

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

import api from "./axios";

export const fetchRequests = async (status) => {
    try{
        const params = {}
        if(status && status !== 'all') params.status = status
        const response = await api.get(`${BACKEND_URL}/accounts/manage-requests`, { params });
        console.log("Fetched requests data:", response.data);
        return response.data;
    }
    catch(err){
        // preserve original error message
        throw err
    }
}

export const postRequestAction = async (payload) => {
    try {
        // payload should be { request_id: number, action: 'accept'|'reject' }
        const response = await api.post(`${BACKEND_URL}/accounts/manage-requests/`, payload)
        return response.data
    } catch (err) {
        throw err
    }
}

