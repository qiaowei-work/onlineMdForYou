import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { EditorView, keymap, highlightSpecialChars, drawSelection, lineNumbers, placeholder } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { executeFormat } from '../utils/formatCommands';
import type { FormatCommand } from '../utils/formatCommands';

interface EditorPanelProps {
  value: string;
  onChange: (value: string) => void;
  darkMode: boolean;
}

export interface EditorPanelHandle {
  executeCommand: (cmd: FormatCommand) => void;
  getLineCount: () => number;
}

const EditorPanel = forwardRef<EditorPanelHandle, EditorPanelProps>(
  function EditorPanel({ value, onChange, darkMode }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const darkCompartment = useRef(new Compartment());

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      executeCommand: (cmd: FormatCommand) => {
        executeFormat(viewRef.current, cmd);
      },
      getLineCount: () => {
        return viewRef.current?.state.doc.lines ?? 0;
      },
    }));

    // 初始化 CodeMirror
    useEffect(() => {
      if (!containerRef.current) return;

      const darkExtension = darkCompartment.current.of(
        darkMode ? oneDark : []
      );

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString();
          onChange(newValue);
        }
      });

      const extensions = [
        // 基础
        lineNumbers(),
        highlightSpecialChars(),
        drawSelection(),
        history(),
        placeholder('开始输入 Markdown...'),

        // Markdown 语法高亮
        markdown({ base: markdownLanguage }),

        // 代码语法高亮
        syntaxHighlighting(defaultHighlightStyle),

        // 快捷键
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
          { key: 'Mod-b', run: (v) => { executeFormat(v, 'bold'); return true; } },
          { key: 'Mod-i', run: (v) => { executeFormat(v, 'italic'); return true; } },
          { key: 'Mod-Shift-x', run: (v) => { executeFormat(v, 'strikethrough'); return true; } },
          { key: 'Mod-k', run: (v) => { executeFormat(v, 'link'); return true; } },
          { key: 'Mod-Shift-k', run: (v) => { executeFormat(v, 'codeBlock'); return true; } },
          { key: 'Mod-Shift-o', run: (v) => { executeFormat(v, 'orderedList'); return true; } },
          { key: 'Mod-Shift-u', run: (v) => { executeFormat(v, 'bulletList'); return true; } },
        ]),

        // 暗色/亮色主题
        darkExtension,

        updateListener,
      ];

      const view = new EditorView({
        state: EditorState.create({
          doc: value,
          extensions,
        }),
        parent: containerRef.current,
      });

      viewRef.current = view;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
    }, []); // 只在挂载时创建

    // 暗色主题切换
    useEffect(() => {
      if (!viewRef.current) return;
      viewRef.current.dispatch({
        effects: darkCompartment.current.reconfigure(
          darkMode ? oneDark : []
        ),
      });
    }, [darkMode]);

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-100/50 dark:bg-surface-900/50 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              编辑器
            </span>
          </div>
          <span className="text-xs text-surface-400 font-mono">
            {viewRef.current?.state.doc.lines ?? 0} 行
          </span>
        </div>

        {/* CodeMirror 容器 */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden"
        />
      </div>
    );
  }
);

export default EditorPanel;
