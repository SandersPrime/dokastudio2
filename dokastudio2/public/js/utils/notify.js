(function () {
    function notify(message, type = 'info', target = null) {
        const node = typeof target === 'string' ? document.getElementById(target) : target;
        if (node) {
            node.textContent = message || '';
            node.dataset.type = type;
            node.classList.remove('is-info', 'is-success', 'is-error', 'is-warning');
            node.classList.add(`is-${type}`);
            return;
        }
        if (message) console[type === 'error' ? 'error' : 'log'](message);
    }
    window.Notify = { show: notify, success: (m, t) => notify(m, 'success', t), error: (m, t) => notify(m, 'error', t) };
})();
