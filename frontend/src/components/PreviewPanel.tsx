import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';

interface PreviewPanelProps {
  markdown: string;
}

export default function PreviewPanel({ markdown }: PreviewPanelProps) {
  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-100/50 dark:bg-surface-900/50 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-surface-400" />
          <span className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
            预览
          </span>
        </div>
      </div>

      {/* Preview Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 overflow-y-auto p-6"
      >
        <div className="prose-preview max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdown}
          </ReactMarkdown>
        </div>
      </motion.div>
    </div>
  );
}
