// public/js/marketplace.js

function marketEscapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function marketStatus(message, isError = false) {
    const node = document.getElementById('marketStatus');
    if (!node) return;
    node.textContent = message;
    node.className = `status-box ${isError ? 'error' : 'success'}`;
    node.style.display = 'block';
    setTimeout(() => { node.style.display = 'none'; }, 3500);
}

function priceLabel(quiz) {
    return quiz.isPaid && Number(quiz.price) > 0 ? `${quiz.price} ₽` : 'Бесплатно';
}

function getMarketplaceFilters() {
    return {
        q: document.getElementById('marketSearch')?.value.trim() || '',
        category: document.getElementById('marketCategory')?.value.trim() || '',
        ageGroup: document.getElementById('marketAgeGroup')?.value.trim() || '',
        format: document.getElementById('marketFormat')?.value.trim() || '',
        isPaid: document.getElementById('marketIsPaid')?.value || '',
    };
}

async function loadMarketplace() {
    const root = document.getElementById('marketGrid');
    if (!root) return;
    try {
        root.innerHTML = '<div class="empty-state">Загрузка...</div>';
        const result = await CatalogService.getAll(getMarketplaceFilters());
        renderMarketCards(result.quizzes || []);
    } catch (error) {
        root.innerHTML = '<div class="empty-state">Не удалось загрузить маркетплейс</div>';
        marketStatus(error.message || 'Ошибка загрузки', true);
    }
}

function renderMarketCards(quizzes) {
    const root = document.getElementById('marketGrid');
    if (!quizzes.length) {
        root.innerHTML = '<div class="empty-state">Ничего не найдено</div>';
        return;
    }

    root.innerHTML = quizzes.map((quiz) => `
        <article class="market-card">
            <div class="market-cover">
                ${quiz.thumbnailUrl ? `<img src="${quiz.thumbnailUrl}" alt="">` : `<span>${marketEscapeHtml(quiz.category || 'Quiz')}</span>`}
            </div>
            <div class="market-body">
                <div class="market-tags">
                    <span>${marketEscapeHtml(quiz.category || 'Категория')}</span>
                    <span>${marketEscapeHtml(quiz.ageGroup || 'Все')}</span>
                </div>
                <h3>${marketEscapeHtml(quiz.title)}</h3>
                <p>${marketEscapeHtml(quiz.description || 'Описание скоро появится')}</p>
                <div class="market-row">
                    <span>${quiz.questionCount} вопросов</span>
                    <strong>${priceLabel(quiz)}</strong>
                </div>
                <div class="market-actions">
                    <a class="btn btn-outline" href="/quiz-view.html?id=${encodeURIComponent(quiz.id)}">Открыть</a>
                    ${quiz.isPaid
                        ? `<button class="btn btn-primary" onclick="buyMarketplaceQuiz('${quiz.id}')">Купить</button>`
                        : `<button class="btn btn-primary" onclick="cloneFreeTemplate('${quiz.id}')">Добавить себе</button>`}
                </div>
            </div>
        </article>
    `).join('');
}

async function buyMarketplaceQuiz(quizId) {
    try {
        if (!getToken()) {
            window.location.href = '/constructor';
            return;
        }
        const result = await MarketplaceService.buy(quizId);
        marketStatus('Квиз куплен и добавлен в библиотеку');
        setTimeout(() => {
            window.location.href = `/constructor.html?quizId=${encodeURIComponent(result.quiz.id)}`;
        }, 700);
    } catch (error) {
        marketStatus(error.message || 'Не удалось купить квиз', true);
    }
}

async function cloneFreeTemplate(quizId) {
    try {
        if (!getToken()) {
            window.location.href = '/constructor';
            return;
        }
        const result = await CatalogService.clone(quizId);
        marketStatus('Шаблон добавлен в библиотеку');
        setTimeout(() => {
            window.location.href = `/constructor.html?quizId=${encodeURIComponent(result.quiz.id)}`;
        }, 700);
    } catch (error) {
        marketStatus(error.message || 'Не удалось добавить шаблон', true);
    }
}

async function loadAuthorDashboard() {
    const root = document.getElementById('authorQuizList');
    if (!root) return;
    try {
        const me = await AuthService.me();
        const [quizResponse, marketResponse] = await Promise.all([
            QuizService.getAll({ authorId: me.user.id }),
            MarketplaceService.getMy(),
        ]);
        renderAuthorDashboard(quizResponse.quizzes || [], marketResponse.quizzes || []);
    } catch (error) {
        marketStatus(error.message || 'Ошибка загрузки кабинета автора', true);
    }
}

