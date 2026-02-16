import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { useToast } from "../../context/ToastContext";

const PromotionRequest = () => {
    const [staffList, setStaffList] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState("");
    const { showToast } = useToast();

    useEffect(() => {
        // Fetch staff from user list
        api.get("/users/").then(res => {
            const staff = (res.data.results || res.data).filter(u => u.role === "STAFF");
            setStaffList(staff);
        });
    }, []);

    const handlePromote = async () => {
        try {
            await api.post("/managers/request-staff-promotion/", {
                staff_id: selectedStaff
            });
            showToast("Promotion requested!", "success");
        } catch (err) {
            showToast("Failed to request promotion", "error");
        }
    };

    return (
        <div>
            <h1>Request Staff Promotion</h1>
            <div className="form-group" style={{ maxWidth: '400px' }}>
                <label>Select Staff Member</label>
                <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                    <option value="" disabled>Select...</option>
                    {staffList.map(s => (
                        <option key={s.user_id} value={s.staff_id || s.user_id}>{s.username}</option>
                    ))}
                </select>
                <button onClick={handlePromote} style={{ marginTop: '10px' }} disabled={!selectedStaff}>
                    Request Promotion
                </button>
            </div>
        </div>
    );
};

export default PromotionRequest;
