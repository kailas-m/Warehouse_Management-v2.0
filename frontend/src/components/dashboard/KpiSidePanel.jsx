import React from "react";
import { X, Package, AlertTriangle, FileText, ArrowRight } from "lucide-react";
import "../../styles/dashboard-enterprise.css";

/**
 * KpiSidePanel - Slide-over panel for KPI drill-down details
 * Props:
 *   - open: boolean
 *   - onClose: () => void
 *   - title: string
 *   - items: Array of detail items to display
 *   - type: 'low_stock' | 'pending_requests' | 'transfers'
 *   - onAction: (item) => void (optional quick action handler)
 *   - actionLabel: string (optional, default: "View Details")
 */
const KpiSidePanel = ({
    open = false,
    onClose,
    title = "Details",
    items = [],
    type = "low_stock",
    onAction,
    actionLabel = "View Details"
}) => {
    // Close on Escape key
    React.useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape" && open) {
                onClose();
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [open, onClose]);

    // Prevent body scroll when panel is open
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (!open) return null;

    const getIcon = () => {
        switch (type) {
            case "low_stock":
                return <AlertTriangle size={20} />;
            case "pending_requests":
            case "transfers":
                return <FileText size={20} />;
            case "warehouses":
            case "warehouse_selection":
                return <Package size={20} />; // Using Package for warehouse related for now, or map/building icon if available
            case "products":
                return <Package size={20} />;
            default:
                return <Package size={20} />;
        }
    };

    const renderLowStockItem = (item) => (
        <div className="side-panel-item" key={item.id || item.product_id}>
            <div className="side-panel-item-header">
                <div className="side-panel-item-title">
                    <Package size={16} />
                    <span>{item.product || item.product_name}</span>
                </div>
                <span className={`side-panel-badge ${item.quantity < item.threshold / 2 ? 'badge-critical' : 'badge-warning'}`}>
                    {item.quantity < item.threshold / 2 ? 'Critical' : 'Low'}
                </span>
            </div>
            <div className="side-panel-item-details">
                <div className="detail-row">
                    <span className="detail-label">Warehouse:</span>
                    <span className="detail-value">{item.warehouse || item.warehouse_name}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Current Stock:</span>
                    <span className="detail-value">{item.quantity || item.current_quantity}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Threshold:</span>
                    <span className="detail-value">{item.threshold}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Shortage:</span>
                    <span className="detail-value shortage">{item.threshold - (item.quantity || item.current_quantity)}</span>
                </div>
            </div>
            {onAction && (
                <button
                    className="side-panel-action-btn"
                    onClick={() => onAction(item)}
                >
                    {actionLabel} <ArrowRight size={14} />
                </button>
            )}
        </div>
    );

    const renderPendingRequestItem = (item) => (
        <div className="side-panel-item" key={item.id}>
            <div className="side-panel-item-header">
                <div className="side-panel-item-title">
                    <FileText size={16} />
                    <span>#{item.id} - {item.product || item.product_name}</span>
                </div>
                <span className="side-panel-badge badge-warning">Pending</span>
            </div>
            <div className="side-panel-item-details">
                <div className="detail-row">
                    <span className="detail-label">Quantity:</span>
                    <span className="detail-value">{item.quantity}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Requested By:</span>
                    <span className="detail-value">{item.requested_by || item.requestedBy}</span>
                </div>
                {item.warehouse && (
                    <div className="detail-row">
                        <span className="detail-label">Warehouse:</span>
                        <span className="detail-value">{item.warehouse}</span>
                    </div>
                )}
            </div>
            {onAction && (
                <button
                    className="side-panel-action-btn"
                    onClick={() => onAction(item)}
                >
                    {actionLabel} <ArrowRight size={14} />
                </button>
            )}
        </div>
    );

    const renderWarehouseItem = (item) => (
        <div className="side-panel-item" key={item.id || item.warehouse_id}>
            <div className="side-panel-item-header">
                <div className="side-panel-item-title">
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                </div>
                {/* Optional status badge if available */}
            </div>
            <div className="side-panel-item-details">
                <div className="detail-row">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">{item.location || "N/A"}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Items:</span>
                    <span className="detail-value">{item.total_quantity || 0}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Manager:</span>
                    <span className="detail-value">{item.manager || "Unassigned"}</span>
                </div>
            </div>
            {onAction && (
                <button
                    className="side-panel-action-btn"
                    onClick={() => onAction(item)}
                >
                    View Details <ArrowRight size={14} />
                </button>
            )}
        </div>
    );

    const renderProductItem = (item) => (
        <div className="side-panel-item" key={item.id}>
            <div className="side-panel-item-header">
                <div className="side-panel-item-title">
                    <span>{item.name}</span>
                </div>
                <span className="side-panel-badge badge-neutral">{item.sku}</span>
            </div>
            <div className="side-panel-item-details">
                <div className="detail-row">
                    <span className="detail-label">Price:</span>
                    <span className="detail-value">${item.price}</span>
                </div>
                {/* If we have total stock info globally, show it, otherwise maybe skip */}
            </div>
        </div>
    );

    const renderTransferItem = (item) => (
        <div className="side-panel-item" key={item.id}>
            <div className="side-panel-item-header">
                <div className="side-panel-item-title">
                    <span>Transfer #{item.id}</span>
                </div>
                <span className="side-panel-badge badge-warning">{item.status}</span>
            </div>
            <div className="side-panel-item-details">
                <div className="detail-row">
                    <span className="detail-label">Product:</span>
                    <span className="detail-value">{item.product_name}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Qty:</span>
                    <span className="detail-value">{item.quantity}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">From:</span>
                    <span className="detail-value">{item.source_warehouse_name}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">To:</span>
                    <span className="detail-value">{item.destination_warehouse_name}</span>
                </div>
            </div>
        </div>
    );

    const renderWarehouseSelectionItem = (item) => (
        <div
            className="side-panel-item hover-clickable"
            key={item.id}
            onClick={() => onAction && onAction(item)}
            style={{ cursor: 'pointer', borderLeft: '4px solid transparent', transition: 'all 0.2s' }}
        >
            <div className="side-panel-item-header">
                <div className="side-panel-item-title">
                    <span>{item.name}</span>
                </div>
            </div>
            <div className="side-panel-item-details">
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>{item.location || "No location set"}</p>
            </div>
        </div>
    );

    const renderItem = (item) => {
        switch (type) {
            case "low_stock":
                return renderLowStockItem(item);
            case "pending_requests":
                return renderPendingRequestItem(item);
            case "warehouses":
                return renderWarehouseItem(item);
            case "products":
                return renderProductItem(item);
            case "transfers":
                return renderTransferItem(item);
            case "warehouse_selection":
                return renderWarehouseSelectionItem(item);
            default:
                return renderLowStockItem(item);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div className="side-panel-backdrop" onClick={onClose} />

            {/* Panel */}
            <div className="side-panel">
                <div className="side-panel-header">
                    <div className="side-panel-title">
                        {getIcon()}
                        <h2>{title}</h2>
                    </div>
                    <button
                        className="side-panel-close"
                        onClick={onClose}
                        aria-label="Close panel"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="side-panel-content">
                    {items.length === 0 ? (
                        <div className="side-panel-empty">
                            {getIcon()}
                            <p>No items to display</p>
                        </div>
                    ) : (
                        <div className="side-panel-items">
                            {items.map(renderItem)}
                        </div>
                    )}
                </div>

                <div className="side-panel-footer">
                    <span className="side-panel-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
            </div>
        </>
    );
};

export default KpiSidePanel;
