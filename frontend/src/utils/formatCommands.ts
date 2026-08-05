import { EditorView } from '@codemirror/view';
import { EditorSelection, SelectionRange } from '@codemirror/state';

// ============================================================
// 光标/选区工具函数
// ============================================================

/** 获取当前选中文本 */
function getSelectedText(view: EditorView): string {
  const { from, to } = view.state.selection.main;
  return view.state.sliceDoc(from, to);
}

/** 替换选区内容，并设置新光标位置 */
function replaceSelection(
  view: EditorView,
  replacement: string,
  cursorOffset: number = replacement.length
) {
  const { from, to } = view.state.selection.main;
  view.dispatch({
    changes: { from, to, insert: replacement },
    selection: EditorSelection.cursor(from + cursorOffset),
  });
}

/** 包裹选区：在选中文字前后加 before/after 标记。已包裹则取消标记（toggle）。 */
function wrapSelection(
  view: EditorView,
  before: string,
  after: string,
  placeholder: string = '文本'
) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  const docLength = view.state.doc.length;

  if (selected) {
    // ---------- 有选区：先检查是否已包裹，再决定 toggle ----------

    // 策略 1：检查选区外侧相邻字符是否正好是标记
    const beforeFrom = Math.max(0, from - before.length);
    const afterTo = Math.min(docLength, to + after.length);
    const leftAdjacent = view.state.sliceDoc(beforeFrom, from);
    const rightAdjacent = view.state.sliceDoc(to, afterTo);

    if (leftAdjacent === before && rightAdjacent === after) {
      // 外侧有标记 → unwrap：删除两侧标记
      view.dispatch({
        changes: [
          { from: from - before.length, to: from },
          { from: to, to: to + after.length },
        ],
        selection: EditorSelection.range(from - before.length, to - before.length),
      });
      return;
    }

    // 策略 2：检查选区文本本身是否以标记开头/结尾
    if (selected.startsWith(before) && selected.endsWith(after) && selected.length >= before.length + after.length) {
      // 选区包含标记 → unwrap：提取内部文字
      const inner = selected.slice(before.length, selected.length - after.length);
      view.dispatch({
        changes: { from, to, insert: inner },
        selection: EditorSelection.range(from, from + inner.length),
      });
      return;
    }

    // 未包裹 → 正常包裹
    view.dispatch({
      changes: [
        { from, insert: before },
        { from: to, insert: after },
      ],
      selection: EditorSelection.range(from + before.length, to + before.length),
    });
  } else {
    // 无选区：插入占位文字并选中它
    const insert = `${before}${placeholder}${after}`;
    view.dispatch({
      changes: { from, to, insert },
      selection: EditorSelection.range(from + before.length, from + before.length + placeholder.length),
    });
  }
}

/** 在每行行首插入 prefix（支持多行选区） */
function prefixLines(view: EditorView, prefix: string) {
  const { from, to } = view.state.selection.main;
  const doc = view.state.doc;
  const fromLine = doc.lineAt(from);
  const toLine = doc.lineAt(to);

  const changes: { from: number; to: number; insert: string }[] = [];
  for (let i = fromLine.number; i <= toLine.number; i++) {
    const line = doc.line(i);
    changes.push({ from: line.from, to: line.from, insert: prefix });
  }

  view.dispatch({
    changes,
    selection: EditorSelection.cursor(to + (toLine.number - fromLine.number + 1) * prefix.length),
  });
}

// ============================================================
// 格式化命令
// ============================================================

export type FormatCommand =
  | 'bold' | 'italic' | 'strikethrough' | 'inlineCode'
  | 'heading1' | 'heading2' | 'heading3'
  | 'bulletList' | 'orderedList' | 'taskList'
  | 'blockquote' | 'codeBlock'
  | 'link' | 'image' | 'table' | 'horizontalRule';

