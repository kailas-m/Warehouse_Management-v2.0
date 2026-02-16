import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const TransferRequestCreate = () => {
    const { user } = useAuth(); // Needed to get assigned warehouses
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [formData, setFormData] = useState({
        product: "",
        source_warehouse: "",
        destination_warehouse: "",
        quantity: 1
    });
    const navigate = useNavigate();
    const { showToast } = useToast();

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch ALL products (by passing all=true) and ALL warehouses
                const [pRes, wRes] = await Promise.all([
                    api.get("/products/list/?all=true"),
                    api.get("/warehouses/list/?simple=true")
                ]);

                // Defensive: handle both array and paginated response
                const productsData = Array.isArray(pRes.data) ? pRes.data : (pRes.data?.results || []);
                const warehousesData = Array.isArray(wRes.data) ? wRes.data : (wRes.data?.results || []);

                setProducts(productsData);
                setWarehouses(warehousesData);

                // Debug logging when enabled
                if (import.meta.env.VITE_DEBUG_DASHBOARD === 'true') {
                    console.log('[TransferRequestCreate] Products loaded:', productsData);
                    console.log('[TransferRequestCreate] Warehouses loaded:', warehousesData);
                }
            } catch (err) {
                console.error("Failed to load data", err);
                // Set empty arrays on error to prevent crashes
                setProducts([]);
                setWarehouses([]);
            }
        };
        loadData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.source_warehouse === formData.destination_warehouse) {
            showToast("Source and Destination cannot be the same", "error");
            return;
        }
        try {
            await api.post("/transfer-requests/", formData);
            showToast("Transfer Request Sent!", "success");
            navigate("/transfer-requests");
        } catch (err) {
            showToast("Failed to create request", "error");
        }
    };

    // Filter Destination: Only Manager's assigned warehouses
    // If Admin, show all. If Manager, show assigned.
    const myWarehouses = user?.role === "ADMIN"
        ? warehouses
        : (user?.assigned_warehouses || []);

    return (
        <div style={{ maxWidth: '600px', background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h2>New Transfer Request</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Product</label>
                    <select value={formData.product} onChange={e => setFormData({ ...formData, product: e.target.value })} required>
                        <option value="" disabled>Select Product...</option>
                        {products.length > 0 ? (
                            products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                        ) : (
                            <option value="" disabled>No products available</option>
                        )}
                    </select>
                </div>

                <div className="form-group">
                    <label>Source Warehouse (From)</label>
                    <select value={formData.source_warehouse} onChange={e => setFormData({ ...formData, source_warehouse: e.target.value })} required>
                        <option value="" disabled>Select Source...</option>
                        {warehouses.length > 0 ? (
                            warehouses
                                .filter(w => w.id !== parseInt(formData.destination_warehouse))
                                .map(w => <option key={w.id} value={w.id}>{w.name}</option>)
                        ) : (
                            <option value="" disabled>No warehouses available</option>
                        )}
                    </select>
                </div>

                <div className="form-group">
                    <label>Destination Warehouse (To)</label>
                    <select value={formData.destination_warehouse} onChange={e => setFormData({ ...formData, destination_warehouse: e.target.value })} required>
                        <option value="" disabled>Select Destination...</option>
                        {myWarehouses.length > 0 ? (
                            myWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)
                        ) : (
                            <option value="" disabled>No warehouses available</option>
                        )}
                    </select>
                    {user?.role !== "ADMIN" && myWarehouses.length === 0 && <p style={{ color: 'red', fontSize: '0.8rem' }}>You have no assigned warehouses.</p>}
                </div>

                <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })} required />
                </div>

                <button type="submit">Submit Request</button>
            </form>
        </div>
    );
};

export default TransferRequestCreate;
