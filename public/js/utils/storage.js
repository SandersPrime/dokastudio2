(function () {
    const StorageUtils = {
        get(key, fallback = null) {
            try {
                const value = localStorage.getItem(key);
                return value === null ? fallback : JSON.parse(value);
            } catch (error) {
                return fallback;
            }
        },
        set(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        },
        remove(key) {
            localStorage.removeItem(key);
        },
        getRaw(key, fallback = null) {
            return localStorage.getItem(key) ?? fallback;
        },
        setRaw(key, value) {
            localStorage.setItem(key, String(value));
        },
    };
    window.StorageUtils = StorageUtils;
})();
