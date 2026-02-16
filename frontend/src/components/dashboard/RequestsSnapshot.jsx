import React from "react";
import { FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import "../../styles/dashboard-enterprise.css";

/**
 * RequestsSnapshot - Latest Purchase/Transfer requests with inline actions
 * Props:
 *   - requests: Array of { id, product, quantity, requestedBy, status, type, onApprove, onReject }
 *   - title: Section title
 *   - showActions: Whether to show approve/reject buttons
 */
const RequestsSnapshot = ({ requests = [], title = "Recent Requests", showActions = false }) => {
    const getStatusBadge = (status) => {
        switch (status?.toUpperCase()) {
            case "APPROVED":
                return <span className="status-badge status-badge-success"><CheckCircle size={14} /> Approved</span>;
            case "REJECTED":
                return <span className="status-badge status-badge-danger"><XCircle size={14} /> Rejected</span>;
            case "PENDING":
                return <span className="status-badge status-badge-warning"><Clock size={14} /> Pending</span>;
            default:
                return <span className="status-badge status-badge-neutral">{status}</span>;
        }
    };

    if (requests.length === 0) {
        return (
            <div className="requests-snapshot">
                <div className="requests-snapshot-header">{title}</div>
                <div className="requests-snapshot-empty">
                    <FileText size={32} style={{ color: "#9ca3af" }} />
                    <p>No requests to display.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="requests-snapshot">
            <div className="requests-snapshot-header">{title}</div>
            <div className="requests-snapshot-table">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Requested By</th>
                            <th>Status</th>
                            {showActions && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((req, idx) => (
                            <tr key={idx}>
                                <td className="request-id">#{req.id}</td>
                                <td className="request-product">{req.product}</td>
                                <td className="request-quantity">{req.quantity}</td>
                                <td className="request-user">{req.requestedBy}</td>
                                <td>{getStatusBadge(req.status)}</td>
                                {showActions && req.status?.toUpperCase() === "PENDING" && (
                                    <td className="request-actions">
                                        <button
                                            className="action-btn-small action-btn-approve"
                                            onClick={() => req.onApprove && req.onApprove(req.id)}
                                        >
                                            Approve
                                        </button>
                                        <button
                                            className="action-btn-small action-btn-reject"
                                            onClick={() => req.onReject && req.onReject(req.id)}
                                        >
                                            Reject
                                        </button>
                                    </td>
                                )}
                                {showActions && req.status?.toUpperCase() !== "PENDING" && (
                                    <td className="request-actions">—</td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RequestsSnapshot;
