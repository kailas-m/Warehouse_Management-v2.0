import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";

const WarehouseDelete = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [validationData, setValidationData] = useState(null);
    const [warehouses, setWarehouses] = useState([]); // For destination selection
    const [error, setError] = useState("");

    // Form state for resolution
    const [stockMap, setStockMap] = useState({}); // { productId: destinationWarehouseId }
    const [staffWarehouseId, setStaffWarehouseId] = useState("");

    useEffect(() => {
        if (id) {
            fetchValidation();
            fetchWarehouses();
        }
    }, [id]);

    const fetchWarehouses = async () => {
        try {
            const res = await api.get("/warehouses/list/?page_size=1000"); // Get all for dropdown
            const list = res.data.results || res.data;
            setWarehouses(list.filter(w => w.id !== parseInt(id)));
        } catch (err) {
            console.error("Failed to fetch warehouses");
        }
    };

    const fetchValidation = async () => {
        try {
            const res = await api.post("/warehouses/delete/validate/", { warehouse_id: id });
            setValidationData(res.data);
            setLoading(false);

            // Initialize stock map
            const initialMap = {};
            if (res.data.stock_summary?.items) {
                res.data.stock_summary.items.forEach(item => {
                    initialMap[item.product_id] = "";
                });
            }
            setStockMap(initialMap);

        } catch (err) {
            setError(err.response?.data?.error || "Failed to validate deletion");
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            // Frontend Validation
            if (required_actions.includes("REASSIGN_STAFF") && !staffWarehouseId) {
                showToast("Please select a warehouse to reassign staff.", "error");
                return;
            }
            if (required_actions.includes("MOVE_STOCK")) {
                const missingStock = stock_summary.items.some(item => !stockMap[item.product_id]);
                if (missingStock) {
                    showToast("Please select a destination for all stock items.", "error");
                    return;
                }
            }

            const cleanStockMap = {};
            Object.keys(stockMap).forEach(key => {
                if (stockMap[key]) {
                    cleanStockMap[key] = parseInt(stockMap[key]);
                }
            });

            const payload = {
                warehouse_id: parseInt(id),
                confirm: true,
                stock_map: cleanStockMap,
                staff_reassign_warehouse_id: staffWarehouseId ? parseInt(staffWarehouseId) : undefined
            };

            await api.post("/warehouses/delete/confirm/", payload);
            showToast("Warehouse deleted successfully", "success");
            navigate("/warehouses");
        } catch (err) {
            console.error("Delete error details:", err.response?.data);
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                // Check for "error" key
                if (data.error) {
                    showToast(data.error, "error");
                    return;
                }
                // Check for field errors
                const fieldErrors = Object.keys(data).map(key => `${key}: ${data[key]}`).join("\n");
                if (fieldErrors) {
                    showToast("Validation failed: " + fieldErrors, "error");
                    return;
                }
            }
            showToast("Deletion failed: " + JSON.stringify(data || err.message), "error");
        }
    };

    if (loading) return <div>Validating...</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
    if (!validationData) return <div>No data</div>;

    const { warehouse, stock_summary, staff_summary, required_actions, can_delete } = validationData;

    return (
        <div style={{ maxWidth: '800px', background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h2>Delete Warehouse: {warehouse.name}</h2>

            {can_delete ? (
                <div style={{ color: 'green', marginBottom: '20px' }}>
                    <p>No conflicts found. You can delete this warehouse safely.</p>
                </div>
            ) : (
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ color: '#eab308' }}>Requires Resolution</h3>

                    {required_actions.includes("MOVE_STOCK") && (
                        <div style={{ marginBottom: '20px', border: '1px solid #e2e8f0', padding: '10px' }}>
                            <h4>Move Stock ({stock_summary.total_quantity} items)</h4>
                            <p>Select destination for each product:</p>
                            {stock_summary.items.map(item => (
                                <div key={item.product_id} className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label>{item.product} (Qty: {item.quantity})</label>
                                    <select
                                        value={stockMap[item.product_id] || ""}
                                        onChange={e => setStockMap({ ...stockMap, [item.product_id]: e.target.value })}
                                        required
                                        style={{ width: '200px' }}
                                    >
                                        <option value="" disabled>Select Destination...</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}

                    {required_actions.includes("REASSIGN_STAFF") && (
                        <div style={{ marginBottom: '20px', border: '1px solid #e2e8f0', padding: '10px' }}>
                            <h4>Reassign Staff ({staff_summary.staff_count} members)</h4>
                            <div className="form-group">
                                <label>New Warehouse for Staff</label>
                                <select
                                    value={staffWarehouseId}
                                    onChange={e => setStaffWarehouseId(e.target.value)}
                                    required
                                    style={{ width: '100%' }}
                                >
                                    <option value="" disabled>Select Destination...</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {required_actions.includes("HANDLE_MANAGER") && (
                        <div style={{ marginBottom: '20px', border: '1px solid #e2e8f0', padding: '10px', background: '#fffbeb' }}>
                            <h4>Manager Action</h4>
                            <p>The manager will be demoted to Staff as this is their last assigned warehouse.</p>
                        </div>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleDelete} style={{ background: '#ef4444' }}>
                    Confirm Deletion
                </button>
                <button onClick={() => navigate("/warehouses")} style={{ background: '#94a3b8' }}>
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default WarehouseDelete;
