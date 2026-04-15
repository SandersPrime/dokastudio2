// public/js/catalog.js

function catalogEscapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function catalogShowStatus(message, isError = false) {
    const node = document.getElementById('catalogStatus');
    if (!node) return;

    node.textContent = message;
    node.className = `status-box ${isError ? 'error' : 'success'}`;
    node.style.display = 'block';

    setTimeout(() => {
        node.style.display = 'none';
    }, 3500);
}

function formatCatalogPrice(quiz) {
    if (!quiz.isPaid || Number(quiz.price) <= 0) return 'Бесплатно';
    return `${quiz.price} ₽`;
}

function getCatalogFilters() {
    return {
        q: document.getElementById('catalogSearch')?.value.trim() || '',
        category: document.getElementById('catalogCategory')?.value.trim() || '',
        ageGroup: document.getElementById('catalogAgeGroup')?.value.trim() || '',
        format: document.getElementById('catalogFormat')?.value.trim() || '',
        isPaid: document.getElementById('catalogIsPaid')?.value || '',
    };
}

async function loadCatalog() {
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;

    try {
        grid.innerHTML = '<div class="empty-state">Загрузка шаблонов...</div>';
        const result = await CatalogService.getAll(getCatalogFilters());
        renderCatalogGrid(result.quizzes || []);
    } catch (error) {
        grid.innerHTML = '<div class="empty-state">Не удалось загрузить каталог</div>';
        catalogShowStatus(error.message || 'Ошибка загрузки каталога', true);
    }
}

function renderCatalogGrid(quizzes) {
    const grid = document.getElementById('catalogGrid');

    if (!quizzes.length) {
        grid.innerHTML = '<div class="empty-state">Шаблоны не найдены</div>';
        return;
    }

    grid.innerHTML = quizzes.map((quiz) => `
        <article class="catalog-card">
            <div class="catalog-cover">
                ${quiz.thumbnailUrl
                    ? `<img src="${quiz.thumbnailUrl}" alt="">`
                    : `<div class="cover-placeholder">${catalogEscapeHtml(quiz.category || 'Quiz')}</div>`}
            </div>
            <div class="catalog-body">
                <div class="catalog-meta">
                    <span>${catalogEscapeHtml(quiz.category || 'Без категории')}</span>
                    <span>${catalogEscapeHtml(quiz.ageGroup || 'Все возрасты')}</span>
                </div>
                <h3>${catalogEscapeHtml(quiz.title)}</h3>
                <p>${catalogEscapeHtml(quiz.description || 'Описание скоро появится')}</p>
                <div class="catalog-footer">
                    <span>${quiz.questionCount} вопросов</span>
                    <strong>${formatCatalogPrice(quiz)}</strong>
                </div>
                <div class="catalog-actions">
                    <a class="btn btn-outline" href="/quiz-view.html?id=${encodeURIComponent(quiz.id)}">Открыть</a>
                    ${quiz.isPaid
                        ? `<button class="btn btn-primary" onclick="buyCatalogQuiz('${quiz.id}')">Купить</button>`
                        : `<button class="btn btn-primary" onclick="cloneCatalogQuiz('${quiz.id}')">Добавить себе</button>`}
                </div>
            </div>
        </article>
    `).join('');
}

async function loadCatalogQuizView() {
    const root = document.getElementById('quizViewRoot');
    if (!root) return;

    try {
        const quizId = new URLSearchParams(window.location.search).get('id');
        if (!quizId) {
            throw new Error('Не указан id шаблона');
        }

        const result = await CatalogService.getById(quizId);
        renderCatalogQuizView(result.quiz);
    } catch (error) {
        root.innerHTML = `<div class="card empty-state">${catalogEscapeHtml(error.message || 'Шаблон не найден')}</div>`;
    }
}

function renderCatalogQuizView(quiz) {
    const root = document.getElementById('quizViewRoot');

    root.innerHTML = `
        <section class="quiz-hero">
            <div class="quiz-cover-large">
                ${quiz.thumbnailUrl
                    ? `<img src="${quiz.thumbnailUrl}" alt="">`
                    : `<div class="cover-placeholder">${catalogEscapeHtml(quiz.category || 'Quiz')}</div>`}
            </div>
            <div>
                <div class="catalog-meta">
                    <span>${catalogEscapeHtml(quiz.category || 'Без категории')}</span>
                    <span>${catalogEscapeHtml(quiz.ageGroup || 'Все возрасты')}</span>
                    <span>${catalogEscapeHtml(quiz.format || 'Любой формат')}</span>
                </div>
                <h1>${catalogEscapeHtml(quiz.title)}</h1>
                <p class="lead">${catalogEscapeHtml(quiz.description || 'Описание скоро появится')}</p>
                <div class="quiz-stats">
                    <span>Автор: ${catalogEscapeHtml(quiz.author?.name || 'Автор')}</span>
                    <span>${quiz.questionCount} вопросов</span>
                    <strong>${formatCatalogPrice(quiz)}</strong>
                </div>
                ${quiz.isPaid
                    ? `<button class="btn btn-primary mt-4" onclick="buyCatalogQuiz('${quiz.id}')">Купить</button>`
                    : `<button class="btn btn-primary mt-4" onclick="cloneCatalogQuiz('${quiz.id}')">Добавить себе</button>`}
            </div>
        </section>

        <section class="card mt-4">
            <h2>Вопросы</h2>
            <div class="question-list">
                ${(quiz.questions || []).map((question, index) => `
                    <div class="question-preview">
                        <strong>${index + 1}. ${catalogEscapeHtml(question.text)}</strong>
                        <div class="text-secondary">${catalogEscapeHtml(question.type)} · ${question.points} pts</div>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

async function cloneCatalogQuiz(quizId) {
    try {
        if (!getToken()) {
            window.location.href = '/constructor';
            return;
        }

        const result = await CatalogService.clone(quizId);
        catalogShowStatus('Шаблон добавлен в вашу библиотеку');

        setTimeout(() => {
            window.location.href = `/constructor.html?quizId=${encodeURIComponent(result.quiz.id)}`;
        }, 700);
    } catch (error) {
        catalogShowStatus(error.message || 'Не удалось добавить шаблон', true);
    }
}

async function buyCatalogQuiz(quizId) {
    try {
        if (!getToken()) {
            window.location.href = '/constructor';
            return;
        }

        const result = await MarketplaceService.buy(quizId);
        catalogShowStatus('Квиз куплен и добавлен в вашу библиотеку');

        setTimeout(() => {
            window.location.href = `/constructor.html?quizId=${encodeURIComponent(result.quiz.id)}`;
        }, 700);
    } catch (error) {
        catalogShowStatus(error.message || 'Не удалось купить квиз', true);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCatalog();
    loadCatalogQuizView();
});

window.loadCatalog = loadCatalog;
window.cloneCatalogQuiz = cloneCatalogQuiz;
window.buyCatalogQuiz = buyCatalogQuiz;
