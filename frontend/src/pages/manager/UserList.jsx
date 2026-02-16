import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useDrawer } from "../../context/DrawerContext";
import TransferRequestsList from "./TransferRequestsList";
import PaginationControls from "../../components/PaginationControls";
import FilterBar from "../../components/FilterBar";

const UserList = () => {
    const { user } = useAuth();
    const { openDrawer } = useDrawer();
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
    const [users, setUsers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;
    const [loading, setLoading] = useState(false);

    // State for Approval Modal
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [approveTarget, setApproveTarget] = useState(null); // { userId, username }
    const [approveDestWarehouse, setApproveDestWarehouse] = useState("");

    // Transfer Modal State
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferTarget, setTransferTarget] = useState(null); // { staffId, name, currentWarehouseId }
    const [transferDestWarehouse, setTransferDestWarehouse] = useState("");


    // Promotion Modal State
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [promotionTarget, setPromotionTarget] = useState(null); // { staffId, name }
    const [promotionDestWarehouse, setPromotionDestWarehouse] = useState("");

    // Tabs
    const [activeTab, setActiveTab] = useState("All");

    // Filters
    const [filters, setFilters] = useState({});

    useEffect(() => {
        if (!user) return;
        fetchUsers(1);
        if (user.role === "ADMIN") {
            fetchWarehouses();
        }
        if (user.role === "MANAGER") {
            if (user.assigned_warehouses && user.assigned_warehouses.length > 0) {
                setWarehouses(user.assigned_warehouses);
            }
        }
    }, [user, filters]);

    const fetchWarehouses = async () => {
        try {
            const res = await api.get("/warehouses/list/?page_size=1000");
            setWarehouses(res.data.results || res.data);
        } catch (err) { console.error(err); }
    };

    const [sortBy, setSortBy] = useState("username"); // Default sort

    const fetchUsers = async (page = 1, currentTab = activeTab, sort = sortBy) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page,
                page_size: pageSize,
                ordering: sort,
                ...filters
            });

            if (currentTab === "Staffs") queryParams.append("role", "STAFF");
            else if (currentTab === "Viewers") queryParams.append("role", "VIEWER");
            else if (currentTab === "Managers") queryParams.append("role", "MANAGER");

            const url = `/users/?${queryParams.toString()}`;

            const res = await api.get(url);
            if (res.data.results) {
                setUsers(res.data.results);
                setTotalItems(res.data.count);
            } else {
                setUsers(res.data);
                setTotalItems(res.data.length);
            }
        } catch (err) {
            console.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const onPageChange = (newPage) => {
        setCurrentPage(newPage);
        fetchUsers(newPage, activeTab);
    };

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setCurrentPage(1);
        fetchUsers(1, newTab, sortBy);
    };

    const handleSortChange = (e) => {
        const newSort = e.target.value;
        setSortBy(newSort);
        setCurrentPage(1);
        fetchUsers(1, activeTab, newSort);
    };

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilters({});
        setCurrentPage(1);
    };

    const filterConfig = [
        { key: 'search', label: 'Search Name/Email', type: 'text' },
        {
            key: 'warehouse',
            label: 'Warehouse',
            type: 'select',
            options: [{ value: '', label: 'All Warehouses' }, ...warehouses.map(w => ({ value: w.id || w.warehouse_id, label: w.name }))]
        },
        { key: 'approved', label: 'Approved Only', type: 'select', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }], group: 'advanced' },
    ];

    // 1. Initiate Approve
    const initiateApprove = (userId, username) => {
        setApproveTarget({ id: userId, name: username });
        // If user has only one warehouse, pre-select it
        if (warehouses.length > 0) {
            setApproveDestWarehouse(warehouses[0].id);
        } else {
            setApproveDestWarehouse("");
        }
        setShowApproveModal(true);
    };

    // 2. Confirm Approve
    const handleConfirmApprove = async () => {
        if (!approveDestWarehouse) {
            alert("Please select a warehouse for this staff member.");
            return;
        }

        const wId = Number(approveDestWarehouse);
        if (isNaN(wId)) {
            alert("Error: Invalid Warehouse ID selected.");
            return;
        }

        const payload = {
            user_id: approveTarget.id,
            warehouse_id: wId
        };

        console.log("Sending Approval Payload:", payload);


        try {
            await api.post("/staffs/approve/", payload);
            alert("Staff approved successfully!");
            setShowApproveModal(false);
            fetchUsers(currentPage);
        } catch (err) {
            console.error(err);
            const msg = err.response?.data ? JSON.stringify(err.response.data) : "Failed to approve";
            alert(`Error: ${msg}`);
        }
    };

    const handleDismiss = async (staffId) => {
        if (!confirm("Are you sure you want to dismiss this staff member?")) return;
        try {
            await api.post("/staffs/dismiss/", { staff_id: staffId });
            alert("Staff dismissed.");
            fetchUsers(currentPage);
        } catch (err) {
            alert(err.response?.data?.error || "Failed to dismiss staff.");
        }
    };

    const handleDemote = async (managerId) => {
        if (!confirm("Are you sure you want to demote this manager?")) return;
        try {
            await api.post("/admin/demote-manager/", { manager_id: managerId });
            alert("Manager demoted.");
            fetchUsers(currentPage);
        } catch (err) {
            alert(err.response?.data?.error || "Failed to demote manager.");
        }
    };

    // 1. Open Modal
    const initiatePromote = (staffId, staffName) => {
        setPromotionTarget({ id: staffId, name: staffName });
        setPromotionDestWarehouse("");
        setShowPromoteModal(true);
    };

    // 2. Confirm Promotion
    const handleConfirmPromote = async () => {
        if (!promotionDestWarehouse) {
            alert("Please select a destination warehouse.");
            return;
        }

        try {
            await api.post("/manager-promotions/approve/", {
                staff_id: promotionTarget.id,
                warehouse_id: promotionDestWarehouse
            });
            alert("Staff promoted to Manager!");
            setShowPromoteModal(false);
            fetchUsers(currentPage);
            fetchWarehouses(); // Refresh warehouse list (manager status changed)
        } catch (err) {
            console.error("Promote error:", err.response?.data);
            alert(err.response?.data?.error || "Failed to promote staff. Check console.");
        }
    };

    // 1. Initiate Transfer
    const initiateTransfer = (staffId, staffName, currentWarehouseId) => {
        setTransferTarget({ id: staffId, name: staffName, currentWarehouseId });
        setTransferDestWarehouse("");
        setShowTransferModal(true);
    };

    // 2. Confirm Transfer Request
    const handleConfirmTransfer = async () => {
        if (!transferDestWarehouse) {
            alert("Please select a destination warehouse.");
            return;
        }

        try {
            const res = await api.post("/staff-transfers/", {
                staff_id: transferTarget.id,
                target_warehouse_id: transferDestWarehouse
            });

            if (res.data.status === 'APPROVED') {
                alert("Transfer completed immediately!");
                fetchUsers(currentPage);
            } else {
                alert("Transfer request submitted successfully!");
            }
            setShowTransferModal(false);
            // We might want to refresh requests list if we display it here
        } catch (err) {
            console.error("Transfer error:", err.response?.data);
            const msg = err.response?.data ? JSON.stringify(err.response.data) : "Failed to submit transfer request.";
            alert(msg);
        }
    };

    const [viewUser, setViewUser] = useState(null);

    const handleViewDetails = async (userId) => {
        try {
            const res = await api.get(`/profile/?user_id=${userId}`);
            setViewUser(res.data);
        } catch (err) {
            alert("Failed to load user details");
        }
    };

    // Filter managerless warehouses
    const managerlessWarehouses = warehouses.filter(w => !w.manager);

    // Removed client-side filtering
    // const getFilteredUsers = ... 
    // const filteredUsers = getFilteredUsers();

    if (loading && users.length === 0) return <p>Loading users...</p>;

    return (
        <div>
            <div ref={headerRef} className="sticky-page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px' }}>
                    <h1>User Management</h1>
                </div>
                <p>This page allows Admins/Managers to view users.</p>

                <div className="outisdeMainContainerSubheader with_shadow" style={{ backgroundColor: "white" }}>
                    <div className="mainContainerSubheader with_shadow" id="secondarySubHeader">
                        <ul className="containerSubheader" style={{ backgroundColor: "white", justifyContent: "center" }}>
                            <li>
                                <a href="#" className={`link ${activeTab === "Staffs" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); handleTabChange("Staffs"); }}>Staffs</a>
                            </li>
                            <li>
                                <a href="#" className={`link ${activeTab === "Viewers" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); handleTabChange("Viewers"); }}>Viewers</a>
                            </li>
                            {user.role === "ADMIN" && (
                                <li>
                                    <a href="#" className={`link ${activeTab === "Managers" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); handleTabChange("Managers"); }}>Managers</a>
                                </li>
                            )}
                            <li>
                                <a href="#" className={`link ${activeTab === "All" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); handleTabChange("All"); }}>All</a>
                            </li>
                        </ul>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                        <select
                            value={sortBy}
                            onChange={handleSortChange}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                            <option value="username">Sort by Name (A-Z)</option>
                            <option value="email">Sort by Email</option>
                            <option value="role__name">Sort by Role</option>
                            <option value="-date_joined">Sort by Newest</option>
                        </select>
                    </div>
                </div>

                <FilterBar
                    filters={filterConfig}
                    activeFilters={filters}
                    onApply={handleApplyFilters}
                    onClear={handleClearFilters}
                />
            </div>

            <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse', background: 'white', '--header-offset': `${headerHeight}px` }}>
                <thead className="sticky-table-header">
                    <tr style={{ background: '#f1f5f9', textAlign: 'left', fontSize: '0.9rem' }}>
                        <th style={{ padding: '10px' }}>User</th>
                        <th style={{ padding: '10px' }}>Profile</th>
                        <th style={{ padding: '10px' }}>Assignment / Role</th>
                        <th style={{ padding: '10px' }}>Status</th>
                        <th style={{ padding: '10px' }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr
                            key={u.user_id}
                            onClick={() => openDrawer('user', u.user_id)}
                            style={{
                                borderBottom: '1px solid #e2e8f0',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <td style={{ padding: '10px' }}>
                                <div style={{ fontWeight: 'bold' }}>{u.username}</div>
                                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>ID: {u.user_id}</div>
                                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{u.email}</div>
                            </td>
                            <td style={{ padding: '10px' }}>
                                <div>{u.full_name || "-"}</div>
                                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{u.phone_number || "No Phone"}</div>
                            </td>
                            <td style={{ padding: '10px' }}>
                                <span style={{ fontWeight: 'bold' }}>{u.role}</span>
                                {u.role === "STAFF" && u.assigned_warehouse && (
                                    <div style={{ marginTop: '5px', fontSize: '0.85rem' }}>
                                        <div>Warehouse: <strong>{u.assigned_warehouse.name}</strong></div>
                                        <div style={{ color: '#64748b' }}>Mgr: {u.assigned_warehouse.manager || "Unassigned"}</div>
                                    </div>
                                )}
                                {u.role === "MANAGER" && u.managed_warehouses && u.managed_warehouses.length > 0 && (
                                    <div style={{ marginTop: '5px', fontSize: '0.85rem' }}>
                                        Charge of: {u.managed_warehouses.map(w => w.name).join(", ")}
                                    </div>
                                )}
                            </td>
                            <td style={{ padding: '10px' }}>
                                <span style={{
                                    padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem',
                                    background: u.is_active ? '#dcfce7' : '#fee2e2',
                                    color: u.is_active ? '#166534' : '#991b1b'
                                }}>
                                    {u.is_active ? "Active" : "Inactive"}
                                </span>
                            </td>
                            <td style={{ padding: '10px' }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                    {!u.is_active && u.role === "STAFF" && (
                                        <button style={{ width: 'auto', padding: '5px 10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => initiateApprove(u.user_id, u.username)}>
                                            Approve
                                        </button>
                                    )}
                                    {u.is_active && u.role === "STAFF" && (user.role === "ADMIN" || user.role === "MANAGER") && (
                                        <button style={{ width: 'auto', padding: '5px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleDismiss(u.staff_id)}>
                                            Dismiss
                                        </button>
                                    )}
                                    {u.is_active && u.role === "STAFF" && (user.role === "ADMIN" || user.role === "MANAGER") && (
                                        <button style={{ width: 'auto', padding: '5px 10px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => initiateTransfer(u.staff_id || u.user_id, u.username, u.assigned_warehouse?.id)}>
                                            {user.role === "ADMIN" ? "Direct Transfer" : "Transfer Request"}
                                        </button>
                                    )}
                                    {u.is_active && u.role === "STAFF" && user.role === "ADMIN" && (
                                        <button style={{ width: 'auto', padding: '5px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => initiatePromote(u.staff_id, u.username)}>
                                            Promote
                                        </button>
                                    )}
                                    {u.is_active && u.role === "MANAGER" && user.role === "ADMIN" && (
                                        <button style={{ width: 'auto', padding: '5px 10px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleDemote(u.manager_id)}>
                                            Demote
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <PaginationControls
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={onPageChange}
            />

            <TransferRequestsList />

            {/* APPROVE MODAL */}
            {showApproveModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '400px', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginTop: 0 }}>Approve {approveTarget?.name}</h3>
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>Assign this staff member to a warehouse.</p>

                        <div style={{ margin: '15px 0' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Assign To Warehouse</label>
                            <select
                                value={approveDestWarehouse}
                                onChange={e => setApproveDestWarehouse(e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="" disabled>Select a warehouse...</option>
                                {warehouses.length > 0 ? (
                                    warehouses.map(w => (
                                        <option key={w.id || w.warehouse_id} value={w.id || w.warehouse_id}>{w.name}</option>
                                    ))
                                ) : (
                                    <option disabled>No available warehouses</option>
                                )}
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <button
                                onClick={() => setShowApproveModal(false)}
                                style={{ background: '#94a3b8', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmApprove}
                                style={{ background: '#22c55e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                                disabled={!approveDestWarehouse}
                            >
                                Confirm Approval
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PROMOTION MODAL */}
            {showPromoteModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '400px', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginTop: 0 }}>Promote {promotionTarget?.name}</h3>
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>Select a warehouse for this new manager. Only warehouses without a current manager are shown.</p>

                        <div style={{ margin: '15px 0' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Destination Warehouse</label>
                            <select
                                value={promotionDestWarehouse}
                                onChange={e => setPromotionDestWarehouse(e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="" disabled>Select a warehouse...</option>
                                {managerlessWarehouses.length > 0 ? (
                                    managerlessWarehouses.map(w => (
                                        <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>
                                    ))
                                ) : (
                                    <option disabled>No available warehouses</option>
                                )}
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <button
                                onClick={() => setShowPromoteModal(false)}
                                style={{ background: '#94a3b8', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmPromote}
                                style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                                disabled={!promotionDestWarehouse}
                            >
                                Confirm Promotion
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '500px', width: '100%', position: 'relative' }}>
                        <button onClick={() => setViewUser(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer' }}>&times;</button>
                        <h2>User Details</h2>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
                            {viewUser.profile.profile_image ? (
                                <img src={viewUser.profile.profile_image} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Img</div>
                            )}
                            <div>
                                <h3 style={{ margin: '0' }}>{viewUser.user.username}</h3>
                                <p style={{ margin: '5px 0', color: '#64748b' }}>{viewUser.user.role}</p>
                                <p style={{ margin: '0' }}>{viewUser.user.email}</p>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div><strong>ID:</strong> {viewUser.user.id}</div>
                            <div><strong>Full Name:</strong> {viewUser.profile.full_name || "-"}</div>
                            <div><strong>Phone:</strong> {viewUser.profile.phone_number || "-"}</div>
                            <div><strong>Gender:</strong> {viewUser.profile.gender || "-"}</div>
                            <div><strong>Status:</strong> {viewUser.user.is_active ? "Active" : "Inactive"}</div>
                            {viewUser.user.assigned_warehouses && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <strong>Assigned Warehouses:</strong>
                                    <ul>
                                        {viewUser.user.assigned_warehouses.map(w => <li key={w.id}>{w.name}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div style={{ marginTop: '20px' }}>
                            <strong>Bio:</strong>
                            <p style={{ marginTop: '5px', background: '#f8fafc', padding: '10px', borderRadius: '4px' }}>{viewUser.profile.bio || "No bio"}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* TRANSFER MODAL */}
            {showTransferModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '400px', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginTop: 0 }}>Transfer {transferTarget?.name}</h3>
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>Select destination warehouse.</p>

                        <div style={{ margin: '15px 0' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Destination Warehouse</label>
                            <select
                                value={transferDestWarehouse}
                                onChange={e => setTransferDestWarehouse(e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="" disabled>Select a warehouse...</option>
                                {warehouses
                                    .filter(w => (w.id || w.warehouse_id) !== transferTarget?.currentWarehouseId)
                                    .map(w => (
                                        <option key={w.id || w.warehouse_id} value={w.id || w.warehouse_id}>{w.name}</option>
                                    ))
                                }
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <button
                                onClick={() => setShowTransferModal(false)}
                                style={{ background: '#94a3b8', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmTransfer}
                                style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                                disabled={!transferDestWarehouse}
                            >
                                {user.role === "ADMIN" ? "Transfer Immediately" : "Request Transfer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div >
    );
};

export default UserList;
