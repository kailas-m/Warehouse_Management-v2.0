import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import { X } from "lucide-react";
import "../styles/components/ThresholdPanel.css";

const ThresholdPanel = ({ isOpen, onClose, threshold, onSuccess }) => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        warehouse: "",
        product: "",
        threshold_quantity: "",
    });
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const isEditMode = !!threshold;

    useEffect(() => {
        if (isOpen) {
            loadWarehouses();
            loadProducts();

            if (threshold) {
                setFormData({
                    warehouse: threshold.warehouse,
                    product: threshold.product,
                    threshold_quantity: threshold.threshold_quantity,
                });
            } else {
                setFormData({
                    warehouse: "",
                    product: "",
                    threshold_quantity: "",
                });
            }
            setErrors({});
        }
    }, [isOpen, threshold]);

    const loadWarehouses = async () => {
        try {
            const res = await api.get("/warehouses/list/?simple=true");
            setWarehouses(res.data);
        } catch (err) {
            console.error("Failed to load warehouses");
        }
    };

    const loadProducts = async () => {
        try {
            const res = await api.get("/products/list/?all=true");
            setProducts(res.data.results || res.data);
        } catch (err) {
            console.error("Failed to load products");
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.warehouse) newErrors.warehouse = "Warehouse is required";
        if (!formData.product) newErrors.product = "Product is required";
        if (!formData.threshold_quantity || formData.threshold_quantity < 0) {
            newErrors.threshold_quantity = "Quantity must be 0 or greater";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await api.post("/low-stock-thresholds/", formData);
            showToast(
                isEditMode ? "Threshold updated successfully" : "Threshold created successfully",
                "success"
            );
            onSuccess();
            onClose();
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Failed to save threshold";
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    };

    // Close on ESC key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);



    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="threshold-overlay"
                    onClick={onClose}
                />
            )}

            {/* Side Panel */}
            <div className={`threshold-panel ${isOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="threshold-header">
                    <h2>{isEditMode ? "Edit Threshold" : "New Threshold"}</h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="threshold-close-btn"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable Form */}
                <div className="threshold-body">
                    <form onSubmit={handleSubmit} className="threshold-form" id="threshold-form">
                        {/* Warehouse Field */}
                        <div className="threshold-field">
                            <label htmlFor="warehouse" className="threshold-label">
                                Warehouse <span className="required">*</span>
                            </label>
                            <select
                                id="warehouse"
                                value={formData.warehouse}
                                onChange={(e) =>
                                    setFormData({ ...formData, warehouse: e.target.value })
                                }
                                disabled={isEditMode || loading}
                                className={`threshold-select ${errors.warehouse ? 'error' : ''}`}
                            >
                                <option value="">Select Warehouse</option>
                                {warehouses.map((w) => (
                                    <option key={w.id} value={w.id}>
                                        {w.name}
                                    </option>
                                ))}
                            </select>
                            {errors.warehouse && (
                                <p className="threshold-error-text">{errors.warehouse}</p>
                            )}
                            {isEditMode ? (
                                <p className="threshold-help-text">
                                    Cannot be changed in edit mode
                                </p>
                            ) : (
                                <p className="threshold-help-text">
                                    Select the warehouse where this rule applies
                                </p>
                            )}
                        </div>

                        {/* Product Field */}
                        <div className="threshold-field">
                            <label htmlFor="product" className="threshold-label">
                                Product <span className="required">*</span>
                            </label>
                            <select
                                id="product"
                                value={formData.product}
                                onChange={(e) =>
                                    setFormData({ ...formData, product: e.target.value })
                                }
                                disabled={isEditMode || loading}
                                className={`threshold-select ${errors.product ? 'error' : ''}`}
                            >
                                <option value="">Select Product</option>
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} {p.sku ? `(${p.sku})` : ""}
                                    </option>
                                ))}
                            </select>
                            {errors.product && (
                                <p className="threshold-error-text">{errors.product}</p>
                            )}
                            {isEditMode && (
                                <p className="threshold-help-text">
                                    Cannot be changed in edit mode
                                </p>
                            )}
                        </div>

                        {/* Threshold Quantity Field */}
                        <div className="threshold-field">
                            <label htmlFor="threshold_quantity" className="threshold-label">
                                Minimum Stock Level (Units) <span className="required">*</span>
                            </label>
                            <input
                                id="threshold_quantity"
                                type="number"
                                min="0"
                                value={formData.threshold_quantity}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        threshold_quantity: e.target.value,
                                    })
                                }
                                disabled={loading}
                                className={`threshold-input ${errors.threshold_quantity ? 'error' : ''}`}
                                placeholder="e.g., 10"
                            />
                            {errors.threshold_quantity && (
                                <p className="threshold-error-text">
                                    {errors.threshold_quantity}
                                </p>
                            )}
                            <p className="threshold-help-text">
                                Alert will trigger when stock falls below this level
                            </p>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="threshold-footer">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="threshold-btn threshold-btn-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="threshold-form"
                        disabled={loading}
                        className="threshold-btn threshold-btn-submit"
                    >
                        {loading ? "Saving..." : isEditMode ? "Update Threshold" : "Save Threshold"}
                    </button>
                </div>
            </div>
        </>
    );
};

export default ThresholdPanel;
