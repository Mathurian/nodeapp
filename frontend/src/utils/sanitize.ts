/**
 * XSS Protection Utility using DOMPurify
 * Sanitizes HTML content to prevent XSS attacks
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML string to prevent XSS attacks
 * @param dirty - The untrusted HTML string
 * @param options - DOMPurify configuration options
 * @returns Sanitized HTML string safe for rendering
 */
export const sanitizeHtml = (
  dirty: string,
  options?: DOMPurify.Config
): string => {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  const defaultOptions: DOMPurify.Config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
      'span', 'div', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'target', 'rel', 'src', 'alt', 'class', 'id', 'style'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false,
    ...options
  };

  // Type assertion needed due to @types/dompurify and dompurify version mismatch
  // We set RETURN_TRUSTED_TYPE: false, so it always returns string
  return DOMPurify.sanitize(dirty, defaultOptions as any) as unknown as string;
};

/**
 * Sanitize text content (removes all HTML)
 * @param dirty - The untrusted string
 * @returns Plain text with HTML stripped
 */
export const sanitizeText = (dirty: string): string => {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true
  });
};

/**
 * Sanitize user input for display (allows basic formatting)
 * @param dirty - The untrusted HTML string from user input
 * @returns Sanitized HTML string with basic formatting preserved
 */
export const sanitizeUserInput = (dirty: string): string => {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    KEEP_CONTENT: true
  });
};

/**
 * Sanitize rich text content (e.g., from WYSIWYG editors)
 * Allows more HTML tags for formatted content
 * @param dirty - Unsanitized HTML from rich text editor
 * @returns Sanitized HTML with rich formatting preserved
 */
export const sanitizeRichText = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'span', 'div'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'class', 'id', 'src', 'alt', 'title',
      'width', 'height', 'style'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
};

/**
 * React component helper: Sanitize and create props for dangerouslySetInnerHTML
 * @param html - The HTML string to sanitize
 * @param options - DOMPurify configuration options
 * @returns Object with __html property safe for React dangerouslySetInnerHTML
 */
export const createSafeMarkup = (
  html: string,
  options?: DOMPurify.Config
): { __html: string } => {
  return {
    __html: sanitizeHtml(html, options)
  };
};

/**
 * React hook for sanitizing HTML in components
 * Returns an object that can be spread into dangerouslySetInnerHTML
 * @param html - HTML content to sanitize
 * @param options - Optional DOMPurify configuration
 * @returns Object with __html property containing sanitized content
 * @example
 * <div {...useSanitizedHTML(userContent)} />
 */
export const useSanitizedHTML = (
  html: string,
  options?: DOMPurify.Config
): { __html: string } => {
  return {
    __html: sanitizeHtml(html, options)
  };
};

/**
 * Sanitize URL to prevent javascript: protocol attacks
 * @param url - The URL to sanitize
 * @returns Safe URL or empty string if invalid
 */
export const sanitizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Remove dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = url.toLowerCase().trim();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      console.warn(`Blocked dangerous URL protocol: ${protocol}`);
      return '';
    }
  }

  return url;
};

/**
 * Escape HTML special characters to prevent XSS
 * Use this when you need plain text with HTML entities escaped
 * @param text - The text to escape
 * @returns Escaped text
 */
export const escapeHtml = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, (char) => map[char] || char);
};

export default {
  sanitizeHtml,
  sanitizeText,
  sanitizeUserInput,
  sanitizeRichText,
  createSafeMarkup,
  useSanitizedHTML,
  sanitizeUrl,
  escapeHtml
};
