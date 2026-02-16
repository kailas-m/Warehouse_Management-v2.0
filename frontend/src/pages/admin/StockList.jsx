import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

import PaginationControls from "../../components/PaginationControls";
import FilterBar from "../../components/FilterBar";

const StockList = () => {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
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
    const [warehouses, setWarehouses] = useState([]); // List of {id, name}

    useEffect(() => {
        fetchWarehouses();
        fetchStocks(1);
    }, [filters]); // Re-fetch when filters change

    // Fetch warehouses for the filter dropdown
    const fetchWarehouses = async () => {
        try {
            // Fetch with large page_size to get all (up to 1000)
            const res = await api.get("/warehouses/list/?page_size=1000");
            if (res.data.results) {
                setWarehouses(res.data.results);
            } else {
                setWarehouses(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch warehouses list");
        }
    };

    const fetchStocks = async (page = 1) => {
        setLoading(true);
        try {
            let url = `/stocks/?page=${page}`;
            const queryParams = new URLSearchParams(filters).toString();
            if (queryParams) url += `&${queryParams}`;

            const res = await api.get(url);

            if (res.data.results) {
                setStocks(res.data.results);
                setTotalItems(res.data.count);
            } else {
                setStocks(res.data);
                setTotalItems(res.data.length);
            }
        } catch (err) {
            console.error("Failed to fetch stocks");
            setStocks([]);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilters({});
        setCurrentPage(1);
    };

    const onPageChange = (newPage) => {
        setCurrentPage(newPage);
        fetchStocks(newPage);
    };

    const filterConfig = [
        {
            key: 'warehouse',
            label: 'Warehouse',
            type: 'select',
            options: [{ value: '', label: 'All Warehouses' }, ...warehouses.map(w => ({ value: w.id || w.warehouse_id, label: w.name }))]
        },
        { key: 'product', label: 'Product Name', type: 'text' },
        { key: 'min_qty', label: 'Min Qty', type: 'number', group: 'advanced' },
        { key: 'max_qty', label: 'Max Qty', type: 'number', group: 'advanced' },
        { key: 'low_stock', label: 'Low Stock Only', type: 'select', options: [{ value: 'true', label: 'Yes' }], group: 'advanced' }
    ];

    const showControls = user.role === "ADMIN" || (user.role === "MANAGER" && user.assigned_warehouses?.length > 1);

    if (loading && stocks.length === 0) return <p>Loading stock data...</p>;

    return (
        <div>
            <div ref={headerRef} className="sticky-page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px' }}>
                    <h1>Stock Management</h1>
                    {showControls && (
                        <a href="/stocks/assign" style={{ padding: '8px 12px', background: '#3b82f6', color: 'white', borderRadius: '4px', textDecoration: 'none' }}>+ Assign Stock</a>
                    )}
                </div>

                {showControls && (
                    <FilterBar
                        filters={filterConfig}
                        activeFilters={filters}
                        onApply={handleApplyFilters}
                        onClear={handleClearFilters}
                    />
                )}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', marginTop: '20px', '--header-offset': `${headerHeight}px` }}>
                <thead className="sticky-table-header">
                    <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Product</th>
                        <th style={{ padding: '10px' }}>Warehouse</th>
                        <th style={{ padding: '10px' }}>Quantity</th>
                        <th style={{ padding: '10px' }}>Last Updated</th>
                    </tr>
                </thead>
                <tbody>
                    {stocks.map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px' }}>{s.product.name}</td>
                            <td style={{ padding: '10px' }}>{s.warehouse.name || s.warehouse}</td>
                            <td style={{ padding: '10px', fontWeight: 'bold' }}>{s.quantity}</td>
                            <td style={{ padding: '10px' }}>{new Date(s.updated_at).toLocaleDateString()}</td>
                        </tr>
                    ))}
                    {stocks.length === 0 && <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center' }}>No stock found.</td></tr>}
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

export default StockList;
