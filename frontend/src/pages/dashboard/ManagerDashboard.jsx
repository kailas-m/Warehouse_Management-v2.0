import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import KPIStrip from "../../components/dashboard/KPIStrip";
import ActionPanel from "../../components/dashboard/ActionPanel";
import WarehouseSummary from "../../components/dashboard/WarehouseSummary";
import InventoryHealth from "../../components/dashboard/InventoryHealth";
import RequestsSnapshot from "../../components/dashboard/RequestsSnapshot";
import ActivityLogs from "../../components/dashboard/ActivityLogs";
import KpiSidePanel from "../../components/dashboard/KpiSidePanel";
import "../../styles/dashboard-enterprise.css";

const ManagerDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [currentWarehouse, setCurrentWarehouse] = useState(null); // Full warehouse object

    // Side Panel State
    const [sidePanelOpen, setSidePanelOpen] = useState(false);
    const [sidePanelType, setSidePanelType] = useState('low_stock');
    const [sidePanelItems, setSidePanelItems] = useState([]);
    const [sidePanelTitle, setSidePanelTitle] = useState('');

    // Activity Logs pagination and sorting state
    const [logsPage, setLogsPage] = useState(1);
    const [logsOrdering, setLogsOrdering] = useState('-timestamp');

    useEffect(() => {
        if (user && user.assigned_warehouses && user.assigned_warehouses.length > 0) {
            // Default to first one if not set
            if (!currentWarehouse) {
                setCurrentWarehouse(user.assigned_warehouses[0]);
            }
        } else {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!currentWarehouse) return;

            setLoading(true);
            try {
                const res = await api.post("/dashboard/warehouse/", {
                    warehouse_id: currentWarehouse.id,
                    page: logsPage,
                    page_size: 10
                }, {
                    params: {
                        ordering: logsOrdering
                    }
                });
                setDashboardData(res.data);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch manager dashboard data", err);
                setError("Failed to load dashboard data. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [currentWarehouse, logsPage, logsOrdering]);

    const handleApproveRequest = async (id) => {
        try {
            await api.post(`/purchase-requests/approve/`, {
                purchase_request_id: id,
                decision: "APPROVED"
            });
            alert("Request approved successfully!");
            // Refresh data
            if (currentWarehouse) {
                const res = await api.post("/dashboard/warehouse/", {
                    warehouse_id: currentWarehouse.id,
                    page: 1,
                    page_size: 10
                });
                setDashboardData(res.data);
            }
        } catch (err) {
            alert("Failed to approve request: " + (err.response?.data?.error || "Unknown error"));
        }
    };

    const handleRejectRequest = async (id) => {
        try {
            await api.post(`/purchase-requests/approve/`, {
                purchase_request_id: id,
                decision: "REJECTED"
            });
            alert("Request rejected successfully!");
            // Refresh data
            if (currentWarehouse) {
                const res = await api.post("/dashboard/warehouse/", {
                    warehouse_id: currentWarehouse.id,
                    page: 1,
                    page_size: 10
                });
                setDashboardData(res.data);
            }
        } catch (err) {
            alert("Failed to reject request: " + (err.response?.data?.error || "Unknown error"));
        }
    };

    if (loading && !dashboardData) {
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
                    <div className="dashboard-title">Manager Dashboard</div>
                    <div className="dashboard-subtitle">No warehouse assigned</div>
                </div>
                <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                    <p>You are not currently assigned to any warehouse. Please contact your administrator.</p>
                </div>
            </div>
        );
    }

    // Handlers
    const handleKpiClick = (type) => {
        if (type === 'assigned_warehouse') {
            if (user.assigned_warehouses.length > 1) {
                setSidePanelType('warehouse_selection');
                setSidePanelTitle('Select Warehouse');
                setSidePanelItems(user.assigned_warehouses);
                setSidePanelOpen(true);
            }
        } else if (type === 'low_stock') {
            setSidePanelType('low_stock');
            setSidePanelTitle('Low Stock Alerts');
            // Combine alerts and items if both exist, or prioritize one
            const items = dashboardData?.low_stock_items || dashboardData?.low_stock_alerts || [];
            setSidePanelItems(items);
            setSidePanelOpen(true);
        }
    };

    const handleSidePanelAction = (item) => {
        if (sidePanelType === 'warehouse_selection') {
            setCurrentWarehouse(item);
            setSidePanelOpen(false);
        } else if (sidePanelType === 'low_stock') {
            navigate(`/purchase-requests/create?product=${item.product_id}&warehouse=${item.warehouse_id}`);
        }
    };

    // Activity Logs handlers
    const handleLogsPageChange = (newPage) => {
        setLogsPage(newPage);
    };

    const handleLogsSortChange = (field) => {
        // Toggle sort order if clicking same field, otherwise default to descending
        if (logsOrdering === field) {
            setLogsOrdering(`-${field}`);
        } else if (logsOrdering === `-${field}`) {
            setLogsOrdering(field);
        } else {
            setLogsOrdering(`-${field}`);
        }
        setLogsPage(1); // Reset to first page when changing sort
    };

    const stats = dashboardData?.stats || {};
    const warehouseName = currentWarehouse ? currentWarehouse.name : "Loading...";

    // Prepare KPIs
    const kpis = [
        {
            label: "Assigned Warehouse",
            value: warehouseName,
            status: "neutral",
            onClick: user.assigned_warehouses.length > 1 ? () => handleKpiClick('assigned_warehouse') : undefined,
            helpText: user.assigned_warehouses.length > 1 ? "Click to switch" : undefined
        },
        {
            label: "Products",
            value: stats.total_products || 0,
            status: "neutral",
            onClick: () => navigate("/products")
        },
        {
            label: "Stock Units",
            value: stats.total_stock_units || 0,
            status: "success"
        },
        {
            label: "Low Stock Alerts",
            value: stats.low_stock_count || 0,
            status: stats.low_stock_count > 0 ? "warning" : "success",
            onClick: () => handleKpiClick('low_stock')
        },
        {
            label: "Pending Purchases",
            value: stats.pending_purchase_requests || 0,
            status: stats.pending_purchase_requests > 0 ? "warning" : "success",
            onClick: () => navigate("/purchase-requests")
        },
        {
            label: "Pending Transfers",
            value: stats.pending_transfer_requests || 0,
            status: stats.pending_transfer_requests > 0 ? "warning" : "success",
            onClick: () => navigate("/transfer-requests")
        }
    ];

    // Prepare Actions
    const actions = [];
    if (stats.pending_purchase_requests > 0) {
        actions.push({
            title: "Purchase Requests Pending Approval",
            count: stats.pending_purchase_requests,
            priority: "high",
            onReview: () => navigate("/purchase-requests")
        });
    }
    if (stats.pending_transfer_requests > 0) {
        actions.push({
            title: "Transfer Requests Awaiting Action",
            count: stats.pending_transfer_requests,
            priority: "medium",
            onReview: () => navigate("/transfer-requests")
        });
    }
    if (stats.low_stock_count > 0) {
        actions.push({
            title: "Low Stock Alerts (Threshold Breached)",
            count: stats.low_stock_count,
            priority: "high",
            onReview: () => handleKpiClick('low_stock')
        });
    }

    // Prepare Warehouse Summary (Active Scope)
    const activeScope = dashboardData?.active_scope || {};
    const warehouseSummary = {
        stockIn: activeScope.stock_in || 0,
        stockOut: activeScope.stock_out || 0,
        transfersIn: activeScope.transfers_in || 0,
        transfersOut: activeScope.transfers_out || 0,
        lastActivity: dashboardData?.last_activity_timestamp
    };

    // Prepare Inventory Health
    const inventoryHealthItems = (dashboardData?.low_stock_items || dashboardData?.low_stock_alerts || []).slice(0, 5).map(item => ({
        product: item.product,
        warehouse: item.warehouse || warehouseName,
        quantity: item.quantity,
        threshold: item.threshold,
        status: item.status || "low"
    }));

    // Prepare Purchase Requests
    const purchaseRequests = (dashboardData?.recent_purchase_requests || []).slice(0, 5).map(req => ({
        id: req.id,
        product: req.product,
        quantity: req.quantity,
        requestedBy: req.requested_by || "Unknown",
        status: req.status,
        onApprove: handleApproveRequest,
        onReject: handleRejectRequest
    }));

    // Prepare Activity Logs - pass fields as-is from backend (snake_case)
    const activityLogs = dashboardData?.movement_history?.results || [];

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="dashboard-title">Manager Dashboard</div>
                <div className="dashboard-subtitle">
                    Warehouse: {warehouseName}
                    {user.assigned_warehouses.length > 1 && (
                        <span
                            style={{ fontSize: '0.8em', color: 'var(--link-color)', cursor: 'pointer', marginLeft: '10px' }}
                            onClick={() => handleKpiClick('assigned_warehouse')}
                        >
                            (Switch)
                        </span>
                    )}
                </div>
            </div>

            <KPIStrip kpis={kpis} />

            {actions.length > 0 && <ActionPanel actions={actions} />}

            <WarehouseSummary scope={warehouseName} stats={warehouseSummary} />

            <div className="dashboard-grid-2col">
                <InventoryHealth items={inventoryHealthItems} title="Low Stock Alerts" />
                <RequestsSnapshot
                    requests={purchaseRequests}
                    title="Recent Purchase Requests"
                    showActions={true}
                />
            </div>

            <ActivityLogs
                logs={activityLogs}
                title="Warehouse Activity"
                page={logsPage}
                totalItems={dashboardData?.movement_history?.total_items || 0}
                pageSize={10}
                onPageChange={handleLogsPageChange}
                sortField={logsOrdering.replace('-', '')}
                sortOrder={logsOrdering.startsWith('-') ? 'desc' : 'asc'}
                onSortChange={handleLogsSortChange}
            />

            {/* KPI Side Panel */}
            <KpiSidePanel
                open={sidePanelOpen}
                onClose={() => setSidePanelOpen(false)}
                title={sidePanelTitle}
                items={sidePanelItems}
                type={sidePanelType}
                onAction={handleSidePanelAction}
                actionLabel={sidePanelType === 'warehouse_selection' ? 'Select' : 'View Details'}
            />
        </div>
    );
};

export default ManagerDashboard;
