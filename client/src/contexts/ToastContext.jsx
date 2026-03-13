import { createContext, useContext, useState, useCallback } from 'react';
import { FaCheck, FaTimes, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

// Premium Clean Toast Component
const Toast = ({ id, type, message, onClose }) => {
    const config = {
        success: {
            icon: <FaCheck className="w-4 h-4" />,
            iconBg: 'bg-emerald-100/80 text-emerald-600',
            borderColor: 'border-emerald-500'
        },
        error: {
            icon: <FaTimes className="w-4 h-4" />,
            iconBg: 'bg-rose-100/80 text-rose-600',
            borderColor: 'border-rose-500'
        },
        warning: {
            icon: <FaExclamationTriangle className="w-4 h-4" />,
            iconBg: 'bg-amber-100/80 text-amber-600',
            borderColor: 'border-amber-500'
        },
        info: {
            icon: <FaInfoCircle className="w-4 h-4" />,
            iconBg: 'bg-blue-100/80 text-blue-600',
            borderColor: 'border-blue-500'
        }
    };

    const { icon, iconBg, borderColor } = config[type] || config.info;

    return (
        <div className={`
            pointer-events-auto
            relative overflow-hidden
            bg-white/95 backdrop-blur-md
            rounded-xl
            shadow-[0_8px_30px_rgb(0,0,0,0.08)]
            border border-gray-100
            border-l-4 ${borderColor}
            w-full sm:w-auto
            min-w-[280px] sm:min-w-[320px] max-w-sm
            flex items-center gap-3 p-3.5
            animate-slide-in
        `}>
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconBg}`}>
                {icon}
            </div>

            {/* Message */}
            <p className="text-gray-700 font-medium text-sm flex-1 leading-snug">
                {message}
            </p>

            {/* Close Button */}
            <button
                onClick={() => onClose(id)}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-1"
            >
                <FaTimes className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

// Premium Confirm Modal Component
const ConfirmModal = ({ title, message, type, onConfirm, onCancel }) => {
    const config = {
        warning: {
            iconBg: 'bg-amber-100',
            icon: <FaExclamationTriangle className="w-8 h-8 text-amber-600" />,
            confirmBtn: 'bg-amber-600 hover:bg-amber-700'
        },
        danger: {
            iconBg: 'bg-red-100',
            icon: <FaTimes className="w-8 h-8 text-red-600" />,
            confirmBtn: 'bg-red-600 hover:bg-red-700'
        },
        info: {
            iconBg: 'bg-blue-100',
            icon: <FaInfoCircle className="w-8 h-8 text-blue-600" />,
            confirmBtn: 'bg-blue-600 hover:bg-blue-700'
        }
    };

    const { iconBg, icon, confirmBtn } = config[type] || config.warning;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-950/70 backdrop-blur-md"
                onClick={onCancel}
            ></div>

            {/* Modal */}
            <div className={`
                relative
                bg-white
                rounded-xl
                shadow-xl
                max-w-sm w-full
                overflow-hidden
                border border-gray-100
            `}>
                {/* Content */}
                <div className="relative p-6 pt-8">
                    {/* Icon */}
                    <div className="flex justify-center mb-5">
                        <div className={`
                            ${iconBg}
                            w-16 h-16 rounded-full
                            flex items-center justify-center
                        `}>
                            {icon}
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-gray-500 text-center text-sm leading-relaxed mb-8">
                        {message}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="
                                flex-1 px-4 py-2.5
                                rounded-lg
                                border border-gray-300
                                bg-white
                                text-gray-700 font-medium
                                hover:bg-gray-50
                                transition-all duration-200
                                text-sm
                            "
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`
                                flex-1 px-4 py-2.5
                                rounded-lg
                                ${confirmBtn}
                                text-white font-medium
                                transition-all duration-200
                                text-sm
                            `}
                        >
                            ยืนยัน
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Toast Provider
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [confirmData, setConfirmData] = useState(null);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const addToast = useCallback((type, message, duration = 4000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, message }]);

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
        return id;
    }, [removeToast]);

    const confirm = useCallback(({ title, message, type = 'warning' }) => {
        return new Promise((resolve) => {
            setConfirmData({
                title,
                message,
                type,
                onConfirm: () => { setConfirmData(null); resolve(true); },
                onCancel: () => { setConfirmData(null); resolve(false); }
            });
        });
    }, []);

    const toast = {
        success: (message, duration) => addToast('success', message, duration),
        error: (message, duration) => addToast('error', message, duration),
        warning: (message, duration) => addToast('warning', message, duration),
        info: (message, duration) => addToast('info', message, duration),
        confirm,
        dismiss: removeToast,
        dismissAll: () => setToasts([])
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-16 right-3 sm:right-6 sm:top-20 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none w-auto max-w-[calc(100vw-1.5rem)] sm:max-w-sm">
                {toasts.map(t => (
                    <div key={t.id} className="w-auto">
                        <Toast
                            id={t.id}
                            type={t.type}
                            message={t.message}
                            onClose={removeToast}
                        />
                    </div>
                ))}
            </div>

            {/* Confirm Modal */}
            {confirmData && (
                <ConfirmModal
                    title={confirmData.title}
                    message={confirmData.message}
                    type={confirmData.type}
                    onConfirm={confirmData.onConfirm}
                    onCancel={confirmData.onCancel}
                />
            )}
        </ToastContext.Provider>
    );
};

export default ToastContext;
