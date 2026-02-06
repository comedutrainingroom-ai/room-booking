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

// Premium Toast Component
const Toast = ({ id, type, message, onClose }) => {
    const config = {
        success: {
            gradient: 'from-emerald-500 to-teal-600',
            glow: 'shadow-emerald-500/25',
            icon: <FaCheck className="w-5 h-5" />
        },
        error: {
            gradient: 'from-rose-500 to-red-600',
            glow: 'shadow-rose-500/25',
            icon: <FaTimes className="w-5 h-5" />
        },
        warning: {
            gradient: 'from-amber-400 to-orange-500',
            glow: 'shadow-amber-500/25',
            icon: <FaExclamationTriangle className="w-5 h-5" />
        },
        info: {
            gradient: 'from-blue-500 to-indigo-600',
            glow: 'shadow-blue-500/25',
            icon: <FaInfoCircle className="w-5 h-5" />
        }
    };

    const { gradient, glow, icon } = config[type] || config.info;

    return (
        <div className={`
            relative overflow-hidden
            bg-white/95 backdrop-blur-xl
            rounded-2xl
            shadow-2xl ${glow}
            border border-white/20
            min-w-[340px] max-w-[440px]
        `}>
            {/* Gradient Top Border */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`}></div>

            {/* Content */}
            <div className="flex items-center gap-4 p-4">
                {/* Icon with Gradient Background */}
                <div className={`
                    bg-gradient-to-br ${gradient}
                    p-3 rounded-xl
                    text-white
                    shadow-lg ${glow}
                    flex-shrink-0
                `}>
                    {icon}
                </div>

                {/* Message */}
                <p className="text-gray-700 font-medium text-sm flex-1 leading-relaxed">
                    {message}
                </p>

                {/* Close Button */}
                <button
                    onClick={() => onClose(id)}
                    className="
                        w-8 h-8 rounded-full
                        flex items-center justify-center
                        text-gray-400 hover:text-gray-600
                        hover:bg-gray-100
                        transition-all duration-200
                        flex-shrink-0
                    "
                >
                    <FaTimes className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

// Premium Confirm Modal Component
const ConfirmModal = ({ title, message, type, onConfirm, onCancel }) => {
    const config = {
        warning: {
            gradient: 'from-amber-400 to-orange-500',
            glow: 'shadow-amber-500/30',
            iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
            icon: <FaExclamationTriangle className="w-8 h-8 text-white" />,
            confirmBtn: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
        },
        danger: {
            gradient: 'from-rose-500 to-red-600',
            glow: 'shadow-rose-500/30',
            iconBg: 'bg-gradient-to-br from-rose-500 to-red-600',
            icon: <FaTimes className="w-8 h-8 text-white" />,
            confirmBtn: 'from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700'
        },
        info: {
            gradient: 'from-blue-500 to-indigo-600',
            glow: 'shadow-blue-500/30',
            iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
            icon: <FaInfoCircle className="w-8 h-8 text-white" />,
            confirmBtn: 'from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
        }
    };

    const { gradient, glow, iconBg, icon, confirmBtn } = config[type] || config.warning;

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
                rounded-3xl
                shadow-2xl ${glow}
                max-w-sm w-full
                overflow-hidden
            `}>
                {/* Decorative Background */}
                <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-br ${gradient} opacity-10`}></div>

                {/* Content */}
                <div className="relative p-8">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className={`
                            ${iconBg}
                            w-20 h-20 rounded-2xl
                            flex items-center justify-center
                            shadow-xl ${glow}
                            rotate-3
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
                                flex-1 px-5 py-3
                                rounded-xl
                                border-2 border-gray-200
                                text-gray-600 font-semibold
                                hover:bg-gray-50 hover:border-gray-300
                                transition-all duration-200
                                text-sm
                            "
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`
                                flex-1 px-5 py-3
                                rounded-xl
                                bg-gradient-to-r ${confirmBtn}
                                text-white font-semibold
                                shadow-lg ${glow}
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
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-4">
                {toasts.map(t => (
                    <Toast
                        key={t.id}
                        id={t.id}
                        type={t.type}
                        message={t.message}
                        onClose={removeToast}
                    />
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
