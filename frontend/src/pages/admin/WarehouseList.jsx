import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import api from "../../api/axios";

import PaginationControls from "../../components/PaginationControls";
import FilterBar from "../../components/FilterBar";

const WarehouseList = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;

    const [sortBy, setSortBy] = useState("name"); // Default sort
    const [filters, setFilters] = useState({});
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

    useEffect(() => {
        fetchWarehouses(1);
    }, [sortBy, filters]); // Refetch when sort or filters change

    const fetchWarehouses = async (page = 1) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page,
                ordering: sortBy,
                ...filters
            }).toString();
            const res = await api.get(`/warehouses/list/?${queryParams}`);
            if (res.data.results) {
                setWarehouses(res.data.results);
                setTotalItems(res.data.count);
            } else {
                setWarehouses(res.data);
                setTotalItems(res.data.length);
            }
        } catch (err) {
            console.error("Failed to fetch warehouses", err);
        } finally {
            setLoading(false);
        }
    };

    const onPageChange = (newPage) => {
        setCurrentPage(newPage);
        fetchWarehouses(newPage);
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
        { key: 'search', label: 'Search Name/Location', type: 'text' },
        { key: 'has_stock', label: 'Has Stock', type: 'select', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }], group: 'advanced' },
        { key: 'has_staff', label: 'Has Staff', type: 'select', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }], group: 'advanced' },
    ];

    const handleCreate = () => {
        window.location.href = "/warehouses/new";
    };

    if (loading && warehouses.length === 0) return <p>Loading warehouses...</p>;

    return (
        <div>
            <div ref={headerRef} className="sticky-page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px' }}>
                    <h1>Manage Warehouses</h1>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                            <option value="name">Sort by Name</option>
                            <option value="location">Sort by Location</option>
                        </select>
                        <button onClick={handleCreate} className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '6px 18px', borderRadius: '3px' }}>+ New Warehouse</button>
                    </div>
                </div>

                <FilterBar
                    filters={filterConfig}
                    activeFilters={filters}
                    onApply={handleApplyFilters}
                    onClear={handleClearFilters}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {warehouses.map(w => (
                    <div key={w.warehouse_id} className="card" style={{ boxShadow: 'none' }}>
                        <h3 style={{ marginBottom: '5px' }}>
                            <a href={`/warehouses/${w.warehouse_id}`} style={{ textDecoration: 'none', color: 'var(--link-color)', cursor: 'pointer' }}>
                                {w.name}
                            </a>
                        </h3>
                        <p style={{ color: '#64748b' }}>{w.location || "No location"}</p>

                        <div style={{ marginTop: '15px' }}>
                            <a href={`/warehouses/delete/${w.warehouse_id}`} style={{ color: '#ef4444', textDecoration: 'none', fontSize: '0.9rem' }}>Delete Warehouse</a>
                        </div>
                        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <strong>{w.total_quantity}</strong>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Items</div>
                            </div>
                            <div>
                                <strong>${w.total_value}</strong>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Value</div>
                            </div>
                            <div>
                                <strong>{w.low_stock_count}</strong>
                                <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>Low Stock</div>
                            </div>
                        </div>
                    </div>
                ))}
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

export default WarehouseList;
