import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, Plus, AlertCircle } from "lucide-react";
import ThresholdPanel from "../../components/ThresholdPanel";

const Thresholds = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { confirm } = useConfirm();
    const navigate = useNavigate();
    const [thresholds, setThresholds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedThreshold, setSelectedThreshold] = useState(null);

    // Permission check - only Admin and Manager can access
    useEffect(() => {
        if (user && user.role !== "ADMIN" && user.role !== "MANAGER") {
            showToast("Access Denied: You do not have permission to view this page", "error");
            navigate("/");
        }
    }, [user, navigate, showToast]);

    const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get("/low-stock-thresholds/");
            setThresholds(res.data);
        } catch (err) {
            console.error("Failed to load thresholds");
            showToast("Failed to load thresholds", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setSelectedThreshold(null);
        setModalOpen(true);
    };

    const handleEdit = (threshold) => {
        setSelectedThreshold(threshold);
        setModalOpen(true);
    };

    const handleDelete = async (threshold) => {
        const confirmed = await confirm(
            `Are you sure you want to delete the threshold for "${threshold.product_name}" in "${threshold.warehouse_name}"?`
        );

        if (!confirmed) return;

        try {
            await api.delete("/low-stock-thresholds/", {
                data: { id: threshold.id },
            });
            showToast("Threshold deleted successfully", "success");
            loadData();
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Failed to delete threshold";
            showToast(errorMsg, "error");
        }
    };

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="animate-pulse">
            <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
            </td>
            <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
            </td>
            <td className="px-6 py-4">
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            </td>
            {canManage && (
                <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                        <div className="h-4 w-4 bg-gray-200 rounded"></div>
                        <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    </div>
                </td>
            )}
        </tr>
    );

    // Empty state component
    const EmptyState = () => (
        <tr>
            <td
                colSpan={canManage ? "4" : "3"}
                className="px-6 py-16 text-center"
            >
                <div className="flex flex-col items-center justify-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No thresholds configured
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 max-w-sm">
                        Set minimum stock levels to receive low-stock alerts and prevent inventory shortages.
                    </p>
                    {canManage && (
                        <button
                            onClick={handleAdd}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Threshold
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Low Stock Thresholds
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage minimum stock levels for automated alerts
                        </p>
                    </div>
                    {canManage && !loading && thresholds.length > 0 && (
                        <button
                            onClick={handleAdd}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Threshold
                        </button>
                    )}
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Product
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Warehouse
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Min. Stock Level
                            </th>
                            {canManage && (
                                <th
                                    scope="col"
                                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <>
                                <SkeletonRow />
                                <SkeletonRow />
                                <SkeletonRow />
                            </>
                        ) : thresholds.length === 0 ? (
                            <EmptyState />
                        ) : (
                            thresholds.map((t) => (
                                <tr
                                    key={t.id}
                                    className="hover:bg-gray-50 transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {t.product_name}
                                        </div>
                                        {t.product_sku && (
                                            <div className="text-xs text-gray-500">
                                                SKU: {t.product_sku}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {t.warehouse_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {t.threshold_quantity} units
                                        </span>
                                    </td>
                                    {canManage && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => handleEdit(t)}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="Edit threshold"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(t)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                                    title="Delete threshold"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <ThresholdPanel
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                threshold={selectedThreshold}
                onSuccess={loadData}
            />
        </div>
    );
};

export default Thresholds;