export function executeFormat(view: EditorView | null, command: FormatCommand) {
  if (!view) return;
  view.focus();

  switch (command) {
    case 'bold': return wrapSelection(view, '**', '**', '粗体');
    case 'italic': return wrapSelection(view, '*', '*', '斜体');
    case 'strikethrough': return wrapSelection(view, '~~', '~~', '删除线');
    case 'inlineCode': return wrapSelection(view, '`', '`', '代码');
    case 'heading1': return toggleHeading(view, '# ');
    case 'heading2': return toggleHeading(view, '## ');
    case 'heading3': return toggleHeading(view, '### ');
    case 'bulletList': return prefixLines(view, '- ');
    case 'orderedList': return orderedList(view);
    case 'taskList': return prefixLines(view, '- [ ] ');
    case 'blockquote': return prefixLines(view, '> ');
    case 'codeBlock': return insertCodeBlock(view);
    case 'link': return insertLink(view);
    case 'image': return insertImage(view);
    case 'table': return insertTable(view);
    case 'horizontalRule': return insertHorizontalRule(view);
  }
}

// ============================================================
// 各命令具体实现
// ============================================================

/** 标题：切换行首的 # 前缀，已有则增加级别，最多 6 级 */
function toggleHeading(view: EditorView, prefix: string) {
  const { from, to } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const lineText = line.text;

  // 已有 # 前缀 → 替换
  const match = lineText.match(/^(#{1,6})\s/);
  if (match) {
    view.dispatch({
      changes: { from: line.from, to: line.from + match[0].length, insert: prefix },
    });
  } else {
    view.dispatch({
      changes: { from: line.from, to: line.from, insert: prefix },
    });
  }
}

/** 有序列表：支持多行自动编号 */
function orderedList(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const doc = view.state.doc;
  const fromLine = doc.lineAt(from);
  const toLine = doc.lineAt(to);

  const changes: { from: number; to: number; insert: string }[] = [];
  let num = 1;
  for (let i = fromLine.number; i <= toLine.number; i++) {
    const line = doc.line(i);
    changes.push({ from: line.from, to: line.from, insert: `${num}. ` });
    num++;
  }

  view.dispatch({
    changes,
    selection: EditorSelection.cursor(to + (toLine.number - fromLine.number + 1) * 3),
  });
}

/** 代码块 */
function insertCodeBlock(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  if (selected) {
    const lang = '';
    view.dispatch({
      changes: [
        { from, insert: `\`\`\`${lang}\n` },
        { from: to, insert: '\n```' },
      ],
      selection: EditorSelection.cursor(from + 3 + lang.length + 1),
    });
  } else {
    const insert = '\n```\n\n```\n';
    const caretPos = from + 5; // 光标在 ``` 和 ``` 之间的空行
    view.dispatch({
      changes: { from, to, insert },
      selection: EditorSelection.cursor(caretPos),
    });
  }
}

/** 链接 */
function insertLink(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  if (selected) {
    view.dispatch({
      changes: [
        { from, insert: '[' },
        { from: to, insert: '](url)' },
      ],
      selection: EditorSelection.range(to + 2, to + 5), // 选中 'url'
    });
  } else {
    const insert = '[链接文本](url)';
    view.dispatch({
      changes: { from, to, insert },
      selection: EditorSelection.range(from + 1, from + 5), // 选中 '链接文本'
    });
  }
}

/** 图片 */
function insertImage(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  if (selected) {
    view.dispatch({
      changes: [
        { from, insert: '![' },
        { from: to, insert: '](url)' },
      ],
      selection: EditorSelection.range(to + 3, to + 6), // 选中 'url'
    });
  } else {
    const insert = '![描述](url)';
    view.dispatch({
      changes: { from, to, insert },
      selection: EditorSelection.range(from + 2, from + 4), // 选中 '描述'
    });
  }
}

/** 表格 */
function insertTable(view: EditorView) {
  const table = '\n| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 内容 | 内容 | 内容 |\n';
  const { from, to } = view.state.selection.main;
  view.dispatch({
    changes: { from, to, insert: table },
    selection: EditorSelection.cursor(from + 4),
  });
}

/** 分割线 */
function insertHorizontalRule(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  // 在当前行末尾下方插入
  const insertPos = line.to;
  view.dispatch({
    changes: { from: insertPos, to: insertPos, insert: '\n---\n' },
    selection: EditorSelection.cursor(insertPos + 5),
  });
}
