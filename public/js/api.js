// API.js — Все запросы к серверу
const API_URL = window.location.origin + '/api';

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function clearToken() {
    localStorage.removeItem('token');
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
}

// Auth API
const AuthAPI = {
    async me() {
        const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
        return res.json();
    },
    
    async login(email, password) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return res.json();
    },
    
    async register(email, password, name) {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });
        return res.json();
    }
};

// Quiz API
const QuizAPI = {
    async getAll(params = {}) {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`${API_URL}/quizzes?${query}`, { headers: getHeaders() });
        return res.json();
    },
    
    async getById(id) {
        const res = await fetch(`${API_URL}/quizzes/${id}`, { headers: getHeaders() });
        return res.json();
    },
    
    async create(data) {
        const res = await fetch(`${API_URL}/quizzes`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },
    
    async update(id, data) {
        const res = await fetch(`${API_URL}/quizzes/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },
    
    async reorderQuestions(quizId, questionIds) {
        const res = await fetch(`${API_URL}/quizzes/${quizId}/questions/reorder`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ questionIds })
        });
        return res.json();
    },
    
    async exportQuiz(id) {
        window.open(`${API_URL}/quizzes/${id}/export`, '_blank');
    },
    
    async importQuiz(file) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/quizzes/import`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData
        });
        return res.json();
    }
};

// Questions API
const QuestionAPI = {
    async create(quizId, data) {
        const res = await fetch(`${API_URL}/quizzes/${quizId}/questions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },
    
    async update(id, data) {
        const res = await fetch(`${API_URL}/questions/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },
    
    async delete(id) {
        const res = await fetch(`${API_URL}/questions/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return res.json();
    }
};

// Upload API
const UploadAPI = {
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData
        });
        return res.json();
    }
};