import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import PaginationControls from "../../components/PaginationControls";

const TransferRequestsList = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;

    useEffect(() => {
        fetchRequests(1);
    }, []);

    const fetchRequests = async (page = 1) => {
        try {
            setLoading(true);
            const res = await api.get(`/staff-transfers/?page=${page}`);

            if (res.data.results) {
                setRequests(res.data.results);
                setTotalItems(res.data.count);
            } else {
                setRequests(res.data);
                setTotalItems(res.data.length);
            }
        } catch (err) {
            console.error("Failed to fetch transfer requests", err);
        } finally {
            setLoading(false);
        }
    };

    const onPageChange = (newPage) => {
        setCurrentPage(newPage);
        fetchRequests(newPage);
    };

    const handleApprove = async (id) => {
        try {
            await api.post(`/staff-transfers/${id}/approve/`);
            alert("Transfer approved!");
            fetchRequests(currentPage);
        } catch (err) {
            alert(err.response?.data?.error || "Failed to approve transfer");
        }
    };

    const handleReject = async (id) => {
        if (!confirm("Reject this transfer request?")) return;
        try {
            await api.post(`/staff-transfers/${id}/reject/`);
            alert("Transfer rejected.");
            fetchRequests(currentPage);
        } catch (err) {
            alert(err.response?.data?.error || "Failed to reject transfer");
        }
    };

    if (loading && requests.length === 0) return <div>Loading Requests...</div>;
    if (!loading && requests.length === 0) return <div>No pending transfer requests.</div>;

    return (
        <div style={{ marginTop: '20px', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>Pending Transfer Requests</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '10px' }}>Staff</th>
                        <th style={{ padding: '10px' }}>From</th>
                        <th style={{ padding: '10px' }}>To</th>
                        <th style={{ padding: '10px' }}>Requested By</th>
                        <th style={{ padding: '10px' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map(req => (
                        <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px' }}>
                                <strong>{req.staff_username}</strong>
                            </td>
                            <td style={{ padding: '10px' }}>{req.current_warehouse_name || "Unassigned"}</td>
                            <td style={{ padding: '10px' }}>{req.target_warehouse_name}</td>
                            <td style={{ padding: '10px' }}>{req.requested_by_username}</td>
                            <td style={{ padding: '10px' }}>
                                <button
                                    onClick={() => handleApprove(req.id)}
                                    style={{
                                        marginRight: '10px',
                                        padding: '5px 10px',
                                        background: '#22c55e',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleReject(req.id)}
                                    style={{
                                        padding: '5px 10px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Reject
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <PaginationControls
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={onPageChange}
            />
        </div>
    );
};

export default TransferRequestsList;
