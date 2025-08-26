const fs = require('fs');

class OrcidCookieFixer {
  constructor(routerPath) {
    this.routerPath = routerPath;
    this.routerContent = fs.readFileSync(routerPath, 'utf8');
  }

  fix() {
    // Find the ORCID callback handler
    const orcidCallbackRegex =
      /\/\/ Complete ORCID auth[\s\S]+?\/api\/auth\/orcid\/callback[\s\S]+?async function/m;
    const match = this.routerContent.match(orcidCallbackRegex);

    if (!match) {
      console.error('Could not find ORCID callback handler');
      return;
    }

    // Find the cookie setting section
    const section = match[0];
    const startIndex = this.routerContent.indexOf(section);

    if (startIndex === -1) {
      console.error('Could not find start of ORCID callback');
      return;
    }

    // Find the cookie setting block
    const cookieSettingRegex =
      /\/\/ For direct browser requests, set cookies and redirect[\s\S]+?headers\.append\('Set-Cookie'.+?;/m;
    const cookieMatch = this.routerContent.substring(startIndex).match(cookieSettingRegex);

    if (!cookieMatch) {
      console.error('Could not find cookie setting block');
      return;
    }

    const cookieSection = cookieMatch[0];
    const cookieSectionIndex =
      startIndex + this.routerContent.substring(startIndex).indexOf(cookieSection);

    if (cookieSectionIndex === -1) {
      console.error('Could not find cookie section');
      return;
    }

    // Replace the cookie setting section
    const newCookieSection = `// For direct browser requests, set cookies and redirect
        const domain = requestUrl.hostname;
        const isLocalhost = domain === 'localhost';
        
        // Set secure and SameSite attribute based on environment
        const secureFlag = isLocalhost ? '' : 'Secure; ';
        
        const sessionCookie = \`r3l_session=\${authResult.token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax; \${secureFlag}\`;
        const authStateCookie = \`r3l_auth_state=true; Path=/; Max-Age=2592000; SameSite=Lax; \${secureFlag}\`;
        
        console.log('Setting ORCID auth cookies:', { sessionCookie, authStateCookie, domain });
        
        const headers = new Headers({
          'Location': '/',
          'Set-Cookie': sessionCookie
        });
        
        // Add a secondary cookie that's accessible to JavaScript just to indicate auth state
        // This doesn't contain the actual token, just a flag that user is logged in
        headers.append('Set-Cookie', authStateCookie);`;

    // Apply the replacement
    const updatedContent =
      this.routerContent.substring(0, cookieSectionIndex) +
      newCookieSection +
      this.routerContent.substring(cookieSectionIndex + cookieSection.length);

    fs.writeFileSync(this.routerPath, updatedContent, 'utf8');
    console.log('Successfully updated ORCID cookie handling in router.ts');

    // Now let's fix the GitHub callback similarly
    this.fixGitHubCallback(updatedContent);
  }

  fixGitHubCallback(content) {
    // Find the GitHub callback handler
    const githubCallbackRegex =
      /\/\/ Complete GitHub auth[\s\S]+?\/api\/auth\/github\/callback[\s\S]+?async function/m;
    const match = content.match(githubCallbackRegex);

    if (!match) {
      console.error('Could not find GitHub callback handler');
      return;
    }

    // Find the cookie setting section
    const section = match[0];
    const startIndex = content.indexOf(section);

    if (startIndex === -1) {
      console.error('Could not find start of GitHub callback');
      return;
    }

    // Find the cookie setting block
    const cookieSettingRegex =
      /\/\/ For direct browser requests, set cookies and redirect[\s\S]+?headers\.append\('Set-Cookie'.+?;/m;
    const cookieMatch = content.substring(startIndex).match(cookieSettingRegex);

    if (!cookieMatch) {
      console.error('Could not find cookie setting block');
      return;
    }

    const cookieSection = cookieMatch[0];
    const cookieSectionIndex = startIndex + content.substring(startIndex).indexOf(cookieSection);

    if (cookieSectionIndex === -1) {
      console.error('Could not find cookie section');
      return;
    }

    // Replace the cookie setting section
    const newCookieSection = `// For direct browser requests, set cookies and redirect
        const domain = requestUrl.hostname;
        const isLocalhost = domain === 'localhost';
        
        // Set secure and SameSite attribute based on environment
        const secureFlag = isLocalhost ? '' : 'Secure; ';
        
        const sessionCookie = \`r3l_session=\${authResult.token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax; \${secureFlag}\`;
        const authStateCookie = \`r3l_auth_state=true; Path=/; Max-Age=2592000; SameSite=Lax; \${secureFlag}\`;
        
        console.log('Setting GitHub auth cookies:', { sessionCookie, authStateCookie, domain });
        
        const headers = new Headers({
          'Location': '/',
          'Set-Cookie': sessionCookie
        });
        
        // Add a secondary cookie that's accessible to JavaScript just to indicate auth state
        // This doesn't contain the actual token, just a flag that user is logged in
        headers.append('Set-Cookie', authStateCookie);`;

    // Apply the replacement
    const updatedContent =
      content.substring(0, cookieSectionIndex) +
      newCookieSection +
      content.substring(cookieSectionIndex + cookieSection.length);

    fs.writeFileSync(this.routerPath, updatedContent, 'utf8');
    console.log('Successfully updated GitHub cookie handling in router.ts');

    // Now fix the fixAuthStateCookie method
    this.fixAuthStateCookieMethod(updatedContent);
  }

  fixAuthStateCookieMethod(content) {
    // Find the fixAuthStateCookie method
    const methodRegex =
      /private fixAuthStateCookie\(request: Request\): Response {[\s\S]+?return new Response\([\s\S]+?}\);[\s\S]+?}/m;
    const match = content.match(methodRegex);

    if (!match) {
      console.error('Could not find fixAuthStateCookie method');
      return;
    }

    const method = match[0];
    const methodIndex = content.indexOf(method);

    if (methodIndex === -1) {
      console.error('Could not find start of fixAuthStateCookie method');
      return;
    }

    // Replace the method
    const newMethod = `private fixAuthStateCookie(request: Request): Response {
    const url = new URL(request.url);
    
    // Get the domain from the request URL
    const domain = url.hostname;
    const isLocalhost = domain === 'localhost';
    
    // Set secure and SameSite attribute based on environment
    const secureFlag = isLocalhost ? '' : 'Secure; ';
    
    // Create auth state cookie that's accessible to JavaScript
    const cookieOptions = \`Path=/; Max-Age=2592000; SameSite=Lax; \${secureFlag}\`;
    
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': url.origin,
      'Access-Control-Allow-Credentials': 'true',
      'Set-Cookie': \`r3l_auth_state=true; \${cookieOptions}\`
    });
    
    console.log('Setting auth state cookie:', \`r3l_auth_state=true; \${cookieOptions}\`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Auth state cookie fixed'
    }), {
      status: 200,
      headers
    });
  }`;

    // Apply the replacement
    const updatedContent =
      content.substring(0, methodIndex) +
      newMethod +
      content.substring(methodIndex + method.length);

    fs.writeFileSync(this.routerPath, updatedContent, 'utf8');
    console.log('Successfully updated fixAuthStateCookie method in router.ts');
  }
}

module.exports = { OrcidCookieFixer };
