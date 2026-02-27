import api from '../api/api';

export const addCycle = async (startDate, endDate, notes) => {
    try {
        const response = await api.post('/api/cycle/add', { startDate, endDate, notes });
        return response.data.cycle; // unwrap
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const getCycleHistory = async () => {
    try {
        const response = await api.get('/api/cycle/history');
        return response.data.cycles || []; // unwrap array
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const updateCycle = async (id, data) => {
    try {
        const response = await api.put(`/api/cycle/update/${id}`, data);
        return response.data.cycle; // unwrap
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const deleteCycle = async (id) => {
    try {
        const response = await api.delete(`/api/cycle/delete/${id}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const getPredictions = async () => {
    try {
        const response = await api.get('/api/cycle/prediction');
        return response.data.predictions || null; // unwrap predictions object
    } catch (error) {
        throw error.response?.data || error;
    }
};

export default {
    addCycle,
    getCycleHistory,
    updateCycle,
    deleteCycle,
    getPredictions
};
