// src/services/api.js
import axios from 'axios';

// URL base da API - ajuste conforme seu ambiente
const API_BASE_URL = 'http://localhost:8000/api/v1';

// Instância axios configurada
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para tratamento de erros global
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
    }
);

// Serviços específicos para cada endpoint
export const sprintService = {
    getAll: () => api.get('/sprints'),
};

export const workItemService = {
    getAll: () => api.get('/workitems'),
};

export const developerService = {
    getAll: () => api.get('/developers'),
    getAllocations: () => api.get('/developers/allocations'),
    updateAllocations: (allocations) => api.post('/developers/allocations', allocations),
    clearAllocations: () => api.delete('/developers/allocations'),
};

export default api;