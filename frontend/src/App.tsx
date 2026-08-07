import { useState, useCallback, useEffect, useRef } from 'react';
import { Moon, Sun, Menu, PanelLeftClose, PanelLeftOpen, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MilkdownEditor from './components/MilkdownEditor';
import type { MilkdownEditorHandle } from './components/MilkdownEditor';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import { ModalProvider } from './components/Modal';
import { exportHTML, exportPDF } from './utils/export';
import type { FormatCommand } from './utils/formatCommands';

const DEFAULT_MARKDOWN = `# 👋 欢迎使用 MdOnline

## 一个高级的在线 Markdown 编辑器

### ✨ 功能特点

- **实时预览** — 所见即所得，编辑流畅
- **分屏模式** — 编辑 / 预览自由切换
- **深色主题** — 保护眼睛的暗色模式
- **语法高亮** — 代码块自动着色（CodeMirror 6 驱动）

---

### 📝 快速开始

> Markdown 是一种轻量级标记语言，让你专注于**内容**而非排版。

#### 文本格式化

这是 **粗体** 文本，这是 *斜体* 文本，这是 ~~删除线~~。

#### 代码示例

行内代码：\`const greeting = "Hello World"\`

\`\`\`javascript
// 代码块带语法高亮
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55
\`\`\`

#### 表格

| 功能 | 状态 | 优先级 |
|------|------|--------|
| 实时预览 | ✅ 完成 | P0 |
| 深色主题 | ✅ 完成 | P0 |
| 语法高亮 | ✅ 完成 | P0 |
| 文件管理 | 🚧 开发中 | P1 |
| 云端同步 | 📋 计划中 | P2 |

#### 列表

1. 第一步：打开编辑器
2. 第二步：开始写作
3. 第三步：导出文档

---

### 🎨 主题预览

点击右上角的 🌙 / ☀️ 按钮切换深色/亮色模式。

**试试快捷键**：选中文字按 \`Ctrl+B\` 加粗！

祝你写作愉快！ ✨
`;

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [currentArticleId, setCurrentArticleId] = useState<number | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!exportOpen) return;
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.export-menu')) setExportOpen(false); };
    setTimeout(() => document.addEventListener('click', close), 0);
    return () => document.removeEventListener('click', close);
  }, [exportOpen]);

  const editorRef = useRef<MilkdownEditorHandle>(null);

  // 侧边栏点击文章 → 加载内容
  const handleSelectArticle = useCallback(async (id: number) => {
    // 无效 id（如删除当前文章后），清空编辑器
    if (id <= 0) {
      setCurrentArticleId(null);
      setMarkdown('');
      setTimeout(() => editorRef.current?.setMarkdown(''), 100);
      return;
    }
    setCurrentArticleId(id);
    try {
      const res = await fetch(`/api/articles/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const content = data.data?.content ?? '';
      setMarkdown(content);
      // 延迟等编辑器就绪后写入
      setTimeout(() => editorRef.current?.setMarkdown(content), 100);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const text = markdown.trim();
    setCharCount(text.length);
    setWordCount(text ? text.split(/\s+/).filter(Boolean).length : 0);
  }, [markdown]);

  // 自动保存：停止输入 1.5s 后 PUT 到后端
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (currentArticleId == null) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // 取消上一次未完成的请求，避免旧数据覆盖新数据
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetch(`/api/articles/${currentArticleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: markdown }),
        signal: controller.signal,
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('自动保存失败:', err);
        }
      });
    }, 1500);
    return () => clearTimeout(saveTimerRef.current);
  }, [markdown, currentArticleId]);

  const handleFormat = useCallback((cmd: FormatCommand) => {
    editorRef.current?.executeCommand(cmd);
  }, []);

  return (
    <ModalProvider>
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="glass flex items-center justify-between px-4 py-2.5 z-50 shrink-0"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-ghost p-2.5"
            title="切换侧边栏"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-surface-900 dark:text-surface-50 text-sm">
              MdOnline
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-ghost p-2.5"
            title="切换侧边栏"
          >
            {sidebarOpen ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
          </button>
          <div className="w-px h-5 bg-surface-200 dark:bg-surface-700 mx-1" />
          {/* 导出 */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="btn-ghost p-2.5"
              title="导出"
            >
              <Download size={22} />
            </button>
            {exportOpen && (
              <div
                className="export-menu absolute right-0 top-full mt-1 z-50 bg-white dark:bg-surface-800
                           border border-surface-200 dark:border-surface-600 rounded-lg shadow-xl py-1 min-w-[120px]"
                onClick={() => setExportOpen(false)}
              >
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left
                             text-surface-700 dark:text-surface-300
                             hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  onClick={() => { const t = document.querySelector('.milkdown-theme-nord h1')?.textContent ?? '文档'; exportHTML(markdown, t); }}
                >
                  导出 HTML
                </button>
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left
                             text-surface-700 dark:text-surface-300
                             hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  onClick={() => { const t = document.querySelector('.milkdown-theme-nord h1')?.textContent ?? '文档'; exportPDF(markdown, t); }}
                >
                  导出 PDF
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="btn-ghost p-2.5"
            title={darkMode ? '切换到亮色模式' : '切换到深色模式'}
          >
            {darkMode ? <Sun size={22} /> : <Moon size={22} />}
          </button>
        </div>
      </motion.header>

      {/* Toolbar */}
      <Toolbar onFormat={handleFormat} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden shrink-0 border-r border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-950/50"
            >
              <Sidebar
                onSelectArticle={handleSelectArticle}
                activeArticleId={currentArticleId}
                refreshKey={sidebarRefreshKey}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Editor Panel — WYSIWYG */}
        <motion.div
          layout
          className="flex-1 flex flex-col min-w-0"
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          <MilkdownEditor
            ref={editorRef}
            value={markdown}
            onChange={setMarkdown}
            darkMode={darkMode}
          />
        </motion.div>
      </div>

      {/* Status Bar */}
      <motion.footer
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
        className="glass flex items-center justify-between px-4 py-1 text-xs text-surface-500 dark:text-surface-400 shrink-0"
      >
        <div className="flex items-center gap-4">
          <span>Markdown</span>
          <span className="w-px h-3 bg-surface-200 dark:bg-surface-700" />
          <span>UTF-8</span>
          <span className="w-px h-3 bg-surface-200 dark:bg-surface-700" />
          <span>WYSIWYG — 所见即所得</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{wordCount.toLocaleString()} 词</span>
          <span className="w-px h-3 bg-surface-200 dark:bg-surface-700" />
          <span>{charCount.toLocaleString()} 字符</span>
        </div>
      </motion.footer>
    </div>
    </ModalProvider>
  );
}

export default App;
