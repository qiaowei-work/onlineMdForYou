import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Editor, rootCtx, defaultValueCtx, editorViewCtx, commandsCtx } from '@milkdown/kit/core';
import { getMarkdown, replaceAll, insert } from '@milkdown/kit/utils';
import { $view, $prose } from '@milkdown/utils';
import { keymap } from '@milkdown/prose/keymap';
import { TextSelection } from '@milkdown/prose/state';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { history } from '@milkdown/kit/plugin/history';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { clipboard } from '@milkdown/kit/plugin/clipboard';
import { indent } from '@milkdown/kit/plugin/indent';
import { trailing } from '@milkdown/kit/plugin/trailing';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { nord } from '@milkdown/theme-nord';

// 代码块语法高亮
import { codeBlockComponent, codeBlockConfig } from '@milkdown/kit/component/code-block';
import { linkTooltipPlugin } from '@milkdown/components/link-tooltip';
import { tableBlock, tableBlockConfig } from '@milkdown/components/table-block';
// LaTeX 数学公式
import { math, mathBlockSchema } from '@milkdown/plugin-math';
import { MathBlockNodeView } from './MathBlockView';
import 'katex/dist/katex.min.css';
import { LanguageDescription } from '@codemirror/language';
import { sql } from '@codemirror/lang-sql';
import { javascript } from '@codemirror/lang-javascript';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { php } from '@codemirror/lang-php';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { cpp } from '@codemirror/lang-cpp';
import { minimalSetup } from 'codemirror';


import type { FormatCommand } from '../utils/formatCommands';

// 修复标题 Backspace 行为：直接转为段落，而非逐级降级
const headingBackspaceKeymap = $prose(() =>
  keymap({
    Backspace: (state, dispatch) => {
      const { $from } = state.selection;
      const node = $from.node();
      if (node.type.name === 'heading' && state.selection.empty && $from.parentOffset === 0) {
        if (dispatch) {
          const paragraph = state.schema.nodes.paragraph;
          if (paragraph) {
            dispatch(state.tr.setBlockType($from.before(), $from.after(), paragraph, {}));
          }
        }
        return true;
      }
      return false;
    },
  })
);

// $$ 输入后按回车 → 自动转换为公式块
const mathBlockInputKeymap = $prose(() =>
  keymap({
    Enter: (state, dispatch) => {
      const { $from } = state.selection;
      const node = $from.node();
      // 代码块内不触发
      if (node.type.spec.code) return false;
      if (node.type.name === 'paragraph' && state.selection.empty && node.textContent.trim() === '$$') {
        const mathBlock = state.schema.nodes.math_block;
        if (mathBlock && dispatch) {
          const pos = $from.before();
          const mathNode = mathBlock.create({ value: '' });
          const tr = state.tr.replaceWith(pos, pos + node.nodeSize, mathNode);
          // 将光标移入公式块
          const newPos = pos + 1;
          dispatch(tr.setSelection(TextSelection.near(tr.doc.resolve(newPos))));
        }
        return true;
      }
      return false;
    },
  })
);

/** 自实现 lift：将当前节点的父块提升出来 */
function liftBlock(view: EditorView): boolean {
  const { state, dispatch } = view;
  const $pos = state.doc.resolve(state.selection.main.from);
  const depth = $pos.depth;
  if (depth < 1) return false;
  const node = $pos.node(depth);
  const from = $pos.start(depth) - 1;
  const to = $pos.end(depth) + 1;
  const inner = node.content;
  const tr = state.tr.replaceWith(from, to, inner);
  dispatch(tr);
  return true;
}

/** 解除 blockquote：找到 blockquote 祖先并提升其内容 */
function liftBlockquote(view: EditorView): boolean {
  const { state, dispatch } = view;
  const $pos = state.doc.resolve(state.selection.main.from);
  let bqDepth = 0;
  for (let d = 1; d <= $pos.depth; d++) {
    if ($pos.node(d)?.type.name === 'blockquote') { bqDepth = d; break; }
  }
  if (bqDepth === 0) return false;
  const node = $pos.node(bqDepth);
  const from = $pos.start(bqDepth) - 1;
  const to = $pos.end(bqDepth) + 1;
  dispatch(state.tr.replaceWith(from, to, node.content));
  return true;
}

