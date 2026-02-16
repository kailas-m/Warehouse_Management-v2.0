import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";




const Reports = () => {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user.role === "ADMIN") {
      fetchWarehouses();
    }
  }, [user]);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get("/dashboard/admin/");
      const list = res.data.warehouse_comparison.map(w => ({
        id: w.warehouse_id,
        name: w.name
      }));
      setWarehouses(list);
    } catch (err) {
      console.error("Failed to fetch warehouses for report");
    }
  };

  const handleDownload = async () => {
    setError("");
    if (!fromDate || !toDate) {
      setError("Please select date range");
      return;
    }

    try {
      const response = await api.get("/reports/stock-movements/", {
        params: {
          start_date: fromDate,
          end_date: toDate,
          warehouse_id: selectedWarehouse || undefined
        },
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `stock_report_${fromDate}_${toDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data instanceof Blob) {
        let text = "";
        try {
          // Parse the blob to get the real error message
          text = await err.response.data.text();
          const json = JSON.parse(text);
          setError(json.error || "Failed to download report");
        } catch (e) {
          setError("Backend Error: " + (text ? text.substring(0, 300) : "Unknown error"));
        }
      } else {
        const msg = err.response?.data?.error || "Failed to download report";
        setError(msg);
      }
    }
  };

  return (
    <div>
      <h1>Stock Movement Reports</h1>
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '500px' }}>
        <div className="form-group">
          <label>From Date</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>

        {user.role === "ADMIN" && (
          <div className="form-group">
            <label>Warehouse (Optional)</label>
            <select value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)}>
              <option value="">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        )}

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button onClick={handleDownload} style={{ marginTop: '10px' }}>Download PDF</button>
      </div>
    </div>
  );
};

export default Reports;
