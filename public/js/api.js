// public/js/api.js

const API_URL = `${window.location.origin}/api`;

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    if (token) {
        localStorage.setItem('token', token);
    }
}

function clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

function getHeaders(isJson = true) {
    const headers = {};
    const token = getToken();

    if (isJson) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}

async function parseJsonResponse(response) {
    let payload = null;

    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }

    if (!response.ok) {
        const message = payload?.error || `HTTP ${response.status}`;
        throw new Error(message);
    }

    return payload;
}

const AuthAPI = {
    async me() {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: getHeaders(),
        });
        return parseJsonResponse(response);
    },

    async login(email, password) {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ email, password }),
        });

        const result = await parseJsonResponse(response);

        if (result?.token) {
            setToken(result.token);
        }

        if (result?.user) {
            localStorage.setItem('user', JSON.stringify(result.user));
        }

        return result;
    },

    async register(email, password, name) {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ email, password, name }),
        });

        const result = await parseJsonResponse(response);

        if (result?.token) {
            setToken(result.token);
        }

        if (result?.user) {
            localStorage.setItem('user', JSON.stringify(result.user));
        }

        return result;
    },
};

const QuizAPI = {
    async getAll(params = {}) {
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`${API_URL}/quizzes${query ? `?${query}` : ''}`, {
            headers: getHeaders(),
        });

        return parseJsonResponse(response);
    },

    async getById(id) {
        const response = await fetch(`${API_URL}/quizzes/${id}`, {
            headers: getHeaders(),
        });

        return parseJsonResponse(response);
    },

    async create(data) {
        const response = await fetch(`${API_URL}/quizzes`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });

        return parseJsonResponse(response);
    },

    async update(id, data) {
        const response = await fetch(`${API_URL}/quizzes/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });

        return parseJsonResponse(response);
    },

    async remove(id) {
        const response = await fetch(`${API_URL}/quizzes/${id}`, {
            method: 'DELETE',
            headers: getHeaders(false),
        });

        return parseJsonResponse(response);
    },

    async reorderQuestions(quizId, questionIds) {
        const response = await fetch(`${API_URL}/quizzes/${quizId}/questions/reorder`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ questionIds }),
        });

        return parseJsonResponse(response);
    },
};

const QuestionAPI = {
    async create(quizId, data) {
        const response = await fetch(`${API_URL}/quizzes/${quizId}/questions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });

        return parseJsonResponse(response);
    },

    async update(id, data) {
        const response = await fetch(`${API_URL}/questions/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });

        return parseJsonResponse(response);
    },

    async delete(id) {
        const response = await fetch(`${API_URL}/questions/${id}`, {
            method: 'DELETE',
            headers: getHeaders(false),
        });

        return parseJsonResponse(response);
    },
};

const UploadAPI = {
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: getToken()
                ? { Authorization: `Bearer ${getToken()}` }
                : {},
            body: formData,
        });

        return parseJsonResponse(response);
    },
};

const SessionAPI = {
    async create(quizId) {
        const normalizedQuizId = String(quizId || '').trim();
        const response = await fetch(`${API_URL}/sessions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ quizId: normalizedQuizId }),
        });

        return parseJsonResponse(response);
    },

    async getByPin(pinCode) {
        const normalizedPinCode = String(pinCode || '').trim();
        const response = await fetch(`${API_URL}/sessions/pin/${encodeURIComponent(normalizedPinCode)}`, {
            headers: getHeaders(),
        });

        return parseJsonResponse(response);
    },

    async getById(id) {
        const normalizedId = String(id || '').trim();
        const response = await fetch(`${API_URL}/sessions/${encodeURIComponent(normalizedId)}`, {
            headers: getHeaders(),
        });

        return parseJsonResponse(response);
    },
};

