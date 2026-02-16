import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import api from "../../api/axios";

import PaginationControls from "../../components/PaginationControls";
import FilterBar from "../../components/FilterBar";

const PromotionRequestList = () => {
    const [requests, setRequests] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWarehouses, setSelectedWarehouses] = useState({}); // Map request ID -> warehouse ID
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
        fetchData(1);
    }, [filters]);

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page,
                ...filters
            }).toString();

            const [reqRes, whRes] = await Promise.all([
                api.get(`/manager-promotions/list/?${queryParams}`),
                api.get("/warehouses/list/?page_size=1000") // Get all for dropdown
            ]);

            if (reqRes.data.results) {
                setRequests(reqRes.data.results);
                setTotalItems(reqRes.data.count);
            } else {
                setRequests(reqRes.data);
                setTotalItems(reqRes.data.length);
            }

            if (whRes.data.results) {
                setWarehouses(whRes.data.results);
            } else {
                setWarehouses(whRes.data);
            }

        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    const onPageChange = (newPage) => {
        setCurrentPage(newPage);
        fetchData(newPage);
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
        { key: 'warehouse', label: 'Assigned Warehouse ID', type: 'text', group: 'advanced' },
        { key: 'requested_by', label: 'Requested By', type: 'text', group: 'advanced' },
    ];

    const handleAction = async (id, decision) => {
        const warehouseId = selectedWarehouses[id];

        if (decision === "APPROVED" && !warehouseId) {
            alert("Please select a warehouse to assign the new manager to.");
            return;
        }

        try {
            await api.post("/manager-promotions/approve/", {
                promotion_request_id: id,
                decision: decision,
                warehouse_id: warehouseId // Optional for REJECTED now
            });
            alert(`Request ${decision.toLowerCase()}!`);
            fetchData(currentPage);
        } catch (err) {
            console.error(err);
            alert("Action failed: " + (err.response?.data?.error || "Unknown error"));
        }
    };

    const handleWarehouseChange = (reqId, whId) => {
        setSelectedWarehouses(prev => ({ ...prev, [reqId]: whId }));
    };

    if (loading && requests.length === 0) return <p>Loading...</p>;

    return (
        <div>
            <div ref={headerRef} className="sticky-page-header">
                <div style={{ paddingTop: '20px', marginBottom: '20px' }}>
                    <h1>Manager Promotion Requests</h1>
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
                            <th style={{ padding: '10px' }}>Staff Member</th>
                            <th style={{ padding: '10px' }}>Requested By</th>
                            <th style={{ padding: '10px' }}>Status</th>
                            <th style={{ padding: '10px' }}>Assign Warehouse</th>
                            <th style={{ padding: '10px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map(req => (
                            <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '10px' }}>#{req.id}</td>
                                <td style={{ padding: '10px' }}>{req.staff_username}</td>
                                <td style={{ padding: '10px' }}>{req.requested_by_username}</td>
                                <td style={{ padding: '10px' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.85em',
                                        fontWeight: 700,
                                        color: req.status === 'APPROVED' ? 'var(--success-green)' : req.status === 'REJECTED' ? 'var(--error-red)' : '#555'
                                    }}>
                                        {req.status}
                                    </span>
                                </td>
                                <td style={{ padding: '10px' }}>
                                    {req.status === "PENDING" ? (
                                        <select
                                            value={selectedWarehouses[req.id] || ""}
                                            onChange={(e) => handleWarehouseChange(req.id, e.target.value)}
                                            style={{ padding: '5px' }}
                                        >
                                            <option value="" disabled>Select Warehouse...</option>
                                            {warehouses.map(w => (
                                                <option key={w.id || w.warehouse_id} value={w.id || w.warehouse_id}>
                                                    {w.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        "-"
                                    )}
                                </td>
                                <td style={{ padding: '10px' }}>
                                    {req.status === "PENDING" && (
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button
                                                onClick={() => handleAction(req.id, "APPROVED")}
                                                className="btn-primary"
                                                style={{ margin: 0, padding: '4px 12px', fontSize: '0.85rem' }}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleAction(req.id, "REJECTED")}
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
                                <td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>No pending promotion requests.</td>
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
        </div>
    );
};

export default PromotionRequestList;
