// Simple OAuth Provider for R3L
// This handles OAuth flows for GitHub and ORCID authentication

export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ORCID_CLIENT_ID: string;
  ORCID_CLIENT_SECRET: string;
  OAUTH_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Simple router for OAuth endpoints
    if (path.startsWith('/auth/github/login')) {
      return handleGitHubLogin(env);
    } else if (path.startsWith('/auth/github/callback')) {
      return handleGitHubCallback(request, env);
    } else if (path.startsWith('/auth/orcid/login')) {
      return handleOrcidLogin(env);
    } else if (path.startsWith('/auth/orcid/callback')) {
      return handleOrcidCallback(request, env);
    }
    
    // Default response for non-OAuth endpoints
    return new Response("R3L OAuth Provider", {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};

// GitHub OAuth handlers
export async function handleGitHubLogin(env: Env): Promise<Response> {
  const state = crypto.randomUUID();
  
  // Store state for verification later
  await env.OAUTH_KV.put(`github-state:${state}`, 'true', { expirationTtl: 600 });
  
  // Redirect to GitHub's authorization endpoint
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', 'https://r3l.distorted.work/auth/github/callback');
  authUrl.searchParams.set('scope', 'read:user user:email');
  authUrl.searchParams.set('state', state);
  
  return Response.redirect(authUrl.toString(), 302);
}

export async function handleGitHubCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  // Validate state and code
  if (!code || !state) {
    return new Response('Missing code or state parameter', { status: 400 });
  }
  
  // Verify state to prevent CSRF
  const storedState = await env.OAUTH_KV.get(`github-state:${state}`);
  if (!storedState) {
    return new Response('Invalid state parameter', { status: 400 });
  }
  
  // Clean up state
  await env.OAUTH_KV.delete(`github-state:${state}`);
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: 'https://r3l.distorted.work/auth/github/callback'
    })
  });
  
  const tokenData = await tokenResponse.json() as {
    access_token?: string;
  };
  if (!tokenData.access_token) {
    return new Response('Failed to exchange code for token', { status: 500 });
  }
  
  // Get user info
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `token ${tokenData.access_token}`,
      'User-Agent': 'R3L-OAuth-Provider'
    }
  });
  
  const userData = await userResponse.json() as {
    id: number;
    name?: string;
    login: string;
    email?: string;
    avatar_url?: string;
  };
  
  // Create a session
  const sessionId = crypto.randomUUID();
  await env.OAUTH_KV.put(`session:${sessionId}`, JSON.stringify({
    provider: 'github',
    userId: userData.id.toString(),
    name: userData.name || userData.login,
    email: userData.email,
    avatarUrl: userData.avatar_url,
    createdAt: new Date().toISOString()
  }), { expirationTtl: 86400 * 30 }); // 30 days
  
  // Set auth cookie and redirect
  const cookie = `r3l_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${86400 * 30}`;
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': cookie
    }
  });
}

// ORCID OAuth handlers
export async function handleOrcidLogin(env: Env): Promise<Response> {
  const state = crypto.randomUUID();
  
  // Store state for verification later
  await env.OAUTH_KV.put(`orcid-state:${state}`, 'true', { expirationTtl: 600 });
  
  // Redirect to ORCID's authorization endpoint
  const authUrl = new URL('https://orcid.org/oauth/authorize');
  authUrl.searchParams.set('client_id', env.ORCID_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', 'https://r3l.distorted.work/auth/orcid/callback');
  authUrl.searchParams.set('scope', '/authenticate');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_type', 'code');
  
  return Response.redirect(authUrl.toString(), 302);
}

export async function handleOrcidCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  // Validate state and code
  if (!code || !state) {
    return new Response('Missing code or state parameter', { status: 400 });
  }
  
  // Verify state to prevent CSRF
  const storedState = await env.OAUTH_KV.get(`orcid-state:${state}`);
  if (!storedState) {
    return new Response('Invalid state parameter', { status: 400 });
  }
  
  // Clean up state
  await env.OAUTH_KV.delete(`orcid-state:${state}`);
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://orcid.org/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      client_id: env.ORCID_CLIENT_ID,
      client_secret: env.ORCID_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: 'https://r3l.distorted.work/auth/orcid/callback'
    }).toString()
  });
  
  const tokenData = await tokenResponse.json() as {
    access_token?: string;
    orcid?: string;
    name?: string;
  };
  if (!tokenData.access_token) {
    return new Response('Failed to exchange code for token', { status: 500 });
  }
  
  // Get user info from token response (ORCID provides basic info in token response)
  const orcid = tokenData.orcid || '';
  const name = tokenData.name || 'ORCID User';
  
  // Create a session
  const sessionId = crypto.randomUUID();
  await env.OAUTH_KV.put(`session:${sessionId}`, JSON.stringify({
    provider: 'orcid',
    userId: orcid,
    name,
    createdAt: new Date().toISOString()
  }), { expirationTtl: 86400 * 30 }); // 30 days
  
  // Set auth cookie and redirect
  const cookie = `r3l_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${86400 * 30}`;
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': cookie
    }
  });
}
