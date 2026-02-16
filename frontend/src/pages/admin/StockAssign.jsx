import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";

const StockAssign = () => {
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [productId, setProductId] = useState("");
    const [warehouseId, setWarehouseId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const navigate = useNavigate();
    const { showToast } = useToast();

    useEffect(() => {
        const loadData = async () => {
            try {
                const [pRes, wRes] = await Promise.all([
                    api.get("/products/list/?page_size=1000"),
                    api.get("/warehouses/list/?page_size=1000")
                ]);

                const productsData = pRes.data.results ? pRes.data.results : pRes.data;
                const warehousesData = wRes.data.results ? wRes.data.results : wRes.data;

                setProducts(productsData);
                setWarehouses(warehousesData);
            } catch (err) {
                console.error("Failed to load data");
            }
        };
        loadData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post("/stocks/assign/", {
                product_id: productId,
                warehouse_id: warehouseId,
                quantity: parseInt(quantity)
            });
            showToast("Stock assigned successfully!", "success");
            navigate("/stocks");
        } catch (err) {
            console.error(err);
            showToast("Failed to assign stock: " + (err.response?.data?.error || err.message), "error");
        }
    };

    return (
        <div style={{ maxWidth: '600px', background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h2>Assign Stock</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Product</label>
                    <select value={productId} onChange={e => setProductId(e.target.value)} required>
                        <option value="" disabled>Select Product...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label>Warehouse</label>
                    <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required>
                        <option value="" disabled>Select Warehouse...</option>
                        {warehouses.map(w => {
                            const val = w.warehouse_id || w.id;
                            return <option key={val} value={val}>{w.name}</option>
                        })}
                    </select>
                </div>

                <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} required />
                </div>

                <button type="submit">Assign Stock</button>
            </form>
        </div>
    );
};

export default StockAssign;
