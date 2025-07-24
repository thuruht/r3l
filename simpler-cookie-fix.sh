#!/bin/bash
# A simpler script to fix cookie handling in router.ts

# Backup the file first
cp src/router.ts src/router.ts.bak.$(date +%s)

# Fix the fixAuthStateCookie method
sed -i 's/`Path=\/; Max-Age=2592000; SameSite=Lax`/`Path=\/; Max-Age=2592000; SameSite=Lax; ${cookieOptions}`/g' src/router.ts
sed -i 's/`Path=\/; Max-Age=2592000; SameSite=Lax; Secure`/`Path=\/; Max-Age=2592000; SameSite=Lax; Secure`/g' src/router.ts

# Also update the logout method to add more debugging
sed -i '/console.log('\''Clearing auth cookies with domain:'\'', domain);/a\      console.log('\''Clearing cookies with options:'\'', { cookieOptions, authStateCookieOptions });' src/router.ts

echo "Cookie handling fixes applied to router.ts"
