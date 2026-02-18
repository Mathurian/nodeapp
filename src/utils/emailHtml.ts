const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export interface BrandedEmailOptions {
  subject?: string;
  previewText?: string;
  headerHtml?: string;
  headerTitle?: string;
  title?: string;
  bodyHtml?: string;
  bodyText?: string;
  footerHtml?: string;
  footerText?: string;
  primaryColor?: string;
  pageBackgroundColor?: string;
  contentBackgroundColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  fontFamily?: string;
  borderRadius?: string;
  appName?: string;
}

export interface PrepareEmailHtmlOptions {
  subject?: string;
  previewText?: string;
  fallbackText?: string;
  headerTitle?: string;
  footerText?: string;
  appName?: string;
  primaryColor?: string;
}

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const looksLikeHtml = (value: string): boolean => /<\/?[a-z][\s\S]*>/i.test(value);

const normalizeHexColor = (value: string | undefined, fallback: string): string => {
  const input = String(value || '').trim();
  if (!HEX_COLOR_REGEX.test(input)) return fallback;

  if (input.length === 4) {
    const r = input[1];
    const g = input[2];
    const b = input[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return input.toLowerCase();
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const normalized = normalizeHexColor(hex, '#000000').replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const channelLuminance = (channel: number): number => {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
};

const relativeLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * channelLuminance(r)) + (0.7152 * channelLuminance(g)) + (0.0722 * channelLuminance(b));
};

export const contrastRatio = (foreground: string, background: string): number => {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

export const ensureReadableTextColor = (
  backgroundColor: string,
  preferredTextColor: string,
  minimumRatio: number = 4.5
): string => {
  const bg = normalizeHexColor(backgroundColor, '#ffffff');
  const preferred = normalizeHexColor(preferredTextColor, '#111827');

  if (contrastRatio(preferred, bg) >= minimumRatio) {
    return preferred;
  }

  const dark = '#111827';
  const light = '#f8fafc';

  const darkRatio = contrastRatio(dark, bg);
  const lightRatio = contrastRatio(light, bg);

  if (darkRatio >= minimumRatio || darkRatio >= lightRatio) {
    return dark;
  }

  return light;
};

export const extractPlainTextFromHtml = (value: string): string => {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h1|h2|h3|h4|h5|h6|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
};

const toBodyHtml = (bodyHtml: string | undefined, bodyText: string | undefined): string => {
  const htmlCandidate = String(bodyHtml || '').trim();
  if (htmlCandidate) {
    if (looksLikeHtml(htmlCandidate)) {
      return htmlCandidate;
    }

    return `<p style="margin:0;font-size:15px;line-height:1.65;">${escapeHtml(htmlCandidate).replace(/\r?\n/g, '<br />')}</p>`;
  }

  const text = String(bodyText || '').trim();
  if (!text) {
    return '<p style="margin:0;font-size:15px;line-height:1.65;">&nbsp;</p>';
  }

  return `<p style="margin:0;font-size:15px;line-height:1.65;">${escapeHtml(text).replace(/\r?\n/g, '<br />')}</p>`;
};

const buildCompatStyles = (primaryColor: string): string => {
  return `
  <style data-em-compat="1">
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      border-collapse: collapse !important;
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
      max-width: 100%;
      height: auto;
    }
    a {
      color: ${primaryColor};
      text-decoration: none;
    }
    .em-email-bg {
      background-color: #eef2f7 !important;
    }
    .em-email-card,
    .container,
    .email-container {
      background-color: #ffffff;
      color: #111827;
    }
    .em-email-body,
    .email-body,
    .content {
      color: #111827;
    }
    .em-email-muted,
    .email-footer,
    .footer {
      color: #4b5563;
    }
    @media (prefers-color-scheme: dark) {
      body,
      .em-email-bg {
        background-color: #0f172a !important;
        color: #e5e7eb !important;
      }
      .em-email-card,
      .container,
      .email-container {
        background-color: #111827 !important;
        border-color: #334155 !important;
      }
      .em-email-body,
      .email-body,
      .content {
        background-color: #111827 !important;
        color: #e5e7eb !important;
      }
      .em-email-muted,
      .email-footer,
      .footer {
        background-color: #0f172a !important;
        border-color: #334155 !important;
        color: #94a3b8 !important;
      }
      .em-email-body h1,
      .em-email-body h2,
      .em-email-body h3,
      .em-email-body h4,
      .em-email-body h5,
      .em-email-body h6,
      .em-email-body p,
      .em-email-body li,
      .em-email-body td,
      .em-email-body span,
      .em-email-body div,
      .content h1,
      .content h2,
      .content h3,
      .content h4,
      .content h5,
      .content h6,
      .content p,
      .content li,
      .content td,
      .content span,
      .content div {
        color: inherit !important;
      }
      a {
        color: #93c5fd !important;
      }
    }
    [data-ogsc] body,
    [data-ogsc] .em-email-bg {
      background-color: #0f172a !important;
      color: #e5e7eb !important;
    }
    [data-ogsc] .em-email-card,
    [data-ogsc] .container,
    [data-ogsc] .email-container {
      background-color: #111827 !important;
      border-color: #334155 !important;
      color: #e5e7eb !important;
    }
  </style>
  `.trim();
};

export const buildBrandedEmailDocument = (options: BrandedEmailOptions): string => {
  const appName = String(options.appName || 'Event Manager');
  const subject = String(options.subject || appName).trim() || appName;
  const primaryColor = normalizeHexColor(options.primaryColor, '#2563eb');
  const pageBackgroundColor = normalizeHexColor(options.pageBackgroundColor, '#eef2f7');
  const contentBackgroundColor = normalizeHexColor(options.contentBackgroundColor, '#ffffff');
  const textColor = ensureReadableTextColor(contentBackgroundColor, normalizeHexColor(options.textColor, '#111827'));
  const mutedTextColor = ensureReadableTextColor(contentBackgroundColor, normalizeHexColor(options.mutedTextColor, '#4b5563'), 3.4);
  const headerTextColor = ensureReadableTextColor(primaryColor, '#ffffff', 4);
  const borderColor = normalizeHexColor('#e5e7eb', '#e5e7eb');
  const borderRadius = String(options.borderRadius || '12px');
  const fontFamily = String(options.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif");
  const previewText = String(options.previewText || subject).trim();
  const headerHtml = String(options.headerHtml || '').trim();
  const footerHtml = String(options.footerHtml || '').trim();
  const footerText = String(options.footerText || `Sent from ${appName}`).trim();
  const title = String(options.title || '').trim();

  const resolvedBodyHtml = toBodyHtml(options.bodyHtml, options.bodyText);

  const resolvedHeaderHtml = headerHtml || `
    <div style="font-size:22px;line-height:1.3;font-weight:700;">${escapeHtml(options.headerTitle || appName)}</div>
  `;

  const resolvedFooterHtml = footerHtml || `
    <p style="margin:0;">${escapeHtml(footerText)}</p>
  `;

  const titleBlock = title
    ? `<h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.3;font-weight:700;color:${textColor};">${escapeHtml(title)}</h1>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(subject)}</title>
  ${buildCompatStyles(primaryColor)}
</head>
<body class="em-email-root" style="margin:0;padding:0;background-color:${pageBackgroundColor};">
  <div data-em-preheader="1" style="display:none!important;visibility:hidden;opacity:0;overflow:hidden;height:0;width:0;line-height:1px;font-size:1px;color:transparent;">
    ${escapeHtml(previewText)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="em-email-bg" style="width:100%;background-color:${pageBackgroundColor};margin:0;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="em-email-card" style="width:100%;max-width:640px;background-color:${contentBackgroundColor};border:1px solid ${borderColor};border-radius:${borderRadius};overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;background-color:${primaryColor};color:${headerTextColor};font-family:${fontFamily};font-size:16px;line-height:1.4;">
              ${resolvedHeaderHtml}
            </td>
          </tr>
          <tr>
            <td class="em-email-body" style="padding:24px;background-color:${contentBackgroundColor};color:${textColor};font-family:${fontFamily};font-size:15px;line-height:1.65;">
              ${titleBlock}
              ${resolvedBodyHtml}
            </td>
          </tr>
          <tr>
            <td class="em-email-footer em-email-muted" style="padding:16px 24px;background-color:${contentBackgroundColor};border-top:1px solid ${borderColor};color:${mutedTextColor};font-family:${fontFamily};font-size:12px;line-height:1.5;">
              ${resolvedFooterHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const appendMetaIfMissing = (documentHtml: string, regex: RegExp, markup: string): string => {
  if (regex.test(documentHtml)) {
    return documentHtml;
  }
  return documentHtml.replace(/<head([^>]*)>/i, `<head$1>\n${markup}`);
};

const appendClassAttribute = (bodyAttributes: string, className: string): string => {
  const classRegex = /\bclass\s*=\s*(["'])(.*?)\1/i;
  if (!classRegex.test(bodyAttributes)) {
    return `${bodyAttributes} class="${className}"`;
  }

  return bodyAttributes.replace(classRegex, (_match, quote: string, classes: string) => {
    if (classes.split(/\s+/).includes(className)) {
      return `class=${quote}${classes}${quote}`;
    }
    const nextClasses = `${classes} ${className}`.trim();
    return `class=${quote}${nextClasses}${quote}`;
  });
};

const prependBodyStyleDefaults = (bodyAttributes: string, defaultStyles: string): string => {
  const styleRegex = /\bstyle\s*=\s*(["'])(.*?)\1/i;
  if (!styleRegex.test(bodyAttributes)) {
    return `${bodyAttributes} style="${defaultStyles}"`;
  }

  return bodyAttributes.replace(styleRegex, (_match, quote: string, styles: string) => {
    const next = `${defaultStyles};${styles}`.replace(/;;+/g, ';');
    return `style=${quote}${next}${quote}`;
  });
};

const injectCompatibilityIntoDocument = (documentHtml: string, options: PrepareEmailHtmlOptions): string => {
  let html = documentHtml;
  const appName = String(options.appName || 'Event Manager');
  const primaryColor = normalizeHexColor(options.primaryColor, '#2563eb');
  const previewText = String(options.previewText || options.subject || appName).trim();

  if (!/<head[\s>]/i.test(html)) {
    if (/<html[\s>]/i.test(html)) {
      html = html.replace(/<html([^>]*)>/i, `<html$1>\n<head></head>`);
    } else {
      html = `<head></head>\n${html}`;
    }
  }

  html = appendMetaIfMissing(
    html,
    /<meta[^>]+name=["']viewport["']/i,
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
  );
  html = appendMetaIfMissing(
    html,
    /<meta[^>]+name=["']x-apple-disable-message-reformatting["']/i,
    '<meta name="x-apple-disable-message-reformatting" />'
  );
  html = appendMetaIfMissing(
    html,
    /<meta[^>]+name=["']format-detection["']/i,
    '<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />'
  );
  html = appendMetaIfMissing(
    html,
    /<meta[^>]+name=["']color-scheme["']/i,
    '<meta name="color-scheme" content="light dark" />'
  );
  html = appendMetaIfMissing(
    html,
    /<meta[^>]+name=["']supported-color-schemes["']/i,
    '<meta name="supported-color-schemes" content="light dark" />'
  );

  if (!/data-em-compat=["']1["']/i.test(html)) {
    html = html.replace(/<\/head>/i, `${buildCompatStyles(primaryColor)}\n</head>`);
  }

  html = html.replace(/<body([^>]*)>/i, (_match, attrs: string) => {
    let nextAttrs = appendClassAttribute(attrs, 'em-email-root');
    nextAttrs = prependBodyStyleDefaults(
      nextAttrs,
      'margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background-color:#eef2f7;color:#111827'
    );
    return `<body${nextAttrs}>`;
  });

  if (previewText && !/data-em-preheader=["']1["']/i.test(html)) {
    const preheaderBlock = `<div data-em-preheader="1" style="display:none!important;visibility:hidden;opacity:0;overflow:hidden;height:0;width:0;line-height:1px;font-size:1px;color:transparent;">${escapeHtml(previewText)}</div>`;
    html = html.replace(/<body[^>]*>/i, (bodyTag) => `${bodyTag}\n${preheaderBlock}`);
  }

  if (!/^\s*<!doctype/i.test(html)) {
    html = `<!DOCTYPE html>\n${html}`;
  }

  return html;
};

export const prepareOutboundEmailHtml = (
  input: string | undefined,
  options: PrepareEmailHtmlOptions = {}
): string => {
  const raw = String(input || '').trim();
  const appName = String(options.appName || 'Event Manager');
  const subject = String(options.subject || appName).trim() || appName;

  if (!raw) {
    return buildBrandedEmailDocument({
      appName,
      subject,
      title: subject,
      bodyText: options.fallbackText || '',
      previewText: options.previewText,
      headerTitle: options.headerTitle || appName,
      footerText: options.footerText,
      primaryColor: options.primaryColor,
    });
  }

  if (!looksLikeHtml(raw)) {
    return buildBrandedEmailDocument({
      appName,
      subject,
      title: subject,
      bodyText: raw,
      previewText: options.previewText,
      headerTitle: options.headerTitle || appName,
      footerText: options.footerText,
      primaryColor: options.primaryColor,
    });
  }

  if (!/<html[\s>]/i.test(raw)) {
    return buildBrandedEmailDocument({
      appName,
      subject,
      title: subject,
      bodyHtml: raw,
      bodyText: options.fallbackText,
      previewText: options.previewText,
      headerTitle: options.headerTitle || appName,
      footerText: options.footerText,
      primaryColor: options.primaryColor,
    });
  }

  return injectCompatibilityIntoDocument(raw, options);
};
