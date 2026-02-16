import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import KPIStrip from "../../components/dashboard/KPIStrip";
import ActionPanel from "../../components/dashboard/ActionPanel";
import WarehouseSummary from "../../components/dashboard/WarehouseSummary";
import InventoryHealth from "../../components/dashboard/InventoryHealth";
import RequestsSnapshot from "../../components/dashboard/RequestsSnapshot";
import ActivityLogs from "../../components/dashboard/ActivityLogs";
import KpiSidePanel from "../../components/dashboard/KpiSidePanel";
import "../../styles/dashboard-enterprise.css";

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [sidePanelOpen, setSidePanelOpen] = useState(false);
    const [sidePanelType, setSidePanelType] = useState('low_stock');
    const [sidePanelItems, setSidePanelItems] = useState([]);
    const [sidePanelTitle, setSidePanelTitle] = useState('');

    // Activity Logs pagination and sorting state (coupled)
    const [logsPage, setLogsPage] = useState(1);
    const [logsOrdering, setLogsOrdering] = useState('-timestamp');
    const [logsLoading, setLogsLoading] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLogsLoading(true);
            try {
                const res = await api.get("/dashboard/admin/", {
                    params: {
                        page: logsPage,
                        page_size: 8,
                        ordering: logsOrdering
                    }
                });

                // Handle invalid page (out of bounds)
                const totalPages = res.data?.movement_history?.total_pages || 0;
                if (logsPage > totalPages && totalPages > 0) {
                    // Reset to page 1 if current page is invalid
                    setLogsPage(1);
                    return; // Will re-fetch with page 1
                }

                setDashboardData(res.data);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch admin dashboard data", err);
                setError("Failed to load dashboard data. Please try again.");
            } finally {
                setLoading(false);
                setLogsLoading(false);
            }
        };
        fetchDashboardData();
    }, [logsPage, logsOrdering]);

    const handleApproveRequest = async (id) => {
        try {
            await api.post(`/purchase-requests/approve/`, {
                purchase_request_id: id,
                decision: "APPROVED"
            });
            alert("Request approved successfully!");
            // Refresh data
            const res = await api.get("/dashboard/admin/");
            setDashboardData(res.data);
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
            const res = await api.get("/dashboard/admin/");
            setDashboardData(res.data);
        } catch (err) {
            alert("Failed to reject request: " + (err.response?.data?.error || "Unknown error"));
        }
    };

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

    // KPI Click Handlers
    const handleKpiClick = async (type) => {
        switch (type) {
            case 'low_stock':
                setSidePanelType('low_stock');
                setSidePanelTitle('Low Stock Items');
                setSidePanelItems(dashboardData?.low_stock_items || []);
                setSidePanelOpen(true);
                break;
            case 'pending_purchases':
                setSidePanelType('pending_requests');
                setSidePanelTitle('Pending Purchase Requests');
                setSidePanelItems(dashboardData?.recent_purchase_requests?.filter(r => r.status === 'PENDING') || []);
                setSidePanelOpen(true);
                break;
            case 'warehouses':
                setSidePanelType('warehouses');
                setSidePanelTitle('All Warehouses');
                // Use existing warehouse_comparison data which lists all warehouses
                setSidePanelItems(dashboardData?.warehouse_comparison || []);
                setSidePanelOpen(true);
                break;
            case 'products':
                setSidePanelType('products');
                setSidePanelTitle('All Products');
                setSidePanelItems([]); // Clear previous
                setSidePanelOpen(true);
                // Fetch products on demand
                try {
                    const res = await api.get("/products/list/");
                    setSidePanelItems(res.data.results || []);
                } catch (err) {
                    console.error("Failed to fetch products", err);
                    alert("Failed to load products list");
                    setSidePanelOpen(false);
                }
                break;
            case 'pending_transfers':
                setSidePanelType('transfers');
                setSidePanelTitle('Pending Transfer Requests');
                setSidePanelItems([]); // Clear previous
                setSidePanelOpen(true);
                // Fetch pending transfers on demand
                try {
                    const res = await api.get("/transfer-requests/list/?status=PENDING");
                    setSidePanelItems(res.data.results || []);
                } catch (err) {
                    console.error("Failed to fetch transfers", err);
                    alert("Failed to load transfer requests");
                    setSidePanelOpen(false);
                }
                break;
            default:
                break;
        }
    };

    const handleSidePanelAction = (item) => {
        // For low stock items, navigate to create purchase request with prefilled data
        if (sidePanelType === 'low_stock') {
            navigate(`/purchase-requests/create?product=${item.product_id}&warehouse=${item.warehouse_id}`);
        } else if (sidePanelType === 'pending_requests') {
            navigate(`/purchase-requests/${item.id}`);
        } else if (sidePanelType === 'warehouses') {
            navigate(`/warehouses/${item.warehouse_id}`);
        } else if (sidePanelType === 'transfers') {
            // Navigate to transfer request detail or list filtered by this ID? 
            // Currently no detail page for transfer request in routes list mentioned in App.jsx (except create)
            // But there is /transfer-requests list.
            // Maybe just navigate to list?
            navigate(`/transfer-requests`);
        }
    };

    // Activity Logs handlers
    const handleLogsPageChange = (newPage) => {
        setLogsPage(newPage);
    };

    const handleLogsSortChange = (field) => {
        // Toggle sort order if clicking same field, otherwise default to descending
        let newOrdering;
        if (logsOrdering === field) {
            newOrdering = `-${field}`;
        } else if (logsOrdering === `-${field}`) {
            newOrdering = field;
        } else {
            newOrdering = `-${field}`;
        }

        // Coupled state update: changing sort ALWAYS resets to page 1
        setLogsOrdering(newOrdering);
        setLogsPage(1);
    };

    const stats = dashboardData?.stats || {};

    // Prepare KPIs
    const kpis = [
        {
            label: "Total Warehouses",
            value: stats.total_warehouses || 0,
            status: "neutral",
            onClick: () => handleKpiClick('warehouses')
        },
        {
            label: "Total Products",
            value: stats.total_products || 0,
            status: "neutral",
            onClick: () => handleKpiClick('products')
        },
        {
            label: "Total Stock Units",
            value: stats.total_stock_units || 0,
            status: "success"
        },
        {
            label: "Low Stock Items",
            value: stats.low_stock_count || 0,
            status: stats.low_stock_count > 0 ? "warning" : "success",
            onClick: () => handleKpiClick('low_stock')
        },
        {
            label: "Pending Purchases",
            value: stats.pending_purchase_requests || 0,
            status: stats.pending_purchase_requests > 0 ? "warning" : "success",
            onClick: () => handleKpiClick('pending_purchases')
        },
        {
            label: "Pending Transfers",
            value: stats.pending_transfer_requests || 0,
            status: stats.pending_transfer_requests > 0 ? "warning" : "success",
            onClick: () => handleKpiClick('pending_transfers')
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
            onReview: () => handleKpiClick('pending_transfers')
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

    // Prepare Inventory Health (Low Stock Items)
    const inventoryHealthItems = (dashboardData?.low_stock_items || []).slice(0, 5).map(item => ({
        product: item.product,
        warehouse: item.warehouse,
        quantity: item.quantity,
        threshold: item.threshold,
        status: item.status || "low"
    }));

    // Prepare Purchase Requests Snapshot
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
                <div className="dashboard-title">Admin Dashboard</div>
                <div className="dashboard-subtitle">Global Operations Overview</div>
            </div>

            <KPIStrip kpis={kpis} />

            {actions.length > 0 && <ActionPanel actions={actions} />}

            <WarehouseSummary scope="Global (Admin)" stats={warehouseSummary} />

            <div className="dashboard-grid-2col">
                <InventoryHealth items={inventoryHealthItems} title="Low Stock Alerts" />
                <RequestsSnapshot
                    requests={purchaseRequests}
                    title="Recent Purchase Requests"
                    showActions={true}
                />
            </div>

            <ActivityLogs
                key={`logs-${logsPage}-${logsOrdering}`}
                logs={activityLogs}
                title="System Activity & Audit Logs"
                page={logsPage}
                totalItems={dashboardData?.movement_history?.count || 0}
                pageSize={8}
                onPageChange={handleLogsPageChange}
                sortField={logsOrdering.replace('-', '')}
                sortOrder={logsOrdering.startsWith('-') ? 'desc' : 'asc'}
                onSortChange={handleLogsSortChange}
                isLoading={logsLoading}
                onRefresh={async () => {
                    const res = await api.get("/dashboard/admin/", {
                        params: {
                            page: logsPage,
                            page_size: 8,
                            ordering: logsOrdering
                        }
                    });
                    setDashboardData(res.data);
                }}
            />

            {/* KPI Side Panel */}
            <KpiSidePanel
                open={sidePanelOpen}
                onClose={() => setSidePanelOpen(false)}
                title={sidePanelTitle}
                items={sidePanelItems}
                type={sidePanelType}
                onAction={handleSidePanelAction}
                actionLabel={
                    sidePanelType === 'low_stock' ? 'Create Purchase Request' :
                        sidePanelType === 'pending_requests' ? 'View Details' :
                            sidePanelType === 'warehouses' ? 'View Details' :
                                'View'
                }
            />
        </div>
    );
};

export default AdminDashboard;
