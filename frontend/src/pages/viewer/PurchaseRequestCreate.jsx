import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";

const PurchaseRequestCreate = () => {
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);

    // Form State
    const [productId, setProductId] = useState("");
    const [warehouseId, setWarehouseId] = useState("");
    const [quantity, setQuantity] = useState(1);

    const navigate = useNavigate();
    const { showToast } = useToast();

    useEffect(() => {
        const loadData = async () => {
            try {
                const pRes = await api.get("/products/list/");
                // Defensive: handle both array and paginated response
                const productsData = Array.isArray(pRes.data) ? pRes.data : (pRes.data?.results || []);
                setProducts(productsData);

                const wRes = await api.get("/warehouses/list/");
                // Defensive: handle both array and paginated response
                const warehousesData = Array.isArray(wRes.data) ? wRes.data : (wRes.data?.results || []);
                setWarehouses(warehousesData);

                // Check for product ID in URL query params
                const params = new URLSearchParams(window.location.search);
                const pId = params.get("product");
                if (pId) setProductId(pId);

                // Debug logging when enabled
                if (import.meta.env.VITE_DEBUG_DASHBOARD === 'true') {
                    console.log('[PurchaseRequestCreate] Products loaded:', productsData);
                    console.log('[PurchaseRequestCreate] Warehouses loaded:', warehousesData);
                }
            } catch (err) {
                console.error("Setup failed", err);
                // Set empty arrays on error to prevent crashes
                setProducts([]);
                setWarehouses([]);
            }
        };
        loadData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post("/purchase-requests/", {
                product: productId,
                warehouse: warehouseId,
                quantity: parseInt(quantity)
            });
            showToast("Request sent!", "success");
            navigate("/products");
        } catch (err) {
            showToast("Failed to send request", "error");
        }
    };

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto', background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h2>New Purchase Request</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Product</label>
                    <select value={productId} onChange={e => setProductId(e.target.value)} required>
                        <option value="" disabled>Select Product ...</option>
                        {products.length > 0 ? (
                            products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))
                        ) : (
                            <option value="" disabled>No products available</option>
                        )}
                    </select>
                </div>

                <div className="form-group">
                    <label>Warehouse</label>
                    <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required>
                        <option value="" disabled>Select Warehouse...</option>
                        {warehouses.length > 0 ? (
                            warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))
                        ) : (
                            <option value="" disabled>No warehouses available</option>
                        )}
                    </select>
                </div>

                <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} required />
                </div>

                <button type="submit">Submit Request</button>
            </form>
        </div>
    );
};

export default PurchaseRequestCreate;
