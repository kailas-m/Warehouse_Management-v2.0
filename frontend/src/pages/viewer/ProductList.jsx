import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import { useDrawer } from "../../context/DrawerContext";
import PaginationControls from "../../components/PaginationControls";
import FilterBar from "../../components/FilterBar";

const ProductList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { openDrawer } = useDrawer();
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useLayoutEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    // Initial update
    updateHeight();

    // Update on resize and when content might change
    window.addEventListener('resize', updateHeight);

    // Observer for robust size changes (e.g. advanced filters expanding)
    const observer = new ResizeObserver(updateHeight);
    if (headerRef.current) observer.observe(headerRef.current);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', updateHeight);
      observer.disconnect();
    };
  }, [user?.role]); // Re-run if role changes

  // Common State
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState([]); // Used for Viewer/Staff
  const [products, setProducts] = useState([]); // Used for Admin/Manager

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10; // Default page size from backend

  // Viewer State (Warehouse Selection)
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null); // { stock, mode: 'buy_now' | 'add_to_cart' }
  const [quantity, setQuantity] = useState(1);

  // Admin Edit State
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", price: "", sku: "" });

  // Sorting
  // Sorting
  const [sortBy, setSortBy] = useState("name");

  // Filters
  const [filters, setFilters] = useState({});

  const filterConfig = [
    { key: 'search', label: 'Search Product', type: 'text' },
    { key: 'is_active', label: 'Status', type: 'select', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
    { key: 'has_stock', label: 'Stock Availability', type: 'select', options: [{ value: 'true', label: 'Has Stock' }, { value: 'false', label: 'Out of Stock' }], group: 'advanced' },
    // { key: 'low_stock', label: 'Low Stock', type: 'select', options: [{ value: 'true', label: 'Low Stock Only' }], group: 'advanced' }
  ];

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    // Logic handled in useEffect
  };

  const handleClearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  useEffect(() => {
    if (!user) return;
    setCurrentPage(1); // Reset page on role switch or mount
    loadData(1);
  }, [user, sortBy, filters]);

  const loadData = (page) => {
    if (user.role === "VIEWER") {
      // If warehouse selected, fetch stocks, else fetch warehouses
      if (selectedWarehouse) {
        handleSelectWarehouse(selectedWarehouse, page);
      } else {
        fetchWarehouses(page);
      }
    } else if (user.role === "STAFF") {
      fetchStaffStocks(page);
    } else {
      fetchProducts(page);
    }
  };

  const onPageChange = (newPage) => {
    setCurrentPage(newPage);
    loadData(newPage);
  };

  const fetchWarehouses = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/warehouses/list/?page=${page}`);
      // Handle paginated response
      if (res.data.results) {
        setWarehouses(res.data.results);
        setTotalItems(res.data.count);
      } else {
        // Fallback if not paginated
        setWarehouses(res.data);
        setTotalItems(res.data.length);
      }
    } catch (err) {
      console.error("Failed to load warehouses");
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffStocks = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/stocks/?page=${page}`);
      if (res.data.results) {
        setStocks(res.data.results);
        setTotalItems(res.data.count);
      } else {
        setStocks(res.data);
        setTotalItems(res.data.length);
      }
    } catch (err) {
      console.error("Failed to load stocks");
    } finally {
      setLoading(false);
    }
  };

  // New fetchProducts function for Admin/Manager roles, incorporating sorting
  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const endpoint = "/products/list/";
      const queryParams = new URLSearchParams({
        page,
        ordering: sortBy,
        ...filters
      }).toString();
      const res = await api.get(`${endpoint}?${queryParams}`);

      if (res.data.results) {
        setProducts(res.data.results);
        setTotalItems(res.data.count);
      } else {
        setProducts(res.data);
        setTotalItems(res.data.length);
      }
    } catch (err) {
      console.error("Failed to load products", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Viewer: Handle Warehouse Selection
  const handleSelectWarehouse = async (warehouse, page = 1) => {
    // If just selected (no page param from generic load), reset to 1
    // But if called via onPageChange, uses page param.
    // We update state here so UI reflects selection immediately
    if (!selectedWarehouse || selectedWarehouse.id !== warehouse.id) {
      setSelectedWarehouse(warehouse);
      page = 1;
      setCurrentPage(1);
    }

    setLoading(true);
    const wId = warehouse.warehouse_id || warehouse.id;
    try {
      const res = await api.get(`/stocks/?warehouse_id=${wId}&page=${page}`);
      if (res.data.results) {
        setStocks(res.data.results);
        setTotalItems(res.data.count);
      } else {
        setStocks(res.data);
        setTotalItems(res.data.length);
      }
    } catch (err) {
      console.error("Failed to load stocks");
    } finally {
      setLoading(false);
    }
  };

  // ... (Cart & Buy Now Logic remains same) ...
  // Viewer: Cart & Buy Now
  const openQuantityModal = (stock, mode) => {
    setActiveItem({ stock, mode });
    setQuantity(1);
  };

  const confirmQuantity = async () => {
    if (!activeItem) return;
    const wId = selectedWarehouse.warehouse_id || selectedWarehouse.id;

    if (activeItem.mode === 'buy_now') {
      try {
        await api.post("/purchase-requests/", {
          product: activeItem.stock.product.id,
          warehouse: wId,
          quantity: parseInt(quantity)
        });
        showToast("Purchase request sent successfully!", "success");
        setActiveItem(null);
      } catch (err) {
        showToast("Failed to send request: " + (err.response?.data?.error || err.message), "error");
      }
    } else {
      const newItem = {
        id: activeItem.stock.id,
        productId: activeItem.stock.product.id,
        name: activeItem.stock.product.name,
        price: activeItem.stock.product.price,
        quantity: parseInt(quantity),
        warehouseId: wId,
        warehouseName: selectedWarehouse.name
      };
      setCart(prev => [...prev, newItem]);
      setActiveItem(null);
      showToast("Added to cart!", "success");
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    let successCount = 0;
    let failCount = 0;
    let firstError = null;

    for (const item of cart) {
      try {
        await api.post("/purchase-requests/", {
          product: item.productId,
          warehouse: item.warehouseId,
          quantity: item.quantity
        });
        successCount++;
      } catch (err) {
        if (!firstError) firstError = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        failCount++;
      }
    }

    let msg = `Checkout complete.\nSent: ${successCount}\nFailed: ${failCount}`;
    if (failCount > 0) msg += `\n\nError Detail: ${firstError}`;
    showToast(msg, failCount > 0 ? "error" : "success");

    if (successCount > 0 && failCount === 0) {
      setCart([]);
      setIsCartOpen(false);
    }
  };

  const handleRemoveFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // Admin: Edit Logic
  const handleEditClick = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      description: product.description || "",
      price: product.price,
      sku: product.sku || ""
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/products/${editingProduct.id}/`, editForm);
      showToast("Product updated!", "success");
      setEditingProduct(null);
      fetchProducts(currentPage); // Use new fetchProducts
    } catch (err) {
      showToast("Failed to update product", "error");
    }
  };


  const handleDelete = async (product) => {
    if (!await confirm(`Are you sure you want to delete "${product.name}"?`, "Delete Product")) return;

    try {
      // 1. Initial delete attempt
      const res = await api.delete(`/products/${product.id}/delete/`);

      // 2. Check if backend requires confirmation (due to stock)
      if (res.data.confirmation_required) {
        if (await confirm(res.data.message, "Confirm Deletion")) {
          // 3. Confirm delete
          await api.delete(`/products/${product.id}/delete/?confirm=true`);
          showToast("Product deleted.", "success");
          fetchProducts(currentPage); // Use new fetchProducts
        }
      } else {
        showToast("Product deleted.", "success");
        fetchProducts(currentPage); // Use new fetchProducts
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to delete product: " + (err.response?.data?.error || err.message), "error");
    }
  };

  const handleCreate = () => {
    navigate("/products/new");
  };

  // ================= RENDER =================

  // 1. VIEWER VIEW (Warehouse Select -> Stocks)
  if (user?.role === "VIEWER") {
    if (!selectedWarehouse) {
      return (
        <div style={{ padding: '20px' }}>
          <h2>Select a Warehouse to Shop</h2>
          {loading ? <p>Loading...</p> : (
            <>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
                {warehouses.map(w => (
                  <div key={w.id} onClick={() => handleSelectWarehouse(w)}
                    style={{
                      border: '1px solid #ddd', padding: '20px', borderRadius: '8px',
                      cursor: 'pointer', width: '200px', background: 'white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <h3>{w.name}</h3>
                    <p>{w.location}</p>
                  </div>
                ))}
              </div>
              <PaginationControls
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={onPageChange}
              />
            </>
          )}
        </div>
      );
    }

    return (
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <button onClick={() => { setSelectedWarehouse(null); setCurrentPage(1); loadData(1); }} style={{ marginRight: '10px' }}>&larr; Back</button>
            <h2 style={{ display: 'inline-block' }}>Products in {selectedWarehouse.name}</h2>
          </div>
          <button onClick={() => setIsCartOpen(true)} style={{ padding: '8px 15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>
            Cart ({cart.length})
          </button>
        </div>

        {loading ? <p>Loading...</p> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
              {stocks.map(stock => (
                <div key={stock.id} style={{ border: '1px solid #eee', padding: '15px', background: 'white', borderRadius: '8px' }}>
                  <h3>{stock.product.name}</h3>
                  <p>Price: <span style={{ color: '#16a34a', fontWeight: 'bold' }}>${stock.product.price}</span></p>
                  <p>Stock: {stock.quantity}</p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button onClick={() => openQuantityModal(stock, 'buy_now')} style={{ flex: 1, padding: '5px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px' }}>Buy Now</button>
                    <button onClick={() => openQuantityModal(stock, 'add_to_cart')} style={{ flex: 1, padding: '5px', background: '#e2e8f0', border: 'none', borderRadius: '4px' }}>Add Cart</button>
                  </div>
                </div>
              ))}
              {stocks.length === 0 && <p>No products found.</p>}
            </div>
            <PaginationControls
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={onPageChange}
            />
          </>
        )}

        {/* Viewer Modals (Quantity, Cart) same as before... */}
        {activeItem && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '300px' }}>
              <h3>{activeItem.mode === 'buy_now' ? 'Buy ' : 'Add '} {activeItem.stock.product.name}</h3>
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ width: '100%', margin: '10px 0', padding: '5px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={confirmQuantity} style={{ flex: 1, background: '#22c55e', color: 'white', padding: '8px', border: 'none', borderRadius: '4px' }}>Confirm</button>
                <button onClick={() => setActiveItem(null)} style={{ flex: 1, background: '#ccc', padding: '8px', border: 'none', borderRadius: '4px' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {isCartOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h2>Your Cart</h2>
                <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5em' }}>&times;</button>
              </div>
              {cart.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '10px 0' }}>
                  <span>{item.name} (x{item.quantity})</span>
                  <button onClick={() => handleRemoveFromCart(index)} style={{ color: 'red', border: 'none', background: 'none' }}>Remove</button>
                </div>
              ))}
              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button onClick={handleCheckout} style={{ padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>Checkout</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. STAFF VIEW (List of Stocks in THEIR warehouse)
  if (user?.role === "STAFF") {
    return (
      <div style={{ padding: '20px' }}>
        <h2>My Warehouse Stock</h2>
        {loading ? <p>Loading...</p> : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Product</th>
                  <th style={{ padding: '10px' }}>SKU</th>
                  <th style={{ padding: '10px' }}>Quantity</th>
                  <th style={{ padding: '10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map(stock => (
                  <tr
                    key={stock.id}
                    onClick={() => openDrawer('stock', stock.id)}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px' }}>{stock.product.name}</td>
                    <td style={{ padding: '10px' }}>{stock.product.sku}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{stock.quantity}</td>
                    <td style={{ padding: '10px' }}>
                      {stock.quantity < 10 ? <span style={{ color: 'red' }}>Low Stock</span> : <span style={{ color: 'green' }}>OK</span>}
                    </td>
                  </tr>
                ))}
                {stocks.length === 0 && <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center' }}>No stock found assigned to your warehouse.</td></tr>}
              </tbody>
            </table>
            <PaginationControls
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={onPageChange}
            />
          </>
        )}
      </div>
    );
  }

  // 3. ADMIN & MANAGER VIEW (Global Product Catalog)
  return (
    <div style={{ padding: '20px' }}>
      <div ref={headerRef} className="sticky-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h1>Products</h1>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="name">Sort by Name (A-Z)</option>
                <option value="-name">Sort by Name (Z-A)</option>
                <option value="price">Sort by Price (Low to High)</option>
                <option value="-price">Sort by Price (High to Low)</option>
                <option value="sku">Sort by SKU (A-Z)</option>
                <option value="-sku">Sort by SKU (Z-A)</option>
              </select>
              {user?.role === "ADMIN" && (
                <button onClick={handleCreate} className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '6px 18px', borderRadius: '3px', background: '#22c55e', color: 'white', border: 'none' }}>+ New Product</button>
              )}
            </div>
          </div>
        </div>

        <FilterBar
          filters={filterConfig}
          activeFilters={filters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />
      </div>

      {loading ? <p>Loading...</p> : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', '--header-offset': `${headerHeight}px` }}>
            <thead className="sticky-table-header">
              <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Name</th>
                <th style={{ padding: '10px' }}>SKU</th>
                <th style={{ padding: '10px' }}>Price</th>
                <th style={{ padding: '10px' }}>Description</th>
                {user?.role === "ADMIN" && <th style={{ padding: '10px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr
                  key={p.id}
                  onClick={() => openDrawer('product', p.id)}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px' }}>{p.name}</td>
                  <td style={{ padding: '10px' }}>{p.sku}</td>
                  <td style={{ padding: '10px' }}>${p.price}</td>
                  <td style={{ padding: '10px', color: '#666' }}>{p.description}</td>
                  {user?.role === "ADMIN" && (
                    <td style={{ padding: '10px' }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleEditClick(p)} style={{ padding: '5px 10px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>Edit</button>
                      <button onClick={() => handleDelete(p)} style={{ padding: '5px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>No products found.</td></tr>}
            </tbody>
          </table>
          <PaginationControls
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={onPageChange}
          />
        </>
      )}

      {/* Admin Edit Modal ... same ... */}
      {editingProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '400px', position: 'relative' }}>
            <button onClick={() => setEditingProduct(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer' }}>&times;</button>
            <h2>Edit Product</h2>
            <form onSubmit={handleUpdate} style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label>Name</label>
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ width: '100%', padding: '8px' }} />
              </div>
              <div>
                <label>SKU</label>
                <input value={editForm.sku} onChange={e => setEditForm({ ...editForm, sku: e.target.value })} style={{ width: '100%', padding: '8px' }} />
              </div>
              <div>
                <label>Price</label>
                <input type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} style={{ width: '100%', padding: '8px' }} />
              </div>
              <div>
                <label>Description</label>
                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} style={{ width: '100%', padding: '8px' }} />
              </div>
              <button type="submit" style={{ padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>Save Changes</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;


