/**
 * 格式化命令类型 — 被 Toolbar 和 MilkdownEditor 共用
 */
export type FormatCommand =
  | 'bold' | 'italic' | 'strikethrough' | 'inlineCode'
  | 'paragraph'
  | 'heading1' | 'heading2' | 'heading3'
  | 'bulletList' | 'orderedList'
  | 'blockquote' | 'codeBlock' | 'math'
  | 'link' | 'image' | 'table' | 'horizontalRule'
  | 'emoji';
