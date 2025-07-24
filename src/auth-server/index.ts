import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { GithubProvider } from "@openauthjs/openauth/provider/github";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string, optional } from "valibot";

// Define our user subject with the fields we care about
const subjects = createSubjects({
  user: object({
    id: string(),
    email: string(),
    github_id: optional(string()),
    orcid_id: optional(string()),
    avatar_key: optional(string())
  }),
});

// Our interface for environment bindings
export interface Env {
  AUTH_STORAGE: KVNamespace;
  AUTH_DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ORCID_CLIENT_ID: string;
  ORCID_CLIENT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    
    // Callback handling - this should match the redirect_uri registered with OAuth providers
    if (url.pathname === "/auth/callback") {
      return Response.json({
        message: "OAuth flow complete!",
        params: Object.fromEntries(url.searchParams.entries()),
      });
    }

    // OpenAuth server code
    return issuer({
      storage: CloudflareStorage({
        namespace: env.AUTH_STORAGE,
      }),
      subjects,
      providers: {
        github: GithubProvider({
          clientID: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          scopes: ['user:email'],
        }),
      },
      theme: {
        title: "R3L Auth",
        primary: "#0051c3",
        favicon: "/favicon.ico",
        logo: {
          dark: "/favicon.svg",
          light: "/favicon.svg",
        },
      },
      success: async (ctx, value: any) => {
        // Handle GitHub authentication
        const provider = value.provider;
        let email = '';
        let github_id = null;
        
        if (provider === 'github') {
          // Get user details from GitHub
          const accessToken = value.tokenset.access_token;
          const userResponse = await fetch('https://api.github.com/user', {
            headers: {
              'Authorization': `token ${accessToken}`,
              'User-Agent': 'R3L-Auth-App'
            }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json() as any;
            github_id = userData.id.toString();
            
            // Get user email if not public in profile
            if (!userData.email) {
              const emailsResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                  'Authorization': `token ${accessToken}`,
                  'User-Agent': 'R3L-Auth-App'
                }
              });
              
              if (emailsResponse.ok) {
                const emails = await emailsResponse.json() as any[];
                const primaryEmail = emails.find((e) => e.primary);
                email = primaryEmail ? primaryEmail.email : emails[0].email;
              }
            } else {
              email = userData.email;
            }
          }
        }
        
        if (!email) {
          throw new Error('Unable to retrieve email from provider');
        }
        
        // Get or create user in database
        const userId = await getOrCreateUser(env, email, github_id, null);
        
        return ctx.subject("user", {
          id: userId,
          email: email,
          github_id: github_id,
          orcid_id: undefined,
          avatar_key: undefined // We would set this later if needed
        });
      },
    }).fetch(request, env, ctx);
  },
};

async function getOrCreateUser(
  env: Env, 
  email: string, 
  github_id: string | null = null, 
  orcid_id: string | null = null
): Promise<string> {
  // Try to find existing user by email
  let result = await env.AUTH_DB.prepare(
    `SELECT id FROM user WHERE email = ?`
  )
  .bind(email)
  .first<{ id: string }>();
  
  // If user exists, update provider IDs if needed
  if (result) {
    if (github_id || orcid_id) {
      const updates = [];
      const bindings = [result.id];
      
      if (github_id) {
        updates.push("github_id = ?");
        bindings.push(github_id);
      }
      
      if (orcid_id) {
        updates.push("orcid_id = ?");
        bindings.push(orcid_id);
      }
      
      updates.push("updated_at = CURRENT_TIMESTAMP");
      
      await env.AUTH_DB.prepare(
        `UPDATE user SET ${updates.join(", ")} WHERE id = ?`
      )
      .bind(...bindings)
      .run();
    }
    
    return result.id;
  }
  
  // Create new user if not found
  result = await env.AUTH_DB.prepare(
    `
    INSERT INTO user (email, github_id, orcid_id)
    VALUES (?, ?, ?)
    RETURNING id;
    `
  )
  .bind(email, github_id, orcid_id)
  .first<{ id: string }>();
  
  if (!result) {
    throw new Error(`Unable to create user with email: ${email}`);
  }
  
  console.log(`Created new user ${result.id} with email ${email}`);
  return result.id;
}
