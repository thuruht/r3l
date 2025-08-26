// src/cookie-fixer.js
// DEPRECATED: This file contained an ad-hoc script used during a migration to
// adjust Set-Cookie handling inside router source files. Cookie handling has
// since been implemented in production code (`src/cookie-helper.ts`) and the
// auth handlers. Keeping this file around can be confusing and dangerous, so
// we replace it with a harmless deprecation stub.

class OrcidCookieFixer {
  constructor() {
    throw new Error(
      'OrcidCookieFixer is deprecated. Cookie handling is implemented in src/cookie-helper.ts'
    );
  }
}

module.exports = { OrcidCookieFixer };
