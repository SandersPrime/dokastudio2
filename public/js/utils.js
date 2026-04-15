// Utils.js — Вспомогательные функции

function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `status-toast ${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.zIndex = '9999';
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

function getQuestionTypeLabel(type) {
    const labels = {
        'TEXT': '📝 Текст',
        'IMAGE': '🖼️ Картинка',
        'AUDIO': '🎵 Аудио',
        'VIDEO': '🎬 Видео',
        'TRUEFALSE': '✅ Правда/Ложь'
    };
    return labels[type] || '📝 Текст';
}

function getQuestionTypeIcon(type) {
    const icons = {
        'TEXT': '📝',
        'IMAGE': '🖼️',
        'AUDIO': '🎵',
        'VIDEO': '🎬',
        'TRUEFALSE': '✅'
    };
    return icons[type] || '📝';
}

function truncateText(text, maxLength = 30) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function generateTempId() {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Закрываем все другие модалки
        document.querySelectorAll('.preview-modal').forEach(m => {
            m.classList.remove('active');
        });
        // Открываем нужную
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function closeAllModals() {
    document.querySelectorAll('.preview-modal').forEach(m => {
        m.classList.remove('active');
    });
}

// Закрытие модалки по клику на фон
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('preview-modal')) {
        e.target.classList.remove('active');
    }
});

// Закрытие по Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAllModals();
    }
});

window.showModal = showModal;
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;