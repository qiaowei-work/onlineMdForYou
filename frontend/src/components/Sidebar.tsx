import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, Folder, FolderOpen, Plus, ChevronRight, ChevronDown,
  MoreHorizontal, Pencil, Trash2, FilePlus, FolderPlus,
} from 'lucide-react';

// ============================================================
// 类型
// ============================================================

interface FolderData {
  id: number;
  name: string;
  parentId: number;
  children: FolderData[];
}

interface ArticleData {
  id: number;
  title: string;
  folderId: number;
  updatedAt: string;
}

interface SidebarProps {
  onSelectArticle: (id: number) => void;
  activeArticleId: number | null;
  refreshKey: number; // 外部触发的刷新信号
}

// ============================================================
// Hook: 数据加载
// ============================================================

function useData(refreshKey: number) {
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, aRes] = await Promise.all([
        fetch('/api/folders/tree'),
        fetch('/api/articles'),
      ]);
      if (fRes.ok) setFolders((await fRes.json()).data ?? []);
      if (aRes.ok) setArticles((await aRes.json()).data ?? []);
    } catch { /* API not available yet */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  return { folders, articles, loading, reload: load };
}

// ============================================================
// 下拉菜单组件
// ============================================================

function PopupMenu({
  items, onClose, pos,
}: {
  items: { label: string; icon: typeof FileText; danger?: boolean; onClick: () => void }[];
  onClose: () => void;
  pos: { top: number; left: number };
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('click', close), 0);
    return () => document.removeEventListener('click', close);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-white dark:bg-surface-800 border border-surface-200
                 dark:border-surface-600 rounded-lg shadow-xl py-1 min-w-[140px]"
      style={{ top: pos.top, left: pos.left }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left
                     hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors
                     ${item.danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-surface-700 dark:text-surface-300'}`}
          onClick={() => { item.onClick(); onClose(); }}
        >
          <item.icon size={14} />
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// 文件夹节点
// ============================================================

function FolderNode({
  folder, depth, articles, onSelect, activeId, onRefresh,
}: {
  folder: FolderData; depth: number; articles: ArticleData[];
  onSelect: (id: number) => void; activeId: number | null;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [menuType, setMenuType] = useState<'add' | 'more' | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renaming, setRenaming] = useState(false);
  const menuBtnRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const folderArticles = articles.filter((a) => a.folderId === folder.id);

  const handleRename = async () => {
    if (!renameInput.trim()) return;
    await fetch(`/api/folders/${folder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameInput.trim() }),
    });
    setRenaming(false);
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm(`确定要删除文件夹"${folder.name}"及其所有内容吗？`)) return;
    await fetch(`/api/folders/${folder.id}`, { method: 'DELETE' });
    onRefresh();
  };

  const handleNewFolder = async () => {
    const name = prompt('请输入文件夹名称：');
    if (!name?.trim()) return;
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), parentId: folder.id }),
    });
    onRefresh();
  };

  const handleNewFile = async () => {
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '未命名文档', folderId: folder.id, content: '' }),
    });
    if (res.ok) {
      const data = await res.json();
      onRefresh();
      onSelect(data.data.id);
    }
  };

  const menuBtnPos = (key: string) => {
    const el = menuBtnRef.current[key];
    if (!el) return { top: 0, left: 0 };
    const rect = el.getBoundingClientRect();
    return { top: rect.bottom - rect.top + 4, left: rect.width / 2 };
  };

  return (
    <div>
      {/* 文件夹行 */}
      <div
        className="flex items-center justify-between group pr-2 cursor-pointer"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5 py-1.5 min-w-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {expanded
            ? <FolderOpen size={15} className="text-amber-500 shrink-0" />
            : <Folder size={15} className="text-amber-500 shrink-0" />}
          {renaming ? (
            <input
              autoFocus
              className="bg-surface-100 dark:bg-surface-700 rounded px-1.5 py-0.5 text-sm outline-none
                         border border-accent-500 w-full"
              defaultValue={folder.name}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setRenaming(false);
              }}
              onChange={(e) => setRenameInput(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={() => setRenaming(false)}
            />
          ) : (
            <span className="text-sm text-surface-700 dark:text-surface-300 truncate select-none">
              {folder.name}
            </span>
          )}
        </div>

        {/* 操作按钮 — hover 显示 */}
        {hovered && !renaming && (
          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* 新建 */}
            <button
              ref={(el) => { menuBtnRef.current.add = el; }}
              className="p-1 rounded-md hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
              onClick={() => setMenuType(menuType === 'add' ? null : 'add')}
            >
              <Plus size={13} className="text-surface-400" />
            </button>
            {/* 更多 */}
            <button
              ref={(el) => { menuBtnRef.current.more = el; }}
              className="p-1 rounded-md hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
              onClick={() => setMenuType(menuType === 'more' ? null : 'more')}
            >
              <MoreHorizontal size={13} className="text-surface-400" />
            </button>
          </div>
        )}
      </div>

      {/* 新建菜单 */}
      {menuType === 'add' && (
        <PopupMenu
          pos={menuBtnPos('add')}
          onClose={() => setMenuType(null)}
          items={[
            { label: '新建文件夹', icon: FolderPlus, onClick: handleNewFolder },
            { label: '新建文件', icon: FilePlus, onClick: handleNewFile },
          ]}
        />
      )}

      {/* 更多菜单 */}
      {menuType === 'more' && (
        <PopupMenu
          pos={menuBtnPos('more')}
          onClose={() => setMenuType(null)}
          items={[
            { label: '重命名', icon: Pencil, onClick: () => { setRenaming(true); } },
            { label: '删除', icon: Trash2, danger: true, onClick: handleDelete },
          ]}
        />
      )}

      {/* 子内容 */}
      {expanded && (
        <div>
          {folder.children.map((child) => (
            <FolderNode
              key={child.id} folder={child} depth={depth + 1}
              articles={articles} onSelect={onSelect} activeId={activeId} onRefresh={onRefresh}
            />
          ))}
          {folderArticles.map((a) => (
            <ArticleRow key={a.id} article={a} depth={depth + 1}
              onSelect={onSelect} activeId={activeId} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 文章行
// ============================================================

function ArticleRow({
  article, depth, onSelect, activeId, onRefresh,
}: {
  article: ArticleData; depth: number;
  onSelect: (id: number) => void; activeId: number | null;
  onRefresh: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const moreRef = useRef<HTMLButtonElement>(null);

  const handleRename = async () => {
    if (!renameInput.trim()) return;
    await fetch(`/api/articles/${article.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: renameInput.trim() }),
    });
    setRenaming(false);
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm(`确定要删除"${article.title}"吗？`)) return;
    await fetch(`/api/articles/${article.id}`, { method: 'DELETE' });
    if (activeId === article.id) onSelect(0);
    onRefresh();
  };

  const menuPos = () => {
    if (!moreRef.current) return { top: 0, left: 0 };
    const rect = moreRef.current.getBoundingClientRect();
    return { top: rect.bottom - rect.top + 4, left: 0 };
  };

  return (
    <div
      className="flex items-center justify-between group pr-2"
      style={{ paddingLeft: `${8 + depth * 16 + 0}px` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(article.id)}
    >
      <div className={`flex items-center gap-1.5 py-1.5 min-w-0 rounded-md px-2 cursor-pointer
                       ${activeId === article.id
                          ? 'bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-400'
                          : 'text-surface-600 dark:text-surface-400'}`}>
        <FileText size={15} className="text-blue-500 shrink-0" />
        {renaming ? (
          <input
            autoFocus
            className="bg-surface-100 dark:bg-surface-700 rounded px-1.5 py-0.5 text-sm outline-none
                       border border-accent-500 w-full text-surface-700 dark:text-surface-200"
            defaultValue={article.title}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setRenaming(false);
            }}
            onChange={(e) => setRenameInput(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => setRenaming(false)}
          />
        ) : (
          <span className="text-sm truncate select-none">{article.title}</span>
        )}
      </div>

      {hovered && !renaming && (
        <button
          ref={moreRef}
          className="p-1 rounded-md hover:bg-surface-200 dark:hover:bg-surface-700
                     transition-colors shrink-0"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
        >
          <MoreHorizontal size={13} className="text-surface-400" />
        </button>
      )}

      {menuOpen && (
        <PopupMenu
          pos={menuPos()}
          onClose={() => setMenuOpen(false)}
          items={[
            { label: '重命名', icon: Pencil, onClick: () => { setRenaming(true); } },
            { label: '删除', icon: Trash2, danger: true, onClick: handleDelete },
          ]}
        />
      )}
    </div>
  );
}

