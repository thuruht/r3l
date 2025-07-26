declare module 'dompurify' {
  interface DOMPurifyI {
    sanitize(
      source: string | Node,
      config?: DOMPurifyConfig & { RETURN_DOM_FRAGMENT?: false; RETURN_DOM?: false }
    ): string;
    sanitize(
      source: string | Node,
      config?: DOMPurifyConfig & { RETURN_DOM_FRAGMENT: true; RETURN_DOM?: false }
    ): DocumentFragment;
    sanitize(
      source: string | Node,
      config?: DOMPurifyConfig & { RETURN_DOM_FRAGMENT?: false; RETURN_DOM: true }
    ): HTMLElement;
    addHook(hook: 'beforeSanitizeElements' | string, cb: (node: any, data: any) => any): void;
  }

  interface DOMPurifyConfig {
    ADD_ATTR?: string[];
    ADD_DATA_URI_TAGS?: string[];
    ADD_TAGS?: string[];
    ALLOW_DATA_ATTR?: boolean;
    ALLOW_UNKNOWN_PROTOCOLS?: boolean;
    ALLOWED_ATTR?: string[];
    ALLOWED_TAGS?: string[];
    ALLOWED_URI_REGEXP?: RegExp;
    FORBID_ATTR?: string[];
    FORBID_TAGS?: string[];
    FORCE_BODY?: boolean;
    KEEP_CONTENT?: boolean;
    RETURN_DOM?: boolean;
    RETURN_DOM_FRAGMENT?: boolean;
    RETURN_DOM_IMPORT?: boolean;
    SAFE_FOR_JQUERY?: boolean;
    SANITIZE_DOM?: boolean;
    WHOLE_DOCUMENT?: boolean;
    [key: string]: any;
  }

  function createDOMPurify(window?: Window): DOMPurifyI;

  const DOMPurify: DOMPurifyI;
  export = DOMPurify;
  export default createDOMPurify;
}
