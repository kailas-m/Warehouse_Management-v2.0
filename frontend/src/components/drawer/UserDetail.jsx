import React from 'react';
import { User, Mail, Shield, Calendar } from 'lucide-react';

const UserDetail = ({ data }) => {
    if (!data) return null;

    return (
        <div>
            <div className="drawer-section">
                <div className="drawer-section-title">User Information</div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Username</div>
                    <div className="drawer-field-value">{data.username}</div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Email</div>
                    <div className="drawer-field-value">{data.email}</div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Role</div>
                    <div className="drawer-field-value">
                        <span className="drawer-badge drawer-badge-neutral">
                            {data.role}
                        </span>
                    </div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Status</div>
                    <div className="drawer-field-value">
                        <span className={`drawer-badge ${data.is_active ? 'drawer-badge-success' : 'drawer-badge-error'}`}>
                            {data.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Joined</div>
                    <div className="drawer-field-value">
                        {data.date_joined ? new Date(data.date_joined).toLocaleDateString() : '—'}
                    </div>
                </div>

                <div className="drawer-field">
                    <div className="drawer-field-label">Last Login</div>
                    <div className="drawer-field-value">
                        {data.last_login ? new Date(data.last_login).toLocaleString() : 'Never'}
                    </div>
                </div>
            </div>

            {data.profile && (
                <div className="drawer-section">
                    <div className="drawer-section-title">Profile Information</div>

                    <div className="drawer-field">
                        <div className="drawer-field-label">Full Name</div>
                        <div className="drawer-field-value">{data.profile.full_name || '—'}</div>
                    </div>

                    <div className="drawer-field">
                        <div className="drawer-field-label">Phone Number</div>
                        <div className="drawer-field-value">{data.profile.phone_number || '—'}</div>
                    </div>

                    <div className="drawer-field">
                        <div className="drawer-field-label">Gender</div>
                        <div className="drawer-field-value">{data.profile.gender || '—'}</div>
                    </div>
                </div>
            )}

            {data.assigned_warehouses && data.assigned_warehouses.length > 0 && (
                <div className="drawer-section">
                    <div className="drawer-section-title">Assigned Warehouses</div>

                    <div style={{ marginTop: '12px' }}>
                        {data.assigned_warehouses.map((warehouse, idx) => (
                            <div key={idx} style={{
                                padding: '12px',
                                background: '#f9fafb',
                                borderRadius: '6px',
                                marginBottom: '8px'
                            }}>
                                <div style={{ fontWeight: 600 }}>{warehouse.name}</div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>ID: {warehouse.id}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDetail;
