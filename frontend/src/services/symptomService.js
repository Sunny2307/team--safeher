import api from '../api/api';

export const addSymptom = async (data) => {
    try {
        const response = await api.post('/api/symptoms/add', data);
        return response.data.symptom; // unwrap
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const getSymptomHistory = async () => {
    try {
        const response = await api.get('/api/symptoms/history');
        return response.data.history || []; // unwrap array
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const getSymptomByDate = async (date) => {
    try {
        const response = await api.get(`/api/symptoms/${date}`);
        return response.data.symptom || null; // unwrap
    } catch (error) {
        throw error.response?.data || error;
    }
};

export default {
    addSymptom,
    getSymptomHistory,
    getSymptomByDate
};
