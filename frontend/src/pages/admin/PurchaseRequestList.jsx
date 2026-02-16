import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useDrawer } from "../../context/DrawerContext";

import PaginationControls from "../../components/PaginationControls";
import FilterBar from "../../components/FilterBar";

const PurchaseRequestList = () => {
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

    const [sortBy, setSortBy] = useState("-id"); // Default sort
    const [filters, setFilters] = useState({});

    useEffect(() => {
        fetchRequests(1);
    }, [sortBy, filters]);

    const fetchRequests = async (page = 1) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page,
                ordering: sortBy,
                ...filters
            }).toString();
            const res = await api.get(`/purchase-requests/list/?${queryParams}`);
            console.log("PurchaseRequestList Data:", res.data);
            if (res.data.results) {
                if (res.data.results.length === 0) console.warn("Received 0 results (Paginated)");
                if (res.data.count > 0 && res.data.results.length === 0) alert("API Error: Count > 0 but results empty!");
                setRequests(res.data.results);
                setTotalItems(res.data.count);
            } else {
                if (res.data.length === 0) console.warn("Received 0 results (Flat)");
                setRequests(res.data);
                setTotalItems(res.data.length);
            }
        } catch (err) {
            console.error("Failed to fetch requests", err);
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
        { key: 'warehouse', label: 'Warehouse ID', type: 'text', group: 'advanced' },
        { key: 'requested_by', label: 'Requester ID', type: 'text', group: 'advanced' },
        { key: 'date_from', label: 'From Date', type: 'date', group: 'advanced' },
        { key: 'date_to', label: 'To Date', type: 'date', group: 'advanced' },
    ];

    const handleApprove = async (id, decision) => {
        try {
            await api.post("/purchase-requests/approve/", {
                purchase_request_id: id,
                decision: decision // "APPROVED" or "REJECTED"
            });
            alert(`Request ${decision.toLowerCase()}!`);
            fetchRequests(currentPage);
        } catch (err) {
            console.error(err);
            alert("Action failed: " + (err.response?.data?.error || err.message));
        }
    };

    if (loading && requests.length === 0) return <p>Loading requests...</p>;

    return (
        <div>
            <div ref={headerRef} className="sticky-page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px' }}>
                    <h1>Purchase Requests</h1>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                            <option value="-id">Sort by Newest</option>
                            <option value="id">Sort by Oldest</option>
                            <option value="status">Sort by Status</option>
                            <option value="product__name">Sort by Product</option>
                        </select>
                    </div>
                </div>

                <FilterBar
                    filters={filterConfig}
                    activeFilters={filters}
                    onApply={handleApplyFilters}
                    onClear={handleClearFilters}
                />
            </div>

            <div className="card" style={{ padding: 0, marginTop: '20px', overflow: 'hidden', '--header-offset': `${headerHeight}px` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead className="sticky-table-header">
                        <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                            <th style={{ padding: '10px' }}>ID</th>
                            <th style={{ padding: '10px' }}>Product</th>
                            <th style={{ padding: '10px' }}>Warehouse</th>
                            <th style={{ padding: '10px' }}>Quantity</th>
                            <th style={{ padding: '10px' }}>Status</th>
                            <th style={{ padding: '10px' }}>Processed</th>
                            <th style={{ padding: '10px' }}>Requested By</th>
                            <th style={{ padding: '10px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map(req => (
                            <tr
                                key={req.id}
                                onClick={() => openDrawer('purchase_request', req.id)}
                                style={{
                                    borderBottom: '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <td style={{ padding: '10px' }}>#{req.id}</td>
                                <td style={{ padding: '10px' }}>{req.product}</td>
                                <td style={{ padding: '10px' }}>{req.warehouse}</td>
                                <td style={{ padding: '10px' }}>{req.quantity}</td>
                                <td style={{ padding: '10px' }}>{req.status}</td>
                                <td style={{ padding: '10px', fontSize: '0.85em', color: '#64748b' }}>
                                    {req.processed_at ? new Date(req.processed_at).toLocaleString() : '-'}
                                </td>
                                <td style={{ padding: '10px' }}>{req.viewer}</td>
                                <td style={{ padding: '10px' }} onClick={(e) => e.stopPropagation()}>
                                    {req.status === "PENDING" && (
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button
                                                onClick={() => handleApprove(req.id, "APPROVED")}
                                                className="btn-primary"
                                                style={{ margin: 0, padding: '4px 12px', fontSize: '0.85rem' }}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleApprove(req.id, "REJECTED")}
                                                className="btn-danger"
                                                style={{ margin: 0, padding: '4px 12px', fontSize: '0.85rem', background: 'transparent', border: '1px solid #c00' }}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {requests.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ padding: '20px', textAlign: 'center' }}>No purchase requests found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <PaginationControls
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={onPageChange}
            />
        </div >
    );
};

export default PurchaseRequestList;
