/**
 * Typora 风格公式块 NodeView — 纯 DOM 实现
 * 编辑/预览双模式：点击外部只显示公式，点击公式进入编辑
 */
import katex from 'katex';
import type { Node } from '@milkdown/prose/model';
import type { EditorView } from '@milkdown/prose/view';

export class MathBlockNodeView {
  dom: HTMLElement;
  private card: HTMLElement;
  private preview: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private getPos: () => number;
  private view: EditorView;
  private editing = true;
  private onDocClick: ((e: MouseEvent) => void) | null = null;

  constructor(node: Node, view: EditorView, getPos: () => number) {
    this.getPos = getPos;
    this.view = view;

    const card = document.createElement('div');
    card.className = 'math-block-card';
    card.setAttribute('contenteditable', 'false');
    this.card = card;

    // LaTeX 编辑区
    const textarea = document.createElement('textarea');
    textarea.className = 'math-block-input';
    textarea.rows = 2;
    textarea.value = node.attrs?.value ?? '';
    this.textarea = textarea;

    textarea.addEventListener('input', () => {
      this.renderPreview(textarea.value);
    });

    const blocker = (e: Event) => { e.stopPropagation(); e.stopImmediatePropagation(); };
    textarea.addEventListener('keydown', blocker, true);
    textarea.addEventListener('keyup', blocker, true);
    textarea.addEventListener('keypress', blocker, true);
    textarea.addEventListener('mousedown', blocker, true);
    textarea.addEventListener('click', blocker, true);
    textarea.addEventListener('paste', blocker, true);
    textarea.addEventListener('cut', blocker, true);
    card.appendChild(textarea);

    // KaTeX 预览区 — 点击进入编辑
    const preview = document.createElement('div');
    preview.className = 'math-block-preview';
    preview.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.enterEdit();
    }, true);
    preview.addEventListener('mouseup', blocker, true);
    this.preview = preview;
    card.appendChild(preview);

    // 不需要 contentDOM — 公式内容存在 attrs.value 中

    this.renderPreview(textarea.value);
    this.dom = card;

    // 点击外部 → 退出编辑
    this.onDocClick = (e: MouseEvent) => {
      if (!card.contains(e.target as Node)) {
        this.exitEdit();
      }
    };
    document.addEventListener('mousedown', this.onDocClick, true);
  }

  private enterEdit() {
    if (this.editing) return;
    this.editing = true;
    this.textarea.style.display = '';
    this.card.classList.remove('math-block-card-preview');
    this.textarea.focus();
  }

  private exitEdit() {
    if (!this.editing) return;
    this.editing = false;
    this.textarea.style.display = 'none';
    this.card.classList.add('math-block-card-preview');
    // 退出时保存值
    const pos = this.getPos();
    const tr = this.view.state.tr.setNodeAttribute(pos, 'value', this.textarea.value);
    this.view.dispatch(tr);
  }

  private renderPreview(value: string) {
    if (!value) {
      this.preview.innerHTML = '';
      return;
    }
    try {
      katex.render(value, this.preview, {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      this.preview.textContent = value;
    }
  }

  private syncValue(value: string) {
    const pos = this.getPos();
    const tr = this.view.state.tr.setNodeAttribute(pos, 'value', value);
    this.view.dispatch(tr);
  }

  update(node: Node) {
    if (node.attrs.value !== this.textarea.value) {
      this.textarea.value = node.attrs?.value ?? '';
      this.renderPreview(this.textarea.value);
    }
    return true;
  }

  ignoreMutation() { return true; }

  destroy() {
    if (this.onDocClick) {
      document.removeEventListener('mousedown', this.onDocClick, true);
    }
  }
}
