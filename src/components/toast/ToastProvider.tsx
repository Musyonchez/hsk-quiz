"use client";

// New infrastructure (docs/57-saved-words-plan.md §7) — grepped the whole
// codebase before starting this, there is no toast/notification component
// anywhere else to reuse. Kept deliberately small: plain Tailwind + a Lucide
// X, no new dependency, matching this repo's consistent bias against
// pulling in a library for something this contained (see SpeakerButton's own
// lazy-import comment for the same instinct elsewhere).
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ToastAction = { label: string; onClick: () => void };
type ToastInput = { message: string; action?: ToastAction };
type Toast = ToastInput & { id: number };

type ToastContextValue = {
  show: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// Auto-dismiss timing — docs/57's "Open questions" flagged this as
// unconfirmed; 4.5s split the difference between the proposed 4-5s range.
const AUTO_DISMISS_MS = 4500;

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Portaled to document.body (see LogoutButton.tsx for the identical
  // backdrop-filter containing-block reasoning) — only renders after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((toast: ToastInput) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDismiss is a stable per-toast closure (dismiss(toast.id)), not state this effect needs to resync on
  }, []);

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-border bg-surface py-3 pl-4 pr-3 text-sm shadow-lg shadow-background/50"
    >
      <span>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className="font-semibold text-accent hover:text-accent-hover"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