// Typora 风格公式块 — 自定义 NodeView（纯 DOM）
const mathBlockView = $view(mathBlockSchema.node, (_ctx) => {
  return (node: any, view: any, getPos: any) => new MathBlockNodeView(node, view, getPos);
});

// 代码块支持的语言列表（编辑模式 CodeMirror 高亮）
const CODE_LANGUAGES = [
  LanguageDescription.of({ name: 'SQL', alias: ['sql'], support: sql() }),
  LanguageDescription.of({ name: 'JavaScript', alias: ['js', 'javascript'], support: javascript() }),
  LanguageDescription.of({ name: 'TypeScript', alias: ['ts', 'typescript'], support: javascript({ typescript: true }) }),
  LanguageDescription.of({ name: 'Java', alias: ['java'], support: java() }),
  LanguageDescription.of({ name: 'Python', alias: ['py', 'python'], support: python() }),
  LanguageDescription.of({ name: 'HTML', alias: ['html'], support: html() }),
  LanguageDescription.of({ name: 'CSS', alias: ['css'], support: css() }),
  LanguageDescription.of({ name: 'JSON', alias: ['json'], support: json() }),
  LanguageDescription.of({ name: 'XML', alias: ['xml'], support: xml() }),
  LanguageDescription.of({ name: 'PHP', alias: ['php'], support: php() }),
  LanguageDescription.of({ name: 'Rust', alias: ['rust', 'rs'], support: rust() }),
  LanguageDescription.of({ name: 'Go', alias: ['go'], support: go() }),
  LanguageDescription.of({ name: 'C++', alias: ['cpp', 'c++'], support: cpp() }),
];

const HEADING_LEVELS: Record<string, number> = {
  heading1: 1,
  heading2: 2,
  heading3: 3,
};

export interface MilkdownEditorHandle {
  executeCommand: (cmd: FormatCommand) => void;
  getLineCount: () => number;
  getMarkdown: () => string;
  setMarkdown: (markdown: string) => void;
}

interface MilkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  darkMode: boolean;
}

// ============================================================
// 内部组件
// ============================================================
function MilkdownInner({
  value,
  onChange,
  onReady,
  isInternalRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onReady: (editor: Editor) => void;
  isInternalRef: React.MutableRefObject<boolean>;
}) {
  const { loading, get } = useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, value);
      })
      .config((ctx) => {
        ctx.update(codeBlockConfig.key, (prev) => ({
          ...prev,
          extensions: [...prev.extensions, minimalSetup],
          languages: CODE_LANGUAGES,
          previewOnlyByDefault: false,
        }));
      })
      .use(nord)
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(clipboard)
      .use(indent)
      .use(trailing)
      .use(listener)
      .use(codeBlockComponent)
      .use(linkTooltipPlugin)
      .use(mathBlockView)
      .use(math)
      .use(tableBlock)
      .config((ctx) => {
        ctx.update(tableBlockConfig.key, (prev) => ({
          ...prev,
          renderButton: (type) => {
            const icons: Record<string, string> = {
              add_row: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
              add_col: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
              delete_row: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>',
              delete_col: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>',
              align_col_left: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 6H3"/><path d="M15 12H3"/><path d="M17 18H3"/></svg>',
              align_col_center: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6H6"/><path d="M21 12H3"/><path d="M16 18H8"/></svg>',
              align_col_right: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 6H9"/><path d="M21 12H3"/><path d="M21 18H7"/></svg>',
              col_drag_handle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>',
              row_drag_handle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="9" r="1"/><circle cx="6" cy="15" r="1"/><circle cx="12" cy="9" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="18" cy="9" r="1"/><circle cx="18" cy="15" r="1"/></svg>',
            };
            return icons[type] || '';
          },
        }));
      })
      .use(headingBackspaceKeymap)
      .use(mathBlockInputKeymap);
  });

  // 编辑器初始化完成后注册回调和通知外部
  useEffect(() => {
    if (loading) return;
    const editor = get();
    if (!editor) return;

    // 注册 markdown 变化监听
    editor.ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
      isInternalRef.current = true;
      onChange(markdown);
    });
    // 通知外部编辑器就绪
    onReady(editor);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return <Milkdown />;
}

