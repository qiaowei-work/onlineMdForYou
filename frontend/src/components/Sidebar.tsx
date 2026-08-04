import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Search,
  Clock,
  Star,
  Trash2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileItem[];
}

const defaultFiles: FileItem[] = [
  {
    id: '1',
    name: '我的文档',
    type: 'folder',
    children: [
      { id: '2', name: '快速上手.md', type: 'file' },
      { id: '3', name: '项目规划.md', type: 'file' },
      { id: '4', name: 'API 文档.md', type: 'file' },
    ],
  },
  {
    id: '5',
    name: '技术笔记',
    type: 'folder',
    children: [
      { id: '6', name: 'Java 笔记.md', type: 'file' },
      { id: '7', name: 'React 学习.md', type: 'file' },
      { id: '8', name: 'Docker 部署.md', type: 'file' },
    ],
  },
  { id: '9', name: '关于项目.md', type: 'file' },
];

function FileTreeNode({ item, depth = 0 }: { item: FileItem; depth?: number }) {
  const [expanded, setExpanded] = useState(true);

  if (item.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full px-3 py-1.5 text-sm text-surface-600 dark:text-surface-400
                     hover:bg-surface-100 dark:hover:bg-surface-800 rounded-md transition-colors duration-150"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {expanded ? <FolderOpen size={14} className="text-amber-500" /> : <Folder size={14} className="text-amber-500" />}
          <span className="truncate">{item.name}</span>
        </button>
        {expanded && item.children?.map((child) => (
          <FileTreeNode key={child.id} item={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <button
      className="flex items-center gap-1.5 w-full px-3 py-1.5 text-sm text-surface-600 dark:text-surface-400
                 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-md transition-colors duration-150 text-left"
      style={{ paddingLeft: `${12 + depth * 16 + 20}px` }}
    >
      <FileText size={14} className="text-blue-500 shrink-0" />
      <span className="truncate">{item.name}</span>
    </button>
  );
}

export default function Sidebar() {
  return (
    <div className="h-full flex flex-col">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-surface-200 dark:border-surface-700">
        <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
          文件管理
        </span>
        <div className="flex items-center gap-1">
          <button className="p-1 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <Search size={14} className="text-surface-400" />
          </button>
          <button className="p-1 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <Plus size={14} className="text-surface-400" />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {defaultFiles.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
          >
            <FileTreeNode item={item} />
          </motion.div>
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="border-t border-surface-200 dark:border-surface-700 px-3 py-2">
        <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-surface-400
                           hover:text-surface-600 dark:hover:text-surface-300 rounded-md
                           hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
          <Clock size={12} />
          <span>最近打开</span>
        </button>
        <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-surface-400
                           hover:text-surface-600 dark:hover:text-surface-300 rounded-md
                           hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
          <Star size={12} />
          <span>收藏文档</span>
        </button>
        <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-surface-400
                           hover:text-red-500 rounded-md
                           hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
          <Trash2 size={12} />
          <span>回收站</span>
        </button>
      </div>
    </div>
  );
}
