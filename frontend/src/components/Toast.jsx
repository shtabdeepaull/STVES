// ============================================================
// Toast Notification Component
// Shows temporary notifications for user feedback
// ============================================================
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
export function Toast({ id, type, message, duration = 4000, onClose }) {
    const [isExiting, setIsExiting] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onClose(id), 300);
        }, duration);
        return () => clearTimeout(timer);
    }, [id, duration, onClose]);
    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onClose(id), 300);
    };
    const icons = {
        success: <CheckCircle size={20}/>,
        error: <XCircle size={20}/>,
        warning: <AlertTriangle size={20}/>,
        info: <Info size={20}/>,
    };
    const colors = {
        success: 'bg-green-50 border-green-200 text-green-700',
        error: 'bg-red-50 border-red-200 text-red-700',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        info: 'bg-blue-50 border-blue-200 text-blue-700',
    };
    const iconColors = {
        success: 'text-green-500',
        error: 'text-red-500',
        warning: 'text-yellow-500',
        info: 'text-blue-500',
    };
    return (<div className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg
        ${colors[type]}
        ${isExiting ? 'animate-slide-out' : 'animate-slide-in'}
      `} style={{
            animation: isExiting
                ? 'slideOut 0.3s ease-in forwards'
                : 'slideIn 0.3s ease-out forwards',
        }}>
      <span className={iconColors[type]}>{icons[type]}</span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button onClick={handleClose} className="p-1 hover:bg-black/5 rounded-lg">
        <X size={16}/>
      </button>
    </div>);
}
export function useToast() {
    const [toasts, setToasts] = useState([]);
    const addToast = (type, message) => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, type, message }]);
    };
    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };
    const success = (message) => addToast('success', message);
    const error = (message) => addToast('error', message);
    const warning = (message) => addToast('warning', message);
    const info = (message) => addToast('info', message);
    return { toasts, removeToast, success, error, warning, info };
}
export function ToastContainer({ toasts, onRemove }) {
    return (<div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(toast => (<Toast key={toast.id} id={toast.id} type={toast.type} message={toast.message} onClose={onRemove}/>))}
    </div>);
}
