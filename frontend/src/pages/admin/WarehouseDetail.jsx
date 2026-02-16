import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

const WarehouseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [warehouse, setWarehouse] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const fetchDetails = async () => {
        try {
            const res = await api.get(`/warehouses/${id}/`);
            setWarehouse(res.data);
        } catch (err) {
            console.error("Failed to fetch warehouse details", err);
            const msg = err.response?.data?.error || "Failed to load warehouse details";
            alert(msg);
            navigate("/warehouses");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p>Loading details...</p>;
    if (!warehouse) return <p>Warehouse not found</p>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ marginBottom: '5px' }}>{warehouse.name}</h1>
                    <span style={{ color: '#64748b', fontSize: '1rem' }}>{warehouse.location}</span>
                </div>
                <button onClick={() => navigate("/warehouses")} className="btn-secondary" style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #D5DBDB', borderRadius: '4px', cursor: 'pointer' }}>
                    Back
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div className="card">
                    <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px', fontSize: '1.1rem', fontWeight: 700 }}>Overview</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Items</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{warehouse.stats.total_quantity}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Value</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${warehouse.stats.total_value.toLocaleString()}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Staff Count</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{warehouse.stats.staff_count}</div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px', fontSize: '1.1rem', fontWeight: 700 }}>Management</h3>
                    {warehouse.manager ? (
                        <div>
                            <div style={{ fontWeight: '500' }}>{warehouse.manager.username}</div>
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{warehouse.manager.email}</div>
                        </div>
                    ) : (
                        <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No Manager Assigned</div>
                    )}
                </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '15px', fontWeight: 700 }}>Staff Members</h2>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', color: '#475569' }}>Username</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', color: '#475569' }}>Email</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', color: '#475569' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {warehouse.staffs.length > 0 ? (
                                warehouse.staffs.map(staff => (
                                    <tr key={staff.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '12px' }}>{staff.username}</td>
                                        <td style={{ padding: '12px' }}>{staff.email}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                fontSize: '0.75rem',
                                                background: staff.is_active ? '#dcfce7' : '#f1f5f9',
                                                color: staff.is_active ? '#166534' : '#64748b'
                                            }}>
                                                {staff.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No staff assigned</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '15px', fontWeight: 700 }}>Current Inventory</h2>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', color: '#475569' }}>Product</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', color: '#475569' }}>SKU</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.9rem', color: '#475569' }}>Quantity</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.9rem', color: '#475569' }}>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {warehouse.stocks.length > 0 ? (
                                warehouse.stocks.map(stock => (
                                    <tr key={stock.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '12px' }}>{stock.product_name}</td>
                                        <td style={{ padding: '12px', color: '#64748b', fontSize: '0.9rem' }}>{stock.sku || '-'}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>{stock.quantity}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>${stock.value.toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No stock available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default WarehouseDetail;
