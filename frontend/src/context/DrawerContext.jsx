import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const DrawerContext = createContext();

export const useDrawer = () => {
    const context = useContext(DrawerContext);
    if (!context) {
        throw new Error('useDrawer must be used within DrawerProvider');
    }
    return context;
};

export const DrawerProvider = ({ children }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [drawerState, setDrawerState] = useState({
        isOpen: false,
        entityType: null,
        entityId: null,
    });

    // Sync with URL params
    useEffect(() => {
        const entityType = searchParams.get('drawer_entity');
        const entityId = searchParams.get('drawer_id');

        if (entityType && entityId) {
            setDrawerState({
                isOpen: true,
                entityType,
                entityId: parseInt(entityId, 10),
            });
        } else {
            setDrawerState({
                isOpen: false,
                entityType: null,
                entityId: null,
            });
        }
    }, [searchParams]);

    const openDrawer = (entityType, entityId) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('drawer_entity', entityType);
        newParams.set('drawer_id', entityId.toString());
        setSearchParams(newParams, { replace: false });
    };

    const closeDrawer = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('drawer_entity');
        newParams.delete('drawer_id');
        setSearchParams(newParams, { replace: false });
    };

    const value = {
        ...drawerState,
        openDrawer,
        closeDrawer,
    };

    return (
        <DrawerContext.Provider value={value}>
            {children}
        </DrawerContext.Provider>
    );
};
