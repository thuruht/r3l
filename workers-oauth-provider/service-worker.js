// R3L OAuth Provider - Standalone Service Worker
// No dependencies, no webpack, no Durable Objects

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Simple router for OAuth endpoints
  if (path.startsWith('/auth/github/login')) {
    return handleGitHubLogin();
  } else if (path.startsWith('/auth/github/callback')) {
    return handleGitHubCallback(request);
  } else if (path.startsWith('/auth/orcid/login')) {
    return handleOrcidLogin();
  } else if (path.startsWith('/auth/orcid/callback')) {
    return handleOrcidCallback(request);
  }
  
  // Default response for non-OAuth endpoints
  return new Response("R3L OAuth Provider", {
    headers: { "Content-Type": "text/plain" }
  });
}

// GitHub OAuth handlers
async function handleGitHubLogin() {
  const state = crypto.randomUUID();
  
  // Store state for verification later
  await OAUTH_KV.put(`github-state:${state}`, 'true', { expirationTtl: 600 });
  
  // Redirect to GitHub's authorization endpoint
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', GITHUB_REDIRECT_URI);
  authUrl.searchParams.set('scope', 'read:user user:email');
  authUrl.searchParams.set('state', state);
  
  return Response.redirect(authUrl.toString(), 302);
}

async function handleGitHubCallback(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  // Validate state and code
  if (!code || !state) {
    return new Response('Missing code or state parameter', { status: 400 });
  }
  
  // Verify state to prevent CSRF
  const storedState = await OAUTH_KV.get(`github-state:${state}`);
  if (!storedState) {
    return new Response('Invalid state parameter', { status: 400 });
  }
  
  // Clean up state
  await OAUTH_KV.delete(`github-state:${state}`);
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_REDIRECT_URI
    })
  });
  
  const tokenData = await tokenResponse.json();
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
  
  const userData = await userResponse.json();
  
  // Create a session
  const sessionId = crypto.randomUUID();
  await OAUTH_KV.put(`session:${sessionId}`, JSON.stringify({
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
async function handleOrcidLogin() {
  const state = crypto.randomUUID();
  
  // Store state for verification later
  await OAUTH_KV.put(`orcid-state:${state}`, 'true', { expirationTtl: 600 });
  
  // Redirect to ORCID's authorization endpoint
  const authUrl = new URL('https://orcid.org/oauth/authorize');
  authUrl.searchParams.set('client_id', ORCID_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', ORCID_REDIRECT_URI);
  authUrl.searchParams.set('scope', '/authenticate');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_type', 'code');
  
  return Response.redirect(authUrl.toString(), 302);
}

async function handleOrcidCallback(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  // Validate state and code
  if (!code || !state) {
    return new Response('Missing code or state parameter', { status: 400 });
  }
  
  // Verify state to prevent CSRF
  const storedState = await OAUTH_KV.get(`orcid-state:${state}`);
  if (!storedState) {
    return new Response('Invalid state parameter', { status: 400 });
  }
  
  // Clean up state
  await OAUTH_KV.delete(`orcid-state:${state}`);
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://orcid.org/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      client_id: ORCID_CLIENT_ID,
      client_secret: ORCID_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: ORCID_REDIRECT_URI
    }).toString()
  });
  
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    return new Response('Failed to exchange code for token', { status: 500 });
  }
  
  // Get user info from token response (ORCID provides basic info in token response)
  const orcid = tokenData.orcid || '';
  const name = tokenData.name || 'ORCID User';
  
  // Create a session
  const sessionId = crypto.randomUUID();
  await OAUTH_KV.put(`session:${sessionId}`, JSON.stringify({
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
