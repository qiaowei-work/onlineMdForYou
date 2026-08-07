import {
  Bold,
  Italic,
  Strikethrough,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  Link,
  Image,
  Table,
  Minus,
} from 'lucide-react';
import type { FormatCommand } from '../utils/formatCommands';

interface ToolbarProps {
  onFormat: (cmd: FormatCommand) => void;
}

const tools: { icon: typeof Bold; label: string; cmd: FormatCommand; tip: string }[] = [
  { icon: Bold, label: '粗体', cmd: 'bold', tip: 'Ctrl+B' },
  { icon: Italic, label: '斜体', cmd: 'italic', tip: 'Ctrl+I' },
  { icon: Strikethrough, label: '删除线', cmd: 'strikethrough', tip: 'Ctrl+Shift+X' },
  { icon: Code, label: '行内代码', cmd: 'inlineCode', tip: '' },
  { icon: Link, label: '链接', cmd: 'link', tip: 'Ctrl+K' },
  { icon: Image, label: '图片', cmd: 'image', tip: '' },
];

const headings: { icon: typeof Heading1; label: string; cmd: FormatCommand; tip: string }[] = [
  { icon: Type, label: '正文', cmd: 'paragraph', tip: '' },
  { icon: Heading1, label: '一级标题', cmd: 'heading1', tip: '' },
  { icon: Heading2, label: '二级标题', cmd: 'heading2', tip: '' },
  { icon: Heading3, label: '三级标题', cmd: 'heading3', tip: '' },
];

const blocks: { icon: typeof List; label: string; cmd: FormatCommand; tip: string }[] = [
  { icon: List, label: '无序列表', cmd: 'bulletList', tip: 'Ctrl+Shift+U' },
  { icon: ListOrdered, label: '有序列表', cmd: 'orderedList', tip: 'Ctrl+Shift+O' },
  { icon: Quote, label: '引用', cmd: 'blockquote', tip: '' },
  { icon: Code2, label: '代码块', cmd: 'codeBlock', tip: 'Ctrl+Shift+K' },
  { icon: Table, label: '表格', cmd: 'table', tip: '' },
  { icon: Minus, label: '分割线', cmd: 'horizontalRule', tip: '' },
];

function ToolButton({ icon: Icon, label, tip, onClick }: {
  icon: typeof Bold;
  label: string;
  tip: string;
  onClick: () => void;
}) {
  const fullTip = tip ? `${label} (${tip})` : label;

  return (
    <button
      onClick={onClick}
      className="group relative p-2.5 rounded-md text-surface-500 dark:text-surface-400
                 hover:text-surface-700 dark:hover:text-surface-200
                 hover:bg-surface-100 dark:hover:bg-surface-800
                 transition-all duration-150 shrink-0"
      title={fullTip}
    >
      <Icon size={24} />
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1
                    bg-surface-800 dark:bg-surface-200 text-white dark:text-surface-800
                    text-xs rounded-md opacity-0 group-hover:opacity-100
                    transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
        {label}
        {tip && <span className="ml-1 text-surface-400 dark:text-surface-500">{tip}</span>}
      </div>
    </button>
  );
}

export default function Toolbar({ onFormat }: ToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 bg-surface-50/80 dark:bg-surface-950/80
                    border-b border-surface-200 dark:border-surface-700 overflow-x-auto shrink-0">
      {/* 行内格式 */}
      {tools.map((t) => (
        <ToolButton key={t.cmd} icon={t.icon} label={t.label} tip={t.tip} onClick={() => onFormat(t.cmd)} />
      ))}

      <div className="w-px h-5 bg-surface-200 dark:bg-surface-700 mx-1 shrink-0" />

      {/* 标题 */}
      {headings.map((t) => (
        <ToolButton key={t.cmd} icon={t.icon} label={t.label} tip={t.tip} onClick={() => onFormat(t.cmd)} />
      ))}

      <div className="w-px h-5 bg-surface-200 dark:bg-surface-700 mx-1 shrink-0" />

      {/* 块级元素 */}
      {blocks.map((t) => (
        <ToolButton key={t.cmd} icon={t.icon} label={t.label} tip={t.tip} onClick={() => onFormat(t.cmd)} />
      ))}
    </div>
  );
}
