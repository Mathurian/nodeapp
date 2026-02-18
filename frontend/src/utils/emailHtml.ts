export interface EmailStyleConfig {
  headerTitle: string
  primaryColor: string
  backgroundColor: string
  textColor: string
  footerText: string
}

export interface EmailStylePreset {
  id: string
  label: string
  style: EmailStyleConfig
}

export interface EmailContrastStatus {
  ratio: number
  passes: boolean
  recommendedTextColor: string
}

interface BuildBrandedEmailOptions {
  subject: string
  title?: string
  message: string
  detailRows?: Array<{ label: string; value: string }>
  note?: string
  preheader?: string
  style: EmailStyleConfig
}

const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export const DEFAULT_EMAIL_STYLE: EmailStyleConfig = {
  headerTitle: 'Event Manager Update',
  primaryColor: '#2563eb',
  backgroundColor: '#eef2f7',
  textColor: '#111827',
  footerText: 'Sent from Event Manager',
}

export const EMAIL_STYLE_PRESETS: EmailStylePreset[] = [
  {
    id: 'default',
    label: 'Default',
    style: { ...DEFAULT_EMAIL_STYLE },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    style: {
      headerTitle: 'Event Manager Update',
      primaryColor: '#0b7285',
      backgroundColor: '#e6f4f8',
      textColor: '#0f172a',
      footerText: 'Sent from Event Manager',
    },
  },
  {
    id: 'sunrise',
    label: 'Sunrise',
    style: {
      headerTitle: 'Event Manager Update',
      primaryColor: '#ea580c',
      backgroundColor: '#fff7ed',
      textColor: '#27272a',
      footerText: 'Sent from Event Manager',
    },
  },
]

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const normalizeHexColor = (value: string, fallback: string): string => {
  const input = String(value || '').trim()
  if (!HEX_COLOR_REGEX.test(input)) return fallback
  if (input.length === 4) {
    const r = input[1]
    const g = input[2]
    const b = input[3]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return input.toLowerCase()
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const normalized = normalizeHexColor(hex, '#000000').replace('#', '')
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

const luminanceChannel = (channel: number): number => {
  const normalized = channel / 255
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4)
}

const contrastRatio = (foreground: string, background: string): number => {
  const fg = hexToRgb(foreground)
  const bg = hexToRgb(background)

  const fgLum = (0.2126 * luminanceChannel(fg.r)) + (0.7152 * luminanceChannel(fg.g)) + (0.0722 * luminanceChannel(fg.b))
  const bgLum = (0.2126 * luminanceChannel(bg.r)) + (0.7152 * luminanceChannel(bg.g)) + (0.0722 * luminanceChannel(bg.b))
  const lighter = Math.max(fgLum, bgLum)
  const darker = Math.min(fgLum, bgLum)

  return (lighter + 0.05) / (darker + 0.05)
}

const chooseReadableTextColor = (backgroundColor: string, preferredTextColor: string): string => {
  const bg = normalizeHexColor(backgroundColor, '#ffffff')
  const preferred = normalizeHexColor(preferredTextColor, '#111827')

  if (contrastRatio(preferred, bg) >= 4.5) return preferred

  const dark = '#111827'
  const light = '#f8fafc'
  const darkRatio = contrastRatio(dark, bg)
  const lightRatio = contrastRatio(light, bg)

  return darkRatio >= lightRatio ? dark : light
}

export const normalizeEmailStyle = (style: EmailStyleConfig): EmailStyleConfig => {
  const pageBackgroundColor = normalizeHexColor(style.backgroundColor, DEFAULT_EMAIL_STYLE.backgroundColor)
  const primaryColor = normalizeHexColor(style.primaryColor, DEFAULT_EMAIL_STYLE.primaryColor)
  const contentTextColor = chooseReadableTextColor('#ffffff', style.textColor)

  return {
    headerTitle: style.headerTitle || DEFAULT_EMAIL_STYLE.headerTitle,
    primaryColor,
    backgroundColor: pageBackgroundColor,
    textColor: contentTextColor,
    footerText: style.footerText || DEFAULT_EMAIL_STYLE.footerText,
  }
}

export const getEmailContrastStatus = (style: EmailStyleConfig): EmailContrastStatus => {
  const normalizedText = normalizeHexColor(style.textColor, '#111827')
  const ratio = contrastRatio(normalizedText, '#ffffff')

  return {
    ratio,
    passes: ratio >= 4.5,
    recommendedTextColor: chooseReadableTextColor('#ffffff', normalizedText),
  }
}

const formatMessageHtml = (message: string): string => {
  const escaped = escapeHtml(message || '').replace(/\r?\n/g, '<br />')
  return escaped || 'No additional details were provided.'
}

export const buildBrandedEmailHtml = ({
  subject,
  title,
  message,
  detailRows = [],
  note,
  preheader,
  style,
}: BuildBrandedEmailOptions): string => {
  const normalized = normalizeEmailStyle(style)
  const safeSubject = escapeHtml(subject || 'Notification')
  const safeTitle = escapeHtml(title || subject || 'Notification')
  const safeHeader = escapeHtml(normalized.headerTitle || 'Event Manager Update')
  const safeFooter = escapeHtml(normalized.footerText || DEFAULT_EMAIL_STYLE.footerText)
  const safeMessage = formatMessageHtml(message)
  const safePreheader = escapeHtml(preheader || subject || title || 'Event Manager update')
  const safeNote = note ? escapeHtml(note) : ''

  const detailsBlock = detailRows.length > 0
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        ${detailRows.map((detail) => `
          <tr>
            <td style="padding:10px 12px;background:#f8fafc;color:#475569;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;width:36%;">
              ${escapeHtml(detail.label)}
            </td>
            <td style="padding:10px 12px;background:#ffffff;color:${normalized.textColor};font-size:13px;border-bottom:1px solid #e5e7eb;">
              ${escapeHtml(detail.value)}
            </td>
          </tr>
        `).join('')}
      </table>`
    : ''

  const noteBlock = safeNote
    ? `<p style="margin:14px 0 0 0;color:#64748b;font-size:12px;line-height:1.6;">${safeNote}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${safeSubject}</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: ${normalized.backgroundColor};
      color: ${normalized.textColor};
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    }
    table, td { border-collapse: collapse !important; mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
    img { border: 0; outline: none; text-decoration: none; max-width: 100%; height: auto; }
    a { color: ${normalized.primaryColor}; text-decoration: none; }
    @media (prefers-color-scheme: dark) {
      body, .em-page-bg { background: #0f172a !important; color: #e5e7eb !important; }
      .em-card { background: #111827 !important; border-color: #334155 !important; }
      .em-content, .em-content * { color: #e5e7eb !important; }
      .em-footer { color: #94a3b8 !important; border-color: #334155 !important; }
      .em-meta-label { color: #cbd5e1 !important; background: #1e293b !important; border-color: #334155 !important; }
      .em-meta-value { color: #e2e8f0 !important; background: #0f172a !important; border-color: #334155 !important; }
      a { color: #93c5fd !important; }
    }
  </style>
</head>
<body>
  <div style="display:none!important;visibility:hidden;opacity:0;overflow:hidden;height:0;width:0;font-size:1px;line-height:1px;color:transparent;">
    ${safePreheader}
  </div>
  <table role="presentation" width="100%" class="em-page-bg" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0;padding:24px 0;background:${normalized.backgroundColor};">
    <tr>
      <td align="center" style="padding:0 12px;">
        <table role="presentation" width="100%" class="em-card" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:18px 22px;background:${normalized.primaryColor};color:#ffffff;">
              <div style="font-size:21px;font-weight:700;line-height:1.3;">${safeHeader}</div>
            </td>
          </tr>
          <tr>
            <td class="em-content" style="padding:24px;color:${normalized.textColor};font-size:15px;line-height:1.65;">
              <h1 style="margin:0 0 14px 0;color:${normalized.textColor};font-size:24px;line-height:1.3;">${safeTitle}</h1>
              <p style="margin:0;color:${normalized.textColor};font-size:15px;line-height:1.65;">${safeMessage}</p>
              ${detailsBlock}
              ${noteBlock}
            </td>
          </tr>
          <tr>
            <td class="em-footer" style="padding:14px 22px;border-top:1px solid #e5e7eb;background:#ffffff;color:#64748b;font-size:12px;line-height:1.5;">
              ${safeFooter}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
