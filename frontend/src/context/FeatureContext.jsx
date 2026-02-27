import React, { createContext, useState, useEffect, useContext } from 'react';
import { getAppFeatures } from '../api/api';

const FeatureContext = createContext();

export const FeatureProvider = ({ children }) => {
    const [features, setFeatures] = useState({
        liveLocation: true,
        stressAssessment: true,
        friends: true,
        pcos: true,
        forum: true,
        appointment: true,
        cycleTracker: true,
        emergencyLocator: true
    });
    const [loadingFeatures, setLoadingFeatures] = useState(true);

    const fetchFeatures = async () => {
        try {
            const response = await getAppFeatures();
            if (response.data && response.data.features) {
                setFeatures(prev => ({ ...prev, ...response.data.features }));
            }
        } catch (error) {
            console.error('Failed to fetch feature toggles:', error);
        } finally {
            setLoadingFeatures(false);
        }
    };

    useEffect(() => {
        fetchFeatures();
    }, []);

    const updateFeatureState = (newFeatures) => {
        setFeatures(newFeatures);
    };

    return (
        <FeatureContext.Provider value={{ features, loadingFeatures, fetchFeatures, updateFeatureState }}>
            {children}
        </FeatureContext.Provider>
    );
};

export const useFeatures = () => {
    return useContext(FeatureContext);
};
