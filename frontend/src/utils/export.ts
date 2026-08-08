/**
 * 导出 Markdown 为 HTML / PDF — marked + highlight.js + KaTeX
 */
import { marked } from 'marked';

// 启用 GFM（表格、任务列表、删除线等）
marked.setOptions({ gfm: true, breaks: false });

const STYLES = `
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.75;font-size:16px;color:#1e293b;max-width:48rem;margin:3rem auto;padding:0 2rem}
h1{font-size:2rem;margin:2rem 0 .75rem;line-height:1.3}
h2{font-size:1.5rem;margin:1.5rem 0 .5rem;line-height:1.35}
h3{font-size:1.25rem;margin:1.25rem 0 .5rem;line-height:1.4}
h4{font-size:1.125rem;margin:1rem 0 .5rem}
p{margin:0 0 .75rem}
code{font-family:'JetBrains Mono',monospace;font-size:.9em;background:#f1f5f9;padding:.125rem .375rem;border-radius:4px}
pre{background:#f1f5f9;padding:1.25rem;border-radius:8px;overflow-x:auto;line-height:1.5;font-size:.9375rem;margin:1rem 0}
pre code{background:none;padding:0;font-size:.9em}
blockquote{border-left:4px solid #3b82f6;padding:.5rem 1.25rem;margin:1rem 0;background:#f8fafc}
table{border-collapse:collapse;width:100%;margin:1rem 0}
th,td{border:1px solid #e2e8f0;padding:.625rem 1rem;text-align:left}
th{background:#f1f5f9;font-weight:600}
img{max-width:100%;border-radius:8px}
hr{border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0}
a{color:#2563eb;text-decoration:underline}
ul,ol{margin-bottom:.75rem;padding-left:1.5rem}
li{margin-bottom:.375rem}
.task-list-item{list-style:none}
.task-list-item input{margin-right:.5rem}
@media print{
  body{margin:0;padding:1rem;max-width:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  pre{background:#f1f5f9!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  code{background:#f1f5f9!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  pre code{background:none!important}
  blockquote{background:#f8fafc!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  th{background:#f1f5f9!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`.replace(/\n/g, '');

function buildDocument(title: string, body: string): string {
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${safeTitle}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css">
<style>${STYLES}</style>
</head>
<body>
${body}
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"><\\/script>
<script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"><\\/script>
<script>
(function(){
  // 代码高亮
  document.querySelectorAll('pre code').forEach(function(b){hljs.highlightElement(b)});
  // 数学公式
  document.querySelectorAll('.math-block').forEach(function(b){try{katex.render(b.getAttribute('data-value')||b.textContent,b,{displayMode:true,throwOnError:false})}catch(e){}});
  document.querySelectorAll('.math-inline').forEach(function(b){try{katex.render(b.getAttribute('data-value')||b.textContent,b,{displayMode:false,throwOnError:false})}catch(e){}});
})();
</script>
</body>
</html>`;
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportHTML(markdown: string, title = '未命名文档') {
  const body = marked.parse(markdown) as string;
  const doc = buildDocument(title, body);
  downloadBlob(doc, `${title.replace(/\.md$/, '')}.html`, 'text/html;charset=utf-8');
}

export function exportPDF(markdown: string, title = '未命名文档') {
  const body = marked.parse(markdown) as string;
  const doc = buildDocument(title, body);
  // 导出为 HTML 文件（浏览器打开后 Ctrl+P 即可打印为 PDF）
  downloadBlob(doc, `${title.replace(/\.md$/, '')}.html`, 'text/html;charset=utf-8');
}
