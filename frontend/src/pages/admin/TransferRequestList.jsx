import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useDrawer } from "../../context/DrawerContext";

import PaginationControls from "../../components/PaginationControls";
import FilterBar from "../../components/FilterBar";

const TransferRequestList = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { openDrawer } = useDrawer();
    const headerRef = useRef(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    useLayoutEffect(() => {
        const updateHeight = () => {
            if (headerRef.current) {
                setHeaderHeight(headerRef.current.offsetHeight);
            }
        };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        const observer = new ResizeObserver(updateHeight);
        if (headerRef.current) observer.observe(headerRef.current);
        return () => {
            window.removeEventListener('resize', updateHeight);
            observer.disconnect();
        };
    }, []);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;

    // Filters
    const [filters, setFilters] = useState({});

    useEffect(() => {
        fetchRequests(1);
    }, [filters]);

    const fetchRequests = async (page = 1) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page,
                ...filters
            }).toString();
            const res = await api.get(`/transfer-requests/list/?${queryParams}`);
            if (res.data.results) {
                setRequests(res.data.results);
                setTotalItems(res.data.count);
            } else {
                setRequests(res.data);
                setTotalItems(res.data.length);
            }
        } catch (err) {
            console.error("Failed to fetch transfers");
        } finally {
            setLoading(false);
        }
    };

    const onPageChange = (newPage) => {
        setCurrentPage(newPage);
        fetchRequests(newPage);
    };

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilters({});
        setCurrentPage(1);
    };

    const filterConfig = [
        {
            key: 'status', label: 'Status', type: 'select', options: [
                { value: 'PENDING', label: 'Pending' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' }
            ]
        },
        { key: 'product', label: 'Product Name', type: 'text' },
        { key: 'from_warehouse', label: 'From Wh (ID/Name)', type: 'text', group: 'advanced' },
        { key: 'to_warehouse', label: 'To Wh (ID/Name)', type: 'text', group: 'advanced' },
    ];

    const handleApprove = async (id, decision) => {
        try {
            await api.post("/transfer-requests/approve/", {
                transfer_request_id: id,
                decision: decision
            });
            alert(`Transfer ${decision.toLowerCase()}!`);
            fetchRequests(currentPage);
        } catch (err) {
            alert("Action failed. Check stock availability.");
        }
    };

    if (loading && requests.length === 0) return <p>Loading transfers...</p>;

    return (
        <div>
            <div ref={headerRef} className="sticky-page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px' }}>
                    <h1>Transfer Requests</h1>
                    {(user.role === "MANAGER") && (
                        <a href="/transfer-requests/new" style={{ padding: '8px 12px', background: '#3b82f6', color: 'white', borderRadius: '4px', textDecoration: 'none' }}>+ New Transfer</a>
                    )}
                </div>

                <FilterBar
                    filters={filterConfig}
                    activeFilters={filters}
                    onApply={handleApplyFilters}
                    onClear={handleClearFilters}
                />
            </div>

            <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse', background: 'white', '--header-offset': `${headerHeight}px` }}>
                <thead className="sticky-table-header">
                    <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Product</th>
                        <th style={{ padding: '10px' }}>From</th>
                        <th style={{ padding: '10px' }}>To</th>
                        <th style={{ padding: '10px' }}>Quantity</th>
                        <th style={{ padding: '10px' }}>Status</th>
                        <th style={{ padding: '10px' }}>Approved At</th>
                        <th style={{ padding: '10px' }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map(req => (
                        <tr
                            key={req.id}
                            onClick={() => openDrawer('transfer_request', req.id)}
                            style={{
                                borderBottom: '1px solid #e2e8f0',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <td style={{ padding: '10px' }}>{req.product}</td>
                            <td style={{ padding: '10px' }}>{req.source_warehouse}</td>
                            <td style={{ padding: '10px' }}>{req.destination_warehouse}</td>
                            <td style={{ padding: '10px' }}>{req.quantity}</td>
                            <td style={{ padding: '10px' }}>
                                <span style={{
                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.9em',
                                    background: req.status === 'APPROVED' ? '#dcfce7' : req.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                                    color: req.status === 'APPROVED' ? '#166534' : req.status === 'REJECTED' ? '#991b1b' : '#854d0e'
                                }}>
                                    {req.status}
                                </span>
                            </td>
                            <td style={{ padding: '10px', fontSize: '0.85em', color: '#64748b' }}>
                                {req.approved_at ? new Date(req.approved_at).toLocaleString() : '-'}
                            </td>
                            <td style={{ padding: '10px' }} onClick={(e) => e.stopPropagation()}>
                                {req.status === "PENDING" && req.can_approve ? (
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button onClick={() => handleApprove(req.id, "APPROVED")} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Approve</button>
                                        <button onClick={() => handleApprove(req.id, "REJECTED")} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                                    </div>
                                ) : req.status === "PENDING" ? (
                                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Waiting for approval</span>
                                ) : null}
                            </td>
                        </tr>
                    ))}
                    {requests.length === 0 && <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>No transfer requests.</td></tr>}
                </tbody>
            </table>

            <PaginationControls
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={onPageChange}
            />
        </div >
    );
};

export default TransferRequestList;