// ============================================================
// 外部组件
// ============================================================
const MilkdownEditor = forwardRef<MilkdownEditorHandle, MilkdownEditorProps>(
  function MilkdownEditor({ value, onChange, darkMode }, ref) {
    const editorRef = useRef<Editor | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const isInternalRef = useRef(false);
    const [editorKey, setEditorKey] = useState(0);
    const [editorReady, setEditorReady] = useState(false);

    // 自定义链接输入状态
    const [linkInput, setLinkInput] = useState<{
      visible: boolean; from: number; to: number; top: number; left: number;
    } | null>(null);
    const linkUrlRef = useRef('');

    // 安装表格行列控件 + 链接点击
    useEffect(() => {
      if (!editorReady) return;
      const container = containerRef.current;
      if (!container) return;

      // 链接点击 → 在新标签页打开
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // 链接：Ctrl/Cmd+点击走默认（编辑），普通点击打开链接
        const link = target.closest('a');
        if (link && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const href = link.getAttribute('href');
          if (href) window.open(href, '_blank');
          return;
        }
      };
      container.addEventListener('click', handleClick, true);

      // 剪贴板粘贴图片
      const handlePaste = async (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            e.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;
            try {
              const form = new FormData();
              form.append('file', file);
              const res = await fetch('/api/upload', { method: 'POST', body: form });
              const data = await res.json();
              const editor = editorRef.current;
              if (editor) {
                editor.ctx.get(commandsCtx).call('InsertImage', { src: data.url });
              }
            } catch (err) {
              console.error('图片粘贴上传失败', err);
            }
            break;
          }
        }
      };
      container.addEventListener('paste', handlePaste);

      return () => {
        container.removeEventListener('click', handleClick, true);
        container.removeEventListener('paste', handlePaste);
      };
    }, [editorReady, editorKey]);

    useImperativeHandle(ref, () => ({
      executeCommand(cmd: FormatCommand) {
        const editor = editorRef.current;
        if (!editor) return;

        // 光标在代码块中 → 禁止所有格式操作（必须先于 focus 检查）
        {
          const view = editor.ctx.get(editorViewCtx);
          try {
            const { $from, $to } = view.state.selection;
            for (const $p of [$from, $to]) {
              for (let d = 1; d <= $p.depth; d++) {
                const n = $p.node(d);
                if (n?.type.name === 'code_block' || n?.type.name === 'fence') return;
              }
            }
          } catch { /* ignore */ }
        }

        // 先聚焦编辑器（防止点击工具栏导致失焦）
        try {
          editor.ctx.get(editorViewCtx).focus();
        } catch { /* ignore */ }

        // 正文 — 将当前块转为普通段落
        if (cmd === 'paragraph') {
          try {
            editor.ctx.get(commandsCtx).call('TurnIntoText');
          } catch {
            // fallback：用 setBlockType 强制置为 paragraph
            try {
              const view = editor.ctx.get(editorViewCtx);
              const { $from } = view.state.selection;
              const paraType = view.state.schema.nodes.paragraph;
              if (paraType) {
                view.dispatch(view.state.tr.setBlockType($from.pos, $from.pos, paraType));
              }
            } catch { /* ignore */ }
          }
          return;
        }

        const view = editor.ctx.get(editorViewCtx);

        // --- 引用块 toggle：包裹 / 取消 ---
        if (cmd === 'blockquote') {
          const $pos = view.state.doc.resolve(view.state.selection.main.from);
          let inBlockquote = false;
          for (let d = 1; d <= $pos.depth; d++) {
            if ($pos.node(d)?.type.name === 'blockquote') { inBlockquote = true; break; }
          }
          if (inBlockquote) {
            liftBlockquote(view);
          } else {
            editor.ctx.get(commandsCtx).call('WrapInBlockquote');
          }
          return;
        }

        // --- 公式块：插入 $$ 块 ---
        if (cmd === 'math') {
          const { state, dispatch } = view;
          const mathBlockType = state.schema.nodes.math_block;
          if (mathBlockType) {
            const node = mathBlockType.create({ value: '' });
            dispatch(state.tr.replaceSelectionWith(node));
          }
          return;
        }

        // --- 代码块：已在代码块中则不做任何操作 ---
        if (cmd === 'codeBlock') {
          try {
            const $pos = view.state.doc.resolve(view.state.selection.main.from);
            let inCodeBlock = false;
            for (let d = 1; d <= $pos.depth; d++) {
              if ($pos.node(d)?.type.name === 'code_block') { inCodeBlock = true; break; }
            }
            if (!inCodeBlock) {
              editor.ctx.get(commandsCtx).call('CreateCodeBlock');
            }
          } catch {
            editor.ctx.get(commandsCtx).call('CreateCodeBlock');
          }
          return;
        }

        // --- 标题 toggle：同级别取消，不同级切换 ---
        if (cmd.startsWith('heading')) {
          const targetLevel = HEADING_LEVELS[cmd];
          try {
            const $pos = view.state.doc.resolve(view.state.selection.main.from);
            const parentNode = $pos.node($pos.depth);
            const currentLevel = parentNode?.type.name === 'heading' ? parentNode.attrs?.level : 0;
            if (currentLevel === targetLevel) {
              editor.ctx.get(commandsCtx).call('TurnIntoText');
            } else {
              editor.ctx.get(commandsCtx).call('WrapInHeading', targetLevel);
            }
          } catch {
            editor.ctx.get(commandsCtx).call('WrapInHeading', targetLevel);
          }
          return;
        }

        // --- 列表 toggle ---
        if (cmd === 'bulletList' || cmd === 'orderedList') {
          const wrapCmd = cmd === 'bulletList' ? 'WrapInBulletList' : 'WrapInOrderedList';
          const lifted = editor.ctx.get(commandsCtx).call('LiftListItem');
          if (!lifted) {
            editor.ctx.get(commandsCtx).call(wrapCmd);
          }
          return;
        }

        // --- 链接输入框定位到选中文字上方 ---
        if (cmd === 'link') {
          const sel = view.state.selection;
          const from = sel.from;
          const to = sel.to;
          if (from === to) return;
          const container = containerRef.current;
          if (!container) return;
          const containerRect = container.getBoundingClientRect();
          let top = 60;
          try {
            const coords = view.coordsAtPos(from);
            if (coords) {
              // coordsAtPos 返回视口坐标，需转换为容器内容坐标（加 scrollTop）
              top = coords.top - containerRect.top + container.scrollTop - 44;
            }
            if (top < 8) top = 8;
          } catch { /* fallback to default top */ }
          setLinkInput({ visible: true, from, to, top, left: 0 });
          return;
        }

        // --- 表情 ---
        if (cmd === 'emoji') {
          const popover = document.createElement('div');
          popover.style.cssText = 'position:fixed;z-index:1001;left:50%;top:80px;transform:translateX(-50%)';
          document.body.appendChild(popover);

          const overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;inset:0;z-index:1000';
          overlay.onclick = () => { popover.remove(); overlay.remove(); };
          document.body.appendChild(overlay);

          import('emoji-picker-react').then(({ default: Picker, EmojiStyle, Theme }) => {
            const root = createRoot(popover);
            root.render(React.createElement(Picker, {
              emojiStyle: EmojiStyle.NATIVE,
              theme: document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT,
              onEmojiClick: (e: any) => {
                editor.ctx.get(editorViewCtx).dispatch(
                  editor.ctx.get(editorViewCtx).state.tr.insertText(e.emoji, editor.ctx.get(editorViewCtx).state.selection.from)
                );
                root.unmount(); popover.remove(); overlay.remove();
              },
              lazyLoadEmojis: true,
            }));
          });
          return;
        }

        // --- 图片上传 ---
        if (cmd === 'image') {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
              const form = new FormData();
              form.append('file', file);
              const res = await fetch('/api/upload', { method: 'POST', body: form });
              const data = await res.json();
              editor.ctx.get(commandsCtx).call('InsertImage', { src: data.url });
            } catch (err) {
              console.error('图片上传失败', err);
            }
          };
          input.click();
          return;
        }

        const cmdMap: Record<string, string> = {
          bold: 'ToggleStrong',
          italic: 'ToggleEmphasis',
          strikethrough: 'ToggleStrikeThrough',
          inlineCode: 'ToggleInlineCode',
          table: 'InsertTable',
          horizontalRule: 'InsertHr',
        };

        const milkdownCmd = cmdMap[cmd];
        if (!milkdownCmd) return;

        const payload = cmd.startsWith('heading') ? HEADING_LEVELS[cmd] : undefined;
        editor.ctx.get(commandsCtx).call(milkdownCmd, payload);
      },

      getLineCount() {
        const editor = editorRef.current;
        if (!editor) return 0;
        try {
          const view = editor.ctx.get(editorViewCtx);
          return view.state.doc.childCount;
        } catch {
          return 0;
        }
      },

      getMarkdown() {
        const editor = editorRef.current;
        if (!editor) return '';
        try {
          return editor.action(getMarkdown());
        } catch {
          return '';
        }
      },

      setMarkdown(markdown: string) {
        const editor = editorRef.current;
        if (!editor) return;
        isInternalRef.current = true;
        try {
          editor.action(replaceAll(markdown));
        } catch {
          isInternalRef.current = false;
        }
      },

    }));

    // 仅在外部（非编辑器输入）value 变化时更新编辑器内容
    useEffect(() => {
      if (isInternalRef.current) {
        return;
      }
      if (editorRef.current) {
        try {
          editorRef.current.action(replaceAll(value));
        } catch {
          setEditorKey((k) => k + 1);
        }
      }
    }, [value]);

    // 每轮渲染结束后重置标记
    useEffect(() => {
      isInternalRef.current = false;
    });

    // 链接提交
    const handleLinkSubmit = () => {
      if (!linkInput || !editorRef.current) return;
      const url = linkUrlRef.current.trim();
      const editor = editorRef.current;
      const view = editor.ctx.get(editorViewCtx);
      if (!url) { setLinkInput(null); return; }
      // 添加 http:// 前缀
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      const linkMark = view.state.schema.marks.link?.create({ href });
      if (linkMark) {
        const tr = view.state.tr.addMark(linkInput.from, linkInput.to, linkMark);
        view.dispatch(tr);
      }
      setLinkInput(null);
      linkUrlRef.current = '';
    };

    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center px-4 py-2 bg-surface-100/50 dark:bg-surface-900/50
                        border-b border-surface-200 dark:border-surface-700 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              WYSIWYG 编辑器
            </span>
          </div>
        </div>

        <div ref={containerRef} className="flex-1 overflow-auto milkdown-container relative" key={editorKey}>
          <MilkdownProvider>
            <MilkdownInner
              value={value}
              onChange={onChange}
              onReady={(editor) => {
                editorRef.current = editor;
                setEditorReady(true);
              }}
              isInternalRef={isInternalRef}
            />
          </MilkdownProvider>

          {/* 自定义链接输入浮层 */}
          {linkInput?.visible && (
            <>
              {/* 遮罩层 — 点击任意处关闭 */}
              <div
                className="fixed inset-0 z-[998]"
                onClick={() => { setLinkInput(null); linkUrlRef.current = ''; }}
              />
              {/* 输入框 — 顶部居中 */}
              <div
                className="link-input-popup absolute z-[999] left-1/2 -translate-x-1/2
                           flex items-center gap-2
                           bg-white dark:bg-surface-800
                           border border-surface-200 dark:border-surface-600
                           rounded-xl shadow-2xl px-4 py-3"
                style={{ top: `${linkInput.top}px` }}
              >
                <input
                  autoFocus
                  className="bg-surface-100 dark:bg-surface-900
                             border-2 border-surface-200 dark:border-surface-600
                             rounded-lg px-3 py-2 text-sm
                             text-surface-800 dark:text-surface-200
                             outline-none w-72
                             focus:border-accent-500 transition-colors"
                  placeholder="输入或粘贴链接地址…"
                  onChange={(e) => { linkUrlRef.current = e.target.value; }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLinkSubmit();
                    if (e.key === 'Escape') { setLinkInput(null); linkUrlRef.current = ''; }
                  }}
                />
                <button
                  className="bg-accent-600 hover:bg-accent-700 text-white
                             rounded-lg px-4 py-2 text-sm font-medium
                             cursor-pointer transition-colors shrink-0"
                  onClick={handleLinkSubmit}
                >
                  确定
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);

export default MilkdownEditor;
