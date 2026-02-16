import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import KPIStrip from "../../components/dashboard/KPIStrip";
import WarehouseSummary from "../../components/dashboard/WarehouseSummary";
import ActivityLogs from "../../components/dashboard/ActivityLogs";
import "../../styles/dashboard-enterprise.css";

const StaffDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [warehouseName, setWarehouseName] = useState("No Warehouse Assigned");

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user || !user.assigned_warehouses || user.assigned_warehouses.length === 0) {
                setLoading(false);
                return;
            }

            try {
                const whId = user.assigned_warehouses[0].id;
                const whName = user.assigned_warehouses[0].name;
                setWarehouseName(whName);

                const res = await api.post("/dashboard/warehouse/", {
                    warehouse_id: whId,
                    page: 1,
                    page_size: 10
                });
                setDashboardData(res.data);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch staff dashboard data", err);
                setError("Failed to load dashboard data. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [user]);

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <div className="dashboard-title">Loading Dashboard...</div>
                    <div className="dashboard-subtitle">Please wait</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <div className="dashboard-title" style={{ color: "#dc2626" }}>Error</div>
                    <div className="dashboard-subtitle">{error}</div>
                </div>
            </div>
        );
    }

    if (!user?.assigned_warehouses || user.assigned_warehouses.length === 0) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <div className="dashboard-title">Staff Dashboard</div>
                    <div className="dashboard-subtitle">No warehouse assigned</div>
                </div>
                <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                    <p>You are not currently assigned to any warehouse. Please contact your manager.</p>
                </div>
            </div>
        );
    }

    const stats = dashboardData?.stats || {};

    // Prepare KPIs
    const kpis = [
        {
            label: "Assigned Warehouse",
            value: warehouseName,
            status: "neutral"
        },
        {
            label: "Products Handled",
            value: stats.total_products || 0,
            status: "neutral",
            onClick: () => navigate("/products")
        },
        {
            label: "Stock Units",
            value: stats.total_stock_units || 0,
            status: "success",
            onClick: () => navigate("/stocks")
        },
        {
            label: "Pending Requests",
            value: stats.pending_purchase_requests || 0,
            status: "neutral",
            onClick: () => navigate("/purchase-requests")
        }
    ];

    // Prepare Warehouse Summary
    const warehouseSummary = {
        stockIn: dashboardData?.total_stock_in || 0,
        stockOut: dashboardData?.total_stock_out || 0,
        transfersIn: dashboardData?.total_transfers_in || 0,
        transfersOut: dashboardData?.total_transfers_out || 0,
        lastActivity: dashboardData?.last_activity_timestamp
    };

    // Prepare Activity Logs - pass fields as-is from backend (snake_case)
    const activityLogs = dashboardData?.movement_history?.results || [];

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="dashboard-title">Staff Dashboard</div>
                <div className="dashboard-subtitle">Warehouse: {warehouseName}</div>
            </div>

            <KPIStrip kpis={kpis} />

            <WarehouseSummary scope={warehouseName} stats={warehouseSummary} />

            <div style={{ marginBottom: "24px" }}>

                <button
                    onClick={() => navigate("/transfer-requests/new")}
                    style={{
                        padding: "12px 24px",
                        background: "#8b5cf6",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        cursor: "pointer"
                    }}
                >
                    Create Transfer Request
                </button>
            </div>

            <ActivityLogs logs={activityLogs} title="Warehouse Activity" />
        </div>
    );
};

export default StaffDashboard;
