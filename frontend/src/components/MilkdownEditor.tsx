import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { Editor, rootCtx, defaultValueCtx, editorViewCtx, commandsCtx } from '@milkdown/kit/core';
import { getMarkdown, replaceAll, insert } from '@milkdown/kit/utils';
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
import { basicSetup } from 'codemirror';

import { setupTableHandles } from '../plugins/tableHandles';
import type { FormatCommand } from '../utils/formatCommands';

/** 自实现 lift：将当前节点从其父节点中提升出来 */
function liftBlock(view: EditorView): boolean {
  const { state, dispatch } = view;
  const $pos = state.doc.resolve(state.selection.main.from);
  const depth = $pos.depth;
  if (depth < 1) return false;
  const node = $pos.node(depth);
  const from = $pos.start(depth) - 1;
  const to = $pos.end(depth) + 1;
  // 用节点的内容替换节点本身（含父包裹标签）
  const inner = node.content;
  const tr = state.tr.replaceWith(from, to, inner);
  dispatch(tr);
  return true;
}

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
          extensions: [...prev.extensions, basicSetup],
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
      .use(codeBlockComponent);
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

    // 安装表格行列控件
    useEffect(() => {
      if (!editorReady) return;
      const container = containerRef.current;
      if (!container) return;

      const cleanup = setupTableHandles(
        container,
        () => editorRef.current?.ctx.get(editorViewCtx),
        (name: string) => editorRef.current?.ctx.get(commandsCtx).call(name) ?? false,
      );

      return () => cleanup.destroy();
    }, [editorReady, editorKey]);

    useImperativeHandle(ref, () => ({
      executeCommand(cmd: FormatCommand) {
        const editor = editorRef.current;
        if (!editor) return;

        // 先聚焦编辑器（防止点击工具栏导致失焦）
        try {
          editor.ctx.get(editorViewCtx).focus();
        } catch { /* ignore */ }

        // 任务列表无内置命令，手动插入 markdown
        if (cmd === 'taskList') {
          editor.action(insert('\n- [ ] '));
          return;
        }

        const view = editor.ctx.get(editorViewCtx);

        // --- 引用块：已在引用中则不做任何操作 ---
        if (cmd === 'blockquote') {
          try {
            const $pos = view.state.doc.resolve(view.state.selection.main.from);
            let inBlockquote = false;
            for (let d = 1; d <= $pos.depth; d++) {
              if ($pos.node(d)?.type.name === 'blockquote') { inBlockquote = true; break; }
            }
            if (!inBlockquote) {
              editor.ctx.get(commandsCtx).call('WrapInBlockquote');
            }
          } catch {
            editor.ctx.get(commandsCtx).call('WrapInBlockquote');
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
          // 用 ProseMirror domAtPos 获取文字 DOM 位置（不依赖焦点）
          const containerRect = container.getBoundingClientRect();
          let top = 60;
          try {
            const domPos = view.domAtPos(from);
            if (domPos.node.nodeType === Node.TEXT_NODE) {
              // 文字节点：取其父元素位置
              const el = domPos.node.parentElement;
              if (el) {
                top = el.getBoundingClientRect().top - containerRect.top - 44;
              }
            } else if (domPos.node instanceof HTMLElement) {
              top = domPos.node.getBoundingClientRect().top - containerRect.top - 44;
            }
            if (top < 8) top = 8;
          } catch { /* fallback to default top */ }
          setLinkInput({ visible: true, from, to, top, left: 0 });
          return;
        }

        const cmdMap: Record<string, string> = {
          bold: 'ToggleStrong',
          italic: 'ToggleEmphasis',
          strikethrough: 'ToggleStrikeThrough',
          inlineCode: 'ToggleInlineCode',
          image: 'InsertImage',
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
              {/* 遮罩层 — 点击关闭 */}
              <div
                className="absolute inset-0 z-[998]"
                onClick={() => setLinkInput(null)}
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
                    if (e.key === 'Escape') setLinkInput(null);
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