// ============================================================
// 根目录文章
// ============================================================

function RootArticleRow({
  article, onSelect, activeId, onRefresh,
}: {
  article: ArticleData;
  onSelect: (id: number) => void; activeId: number | null; onRefresh: () => void;
}) {
  return (
    <ArticleRow article={article} depth={0} onSelect={onSelect} activeId={activeId} onRefresh={onRefresh} />
  );
}

// ============================================================
// 主组件
// ============================================================

export default function Sidebar({ onSelectArticle, activeArticleId, refreshKey }: SidebarProps) {
  const { folders, articles, loading, reload } = useData(refreshKey);
  const rootArticles = articles.filter((a) => a.folderId === 0 || a.folderId == null);

  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const topBtnRef = useRef<HTMLButtonElement>(null);

  const handleNewFolder = async () => {
    const name = prompt('请输入文件夹名称：');
    if (!name?.trim()) return;
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), parentId: 0 }),
    });
    reload();
  };

  const handleNewFile = async () => {
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '未命名文档', content: '' }),
    });
    if (res.ok) {
      const data = await res.json();
      reload();
      onSelectArticle(data.data.id);
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-surface-200 dark:border-surface-700">
        <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
          文件管理
        </span>
        <div className="relative">
          <button
            ref={topBtnRef}
            className="p-1 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            onClick={() => setTopMenuOpen(!topMenuOpen)}
          >
            <Plus size={14} className="text-surface-400" />
          </button>
          {topMenuOpen && (
            <PopupMenu
              pos={{ top: 24, left: topBtnRef.current?.getBoundingClientRect().right
                ? -120 : 0 }}
              onClose={() => setTopMenuOpen(false)}
              items={[
                { label: '新建文件夹', icon: FolderPlus, onClick: handleNewFolder },
                { label: '新建文件', icon: FilePlus, onClick: handleNewFile },
              ]}
            />
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-4 py-8 text-xs text-surface-400 text-center">加载中...</div>
        ) : (
          <>
            {folders.map((f) => (
              <FolderNode
                key={f.id} folder={f} depth={0}
                articles={articles} onSelect={onSelectArticle}
                activeId={activeArticleId} onRefresh={reload}
              />
            ))}
            {rootArticles.map((a) => (
              <RootArticleRow
                key={a.id} article={a}
                onSelect={onSelectArticle} activeId={activeArticleId}
                onRefresh={reload}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-surface-200 dark:border-surface-700 px-3 py-2">
        <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-surface-400
                           hover:text-surface-600 dark:hover:text-surface-300 rounded-md
                           hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
          <Trash2 size={12} />
          <span>回收站</span>
        </button>
      </div>
    </div>
  );
}
