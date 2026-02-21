import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const buildDocxPreviewHtml = async (filePath: string, title: string): Promise<string> => {
  let previewText = 'Unable to generate DOCX preview text for this document.';
  try {
    const { stdout } = await execFileAsync('unzip', ['-p', filePath, 'word/document.xml'], {
      maxBuffer: 10 * 1024 * 1024,
    });
    const rawXml = String(stdout || '');
    const xmlDecoded = rawXml
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, '\'');
    previewText = xmlDecoded
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<\/w:p>/g, '\n\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
    if (!previewText) {
      previewText = 'No preview text was extracted from this document.';
    }
  } catch (_error) {
    previewText = 'Unable to generate DOCX preview text for this document.';
  }

  const safeTitle = escapeHtml(title || 'Document Preview');
  const safeContent = escapeHtml(previewText);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        margin: 0;
        padding: 1rem;
        font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }
      .wrap {
        max-width: 980px;
        margin: 0 auto;
      }
      h1 {
        font-size: 1.125rem;
        margin: 0 0 0.75rem;
      }
      .hint {
        margin: 0 0 1rem;
        font-size: 0.875rem;
        color: #94a3b8;
      }
      pre {
        white-space: pre-wrap;
        word-wrap: break-word;
        line-height: 1.5;
        font-size: 0.95rem;
        background: #111827;
        border: 1px solid #1f2937;
        border-radius: 0.5rem;
        padding: 1rem;
      }
      @media (prefers-color-scheme: light) {
        body {
          background: #f8fafc;
          color: #0f172a;
        }
        .hint {
          color: #475569;
        }
        pre {
          background: #ffffff;
          border-color: #dbeafe;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>${safeTitle}</h1>
      <p class="hint">This is an in-app text preview of the DOCX file.</p>
      <pre>${safeContent}</pre>
    </div>
  </body>
</html>`;
};
