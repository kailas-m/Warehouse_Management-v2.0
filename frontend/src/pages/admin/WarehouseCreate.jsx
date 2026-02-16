import React, { useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";

const WarehouseCreate = () => {
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post("/warehouses/", {
                name,
                location
            });
            showToast("Warehouse created!", "success");
            navigate("/warehouses");
        } catch (err) {
            showToast("Failed to create warehouse", "error");
            console.error(err);
        }
    };

    return (
        <div style={{ maxWidth: '500px', background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h2>Create New Warehouse</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Warehouse Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Location</label>
                    <input value={location} onChange={e => setLocation(e.target.value)} required />
                </div>
                <button type="submit">Create Warehouse</button>
            </form>
        </div>
    );
};

export default WarehouseCreate;
