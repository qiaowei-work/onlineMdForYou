/**
 * 导出 Markdown 为 HTML / PDF — 使用 marked 做专业解析
 */
import { marked } from 'marked';

const STYLES = `
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.75; font-size: 16px; color: #1e293b;
  max-width: 48rem; margin: 3rem auto; padding: 0 2rem;
}
h1 { font-size: 2rem; margin: 2rem 0 0.75rem; line-height: 1.3; }
h2 { font-size: 1.5rem; margin: 1.5rem 0 0.5rem; line-height: 1.35; }
h3 { font-size: 1.25rem; margin: 1.25rem 0 0.5rem; line-height: 1.4; }
h4 { font-size: 1.125rem; margin: 1rem 0 0.5rem; }
p { margin: 0 0 0.75rem; }
code { font-family: 'JetBrains Mono', monospace; font-size: 0.9em;
       background: #f1f5f9; padding: 0.125rem 0.375rem; border-radius: 4px; }
pre { background: #f1f5f9; padding: 1.25rem; border-radius: 8px; overflow-x: auto;
      line-height: 1.5; font-size: 0.9375rem; margin: 1rem 0; }
pre code { background: none; padding: 0; }
blockquote { border-left: 4px solid #3b82f6; padding: 0.5rem 1.25rem;
             margin: 1rem 0; background: #f8fafc; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
th, td { border: 1px solid #e2e8f0; padding: 0.625rem 1rem; text-align: left; }
th { background: #f1f5f9; font-weight: 600; }
img { max-width: 100%; border-radius: 8px; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
a { color: #2563eb; text-decoration: underline; }
ul, ol { margin-bottom: 0.75rem; padding-left: 1.5rem; }
li { margin-bottom: 0.375rem; }
@media print {
  body { margin: 0; padding: 1rem; max-width: none; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  pre { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  code { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  pre code { background: none !important; }
  blockquote { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  th { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

function buildDocument(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>
<style>${STYLES}</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function exportHTML(markdown: string, title = '未命名文档') {
  const body = marked.parse(markdown) as string;
  const doc = buildDocument(title, body);
  const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\.md$/, '')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(markdown: string, title = '未命名文档') {
  const body = marked.parse(markdown) as string;
  const doc = buildDocument(title, body);
  const w = window.open('', '_blank');
  if (!w) return;
  w.onload = () => { w.print(); };
  w.document.write(doc);
  w.document.close();
}
