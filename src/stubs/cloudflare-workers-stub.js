// This is a stub for the cloudflare:workers module
// It provides the necessary exports for the @cloudflare/workers-oauth-provider to work during build
module.exports = {
  // Add any required exports here
  // This is just enough to make webpack happy
  Request: globalThis.Request,
  Response: globalThis.Response,
  URL: globalThis.URL,
  Headers: globalThis.Headers,
  FormData: globalThis.FormData,
  crypto: globalThis.crypto
};