const HomeworkAPI = {
    async create(data) {
        const response = await fetch(`${API_URL}/homework`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });

        return parseJsonResponse(response);
    },

    async getAll() {
        const response = await fetch(`${API_URL}/homework`, {
            headers: getHeaders(),
        });

        return parseJsonResponse(response);
    },

    async getById(id) {
        const response = await fetch(`${API_URL}/homework/${encodeURIComponent(String(id || '').trim())}`, {
            headers: getHeaders(),
        });

        return parseJsonResponse(response);
    },

    async update(id, data) {
        const response = await fetch(`${API_URL}/homework/${encodeURIComponent(String(id || '').trim())}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });

        return parseJsonResponse(response);
    },

    async remove(id) {
        const response = await fetch(`${API_URL}/homework/${encodeURIComponent(String(id || '').trim())}`, {
            method: 'DELETE',
            headers: getHeaders(false),
        });

        return parseJsonResponse(response);
    },

    async getReport(id) {
        const response = await fetch(`${API_URL}/homework/${encodeURIComponent(String(id || '').trim())}/report`, {
            headers: getHeaders(),
        });

        return parseJsonResponse(response);
    },

    async getByPin(pinCode) {
        const response = await fetch(`${API_URL}/homework/pin/${encodeURIComponent(String(pinCode || '').trim())}`);
        return parseJsonResponse(response);
    },

    async start(pinCode, studentName) {
        const response = await fetch(`${API_URL}/homework/pin/${encodeURIComponent(String(pinCode || '').trim())}/start`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ studentName }),
        });

        return parseJsonResponse(response);
    },

    async submit(pinCode, data) {
        const response = await fetch(`${API_URL}/homework/pin/${encodeURIComponent(String(pinCode || '').trim())}/submit`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });

        return parseJsonResponse(response);
    },

    async getResults(pinCode, submissionId) {
        const response = await fetch(
            `${API_URL}/homework/pin/${encodeURIComponent(String(pinCode || '').trim())}/results/${encodeURIComponent(String(submissionId || '').trim())}`
        );

        return parseJsonResponse(response);
    },
};

const CatalogAPI = {
    async getAll(params = {}) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                query.set(key, value);
            }
        });

        const response = await fetch(`${API_URL}/catalog${query.toString() ? `?${query}` : ''}`);
        return parseJsonResponse(response);
    },

    async getById(id) {
        const response = await fetch(`${API_URL}/catalog/${encodeURIComponent(String(id || '').trim())}`);
        return parseJsonResponse(response);
    },

    async clone(id) {
        const response = await fetch(`${API_URL}/catalog/${encodeURIComponent(String(id || '').trim())}/clone`, {
            method: 'POST',
            headers: getHeaders(false),
        });

        return parseJsonResponse(response);
    },
};

const MarketplaceAPI = {
    async publish(quizId, data) {
        const response = await fetch(`${API_URL}/marketplace/publish/${encodeURIComponent(String(quizId || '').trim())}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });

        return parseJsonResponse(response);
    },

    async update(quizId, data) {
        const response = await fetch(`${API_URL}/marketplace/${encodeURIComponent(String(quizId || '').trim())}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });

        return parseJsonResponse(response);
    },

    async getMy() {
        const response = await fetch(`${API_URL}/marketplace/my`, {
            headers: getHeaders(),
        });

        return parseJsonResponse(response);
    },

    async getPending() {
        const response = await fetch(`${API_URL}/marketplace/pending`, {
            headers: getHeaders(),
        });

        return parseJsonResponse(response);
    },

    async approve(quizId) {
        const response = await fetch(`${API_URL}/marketplace/${encodeURIComponent(String(quizId || '').trim())}/approve`, {
            method: 'POST',
            headers: getHeaders(false),
        });

        return parseJsonResponse(response);
    },

    async reject(quizId, rejectionReason) {
        const response = await fetch(`${API_URL}/marketplace/${encodeURIComponent(String(quizId || '').trim())}/reject`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ rejectionReason }),
        });

        return parseJsonResponse(response);
    },

    async buy(quizId) {
        const response = await fetch(`${API_URL}/marketplace/${encodeURIComponent(String(quizId || '').trim())}/buy`, {
            method: 'POST',
            headers: getHeaders(false),
        });

        return parseJsonResponse(response);
    },
};

const EarningsAPI = {
    async getSummary() {
        const response = await fetch(`${API_URL}/earnings/summary`, { headers: getHeaders() });
        return parseJsonResponse(response);
    },

    async getSales() {
        const response = await fetch(`${API_URL}/earnings/sales`, { headers: getHeaders() });
        return parseJsonResponse(response);
    },

    async createPayoutRequest(data) {
        const response = await fetch(`${API_URL}/earnings/payout-request`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return parseJsonResponse(response);
    },

    async getPayoutRequests() {
        const response = await fetch(`${API_URL}/earnings/payout-requests`, { headers: getHeaders() });
        return parseJsonResponse(response);
    },

    async getAdminPayoutRequests() {
        const response = await fetch(`${API_URL}/earnings/admin/payout-requests`, { headers: getHeaders() });
        return parseJsonResponse(response);
    },

    async approvePayoutRequest(id, adminNote = '') {
        const response = await fetch(`${API_URL}/earnings/admin/payout-requests/${encodeURIComponent(String(id || '').trim())}/approve`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ adminNote }),
        });
        return parseJsonResponse(response);
    },

    async rejectPayoutRequest(id, adminNote = '') {
        const response = await fetch(`${API_URL}/earnings/admin/payout-requests/${encodeURIComponent(String(id || '').trim())}/reject`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ adminNote }),
        });
        return parseJsonResponse(response);
    },

    async markPayoutPaid(id, adminNote = '') {
        const response = await fetch(`${API_URL}/earnings/admin/payout-requests/${encodeURIComponent(String(id || '').trim())}/mark-paid`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ adminNote }),
        });
        return parseJsonResponse(response);
    },
};

const EquipmentAPI = {
    async getAll(params = {}) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') query.set(key, value);
        });
        const response = await fetch(`${API_URL}/equipment${query.toString() ? `?${query}` : ''}`);
        return parseJsonResponse(response);
    },

    async getBySlug(slug) {
        const response = await fetch(`${API_URL}/equipment/${encodeURIComponent(String(slug || '').trim())}`);
        return parseJsonResponse(response);
    },

    async createRequest(data) {
        const response = await fetch(`${API_URL}/equipment/requests`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return parseJsonResponse(response);
    },

    async adminCreateProduct(data) {
        const response = await fetch(`${API_URL}/equipment/admin/products`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return parseJsonResponse(response);
    },

    async adminGetProducts(params = {}) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') query.set(key, value);
        });
        const response = await fetch(`${API_URL}/equipment/admin/products${query.toString() ? `?${query}` : ''}`, {
            headers: getHeaders(),
        });
        return parseJsonResponse(response);
    },

    async adminUpdateProduct(id, data) {
        const response = await fetch(`${API_URL}/equipment/admin/products/${encodeURIComponent(String(id || '').trim())}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return parseJsonResponse(response);
    },

    async adminDeleteProduct(id) {
        const response = await fetch(`${API_URL}/equipment/admin/products/${encodeURIComponent(String(id || '').trim())}`, {
            method: 'DELETE',
            headers: getHeaders(false),
        });
        return parseJsonResponse(response);
    },

    async adminGetRequests(params = {}) {
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`${API_URL}/equipment/admin/requests${query ? `?${query}` : ''}`, {
            headers: getHeaders(),
        });
        return parseJsonResponse(response);
    },

    async adminUpdateRequest(id, data) {
        const response = await fetch(`${API_URL}/equipment/admin/requests/${encodeURIComponent(String(id || '').trim())}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return parseJsonResponse(response);
    },
};

window.AuthAPI = AuthAPI;
window.QuizAPI = QuizAPI;
window.QuestionAPI = QuestionAPI;
window.UploadAPI = UploadAPI;
window.SessionAPI = SessionAPI;
window.HomeworkAPI = HomeworkAPI;
window.CatalogAPI = CatalogAPI;
window.MarketplaceAPI = MarketplaceAPI;
window.EarningsAPI = EarningsAPI;
window.EquipmentAPI = EquipmentAPI;
window.AuthService = window.AuthService || AuthAPI;
window.QuizService = window.QuizService || QuizAPI;
window.QuestionService = window.QuestionService || QuestionAPI;
window.SessionService = window.SessionService || SessionAPI;
window.HomeworkService = window.HomeworkService || HomeworkAPI;
window.CatalogService = window.CatalogService || CatalogAPI;
window.MarketplaceService = window.MarketplaceService || MarketplaceAPI;
window.EarningsService = window.EarningsService || EarningsAPI;
window.EquipmentService = window.EquipmentService || EquipmentAPI;
window.getToken = getToken;
window.setToken = setToken;
window.clearToken = clearToken;
window.getHeaders = getHeaders;
