/**
 * 表格工具栏 — 鼠标移到表格上方时显示行列操作按钮
 */
import type { EditorView } from '@milkdown/prose/view';

interface ToolbarState {
  toolbar: HTMLElement;
  targetTable: HTMLElement | null;
  container: HTMLElement;
}

function createToolbar(container: HTMLElement, onCmd: (name: string) => void): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'table-toolbar';
  bar.innerHTML = `
    <span class="table-toolbar-label">表格</span>
  `;

  const btn = (text: string, title: string, cmd: string, cls = '') => {
    const b = document.createElement('button');
    b.textContent = text;
    b.title = title;
    b.className = `table-toolbar-btn ${cls}`;
    b.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onCmd(cmd);
    });
    return b;
  };

  bar.appendChild(btn('+↥', '上方插入行', 'AddRowBefore'));
  bar.appendChild(btn('+↧', '下方插入行', 'AddRowAfter'));
  bar.appendChild(btn('+↤', '左侧插入列', 'AddColBefore'));
  bar.appendChild(btn('+↦', '右侧插入列', 'AddColAfter'));
  bar.appendChild(btn('−行', '删除此行', 'del-row', 'del'));
  bar.appendChild(btn('−列', '删除此列', 'del-col', 'del'));

  bar.style.display = 'none';
  container.appendChild(bar);
  return bar;
}

function positionToolbar(bar: HTMLElement, table: HTMLElement, container: HTMLElement) {
  const tableRect = table.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  bar.style.display = 'flex';
  bar.style.position = 'absolute';
  bar.style.top = `${tableRect.top - containerRect.top - 36}px`;
  bar.style.left = `${tableRect.left - containerRect.left}px`;
}

export function setupTableHandles(
  container: HTMLElement,
  getView: () => EditorView | undefined,
  callCmd: (name: string) => boolean,
) {
  // 创建删除按钮时需要选择对应行列的命令
  function handleCmd(name: string) {
    const view = getView();
    if (!view) return;
    view.focus();

    if (name === 'del-row') {
      callCmd('SelectRow');
      setTimeout(() => callCmd('DeleteSelectedCells'), 10);
    } else if (name === 'del-col') {
      callCmd('SelectCol');
      setTimeout(() => callCmd('DeleteSelectedCells'), 10);
    } else {
      callCmd(name);
    }
  }

  const toolbar = createToolbar(container, handleCmd);
  let currentTable: HTMLElement | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  // 稳定的 handler 引用（只创建一次，避免重复 addEventListener 导致内存泄漏）
  const toolbarMouseEnter = () => {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  };
  const toolbarMouseLeave = () => { hide(); };

  // 初始化时绑定一次
  toolbar.addEventListener('mouseenter', toolbarMouseEnter);
  toolbar.addEventListener('mouseleave', toolbarMouseLeave);

  function show(table: HTMLElement) {
    if (currentTable === table) return;
    currentTable = table;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    positionToolbar(toolbar, table, container);
  }

  function hide() {
    hideTimer = setTimeout(() => {
      toolbar.style.display = 'none';
      currentTable = null;
    }, 300);
  }

  function onMouseMove(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const table = target.closest('.ProseMirror table');
    if (table instanceof HTMLElement) {
      show(table);
    } else if (currentTable && !(e.target as HTMLElement).closest('.table-toolbar')) {
      hide();
    }
  }

  function onScroll() {
    if (currentTable) positionToolbar(toolbar, currentTable, container);
  }

  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('scroll', onScroll);

  return {
    destroy() {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('scroll', onScroll);
      toolbar.removeEventListener('mouseenter', toolbarMouseEnter);
      toolbar.removeEventListener('mouseleave', toolbarMouseLeave);
      toolbar.remove();
    },
  };
}
