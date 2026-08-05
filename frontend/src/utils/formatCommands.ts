/**
 * 格式化命令类型 — 被 Toolbar 和 MilkdownEditor 共用
 */
export type FormatCommand =
  | 'bold' | 'italic' | 'strikethrough' | 'inlineCode'
  | 'heading1' | 'heading2' | 'heading3'
  | 'bulletList' | 'orderedList' | 'taskList'
  | 'blockquote' | 'codeBlock'
  | 'link' | 'image' | 'table' | 'horizontalRule';
