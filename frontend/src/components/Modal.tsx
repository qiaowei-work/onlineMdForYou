import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from 'react';

// ============================================================
// Context
// ============================================================

interface ModalConfig {
  title: string;
  mode: 'prompt' | 'confirm';
  description?: string;
  defaultValue?: string;
  confirmLabel?: string;
  danger?: boolean;
}

type ModalCallback = (value?: string) => void;

interface ModalCtx {
  open: (c: ModalConfig, cb: ModalCallback) => void;
}

const ModalContext = createContext<ModalCtx>({ open: () => {} });

export function useModal() {
  return useContext(ModalContext);
}

// ============================================================
// Provider
// ============================================================

export function ModalProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ModalConfig | null>(null);
  const cbRef = useRef<ModalCallback | null>(null);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const open = useCallback((c: ModalConfig, cb: ModalCallback) => {
    cbRef.current = cb;
    setConfig(c);
    setValue('');
    // 延迟聚焦（等 DOM 渲染完）
    if (c.mode === 'prompt') {
      setTimeout(() => {
        setValue(c.defaultValue ?? '');
        inputRef.current?.focus();
      }, 50);
    }
  }, []);

  const close = useCallback(() => {
    setConfig(null);
    cbRef.current = null;
  }, []);

  useEffect(() => {
    if (!config) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter' && config.mode === 'prompt') {
        cbRef.current?.(value);
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [config, value, close]);

  const handleConfirm = () => {
    if (config?.mode === 'prompt') {
      cbRef.current?.(value);
    } else {
      cbRef.current?.();
    }
    close();
  };

  return (
    <ModalContext.Provider value={{ open }}>
      {children}
      {config && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center
                     bg-black/20 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl
                       border border-surface-200 dark:border-surface-700
                       w-full max-w-sm mx-4 overflow-hidden
                       animate-[popup_0.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-1">
              <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">
                {config.title}
              </h3>
              {config.description && (
                <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
                  {config.description}
                </p>
              )}
            </div>

            {config.mode === 'prompt' && (
              <div className="px-6 py-3">
                <input
                  ref={inputRef}
                  className="w-full bg-surface-100 dark:bg-surface-900
                             border-2 border-surface-200 dark:border-surface-700
                             rounded-lg px-3 py-2 text-sm
                             text-surface-800 dark:text-surface-200
                             outline-none focus:border-accent-500 transition-colors"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="输入名称..."
                />
              </div>
            )}

            <div className="flex justify-end gap-2 px-6 pb-5 pt-2">
              <button
                className="px-4 py-2 text-sm font-medium rounded-lg
                           text-surface-600 dark:text-surface-400
                           hover:bg-surface-100 dark:hover:bg-surface-700
                           transition-colors"
                onClick={close}
              >
                取消
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors
                           ${config.danger
                              ? 'bg-red-500 hover:bg-red-600'
                              : 'bg-accent-600 hover:bg-accent-700'
                           }`}
                onClick={handleConfirm}
              >
                {config.confirmLabel ?? (config.danger ? '删除' : '确定')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}
