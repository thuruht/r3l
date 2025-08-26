// Placeholder router to indicate this file was archived.
// Original router logic was archived to /archive/legacy-oauth/src/router-new.ts

export const ARCHIVE_NOTICE = 'moved to archive/legacy-oauth/src/router-new.ts';

export class Router {
  // Minimal route method that returns an informational response
  async route(_request: Request, _env: any): Promise<Response> {
    return new Response(JSON.stringify({ archived: true, note: ARCHIVE_NOTICE }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
