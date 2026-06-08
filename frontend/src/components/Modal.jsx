// ============================================================
// Modal Component
// Reusable modal dialog with overlay
// ============================================================
import { useEffect } from 'react';
import { X } from 'lucide-react';
export default function Modal({ isOpen, onClose, title, children, size = 'md', showClose = true, }) {
    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);
    if (!isOpen)
        return null;
    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    };
    return (<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}/>

      {/* Modal content */}
      <div className={`
          relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size]}
          animate-fade-in transform
        `} onClick={e => e.stopPropagation()}>
        {/* Header */}
        {(title || showClose) && (<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            {title && (<h3 className="text-lg font-semibold text-gray-800">{title}</h3>)}
            {showClose && (<button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 ml-auto">
                <X size={20}/>
              </button>)}
          </div>)}

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>);
}
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'info', }) {
    const colors = {
        danger: 'bg-red-600 hover:bg-red-700',
        warning: 'bg-orange-600 hover:bg-orange-700',
        info: 'bg-[#0f4c81] hover:bg-[#0a3d6a]',
    };
    return (<Modal isOpen={isOpen} onClose={onClose} size="sm" showClose={false}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
            {cancelText}
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 py-2.5 text-white rounded-xl font-medium ${colors[type]}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>);
}
