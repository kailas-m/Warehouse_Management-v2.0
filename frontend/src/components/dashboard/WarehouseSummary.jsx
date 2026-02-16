import React from "react";
import { Warehouse, TrendingUp, TrendingDown, Clock } from "lucide-react";
import "../../styles/dashboard-enterprise.css";

/**
 * WarehouseSummary - Replaces Profile Card with warehouse-centric view
 * Props:
 *   - scope: "Global (Admin)" or specific warehouse name
 *   - stats: { stockIn, stockOut, transfersIn, transfersOut, lastActivity }
 */
const WarehouseSummary = ({ scope = "Global", stats = {} }) => {
    return (
        <div className="warehouse-summary">
            <div className="warehouse-summary-header">
                <Warehouse size={24} />
                <div>
                    <div className="warehouse-scope-label">Active Scope</div>
                    <div className="warehouse-scope-value">{scope}</div>
                </div>
            </div>

            <div className="warehouse-stats-grid">
                <div className="warehouse-stat">
                    <div className="warehouse-stat-icon" style={{ background: "#dcfce7" }}>
                        <TrendingUp size={18} style={{ color: "#16a34a" }} />
                    </div>
                    <div className="warehouse-stat-content">
                        <div className="warehouse-stat-label">Stock In</div>
                        <div className="warehouse-stat-value">{stats.stockIn || 0}</div>
                    </div>
                </div>

                <div className="warehouse-stat">
                    <div className="warehouse-stat-icon" style={{ background: "#fee2e2" }}>
                        <TrendingDown size={18} style={{ color: "#dc2626" }} />
                    </div>
                    <div className="warehouse-stat-content">
                        <div className="warehouse-stat-label">Stock Out</div>
                        <div className="warehouse-stat-value">{stats.stockOut || 0}</div>
                    </div>
                </div>

                <div className="warehouse-stat">
                    <div className="warehouse-stat-icon" style={{ background: "#dbeafe" }}>
                        <TrendingUp size={18} style={{ color: "#2563eb" }} />
                    </div>
                    <div className="warehouse-stat-content">
                        <div className="warehouse-stat-label">Transfers In</div>
                        <div className="warehouse-stat-value">{stats.transfersIn || 0}</div>
                    </div>
                </div>

                <div className="warehouse-stat">
                    <div className="warehouse-stat-icon" style={{ background: "#fef3c7" }}>
                        <TrendingDown size={18} style={{ color: "#ca8a04" }} />
                    </div>
                    <div className="warehouse-stat-content">
                        <div className="warehouse-stat-label">Transfers Out</div>
                        <div className="warehouse-stat-value">{stats.transfersOut || 0}</div>
                    </div>
                </div>
            </div>

            {stats.lastActivity && (
                <div className="warehouse-last-activity">
                    <Clock size={14} />
                    <span>Last Activity: {new Date(stats.lastActivity).toLocaleString()}</span>
                </div>
            )}
        </div>
    );
};

export default WarehouseSummary;
