import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Edit2, ChevronRight, User, MapPin, Calendar, Shield, CheckCircle } from "lucide-react";
import "../../styles/profile.css";

// Common country codes for phone validation
const COUNTRY_CODES = [
    { code: "+1", country: "US/CA", minDigits: 10, maxDigits: 10 },
    { code: "+44", country: "UK", minDigits: 10, maxDigits: 10 },
    { code: "+91", country: "India", minDigits: 10, maxDigits: 10 },
    { code: "+61", country: "Australia", minDigits: 9, maxDigits: 9 },
    { code: "+86", country: "China", minDigits: 11, maxDigits: 11 },
    { code: "+81", country: "Japan", minDigits: 10, maxDigits: 10 },
    { code: "+49", country: "Germany", minDigits: 10, maxDigits: 11 },
    { code: "+33", country: "France", minDigits: 9, maxDigits: 9 },
];

const ProfilePage = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    // State Management
    const [mode, setMode] = useState("VIEW");
    const [profileData, setProfileData] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);

    // Country Code State
    const [countryCode, setCountryCode] = useState("+1");

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get("/profile/");
            setProfileData(res.data);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch profile", err);
            setError("Unable to load profile data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const parsePhoneNumber = (fullPhone) => {
        if (!fullPhone) return { code: "+1", number: "" };

        // Try to match against known country codes
        for (const c of COUNTRY_CODES) {
            if (fullPhone.startsWith(c.code)) {
                return {
                    code: c.code,
                    number: fullPhone.slice(c.code.length).trim()
                };
            }
        }

        // Default fallback
        return { code: "+1", number: fullPhone };
    };

    const handleEditMode = () => {
        const { code, number } = parsePhoneNumber(profileData.profile.phone_number);

        setEditForm({
            full_name: profileData.profile.full_name || "",
            phone_number: number,
            gender: profileData.profile.gender || "",
            email: profileData.user.email || "",
        });
        setCountryCode(code);
        setImagePreview(null);
        setImageFile(null);
        setMode("EDIT");
    };

    const handleCancelEdit = () => {
        setEditForm(null);
        setImagePreview(null);
        setImageFile(null);
        setCountryCode("+1");
        setMode("VIEW");
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;

        // For phone number, only allow digits
        if (name === "phone_number") {
            const digitsOnly = value.replace(/\D/g, '');
            setEditForm({ ...editForm, [name]: digitsOnly });
        } else {
            setEditForm({ ...editForm, [name]: value });
        }
    };

    const handleCountryCodeChange = (e) => {
        setCountryCode(e.target.value);
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                showToast("Image size must be less than 5MB", "error", "File Too Large");
                return;
            }

            // Validate file type
            if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
                showToast("Only JPG and PNG images are allowed", "error", "Invalid Format");
                return;
            }

            setImageFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleResetImage = async () => {
        if (!window.confirm("Reset profile picture to default?")) return;

        try {
            await api.delete("/profile/");
            showToast("Profile picture reset successfully", "success");
            fetchProfile();
            window.location.reload();
        } catch (err) {
            showToast("Failed to reset profile picture", "error");
        }
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone, code) => {
        const countryInfo = COUNTRY_CODES.find(c => c.code === code);
        if (!countryInfo) return false;

        const digitsOnly = phone.replace(/\D/g, '');
        return digitsOnly.length >= countryInfo.minDigits &&
            digitsOnly.length <= countryInfo.maxDigits;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!editForm.full_name.trim()) {
            showToast("Full name is required", "error", "Validation Error");
            return;
        }

        if (!editForm.gender || editForm.gender === "") {
            showToast("Please select a gender", "error", "Validation Error");
            return;
        }

        if (editForm.email && !validateEmail(editForm.email)) {
            showToast("Please enter a valid email address", "error", "Invalid Email");
            return;
        }

        if (editForm.phone_number && !validatePhone(editForm.phone_number, countryCode)) {
            const countryInfo = COUNTRY_CODES.find(c => c.code === countryCode);
            showToast(
                `Phone number must be ${countryInfo.minDigits}-${countryInfo.maxDigits} digits for ${countryInfo.country}`,
                "error",
                "Invalid Phone Number"
            );
            return;
        }

        setSubmitting(true);

        const fullPhoneNumber = editForm.phone_number
            ? `${countryCode}${editForm.phone_number.trim()}`
            : "";

        const formData = new FormData();
        formData.append("full_name", editForm.full_name);
        formData.append("phone_number", fullPhoneNumber);
        formData.append("gender", editForm.gender);
        formData.append("email", editForm.email);

        if (imageFile) {
            formData.append("profile_image", imageFile);
        }

        try {
            await api.patch("/profile/", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            showToast("Profile updated successfully", "success", "Saved");
            await fetchProfile();
            setMode("VIEW");
            window.location.reload();
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Unable to update profile. Please review your information and try again.";
            showToast(errorMsg, "error", "Update Failed");
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="profile-container">
                <div className="profile-loading">Loading profile...</div>
            </div>
        );
    }

    if (error || !profileData) {
        return (
            <div className="profile-container">
                <div className="profile-error">{error || "Profile not found"}</div>
            </div>
        );
    }

    const { user: userData, profile } = profileData;

    return (
        <div className="profile-container">
            {/* Header */}
            <div className="profile-header">
                <div className="profile-header-content">
                    <div className="profile-breadcrumb">
                        <span onClick={() => navigate("/")} style={{ cursor: "pointer" }}>Dashboard</span>
                        <ChevronRight size={16} />
                        <span>Profile</span>
                    </div>
                    <h1 className="profile-title">My Profile</h1>
                    <p className="profile-subtitle">Account & Access Information</p>
                </div>
                {mode === "VIEW" && (
                    <button className="btn-edit-profile" onClick={handleEditMode}>
                        <Edit2 size={16} />
                        Edit Profile
                    </button>
                )}
            </div>

            {mode === "VIEW" ? (
                /* VIEW MODE */
                <div className="profile-content">
                    {/* Profile Summary Card */}
                    <div className="profile-summary-card">
                        <div className="profile-avatar-section">
                            {profile.profile_image ? (
                                <img
                                    src={profile.profile_image}
                                    alt="Profile"
                                    className="profile-avatar"
                                />
                            ) : (
                                <div className="profile-avatar-placeholder">
                                    {(userData.username || 'U').charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="profile-identity">
                            <h2 className="profile-username">{userData.username}</h2>
                            <div className="profile-badges">
                                <span className={`role-badge role-${userData.role.toLowerCase()}`}>
                                    {userData.role}
                                </span>
                                <span className="status-badge status-active">
                                    <CheckCircle size={14} />
                                    Active
                                </span>
                            </div>
                        </div>
                        <div className="profile-meta">
                            <div className="profile-meta-item">
                                <Calendar size={14} />
                                <span>Member since {new Date(userData.date_joined).toLocaleDateString()}</span>
                            </div>
                            {userData.last_login && (
                                <div className="profile-meta-item">
                                    <Shield size={14} />
                                    <span>Last login {new Date(userData.last_login).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Information Sections */}
                    <div className="profile-sections">
                        {/* Personal Information */}
                        <div className="profile-section">
                            <h3 className="section-title">Personal Information</h3>
                            <div className="section-grid">
                                <div className="info-field">
                                    <label>Full Name</label>
                                    <p>{profile.full_name || "Not set"}</p>
                                </div>
                                <div className="info-field">
                                    <label>Gender</label>
                                    <p>{profile.gender || "Not set"}</p>
                                </div>
                                <div className="info-field">
                                    <label>Phone Number</label>
                                    <p>{profile.phone_number || "Not set"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Account Information */}
                        <div className="profile-section">
                            <h3 className="section-title">Account Information</h3>
                            <div className="section-grid">
                                <div className="info-field">
                                    <label>Username</label>
                                    <p className="read-only">{userData.username}</p>
                                </div>
                                <div className="info-field">
                                    <label>Email</label>
                                    <p>{userData.email}</p>
                                </div>
                                <div className="info-field">
                                    <label>Role</label>
                                    <p className="read-only">{userData.role}</p>
                                </div>
                            </div>
                        </div>

                        {/* System Access */}
                        {userData.assigned_warehouses && userData.assigned_warehouses.length > 0 && (
                            <div className="profile-section">
                                <h3 className="section-title">System Access & Scope</h3>
                                <div className="section-content">
                                    <div className="info-field">
                                        <label>Assigned Warehouses</label>
                                        <div className="warehouse-list">
                                            {userData.assigned_warehouses.map((wh) => (
                                                <span key={wh.id} className="warehouse-badge">
                                                    <MapPin size={14} />
                                                    {wh.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="info-field">
                                        <label>Scope</label>
                                        <p className="read-only">
                                            {userData.role === "ADMIN"
                                                ? "Global Access"
                                                : `${userData.assigned_warehouses.length} Warehouse${userData.assigned_warehouses.length > 1 ? 's' : ''}`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* EDIT MODE */
                <form className="profile-edit-form" onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h3 className="section-title">Profile Picture</h3>
                        <div className="image-upload-section">
                            <div className="image-preview">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="profile-avatar" />
                                ) : profile.profile_image ? (
                                    <img src={profile.profile_image} alt="Current" className="profile-avatar" />
                                ) : (
                                    <div className="profile-avatar-placeholder">
                                        {(userData.username || 'U').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="image-controls">
                                <label className="btn-upload">
                                    <User size={16} />
                                    Change Photo
                                    <input
                                        type="file"
                                        onChange={handleImageChange}
                                        accept="image/jpeg,image/jpg,image/png"
                                        style={{ display: "none" }}
                                    />
                                </label>
                                {profile.profile_image && (
                                    <button type="button" className="btn-reset" onClick={handleResetImage}>
                                        Reset to Default
                                    </button>
                                )}
                                <p className="image-hint">JPG or PNG, max 5MB</p>
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3 className="section-title">Personal Information</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="full_name">Full Name *</label>
                                <input
                                    id="full_name"
                                    name="full_name"
                                    value={editForm.full_name}
                                    onChange={handleFormChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="gender">Gender *</label>
                                <select
                                    id="gender"
                                    name="gender"
                                    value={editForm.gender}
                                    onChange={handleFormChange}
                                    required
                                >
                                    <option value="" disabled>Select Gender...</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone_number">Phone Number</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select
                                        value={countryCode}
                                        onChange={handleCountryCodeChange}
                                        style={{ width: '120px', flexShrink: 0 }}
                                        className="country-code-select"
                                    >
                                        {COUNTRY_CODES.map(c => (
                                            <option key={c.code} value={c.code}>
                                                {c.code} {c.country}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        id="phone_number"
                                        name="phone_number"
                                        value={editForm.phone_number}
                                        onChange={handleFormChange}
                                        placeholder="Enter mobile number"
                                        style={{ flex: 1 }}
                                    />
                                </div>
                                <p className="field-hint">Select country code and enter mobile number (digits only)</p>
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3 className="section-title">Account Information</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={editForm.email}
                                    onChange={handleFormChange}
                                />
                                <p className="field-hint">Changing your email may affect login notifications</p>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn-save" disabled={submitting}>
                            {submitting ? "Saving..." : "Save Changes"}
                        </button>
                        <button type="button" className="btn-cancel" onClick={handleCancelEdit} disabled={submitting}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ProfilePage;
