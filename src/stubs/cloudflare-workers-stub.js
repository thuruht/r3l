// src/stubs/cloudflare-workers-stub.js
// DEPRECATED: This build-time stub was used to allow importing a virtual
// `cloudflare:workers` module during webpack builds. Modern builds should not
// rely on this. We keep a minimal, well-documented stub to avoid breaking CI
// until a build-time replacement is implemented.

module.exports = {
  Request: globalThis.Request,
  Response: globalThis.Response,
  URL: globalThis.URL,
  Headers: globalThis.Headers,
  FormData: globalThis.FormData,
  crypto: globalThis.crypto,
};
