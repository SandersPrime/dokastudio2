(function () {
    const AuthState = {
        user: null,
        setUser(user) { this.user = user || null; return this.user; },
        clear() { this.user = null; },
        isAuthenticated() { return Boolean(this.user || window.getToken?.()); },
    };
    window.AuthState = window.AuthState || AuthState;
})();
