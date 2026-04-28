import React, { useEffect } from 'react';
import '../styles/Toast.css';

/**
 * Single toast notification. Auto-dismisses after `duration` ms.
 */
function Toast({ id, message, type = 'info', onDismiss, duration = 3500 }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div className={`toast toast-${type}`} role="alert">
      <span className="toast-icon">
        {type === 'success' && '✅'}
        {type === 'error' && '❌'}
        {type === 'info' && 'ℹ️'}
      </span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={() => onDismiss(id)}>✕</button>
    </div>
  );
}

/**
 * Container that renders all active toasts.
 * Place this once at the top level of your app.
 */
export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <Toast key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export default Toast;
