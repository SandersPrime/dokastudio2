(function () {
    const DomUtils = {
        byId(id) { return document.getElementById(id); },
        qs(selector, root = document) { return root.querySelector(selector); },
        qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); },
        setText(target, value) {
            const node = typeof target === 'string' ? document.getElementById(target) : target;
            if (node) node.textContent = value ?? '';
        },
        show(target, display = 'block') {
            const node = typeof target === 'string' ? document.getElementById(target) : target;
            if (node) node.style.display = display;
        },
        hide(target) {
            const node = typeof target === 'string' ? document.getElementById(target) : target;
            if (node) node.style.display = 'none';
        },
        escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },
    };
    window.DomUtils = DomUtils;
})();
