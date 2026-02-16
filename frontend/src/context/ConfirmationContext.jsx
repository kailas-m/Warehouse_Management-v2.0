import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

const ConfirmationContext = createContext(null);

export const ConfirmationProvider = ({ children }) => {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        resolve: null
    });

    const confirm = useCallback((message, title = 'Confirm Action') => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                title,
                message,
                resolve
            });
        });
    }, []);

    const handleConfirm = () => {
        if (confirmState.resolve) {
            confirmState.resolve(true);
        }
        setConfirmState({ isOpen: false, title: '', message: '', resolve: null });
    };

    const handleCancel = () => {
        if (confirmState.resolve) {
            confirmState.resolve(false);
        }
        setConfirmState({ isOpen: false, title: '', message: '', resolve: null });
    };

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            <ConfirmationModal
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ConfirmationContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmationProvider');
    }
    return context;
};
