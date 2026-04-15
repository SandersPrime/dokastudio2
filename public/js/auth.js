// Auth.js — Управление авторизацией
let currentUser = null;

async function checkAuth() {
    try {
        const response = await AuthAPI.me();
        if (response.user) {
            currentUser = response.user;
            return true;
        }
    } catch (error) {
        console.error('Auth error:', error);
    }
    clearToken();
    return false;
}

async function doLogin(email, password) {
    try {
        const response = await AuthAPI.login(email, password);
        if (response.token) {
            setToken(response.token);
            currentUser = response.user;
            return { success: true, user: response.user };
        }
        return { success: false, error: response.error };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Ошибка соединения' };
    }
}

async function doRegister(email, password, name) {
    try {
        const response = await AuthAPI.register(email, password, name);
        if (response.token) {
            setToken(response.token);
            currentUser = response.user;
            return { success: true, user: response.user };
        }
        return { success: false, error: response.error };
    } catch (error) {
        console.error('Register error:', error);
        return { success: false, error: 'Ошибка соединения' };
    }
}

function doLogout() {
    clearToken();
    currentUser = null;
    window.location.reload();
}

function getUserInitials() {
    return currentUser?.name?.charAt(0).toUpperCase() || 'U';
}

// Привязка к window с другими именами
window.handleLogin = async () => {
    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        alert('Введите email и пароль');
        return;
    }
    
    const result = await doLogin(email, password);
    if (result.success) {
        window.location.reload();
    } else {
        alert(result.error);
    }
};

window.handleRegister = async () => {
    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    const name = document.getElementById('loginName')?.value?.trim();
    
    if (!email || !password) {
        alert('Введите email и пароль');
        return;
    }
    if (!name) {
        alert('Введите имя');
        return;
    }
    
    const result = await doRegister(email, password, name);
    if (result.success) {
        alert('Регистрация успешна!');
        window.location.reload();
    } else {
        alert(result.error);
    }
};

window.handleLogout = doLogout;