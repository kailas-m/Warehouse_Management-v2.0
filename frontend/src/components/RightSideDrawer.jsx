import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useDrawer } from '../context/DrawerContext';
import api from '../api/axios';
import '../styles/drawer.css';

// Entity-specific detail components
import ProductDetail from './drawer/ProductDetail';
import StockDetail from './drawer/StockDetail';
import PurchaseRequestDetail from './drawer/PurchaseRequestDetail';
import TransferRequestDetail from './drawer/TransferRequestDetail';
import UserDetail from './drawer/UserDetail';

const RightSideDrawer = () => {
    const { isOpen, entityType, entityId, closeDrawer } = useDrawer();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !entityType || !entityId) {
            setData(null);
            setError(null);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const endpoint = getEndpoint(entityType, entityId);
                const response = await api.get(endpoint);
                setData(response.data);
            } catch (err) {
                console.error('Failed to fetch drawer data:', err);
                setError(err.response?.data?.error || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, entityType, entityId]);

    const getEndpoint = (type, id) => {
        const endpoints = {
            product: `/products/${id}/detail/`,
            stock: `/stocks/${id}/detail/`,
            purchase_request: `/purchase-requests/${id}/detail/`,
            transfer_request: `/transfer-requests/${id}/detail/`,
            user: `/users/${id}/detail/`,
        };
        return endpoints[type] || '';
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="drawer-loading">
                    <div className="drawer-spinner"></div>
                    <p>Loading...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="drawer-error">
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} className="drawer-retry-btn">
                        Retry
                    </button>
                </div>
            );
        }

        if (!data) {
            return null;
        }

        switch (entityType) {
            case 'product':
                return <ProductDetail data={data} />;
            case 'stock':
                return <StockDetail data={data} />;
            case 'purchase_request':
                return <PurchaseRequestDetail data={data} />;
            case 'transfer_request':
                return <TransferRequestDetail data={data} />;
            case 'user':
                return <UserDetail data={data} />;
            default:
                return <div>Unknown entity type</div>;
        }
    };

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen) {
                closeDrawer();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, closeDrawer]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="drawer-backdrop" onClick={closeDrawer}></div>

            {/* Drawer */}
            <div className="drawer-container">
                <div className="drawer-header">
                    <h2 className="drawer-title">
                        {entityType?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} Details
                    </h2>
                    <button className="drawer-close-btn" onClick={closeDrawer} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="drawer-body">
                    {renderContent()}
                </div>
            </div>
        </>
    );
};

export default RightSideDrawer;
