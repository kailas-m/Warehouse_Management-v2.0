import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import '../styles/confirmation-modal.css';

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="confirmation-overlay" onClick={onCancel}>
            <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
                <button className="confirmation-close" onClick={onCancel}>
                    <X size={20} />
                </button>

                <div className="confirmation-icon">
                    <AlertTriangle size={48} />
                </div>

                <h2 className="confirmation-title">{title}</h2>
                <p className="confirmation-message">{message}</p>

                <div className="confirmation-actions">
                    <button className="confirmation-btn confirmation-btn-cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="confirmation-btn confirmation-btn-confirm" onClick={onConfirm}>
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
