// ui/src/components/Toast.jsx
import { useEffect } from "react";

export default function Toast({ toasts, remove }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => <ToastItem key={t.id} toast={t} remove={remove} />)}
    </div>
  );
}

function ToastItem({ toast, remove }) {
  useEffect(() => {
    const timer = setTimeout(() => remove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, remove]);
  return (
    <div className={`toast ${toast.type}`} onClick={() => remove(toast.id)}>
      {toast.type === "ok" ? "✓ " : "✕ "}{toast.msg}
    </div>
  );
}
