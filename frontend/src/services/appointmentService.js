import api from '../api/api';

/**
 * Appointment Service
 * Handles booking, listing, and cancelling appointments.
 */

export const bookAppointment = (payload) =>
    // payload: { doctorId, scheduledAt (ISO string), notes? }
    api.post('/appointments/book', payload, { timeout: 30000 }).then(res => res.data);

export const getUserAppointments = () =>
    api.get('/appointments/user').then(res => res.data.appointments);

export const getDoctorAppointments = (doctorId) =>
    api.get(`/appointments/doctor?doctorId=${doctorId}`).then(res => res.data.appointments);

export const cancelAppointment = (appointmentId) =>
    api.put(`/appointments/cancel/${appointmentId}`).then(res => res.data);

export default { bookAppointment, getUserAppointments, getDoctorAppointments, cancelAppointment };
