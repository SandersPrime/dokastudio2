(function () {
    const Modal = {
        open(id) {
            const node = document.getElementById(id);
            if (node) node.classList.add('active');
        },
        close(id) {
            const node = document.getElementById(id);
            if (node) node.classList.remove('active');
        },
        setContent(id, html) {
            const node = document.getElementById(id);
            if (node) node.innerHTML = html;
        },
    };
    window.Modal = window.Modal || Modal;
})();
