import React from "react";
import { AlertTriangle, TrendingUp, Package } from "lucide-react";
import "../../styles/dashboard-enterprise.css";

/**
 * InventoryHealth - Table/List of inventory health indicators
 * Props:
 *   - items: Array of { product, warehouse, quantity, status, type }
 *     - product: Product name
 *     - warehouse: Warehouse name
 *     - quantity: Current quantity
 *     - status: "low" | "overstock" | "fast-moving" | "normal"
 *     - type: "low_stock" | "fast_moving" | "overstock" | "recent"
 */
const InventoryHealth = ({ items = [], title = "Inventory Health" }) => {
    const getStatusBadge = (status) => {
        switch (status) {
            case "low":
                return <span className="status-badge status-badge-danger">Low Stock</span>;
            case "overstock":
                return <span className="status-badge status-badge-warning">Overstock</span>;
            case "fast-moving":
                return <span className="status-badge status-badge-success">Fast Moving</span>;
            default:
                return <span className="status-badge status-badge-neutral">Normal</span>;
        }
    };

    if (items.length === 0) {
        return (
            <div className="inventory-health">
                <div className="inventory-health-header">{title}</div>
                <div className="inventory-health-empty">
                    <Package size={32} style={{ color: "#9ca3af" }} />
                    <p>No inventory alerts at this time.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="inventory-health">
            <div className="inventory-health-header">{title}</div>
            <div className="inventory-health-table">
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Warehouse</th>
                            <th>Current</th>
                            <th>Threshold</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td className="inventory-product">{item.product}</td>
                                <td className="inventory-warehouse">{item.warehouse}</td>
                                <td className="inventory-quantity">{item.quantity}</td>
                                <td className="inventory-threshold">{item.threshold || 'N/A'}</td>
                                <td>{getStatusBadge(item.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InventoryHealth;
