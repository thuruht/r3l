export const sanitizeHTML = (html: string): string => {
  if (!html) return '';
  // Basic script tag removal (case insensitive, multiline)
  let clean = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
  // Remove event handlers (on*)
  clean = clean.replace(/ on\w+="[^"]*"/gi, "");
  // Remove javascript: links
  clean = clean.replace(/href="javascript:[^"]*"/gi, 'href="#"');
  return clean;
};
