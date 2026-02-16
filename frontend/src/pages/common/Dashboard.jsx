import React from "react";
import { useAuth } from "../../context/AuthContext";
import AdminDashboard from "../dashboard/AdminDashboard";
import ManagerDashboard from "../dashboard/ManagerDashboard";
import StaffDashboard from "../dashboard/StaffDashboard";
import ViewerDashboard from "../dashboard/ViewerDashboard";

const Dashboard = () => {
    const { user } = useAuth();

    if (!user) {
        return (
            <div style={{ padding: "40px", textAlign: "center" }}>
                <p>Loading user data...</p>
            </div>
        );
    }

    // Route to appropriate dashboard based on role
    switch (user.role) {
        case "ADMIN":
            return <AdminDashboard />;
        case "MANAGER":
            return <ManagerDashboard />;
        case "STAFF":
            return <StaffDashboard />;
        case "VIEWER":
            return <ViewerDashboard />;
        default:
            return (
                <div style={{ padding: "40px", textAlign: "center", color: "#dc2626" }}>
                    <h2>Unknown Role</h2>
                    <p>Your account role is not recognized. Please contact your administrator.</p>
                </div>
            );
    }
};

export default Dashboard;

