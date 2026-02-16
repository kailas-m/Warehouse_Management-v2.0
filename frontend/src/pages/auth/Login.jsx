import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import "../../styles/auth.css"; // We'll create this later or use globals

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();

    useEffect(() => {
        if (user) {
            navigate("/");
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await login(username, password);
            // Navigation handled by useEffect
        } catch (err) {
            console.error("Login Error:", err);
            const errorMessage = err.response?.data?.detail || err.response?.data?.error || "Login failed. Please check your credentials.";
            setError(errorMessage);
            showToast(errorMessage, "error");
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleSubmit} className="login-form">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <img src="/logo.png" alt="Nexus Inventory Logo" style={{ maxHeight: '60px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                </div>
                <h2>Login</h2>
                {error && <p className="error-message">{error}</p>}
                <div className="form-group">
                    <label>Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Log In</button>

                <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '0.9rem' }}>
                    Don't have an account? <Link to="/register" style={{ color: '#3b82f6', textDecoration: 'none' }}>Register</Link>
                </div>
            </form>
        </div>
    );
};

export default Login;
