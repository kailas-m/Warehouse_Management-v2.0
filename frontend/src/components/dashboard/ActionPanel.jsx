import React from "react";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import "../../styles/dashboard-enterprise.css";

/**
 * ActionPanel - "What needs attention now?" section
 * Props:
 *   - actions: Array of { title, count, priority, onReview }
 *     - title: Action description (e.g., "Purchase Requests Pending Approval")
 *     - count: Number of items
 *     - priority: "high" | "medium" | "low"
 *     - onReview: Click handler for Review button
 */
const ActionPanel = ({ actions = [] }) => {
    const getPriorityIcon = (priority) => {
        switch (priority) {
            case "high": return <AlertCircle size={20} className="priority-icon-high" />;
            case "medium": return <Clock size={20} className="priority-icon-medium" />;
            case "low": return <CheckCircle size={20} className="priority-icon-low" />;
            default: return <Clock size={20} />;
        }
    };

    const getPriorityClass = (priority) => {
        switch (priority) {
            case "high": return "action-item-high";
            case "medium": return "action-item-medium";
            case "low": return "action-item-low";
            default: return "";
        }
    };

    if (actions.length === 0) {
        return (
            <div className="action-panel">
                <div className="action-panel-header">Action Required</div>
                <div className="action-panel-empty">
                    <CheckCircle size={32} style={{ color: "#10b981" }} />
                    <p>All caught up! No pending actions.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="action-panel">
            <div className="action-panel-header">Action Required</div>
            <div className="action-list">
                {actions.map((action, idx) => (
                    <div key={idx} className={`action-item ${getPriorityClass(action.priority)}`}>
                        <div className="action-icon">{getPriorityIcon(action.priority)}</div>
                        <div className="action-content">
                            <div className="action-title">{action.title}</div>
                            <div className="action-count">{action.count} pending</div>
                        </div>
                        <button className="action-btn" onClick={action.onReview}>
                            Review
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActionPanel;
