import React, { useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";

const ProductCreate = () => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [sku, setSku] = useState("");
    const [category, setCategory] = useState("");

    // Categories based on backend model: ELECTRONICS, CLOTHING, GROCERY, FURNITURE, STATIONERY, OTHER
    // We can hardcode or just let user type if it wasn't strictly enforced by choice field in frontend
    // but better to match backend choices
    const CATEGORIES = ["ELECTRONICS", "CLOTHING", "GROCERY", "FURNITURE", "STATIONERY", "OTHER"];

    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post("/products/", {
                name,
                description,
                price: parseFloat(price),
                sku,
                category
            });
            showToast("Product created successfully!", "success");
            navigate("/products");
        } catch (err) {
            console.error(err);
            showToast("Failed to create product. Check SKU uniqueness.", "error");
        }
    };

    return (
        <div style={{ maxWidth: '600px', background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h2>Create New Product</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Product Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} required />
                </div>

                <div className="form-group">
                    <label>SKU (Unique Code)</label>
                    <input value={sku} onChange={e => setSku(e.target.value)} required />
                </div>

                <div className="form-group">
                    <label>Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} required>
                        <option value="" disabled>Select Category...</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label>Price</label>
                    <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
                </div>

                <div className="form-group">
                    <label>Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows="3"></textarea>
                </div>

                <button type="submit">Create Product</button>
            </form>
        </div>
    );
};

export default ProductCreate;
