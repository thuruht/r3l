#!/bin/bash

# Update the cookie handling in router.ts to fix SameSite and Secure attributes

# First, update the ORCID auth handler
sed -i '167,180c\
        // For direct browser requests, set cookies and redirect\
        // Get the domain from the request URL\
        const domain = requestUrl.hostname;\
        const isLocalhost = domain === "localhost";\
        \
        // Set secure and SameSite attribute based on environment\
        const secureFlag = isLocalhost ? "" : "Secure; ";\
        \
        const sessionCookie = `r3l_session=${authResult.token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax; ${secureFlag}`;\
        const authStateCookie = `r3l_auth_state=true; Path=/; Max-Age=2592000; SameSite=Lax; ${secureFlag}`;\
        \
        console.log("Setting ORCID auth cookies:", { sessionCookie, authStateCookie, domain });\
        \
        const headers = new Headers({\
          "Location": "/",\
          "Set-Cookie": sessionCookie\
        });\
        \
        // Add a secondary cookie that is accessible to JavaScript just to indicate auth state\
        // This does not contain the actual token, just a flag that user is logged in\
        headers.append("Set-Cookie", authStateCookie);\
        \
        // Add CORS headers\
        headers.set("Access-Control-Allow-Origin", requestUrl.origin);\
        headers.set("Access-Control-Allow-Credentials", "true");' src/router.ts

# Then, update the GitHub auth handler
sed -i '238,251c\
        // For direct browser requests, set cookies and redirect\
        // Get the domain from the request URL\
        const domain = requestUrl.hostname;\
        const isLocalhost = domain === "localhost";\
        \
        // Set secure and SameSite attribute based on environment\
        const secureFlag = isLocalhost ? "" : "Secure; ";\
        \
        const sessionCookie = `r3l_session=${authResult.token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax; ${secureFlag}`;\
        const authStateCookie = `r3l_auth_state=true; Path=/; Max-Age=2592000; SameSite=Lax; ${secureFlag}`;\
        \
        console.log("Setting GitHub auth cookies:", { sessionCookie, authStateCookie, domain });\
        \
        const headers = new Headers({\
          "Location": "/",\
          "Set-Cookie": sessionCookie\
        });\
        \
        // Add a secondary cookie that is accessible to JavaScript just to indicate auth state\
        // This does not contain the actual token, just a flag that user is logged in\
        headers.append("Set-Cookie", authStateCookie);\
        \
        // Add CORS headers\
        headers.set("Access-Control-Allow-Origin", requestUrl.origin);\
        headers.set("Access-Control-Allow-Credentials", "true");' src/router.ts

# Update the fixAuthStateCookie method
sed -i '984,997c\
  private fixAuthStateCookie(request: Request): Response {\
    const url = new URL(request.url);\
    \
    // Get the domain from the request URL\
    const domain = url.hostname;\
    const isLocalhost = domain === "localhost";\
    \
    // Set secure and SameSite attribute based on environment\
    const secureFlag = isLocalhost ? "" : "Secure; ";\
    \
    // Create auth state cookie that is accessible to JavaScript\
    const cookieOptions = `Path=/; Max-Age=2592000; SameSite=Lax; ${secureFlag}`;\
    \
    const headers = new Headers({\
      "Content-Type": "application/json",\
      "Access-Control-Allow-Origin": url.origin,\
      "Access-Control-Allow-Credentials": "true",\
      "Set-Cookie": `r3l_auth_state=true; ${cookieOptions}`\
    });\
    \
    console.log("Setting auth state cookie:", `r3l_auth_state=true; ${cookieOptions}`);\
    \
    return new Response(JSON.stringify({\
      success: true,\
      message: "Auth state cookie fixed"\
    }), {\
      status: 200,\
      headers\
    });\
  }' src/router.ts

# Make sure the script is properly closed at the end
echo "Cookie handling updated in router.ts"
