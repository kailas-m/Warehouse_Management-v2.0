import React from 'react';
import { FileText, Clock } from 'lucide-react';

const PurchaseRequestDetail = ({ data }) => {
    if (!data) return null;

    const getStatusBadge = (status) => {
        const statusMap = {
            'PENDING': 'drawer-badge-warning',
            'APPROVED': 'drawer-badge-success',
            'REJECTED': 'drawer-badge-error',
        };
        return statusMap[status] || 'drawer-badge-neutral';
    };

    return (
        <div>
            <div className="drawer-section">
                <div className="drawer-section-title">Request Information</div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Status</div>
                    <div className="drawer-field-value">
                        <span className={`drawer-badge ${getStatusBadge(data.status)}`}>
                            {data.status}
                        </span>
                    </div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Product</div>
                    <div className="drawer-field-value">{data.product?.name || '—'}</div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Warehouse</div>
                    <div className="drawer-field-value">{data.warehouse?.name || '—'}</div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Quantity</div>
                    <div className="drawer-field-value" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                        {data.quantity} units
                    </div>
                </div>
            </div>

            <div className="drawer-section">
                <div className="drawer-section-title">Requester Information</div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Requested By</div>
                    <div className="drawer-field-value">{data.viewer_username || '—'}</div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Email</div>
                    <div className="drawer-field-value">{data.viewer_email || '—'}</div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Requested At</div>
                    <div className="drawer-field-value">
                        {data.created_at ? new Date(data.created_at).toLocaleString() : '—'}
                    </div>
                </div>
            </div>

            {data.processed_at && (
                <div className="drawer-section">
                    <div className="drawer-section-title">Processing Information</div>

                    <div className="drawer-field">
                        <div className="drawer-field-label">Processed By</div>
                        <div className="drawer-field-value">{data.processed_by_username || '—'}</div>
                    </div>

                    <div className="drawer-field">
                        <div className="drawer-field-label">Processed At</div>
                        <div className="drawer-field-value">
                            {new Date(data.processed_at).toLocaleString()}
                        </div>
                    </div>
                </div>
            )}

            {data.approval_history && data.approval_history.length > 0 && (
                <div className="drawer-section">
                    <div className="drawer-section-title">Approval History</div>

                    <div style={{ marginTop: '12px' }}>
                        {data.approval_history.map((approval, idx) => (
                            <div key={idx} style={{
                                padding: '12px',
                                background: '#f9fafb',
                                borderRadius: '6px',
                                marginBottom: '8px',
                                borderLeft: `3px solid ${approval.decision === 'APPROVED' ? '#059669' : '#dc2626'}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 600 }}>{approval.approver}</span>
                                    <span className={`drawer-badge ${getStatusBadge(approval.decision)}`}>
                                        {approval.decision}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                    {approval.timestamp ? new Date(approval.timestamp).toLocaleString() : '—'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseRequestDetail;
