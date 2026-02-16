import React from 'react';

const PaginationControls = ({ currentPage, totalItems, pageSize, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / pageSize);

    if (totalPages <= 1) return null;

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '10px' }}>
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: currentPage === 1 ? '#f5f5f5' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                }}
            >
                Previous
            </button>

            <span style={{ color: '#666' }}>
                Page {currentPage} of {totalPages}
            </span>

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: currentPage === totalPages ? '#f5f5f5' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                }}
            >
                Next
            </button>
        </div>
    );
};

export default PaginationControls;
