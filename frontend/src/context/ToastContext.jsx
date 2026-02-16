import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import '../styles/toast.css';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', title = '') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, title }]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={20} className="toast-icon" />;
            case 'error': return <AlertCircle size={20} className="toast-icon" />;
            default: return <Info size={20} className="toast-icon" />;
        }
    };

    const getTitle = (toast) => {
        if (toast.title) return toast.title;
        switch (toast.type) {
            case 'success': return 'Success';
            case 'error': return 'Error';
            default: return 'Information';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        {getIcon(toast.type)}
                        <div className="toast-content">
                            <div className="toast-title">{getTitle(toast)}</div>
                            <div className="toast-message">{toast.message}</div>
                        </div>
                        <button className="toast-close" onClick={() => removeToast(toast.id)}>
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
