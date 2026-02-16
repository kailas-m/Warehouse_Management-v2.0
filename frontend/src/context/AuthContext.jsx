import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { username, role, ... }
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem("access_token");
        if (token) {
            try {
                // Build user object from stored data or fetch profile
                // For now, we rely on what we have or fetch profile
                const res = await api.get("/profile/");
                // Backend returns { user: { role: "ADMIN", ... }, profile: ... } based on my previous analysis
                const userData = {
                    ...res.data.user,
                    profile: res.data.profile
                };
                // console.log("Auth User Loaded:", userData);
                setUser(userData);
                setLoading(false);
                return userData;
            } catch (error) {
                console.error("Auth check failed", error);
                // Only logout if 401 Unauthorized
                if (error.response && error.response.status === 401) {
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                    setUser(null);
                }
                // Don't clear user if it's a 500 or network error, just let them retry or stay authenticated if they were
                setLoading(false);
                return null;
            }
        }
        setLoading(false);
        return null;
    };

    const login = async (username, password) => {
        setLoading(true);
        try {
            const res = await api.post("/auth/login/", { username, password });
            localStorage.setItem("access_token", res.data.access);
            localStorage.setItem("refresh_token", res.data.refresh);

            // Fetch profile immediately to get role
            const userData = await checkAuth();
            if (!userData) {
                throw new Error("Failed to load user profile. Please try again.");
            }
            return true;
        } catch (e) {
            setLoading(false);
            throw e;
        }
    };

    const logout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_role");
        setUser(null);
        window.location.href = "/login";
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {loading ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading Application...</div> : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
