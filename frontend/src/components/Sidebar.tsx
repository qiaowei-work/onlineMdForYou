import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  FileText, Folder, FolderOpen, Plus, ChevronRight, ChevronDown,
  MoreHorizontal, Pencil, Trash2, FilePlus, FolderPlus,
} from 'lucide-react';
import { useModal } from './Modal';

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
  items, onClose, anchorRef, separatorAfter = 0,
}: {
  items: { label: string; icon: typeof FileText; danger?: boolean; onClick: () => void }[];
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  separatorAfter?: number; // 在此索引后加分隔线
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
      setReady(true);
    }
  }, [anchorRef]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('click', close), 0);
    return () => document.removeEventListener('click', close);
  }, [onClose]);

  if (!ready) return null;

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-xl py-1 min-w-[150px]
                 bg-white/95 dark:bg-surface-800/95 backdrop-blur-md
                 border border-surface-200/60 dark:border-surface-600/60
                 shadow-lg shadow-black/5 dark:shadow-black/20
                 animate-[popup_0.15s_ease-out]"
      style={{ top: pos.top, left: pos.left }}
    >
      {items.map((item, i) => (
        <div key={i}>
          {i === separatorAfter && (
            <div className="border-t border-surface-200 dark:border-surface-700 my-1" />
          )}
          <button
            className={`flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-left
                       transition-colors
                       ${item.danger
                          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
                       }`}
            onClick={() => { item.onClick(); if (!item.keepOpen) onClose(); }}
          >
            <item.icon size={22} />
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 文件夹节点
// ============================================================

function FolderNode({
  folder, depth, articles, onSelect, activeId, onRefresh, onPrompt, onConfirmDlg, allFolders,
  expandedIds, onToggleExpand,
}: {
  folder: FolderData; depth: number; articles: ArticleData[];
  onSelect: (id: number) => void; activeId: number | null;
  onRefresh: () => void;
  onPrompt: (title: string, defaultValue: string, cb: (v: string) => void) => void;
  onConfirmDlg: (title: string, desc: string, cb: () => void) => void;
  allFolders: FolderData[];
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
}) {
  const expanded = expandedIds.has(folder.id);
  const [hovered, setHovered] = useState(false);
  const [menuType, setMenuType] = useState<'add' | 'more' | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renaming, setRenaming] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

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

  const handleDelete = () => {
    onConfirmDlg('删除文件夹', `确定要删除 "${folder.name}" 及其所有内容吗？`, async () => {
      await fetch(`/api/folders/${folder.id}`, { method: 'DELETE' });
      onRefresh();
    });
  };

  const handleNewFolder = () => {
    onPrompt('新建文件夹', '', async (name) => {
      if (!name.trim()) return;
      await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), parentId: folder.id }),
      });
      onRefresh();
    });
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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('drag-over'); };
  const handleDragLeave = (e: React.DragEvent) => { e.currentTarget.classList.remove('drag-over'); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    const dragData = JSON.parse(raw) as { type: string; id: number };
    if (dragData.type === 'article') {
      // 文章拖入文件夹
      await fetch(`/api/articles/${dragData.id}/move?folderId=${folder.id}`, { method: 'PUT' });
      onRefresh();
    } else if (dragData.type === 'folder' && dragData.id !== folder.id) {
      // 文件夹拖入另一个文件夹
      await fetch(`/api/folders/${dragData.id}/move?parentId=${folder.id}`, { method: 'PUT' });
      onRefresh();
    }
  };

  return (
    <div>
      {/* 文件夹行 — 三列固定布局 */}
      <div
        className="flex items-center justify-between group pr-2 cursor-pointer py-1.5"
        style={{ paddingLeft: `${depth * 24}px` }}
        draggable
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'folder', id: folder.id })); }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onToggleExpand(folder.id)}
      >
        {/* 箭头区 27px */}
        <span className="w-[27px] flex justify-center shrink-0">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
        {/* 图标区 24px */}
        <span className="w-[24px] flex justify-center shrink-0">
          {expanded
            ? <FolderOpen size={20} className="text-amber-500" />
            : <Folder size={20} className="text-amber-500" />}
        </span>
        {/* 名称 */}
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              autoFocus
              className="bg-surface-100 dark:bg-surface-700 rounded px-1.5 py-0.5 text-sm outline-none
                         border border-accent-500 w-full"
              value={renameInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setRenaming(false);
              }}
              onChange={(e) => setRenameInput(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={() => handleRename()}
            />
          ) : (
            <span className="text-sm text-surface-700 dark:text-surface-300 truncate select-none">
              {folder.name}
            </span>
          )}
        </div>

        {/* 操作按钮 — 始终占位，hover 显示 */}
        <div className={`flex items-center gap-0.5 shrink-0 transition-opacity ${hovered && !renaming ? 'opacity-100' : 'opacity-0'}`}
             onClick={(e) => e.stopPropagation()}>
          <button
            ref={addBtnRef}
            className="p-1 rounded-md hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
            onClick={() => setMenuType(menuType === 'add' ? null : 'add')}
          >
              <Plus size={22} className="text-surface-400" />
            </button>
            {/* 更多 */}
            <button
              ref={moreBtnRef}
              className="p-1 rounded-md hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
              onClick={() => setMenuType(menuType === 'more' ? null : 'more')}
            >
              <MoreHorizontal size={20} className="text-surface-400" />
            </button>
          </div>
      </div>

      {/* 新建菜单 */}
      {menuType === 'add' && (
        <PopupMenu
          anchorRef={addBtnRef}
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
          anchorRef={moreBtnRef}
          onClose={() => setMenuType(null)}
          separatorAfter={1}
          items={[
            { label: '重命名', icon: Pencil, onClick: () => { setRenameInput(folder.name); setRenaming(true); } },
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
              articles={articles} onSelect={onSelect} activeId={activeId} onRefresh={onRefresh} onPrompt={onPrompt} onConfirmDlg={onConfirmDlg} allFolders={allFolders}
              expandedIds={expandedIds} onToggleExpand={onToggleExpand}
            />
          ))}
          {folderArticles.map((a) => (
            <ArticleRow key={a.id} article={a} depth={depth + 1}
              onSelect={onSelect} activeId={activeId} onRefresh={onRefresh} onConfirmDlg={onConfirmDlg}
              folders={allFolders} />
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
  article, depth, onSelect, activeId, onRefresh, onConfirmDlg, folders,
}: {
  article: ArticleData; depth: number;
  onSelect: (id: number) => void; activeId: number | null;
  onRefresh: () => void;
  onConfirmDlg: (title: string, desc: string, cb: () => void) => void;
  folders: FolderData[];
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

  const handleDelete = () => {
    onConfirmDlg('删除文件', `确定要删除 "${article.title}" 吗？`, async () => {
      await fetch(`/api/articles/${article.id}`, { method: 'DELETE' });
      if (activeId === article.id) onSelect(-1);
      onRefresh();
    });
  };

  return (
    <div
      className="flex items-center justify-between group pr-2 cursor-pointer py-1.5"
      style={{ paddingLeft: `${depth * 24}px` }}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'article', id: article.id })); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(article.id)}
    >
      {/* 箭头区 — 空占位 */}
      <span className="w-[27px] shrink-0" />
      {/* 图标区 */}
      <span className="w-[24px] flex justify-center shrink-0">
        <FileText size={20} className="text-blue-500" />
      </span>
      {/* 名称 */}
      <div className={`min-w-0 flex-1 rounded-md px-2 cursor-pointer
                       ${activeId === article.id
                          ? 'bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-400'
                          : 'text-surface-600 dark:text-surface-400'}`}>
        {renaming ? (
          <input
            autoFocus
            className="bg-surface-100 dark:bg-surface-700 rounded px-1.5 py-0.5 text-sm outline-none
                       border border-accent-500 w-full text-surface-700 dark:text-surface-200"
            value={renameInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setRenaming(false);
            }}
            onChange={(e) => setRenameInput(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => handleRename()}
          />
        ) : (
          <span className="text-sm truncate select-none">{article.title}</span>
        )}
      </div>

      <button
        ref={moreRef}
        className={`p-1 rounded-md hover:bg-surface-200 dark:hover:bg-surface-700
                   transition-all shrink-0 ${hovered && !renaming ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
      >
        <MoreHorizontal size={20} className="text-surface-400" />
      </button>

      {menuOpen && (
        <PopupMenu
          anchorRef={moreRef}
          onClose={() => setMenuOpen(false)}
          items={[
            { label: '重命名', icon: Pencil, onClick: () => { setRenameInput(article.title); setRenaming(true); } },
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
  article, onSelect, activeId, onRefresh, onConfirmDlg, folders,
}: {
  article: ArticleData;
  onSelect: (id: number) => void; activeId: number | null; onRefresh: () => void;
  onConfirmDlg: (title: string, desc: string, cb: () => void) => void;
  folders: FolderData[];
}) {
  return (
    <ArticleRow article={article} depth={0} onSelect={onSelect} activeId={activeId}
      onRefresh={onRefresh} onConfirmDlg={onConfirmDlg} folders={folders} />
  );
}

// ============================================================
// 主组件
// ============================================================

export default function Sidebar({ onSelectArticle, activeArticleId, refreshKey }: SidebarProps) {
  const { folders, articles, loading, reload } = useData(refreshKey);
  const rootArticles = articles.filter((a) => a.folderId === 0 || a.folderId == null);
  const modal = useModal();

  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const topBtnRef = useRef<HTMLButtonElement>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openPrompt = (title: string, defaultValue: string, onConfirm: (v: string) => void) => {
    modal.open({ title, mode: 'prompt', defaultValue }, onConfirm);
  };
  const openConfirm = (title: string, description: string, onConfirm: () => void) => {
    modal.open({ title, mode: 'confirm', description, confirmLabel: '删除', danger: true }, onConfirm);
  };

  const handleNewFolder = () => {
    openPrompt('新建文件夹', '', async (name) => {
      if (!name.trim()) return;
      await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), parentId: 0 }),
      });
      reload();
    });
  };

  const handleNewFile = () => {
    openPrompt('新建文件', '未命名文档', async (title) => {
      if (!title.trim()) return;
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: '' }),
      });
      if (res.ok) {
        const data = await res.json();
        reload();
        onSelectArticle(data.data.id);
      }
    });
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-surface-200 dark:border-surface-700">
        <span className="text-[14px] font-semibold text-surface-400 uppercase tracking-wider">
          文件管理
        </span>
        <div className="relative">
          <button
            ref={topBtnRef}
            className="p-1 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            onClick={() => setTopMenuOpen(!topMenuOpen)}
          >
            <Plus size={21} className="text-surface-400" />
          </button>
          {topMenuOpen && (
            <PopupMenu
              anchorRef={topBtnRef}
              onClose={() => setTopMenuOpen(false)}
              items={[
                { label: '新建文件夹', icon: FolderPlus, onClick: handleNewFolder },
                { label: '新建文件', icon: FilePlus, onClick: handleNewFile },
              ]}
            />
          )}
        </div>
      </div>

      {/* Tree — 根目录 drop zone */}
      <div className="flex-1 overflow-y-auto py-2"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
        onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over'); }}
        onDrop={async (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('drag-over');
          const raw = e.dataTransfer.getData('text/plain');
          if (!raw) return;
          const dragData = JSON.parse(raw) as { type: string; id: number };
          if (dragData.type === 'article') {
            await fetch(`/api/articles/${dragData.id}/move?folderId=0`, { method: 'PUT' });
            reload();
          } else if (dragData.type === 'folder') {
            await fetch(`/api/folders/${dragData.id}/move?parentId=0`, { method: 'PUT' });
            reload();
          }
        }}
      >
        {loading ? (
          <div className="px-4 py-8 text-xs text-surface-400 text-center">加载中...</div>
        ) : (
          <>
            {folders.map((f) => (
              <FolderNode
                key={f.id} folder={f} depth={0}
                articles={articles} onSelect={onSelectArticle}
                activeId={activeArticleId} onRefresh={reload}
                onPrompt={openPrompt} onConfirmDlg={openConfirm}
                allFolders={folders}
                expandedIds={expandedIds} onToggleExpand={toggleExpand}
              />
            ))}
            {rootArticles.map((a) => (
              <RootArticleRow
                key={a.id} article={a}
                onSelect={onSelectArticle} activeId={activeArticleId}
                onRefresh={reload} onConfirmDlg={openConfirm} folders={folders}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-surface-200 dark:border-surface-700 px-3 py-2">
        <button className="flex items-center gap-2 w-full px-2 py-1.5 text-[14px] text-surface-400
                           hover:text-surface-600 dark:hover:text-surface-300 rounded-md
                           hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
          <Trash2 size={18} />
          <span>回收站</span>
        </button>
      </div>
    </div>
  );
}
