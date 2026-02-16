import React, { useState } from "react";
import api from "../../api/axios";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import "../../styles/auth.css"; // Using same styles as Login

const Register = () => {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "VIEWER",
        full_name: "",
        phone_number: "",
    });
    const [profileImage, setProfileImage] = useState(null);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setProfileImage(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        const data = new FormData();
        data.append("username", formData.username);
        data.append("email", formData.email);
        data.append("password", formData.password);
        data.append("role", formData.role);
        data.append("full_name", formData.full_name);
        data.append("phone_number", formData.phone_number);
        if (profileImage) {
            data.append("profile_image", profileImage);
        }

        try {
            await api.post("/auth/register/", data, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            showToast("Registration successful! Please login.", "success");
            navigate("/login");
        } catch (err) {
            console.error("Registration Error:", err);
            let errorMessage = "Registration failed. Please try again.";

            if (err.response?.data) {
                if (typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                } else if (typeof err.response.data === 'object') {
                    // Combine all field errors into a single string
                    errorMessage = Object.entries(err.response.data)
                        .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(" ") : val}`)
                        .join("\n");
                }
            }
            setError(errorMessage);
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleSubmit} className="login-form">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <img src="/logo.png" alt="Nexus Inventory Logo" style={{ maxHeight: '60px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                </div>
                <h2>Register</h2>
                {error && <p className="error-message" style={{ whiteSpace: 'pre-wrap' }}>{error}</p>}

                <div className="form-group">
                    <label>Role</label>
                    <select name="role" value={formData.role} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
                        <option value="VIEWER">Viewer (Regular User)</option>
                        <option value="STAFF">Staff (Requires Approval)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Username</label>
                    <input type="text" name="username" value={formData.username} onChange={handleChange} required />
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>

                <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} />
                </div>

                <div className="form-group">
                    <label>Phone Number</label>
                    <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} />
                </div>

                <div className="form-group">
                    <label>Profile Image</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ padding: '10px 0' }} />
                </div>

                <div className="form-group">
                    <label>Password</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} required />
                </div>

                <div className="form-group">
                    <label>Confirm Password</label>
                    <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                </div>

                <button type="submit">Sign Up</button>

                <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '0.9rem' }}>
                    Already have an account? <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none' }}>Log In</Link>
                </div>
            </form>
        </div>
    );
};

export default Register;
