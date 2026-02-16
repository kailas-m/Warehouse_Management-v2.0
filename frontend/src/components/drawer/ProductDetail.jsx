import React from 'react';
import { Package } from 'lucide-react';

const ProductDetail = ({ data }) => {
    if (!data) return null;

    return (
        <div>
            <div className="drawer-section">
                <div className="drawer-section-title">Product Information</div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Name</div>
                    <div className="drawer-field-value">{data.name}</div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">SKU</div>
                    <div className="drawer-field-value">{data.sku || '—'}</div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Price</div>
                    <div className="drawer-field-value">${data.price}</div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Description</div>
                    <div className="drawer-field-value">{data.description || '—'}</div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Status</div>
                    <div className="drawer-field-value">
                        <span className={`drawer-badge ${data.is_active ? 'drawer-badge-success' : 'drawer-badge-error'}`}>
                            {data.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="drawer-section">
                <div className="drawer-section-title">Stock Information</div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Total Stock</div>
                    <div className="drawer-field-value">{data.total_stock || 0} units</div>
                </div>

                {data.stock_by_warehouse && data.stock_by_warehouse.length > 0 && (
                    <div className="drawer-field">
                        <div className="drawer-field-label">Stock by Warehouse</div>
                        <div style={{ marginTop: '8px' }}>
                            {data.stock_by_warehouse.map((stock, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    background: '#f9fafb',
                                    borderRadius: '6px',
                                    marginBottom: '4px'
                                }}>
                                    <span>{stock.warehouse_name}</span>
                                    <span style={{ fontWeight: 600 }}>{stock.quantity} units</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductDetail;
