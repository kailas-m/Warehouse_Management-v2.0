import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import { X } from "lucide-react";

const ThresholdModal = ({ isOpen, onClose, threshold, onSuccess }) => {
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {isEditMode ? "Edit Low Stock Threshold" : "Add Low Stock Threshold"}
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 space-y-4">
                        {/* Warehouse Field */}
                        <div>
                            <label
                                htmlFor="warehouse"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Warehouse <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="warehouse"
                                value={formData.warehouse}
                                onChange={(e) =>
                                    setFormData({ ...formData, warehouse: e.target.value })
                                }
                                disabled={isEditMode || loading}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.warehouse
                                        ? "border-red-500 focus:ring-red-500"
                                        : "border-gray-300"
                                    } ${isEditMode
                                        ? "bg-gray-100 cursor-not-allowed text-gray-600"
                                        : "bg-white"
                                    }`}
                            >
                                <option value="">Select Warehouse</option>
                                {warehouses.map((w) => (
                                    <option key={w.id} value={w.id}>
                                        {w.name}
                                    </option>
                                ))}
                            </select>
                            {errors.warehouse && (
                                <p className="text-red-500 text-xs mt-1">{errors.warehouse}</p>
                            )}
                            {isEditMode && (
                                <p className="text-gray-500 text-xs mt-1">
                                    Cannot be changed in edit mode
                                </p>
                            )}
                        </div>

                        {/* Product Field */}
                        <div>
                            <label
                                htmlFor="product"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Product <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="product"
                                value={formData.product}
                                onChange={(e) =>
                                    setFormData({ ...formData, product: e.target.value })
                                }
                                disabled={isEditMode || loading}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.product
                                        ? "border-red-500 focus:ring-red-500"
                                        : "border-gray-300"
                                    } ${isEditMode
                                        ? "bg-gray-100 cursor-not-allowed text-gray-600"
                                        : "bg-white"
                                    }`}
                            >
                                <option value="">Select Product</option>
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} {p.sku ? `(${p.sku})` : ""}
                                    </option>
                                ))}
                            </select>
                            {errors.product && (
                                <p className="text-red-500 text-xs mt-1">{errors.product}</p>
                            )}
                            {isEditMode && (
                                <p className="text-gray-500 text-xs mt-1">
                                    Cannot be changed in edit mode
                                </p>
                            )}
                        </div>

                        {/* Threshold Quantity Field */}
                        <div>
                            <label
                                htmlFor="threshold_quantity"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Minimum Stock Level (Units) <span className="text-red-500">*</span>
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
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.threshold_quantity
                                        ? "border-red-500 focus:ring-red-500"
                                        : "border-gray-300"
                                    }`}
                                placeholder="e.g., 10"
                            />
                            {errors.threshold_quantity && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.threshold_quantity}
                                </p>
                            )}
                            <p className="text-gray-500 text-xs mt-1">
                                Alert will trigger when stock falls below this level
                            </p>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            {loading ? "Saving..." : isEditMode ? "Update Threshold" : "Create Threshold"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ThresholdModal;
