import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import KPIStrip from "../../components/dashboard/KPIStrip";
import ActivityLogs from "../../components/dashboard/ActivityLogs";
import "../../styles/dashboard-enterprise.css";

const ViewerDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [myRequests, setMyRequests] = useState([]);

    useEffect(() => {
        const fetchMyRequests = async () => {
            try {
                const res = await api.get("/purchase-requests/list/");
                // Handle both array and paginated response
                const requestsData = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setMyRequests(requestsData);
            } catch (err) {
                console.error("Failed to fetch viewer dashboard data", err);
                setMyRequests([]); // Set empty array on error
            } finally {
                setLoading(false);
            }
        };
        fetchMyRequests();
    }, []);

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <div className="dashboard-title">Loading...</div>
                </div>
            </div>
        );
    }

    // Prepare KPIs - safe array handling
    const requestsArray = Array.isArray(myRequests) ? myRequests : [];
    const pendingCount = requestsArray.filter(r => r.status === "PENDING").length;
    const approvedCount = requestsArray.filter(r => r.status === "APPROVED").length;
    const rejectedCount = requestsArray.filter(r => r.status === "REJECTED").length;

    const kpis = [
        {
            label: "Total Requests",
            value: requestsArray.length,
            status: "neutral",
            onClick: () => navigate("/my-requests")
        },
        {
            label: "Pending",
            value: pendingCount,
            status: pendingCount > 0 ? "warning" : "neutral",
            onClick: () => navigate("/my-requests")
        },
        {
            label: "Approved",
            value: approvedCount,
            status: "success"
        },
        {
            label: "Rejected",
            value: rejectedCount,
            status: rejectedCount > 0 ? "danger" : "neutral"
        }
    ];

    // Format requests as activity logs with proper event_type field
    const activityLogs = requestsArray.map(req => ({
        event_id: req.id,
        event_type: "PURCHASE_REQUESTED",
        timestamp: req.processed_at || req.created_at,
        performed_by: "You",
        main_text: `${req.product_name || req.product} - ${req.status}`,
        sub_text: `Quantity: ${req.quantity} • Warehouse: ${req.warehouse_name || req.warehouse}`,
        status: req.status
    }));

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="dashboard-title">Viewer Dashboard</div>
                <div className="dashboard-subtitle">My Purchase Requests</div>
            </div>

            <KPIStrip kpis={kpis} />

            <div style={{ marginBottom: "24px" }}>
                <button
                    onClick={() => navigate("/purchase-requests/new")}
                    style={{
                        padding: "12px 24px",
                        background: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        cursor: "pointer"
                    }}
                >
                    Create New Request
                </button>
            </div>

            <ActivityLogs logs={activityLogs} title="My Recent Requests" />
        </div>
    );
};

export default ViewerDashboard;
