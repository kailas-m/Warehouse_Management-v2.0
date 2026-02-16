import React, { useEffect, useState } from "react";
import api from "../../api/axios";

const MyPurchaseRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await api.get("/purchase-requests/list/");
            if (res.data.results) {
                setRequests(res.data.results);
            } else {
                setRequests(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch requests", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p>Loading requests...</p>;

    return (
        <div style={{ padding: '20px' }}>
            <h1>My Purchase Requests</h1>
            <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr style={{ textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>ID</th>
                        <th style={{ padding: '12px' }}>Product</th>
                        <th style={{ padding: '12px' }}>Warehouse</th>
                        <th style={{ padding: '12px' }}>Quantity</th>
                        <th style={{ padding: '12px' }}>Status</th>
                        <th style={{ padding: '12px' }}>Processed At</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map(req => (
                        <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px' }}>#{req.id}</td>
                            <td style={{ padding: '12px' }}>{req.product}</td>
                            <td style={{ padding: '12px' }}>{req.warehouse}</td>
                            <td style={{ padding: '12px' }}>{req.quantity}</td>
                            <td style={{ padding: '12px' }}>
                                <span style={{
                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.9em',
                                    background: req.status === 'APPROVED' ? '#dcfce7' : req.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                                    color: req.status === 'APPROVED' ? '#166534' : req.status === 'REJECTED' ? '#991b1b' : '#854d0e'
                                }}>
                                    {req.status}
                                </span>
                            </td>
                            <td style={{ padding: '12px', color: '#64748b' }}>
                                {req.processed_at ? new Date(req.processed_at).toLocaleString() : '-'}
                            </td>
                        </tr>
                    ))}
                    {requests.length === 0 && (
                        <tr>
                            <td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>No requests found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default MyPurchaseRequests;
