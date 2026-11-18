import axios from 'axios';
export const api = axios.create({ baseURL: '/api', timeout: 20_000, headers: { 'Content-Type': 'application/json' } });
export function errorMessage(error) { return error?.response?.data?.error || error?.message || 'Something went wrong. Please try again.'; }