function renderAuthorDashboard(quizzes, marketplaceQuizzes) {
    const root = document.getElementById('authorQuizList');
    const byId = new Map(marketplaceQuizzes.map((quiz) => [quiz.id, quiz]));
    root.innerHTML = quizzes.map((quiz) => {
        const marketQuiz = byId.get(quiz.id) || quiz;
        return `
            <article class="market-card author-card">
                <h3>${marketEscapeHtml(quiz.title)}</h3>
                <p>${marketEscapeHtml(quiz.description || '')}</p>
                <div class="market-row">
                    <span>Статус: <strong>${marketEscapeHtml(marketQuiz.marketplaceStatus || 'DRAFT')}</strong></span>
                    <span>${priceLabel(marketQuiz)}</span>
                </div>
                ${marketQuiz.rejectionReason ? `<div class="status-box error" style="display:block;">${marketEscapeHtml(marketQuiz.rejectionReason)}</div>` : ''}
                <div class="publish-form">
                    <input class="input" id="price-${quiz.id}" type="number" min="0" placeholder="Цена" value="${marketQuiz.price || 0}">
                    <input class="input" id="category-${quiz.id}" placeholder="Категория" value="${marketEscapeHtml(marketQuiz.category || '')}">
                    <input class="input" id="age-${quiz.id}" placeholder="Возраст" value="${marketEscapeHtml(marketQuiz.ageGroup || '')}">
                    <input class="input" id="format-${quiz.id}" placeholder="Формат" value="${marketEscapeHtml(marketQuiz.format || '')}">
                    <input class="input" id="license-${quiz.id}" placeholder="Лицензия" value="${marketEscapeHtml(marketQuiz.licenseType || '')}">
                    <button class="btn btn-primary" onclick="publishQuizToMarketplace('${quiz.id}')">Отправить на модерацию</button>
                </div>
            </article>
        `;
    }).join('');
}

async function publishQuizToMarketplace(quizId) {
    try {
        await MarketplaceService.publish(quizId, {
            price: Number(document.getElementById(`price-${quizId}`).value || 0),
            category: document.getElementById(`category-${quizId}`).value,
            ageGroup: document.getElementById(`age-${quizId}`).value,
            format: document.getElementById(`format-${quizId}`).value,
            licenseType: document.getElementById(`license-${quizId}`).value,
        });
        marketStatus('Квиз отправлен на модерацию');
        await loadAuthorDashboard();
    } catch (error) {
        marketStatus(error.message || 'Ошибка отправки', true);
    }
}

async function loadAdminMarketplace() {
    const root = document.getElementById('pendingList');
    if (!root) return;
    try {
        const result = await MarketplaceService.getPending();
        renderPendingList(result.quizzes || []);
    } catch (error) {
        root.innerHTML = '<div class="empty-state">Нет доступа или ошибка загрузки</div>';
        marketStatus(error.message || 'Ошибка загрузки pending', true);
    }
}

function renderPendingList(quizzes) {
    const root = document.getElementById('pendingList');
    if (!quizzes.length) {
        root.innerHTML = '<div class="empty-state">Нет квизов на модерации</div>';
        return;
    }
    root.innerHTML = quizzes.map((quiz) => `
        <article class="market-card">
            <h3>${marketEscapeHtml(quiz.title)}</h3>
            <p>${marketEscapeHtml(quiz.description || '')}</p>
            <div class="market-row">
                <span>${marketEscapeHtml(quiz.author?.name || 'Автор')}</span>
                <strong>${priceLabel(quiz)}</strong>
            </div>
            <textarea class="input" id="reject-${quiz.id}" rows="2" placeholder="Причина отклонения"></textarea>
            <div class="market-actions">
                <button class="btn btn-primary" onclick="approveMarketplaceQuiz('${quiz.id}')">Approve</button>
                <button class="btn btn-outline" onclick="rejectMarketplaceQuiz('${quiz.id}')">Reject</button>
            </div>
        </article>
    `).join('');
}

async function approveMarketplaceQuiz(quizId) {
    try {
        await MarketplaceService.approve(quizId);
        marketStatus('Квиз опубликован');
        await loadAdminMarketplace();
    } catch (error) {
        marketStatus(error.message || 'Ошибка approve', true);
    }
}

async function rejectMarketplaceQuiz(quizId) {
    try {
        const reason = document.getElementById(`reject-${quizId}`).value;
        await MarketplaceService.reject(quizId, reason);
        marketStatus('Квиз отклонён');
        await loadAdminMarketplace();
    } catch (error) {
        marketStatus(error.message || 'Ошибка reject', true);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadMarketplace();
    loadAuthorDashboard();
    loadAdminMarketplace();
});

window.loadMarketplace = loadMarketplace;
window.buyMarketplaceQuiz = buyMarketplaceQuiz;
window.cloneFreeTemplate = cloneFreeTemplate;
window.publishQuizToMarketplace = publishQuizToMarketplace;
window.approveMarketplaceQuiz = approveMarketplaceQuiz;
window.rejectMarketplaceQuiz = rejectMarketplaceQuiz;
