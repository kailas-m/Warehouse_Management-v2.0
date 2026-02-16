import React from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Package, Warehouse, ShoppingCart } from "lucide-react";
import "../../styles/dashboard-enterprise.css";

/**
 * KPIStrip - Horizontal strip of compact KPI cards
 * Props:
 *   - kpis: Array of { label, value, trend, status, onClick }
 *     - label: Display name (e.g., "Total Products")
 *     - value: Numeric value
 *     - trend: "up" | "down" | null
 *     - status: "success" | "warning" | "danger" | "neutral"
 *     - onClick: Optional click handler
 */
const KPIStrip = ({ kpis = [] }) => {
    const getStatusClass = (status) => {
        switch (status) {
            case "success": return "kpi-card-success";
            case "warning": return "kpi-card-warning";
            case "danger": return "kpi-card-danger";
            default: return "kpi-card-neutral";
        }
    };

    const getTrendIcon = (trend) => {
        if (trend === "up") return <TrendingUp size={16} />;
        if (trend === "down") return <TrendingDown size={16} />;
        return null;
    };

    return (
        <div className="kpi-strip">
            {kpis.map((kpi, idx) => (
                <div
                    key={idx}
                    className={`kpi-card ${getStatusClass(kpi.status)} ${kpi.onClick ? 'kpi-card-clickable' : ''}`}
                    onClick={kpi.onClick}
                >
                    <div className="kpi-label">{kpi.label}</div>
                    <div className="kpi-value">
                        {kpi.value}
                        {kpi.trend && <span className="kpi-trend">{getTrendIcon(kpi.trend)}</span>}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KPIStrip;
