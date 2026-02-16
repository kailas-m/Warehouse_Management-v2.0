import React, { useState, useEffect } from "react";
import { Activity, Package, ArrowRightLeft, Users, FileText, ChevronDown, ChevronUp, Filter, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import PaginationControls from "../PaginationControls";
import "../../styles/dashboard-enterprise.css";

/**
 * Event Normalization Map - Maps backend event codes to human-readable labels, categories, and severity
 */
const EVENT_NORMALIZATION_MAP = {
    // Purchase Request Events
    "PURCHASE_REQUESTED": { label: "Purchase Requested", category: "purchase", severity: "warning" },
    "PURCHASE_APPROVED": { label: "Purchase Approved", category: "purchase", severity: "success" },
    "PURCHASE_REJECTED": { label: "Purchase Rejected", category: "purchase", severity: "failure" },
    "PURCHASE_COMPLETED": { label: "Purchase Completed", category: "purchase", severity: "success" },

    // Transfer Request Events
    "TRANSFER_REQUESTED": { label: "Transfer Requested", category: "transfer", severity: "warning" },
    "TRANSFER_CREATED": { label: "Transfer Created", category: "transfer", severity: "warning" },
    "TRANSFER_APPROVED": { label: "Transfer Approved", category: "transfer", severity: "success" },
    "TRANSFER_REJECTED": { label: "Transfer Rejected", category: "transfer", severity: "failure" },
    "TRANSFER_COMPLETED": { label: "Transfer Completed", category: "transfer", severity: "success" },

    // Staff/User Events
    "STAFF_REQUESTED": { label: "Staff Registration Requested", category: "staff", severity: "warning" },
    "STAFF_APPROVED": { label: "Staff Approved", category: "staff", severity: "success" },
    "STAFF_REJECTED": { label: "Staff Rejected", category: "staff", severity: "failure" },
    "STAFF_DISMISSED": { label: "Staff Dismissed", category: "staff", severity: "failure" },
    "MANAGER_APPROVED": { label: "Manager Approved", category: "staff", severity: "success" },
    "MANAGER_REJECTED": { label: "Manager Rejected", category: "staff", severity: "failure" },
    "USER_PROMOTED": { label: "User Promoted", category: "staff", severity: "success" },

    // Stock/Inventory Events
    "STOCK_ADDED": { label: "Stock Added", category: "inventory", severity: "success" },
    "STOCK_REMOVED": { label: "Stock Removed", category: "inventory", severity: "neutral" },
    "STOCK_ADJUSTED": { label: "Stock Adjusted", category: "inventory", severity: "warning" },
    "STOCK_IN": { label: "Stock Received", category: "inventory", severity: "success" },
    "STOCK_OUT": { label: "Stock Dispatched", category: "inventory", severity: "neutral" },
    "LOW_STOCK_ALERT": { label: "Low Stock Alert", category: "inventory", severity: "warning" },

    // Product Events
    "PRODUCT_CREATED": { label: "Product Created", category: "inventory", severity: "success" },
    "PRODUCT_UPDATED": { label: "Product Updated", category: "inventory", severity: "neutral" },
    "PRODUCT_DELETED": { label: "Product Deleted", category: "inventory", severity: "failure" },
};

/**
 * ActivityLogs - Professional structured audit table  
 * Props:
 *   - logs: Array of audit events from backend
 *   - title: Section title
 *   - page: Current page number
 *   - totalItems: Total number of items
 *   - pageSize: Number of items per page
 *   - onPageChange: (page: number) => void
 *   - sortField: Current sort field
 *   - sortOrder: 'asc' | 'desc'
 *   - onSortChange: (field: string) => void
 *   - onRefresh: () => void
 */
const ActivityLogs = ({
    logs = [],
    title = "System Activity & Audit Logs",
    page = 1,
    totalItems = 0,
    pageSize = 10,
    onPageChange,
    sortField = 'timestamp',
    sortOrder = 'desc',
    onSortChange,
    onRefresh,
    isLoading = false
}) => {
    const [expandedRow, setExpandedRow] = useState(null);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [severityFilter, setSeverityFilter] = useState("all");

    // Reset filters and expanded state when page or sort changes
    useEffect(() => {
        setExpandedRow(null);
        setCategoryFilter("all");
        setSeverityFilter("all");
    }, [page, sortField, sortOrder]);

    // Normalize event type to human-readable using the map
    const normalizeEventName = (eventType) => {
        if (!eventType) return "Unknown Event";

        // Check if we have a mapping
        const normalized = EVENT_NORMALIZATION_MAP[eventType];
        if (normalized) {
            return normalized.label;
        }

        // Fallback: convert underscores to spaces and capitalize
        return eventType
            .replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());
    };

    // Get category from event type using the map
    const getCategory = (eventType) => {
        if (!eventType) return "system";

        // Check if we have a mapping
        const normalized = EVENT_NORMALIZATION_MAP[eventType];
        if (normalized) {
            return normalized.category;
        }

        // Fallback: try to infer from event name
        const type = eventType.toUpperCase();
        if (type.includes("PURCHASE")) return "purchase";
        if (type.includes("TRANSFER")) return "transfer";
        if (type.includes("STAFF") || type.includes("MANAGER") || type.includes("USER")) return "staff";
        if (type.includes("STOCK") || type.includes("PRODUCT")) return "inventory";
        return "system";
    };

    // Get severity using the map
    const getSeverity = (eventType) => {
        if (!eventType) return "neutral";

        // Check if we have a mapping
        const normalized = EVENT_NORMALIZATION_MAP[eventType];
        if (normalized) {
            return normalized.severity;
        }

        // Fallback: try to infer from event name
        const type = eventType.toUpperCase();
        if (type.includes("APPROVED") || type.includes("COMPLETED") || type.includes("ADDED")) return "success";
        if (type.includes("REJECTED") || type.includes("FAILED") || type.includes("DISMISSED") || type.includes("DELETED")) return "failure";
        if (type.includes("PENDING") || type.includes("REQUESTED") || type.includes("ALERT")) return "warning";
        return "neutral";
    };

    // Category icon
    const getCategoryIcon = (category) => {
        switch (category) {
            case "inventory":
                return <Package size={16} />;
            case "transfer":
                return <ArrowRightLeft size={16} />;
            case "staff":
                return <Users size={16} />;
            case "purchase":
                return <FileText size={16} />;
            default:
                return <Activity size={16} />;
        }
    };

    // Severity badge
    const getSeverityBadge = (severity) => {
        return <span className={`audit-badge audit-badge-${severity}`}></span>;
    };

    // Filter logs based on selected category and severity
    const filteredLogs = logs.filter(log => {
        const category = getCategory(log.event_type);
        const severity = getSeverity(log.event_type);

        if (categoryFilter !== "all" && category !== categoryFilter) return false;
        if (severityFilter !== "all" && severity !== severityFilter) return false;
        return true;
    });

    // Format timestamp
    const formatTime = (timestamp) => {
        if (!timestamp) return "—";
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Toggle row expansion
    const toggleRow = (logId) => {
        setExpandedRow(expandedRow === logId ? null : logId);
    };

    // Render sort icon
    const renderSortIcon = (field) => {
        if (sortField !== field) {
            return <ArrowUp size={14} style={{ opacity: 0.3 }} />;
        }
        return sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    // Handle sort click
    const handleSortClick = (field) => {
        if (onSortChange) {
            onSortChange(field);
        }
    };

    if (!logs || logs.length === 0) {
        return (
            <div className="activity-logs">
                <div className="activity-logs-header">{title}</div>
                <div className="activity-logs-empty">
                    <Activity size={48} style={{ opacity: 0.3 }} />
                    <p>No activity logs available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="activity-logs">
            <div className="activity-logs-header-row">
                <div className="activity-logs-header">{title}</div>
                <div className="activity-logs-filters">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="audit-filter"
                    >
                        <option value="all">All Categories</option>
                        <option value="inventory">Inventory</option>
                        <option value="transfer">Transfer</option>
                        <option value="purchase">Purchase</option>
                        <option value="staff">Staff</option>
                    </select>
                    <select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        className="audit-filter"
                    >
                        <option value="all">All Severity</option>
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                        <option value="failure">Failure</option>
                    </select>
                    {onRefresh && (
                        <button
                            className="audit-refresh-btn"
                            onClick={onRefresh}
                            title="Refresh logs"
                        >
                            <RefreshCw size={16} />
                        </button>
                    )}
                </div>
            </div>

            {filteredLogs.length === 0 ? (
                <div className="activity-logs-empty">
                    <Filter size={48} style={{ opacity: 0.3 }} />
                    <p>No logs match your filters</p>
                </div>
            ) : (
                <div className="activity-logs-table-wrapper" style={{ position: 'relative' }}>
                    {isLoading && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(255, 255, 255, 0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            borderRadius: '8px'
                        }}>
                            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                    )}
                    <table className="audit-table">
                        <thead>
                            <tr>
                                <th style={{ width: "24px" }}></th>
                                <th
                                    style={{ width: "140px", cursor: "pointer" }}
                                    onClick={() => handleSortClick('timestamp')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        TIME {renderSortIcon('timestamp')}
                                    </div>
                                </th>
                                <th style={{ width: "120px" }}>CATEGORY</th>
                                <th
                                    style={{ cursor: "pointer" }}
                                    onClick={() => handleSortClick('event_type')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        EVENT {renderSortIcon('event_type')}
                                    </div>
                                </th>
                                <th>TARGET</th>
                                <th
                                    style={{ cursor: "pointer" }}
                                    onClick={() => handleSortClick('performed_by')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        ACTOR {renderSortIcon('performed_by')}
                                    </div>
                                </th>
                                <th style={{ width: "100px" }}>IMPACT</th>
                                <th style={{ width: "40px" }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map((log) => {
                                const category = getCategory(log.event_type);
                                const severity = getSeverity(log.event_type);
                                const isExpanded = expandedRow === log.event_id;

                                return (
                                    <React.Fragment key={log.event_id}>
                                        <tr className={`audit-row ${isExpanded ? 'audit-row-expanded' : ''}`}>
                                            <td>{getSeverityBadge(severity)}</td>
                                            <td className="audit-time">{formatTime(log.timestamp)}</td>
                                            <td className="audit-category">
                                                {getCategoryIcon(category)}
                                                <span className="audit-category-text">{category}</span>
                                            </td>
                                            <td className="audit-event">{normalizeEventName(log.event_type)}</td>
                                            <td className="audit-entity">{log.main_text || "—"}</td>
                                            <td className="audit-user">{log.performed_by || "System"}</td>
                                            <td className={`audit-impact ${log.quantity_change > 0 ? 'impact-positive' : log.quantity_change < 0 ? 'impact-negative' : ''}`}>
                                                {log.quantity_change ? (log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change) : "—"}
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => toggleRow(log.event_id)}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        padding: "4px",
                                                        display: "flex",
                                                        alignItems: "center"
                                                    }}
                                                >
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="audit-row-expanded">
                                                <td colSpan="8">
                                                    <div className="audit-details">
                                                        <div className="audit-details-grid">
                                                            <div>
                                                                <strong>Event ID</strong>
                                                                <div><code>{log.event_id}</code></div>
                                                            </div>
                                                            <div>
                                                                <strong>Event Type</strong>
                                                                <div><code>{log.event_type}</code></div>
                                                            </div>
                                                            <div>
                                                                <strong>Status</strong>
                                                                <div>{log.status || "—"}</div>
                                                            </div>
                                                            {log.source_warehouse && (
                                                                <div>
                                                                    <strong>From Warehouse</strong>
                                                                    <div>{log.source_warehouse}</div>
                                                                </div>
                                                            )}
                                                            {log.destination_warehouse && (
                                                                <div>
                                                                    <strong>To Warehouse</strong>
                                                                    <div>{log.destination_warehouse}</div>
                                                                </div>
                                                            )}
                                                            {log.sub_text && (
                                                                <div>
                                                                    <strong>Details</strong>
                                                                    <div>{log.sub_text}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination Controls - Always visible when pagination is enabled */}
            {onPageChange && totalItems > 0 && (
                <PaginationControls
                    currentPage={page}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    );
};

export default ActivityLogs;
