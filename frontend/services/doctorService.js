import api from '../api/api';

/**
 * Doctor Service
 * Handles all doctor directory API calls.
 */

export const getDoctors = () =>
    api.get('/doctors').then(res => res.data.doctors);

export const getDoctorById = (doctorId) =>
    api.get(`/doctors/${doctorId}`).then(res => res.data.doctor);

export default { getDoctors, getDoctorById };
