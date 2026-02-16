import React from 'react';
import { Package, AlertTriangle, CheckCircle } from 'lucide-react';

const StockDetail = ({ data }) => {
    if (!data) return null;

    const thresholdStatus = data.threshold_status;

    return (
        <div>
            <div className="drawer-section">
                <div className="drawer-section-title">Stock Information</div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Product</div>
                    <div className="drawer-field-value">{data.product?.name || '—'}</div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Warehouse</div>
                    <div className="drawer-field-value">{data.warehouse?.name || '—'}</div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Current Quantity</div>
                    <div className="drawer-field-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {data.quantity} units
                    </div>
                </div>

                {thresholdStatus && (
                    <div className="drawer-field">
                        <div className="drawer-field-label">Threshold Status</div>
                        <div className="drawer-field-value">
                            {thresholdStatus.is_low ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                                    <AlertTriangle size={18} />
                                    <span>Low Stock (Threshold: {thresholdStatus.threshold})</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669' }}>
                                    <CheckCircle size={18} />
                                    <span>Adequate Stock</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="drawer-section">
                <div className="drawer-section-title">Product Details</div>

                <div className="drawer-field">
                    <div className="drawer-field-label">SKU</div>
                    <div className="drawer-field-value">{data.product?.sku || '—'}</div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Price</div>
                    <div className="drawer-field-value">${data.product?.price || '0.00'}</div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Last Updated</div>
                    <div className="drawer-field-value">
                        {data.updated_at ? new Date(data.updated_at).toLocaleString() : '—'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockDetail;
