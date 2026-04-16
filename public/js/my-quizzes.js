// public/js/my-quizzes.js

let quizLibraryItems = [];

function libraryEscapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function formatLibraryDate(value) {
    if (!value) return 'не указана';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'не указана';

    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

function getLibrarySourceLabel(source) {
    return source === 'PURCHASED' ? 'Куплен' : 'Редактируемый';
}

function showLibraryStatus(message) {
    const node = document.getElementById('libraryStatus');
    if (!node) return;

    node.textContent = message;
    node.className = 'status-box error';
}

function updateLibraryStats(items, meta = {}) {
    const total = items.length;
    const owned = meta.ownCount ?? items.filter((item) => item.source !== 'PURCHASED').length;
    const purchased = meta.purchasedCount ?? items.filter((item) => item.source === 'PURCHASED').length;

    document.getElementById('libraryTotalCount').textContent = String(total);
    document.getElementById('libraryOwnedCount').textContent = String(owned);
    document.getElementById('libraryPurchasedCount').textContent = String(purchased);
}

function getFilteredLibraryItems() {
    const search = document.getElementById('librarySearch')?.value.trim().toLowerCase() || '';
    const source = document.getElementById('librarySource')?.value || '';

    return quizLibraryItems.filter((quiz) => {
        const matchesSource = !source || quiz.source === source;
        const haystack = [
            quiz.title,
            quiz.description,
            quiz.author?.name,
            quiz.category,
            quiz.format,
        ].join(' ').toLowerCase();

        return matchesSource && (!search || haystack.includes(search));
    });
}

function renderQuizLibrary(items) {
    const list = document.getElementById('libraryList');
    if (!list) return;

    if (!items.length) {
        list.innerHTML = `
            <div class="library-empty">
                <strong>Квизы не найдены</strong>
                <p>Создайте новый квиз в Studio или добавьте материал из маркетплейса.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = items.map((quiz) => {
        const sourceClass = quiz.source === 'PURCHASED' ? 'purchased' : 'owned';
        const authorName = quiz.author?.name || 'Автор не указан';
        const createdDate = formatLibraryDate(quiz.createdAt);
        const purchasedDate = formatLibraryDate(quiz.purchasedAt);
        const openUrl = `/constructor.html?quizId=${encodeURIComponent(quiz.id)}`;
        const viewUrl = `/quiz-view.html?id=${encodeURIComponent(quiz.id)}`;

        return `
            <article class="library-card">
                <div class="library-cover">
                    ${quiz.thumbnailUrl
                        ? `<img src="${libraryEscapeHtml(quiz.thumbnailUrl)}" alt="">`
                        : `<span>${libraryEscapeHtml((quiz.category || 'Quiz').slice(0, 12))}</span>`}
                </div>
                <div class="library-main">
                    <div class="library-meta">
                        <span class="library-badge ${sourceClass}">${getLibrarySourceLabel(quiz.source)}</span>
                        <span class="library-badge">${quiz.questionCount || 0} вопросов</span>
                        <span class="library-badge">${quiz.playedCount || 0} игр</span>
                    </div>
                    <h3>${libraryEscapeHtml(quiz.title || 'Без названия')}</h3>
                    <p class="library-description">${libraryEscapeHtml(quiz.description || 'Описание не заполнено')}</p>
                    <div class="library-meta">
                        <span class="library-badge">Создан: ${createdDate}</span>
                        <span class="library-badge">Автор: ${libraryEscapeHtml(authorName)}</span>
                        ${quiz.purchasedAt ? `<span class="library-badge">Куплен: ${purchasedDate}</span>` : ''}
                        ${quiz.category ? `<span class="library-badge">${libraryEscapeHtml(quiz.category)}</span>` : ''}
                        ${quiz.format ? `<span class="library-badge">${libraryEscapeHtml(quiz.format)}</span>` : ''}
                    </div>
                </div>
                <div class="library-card-actions">
                    ${quiz.canEdit
                        ? `<a class="btn btn-primary btn-sm" href="${openUrl}">Открыть в Studio</a>`
                        : `<button class="btn btn-outline btn-sm" disabled>Только просмотр</button>`}
                    <a class="btn btn-outline btn-sm" href="${viewUrl}">Карточка квиза</a>
                </div>
            </article>
        `;
    }).join('');
}

async function loadQuizLibrary() {
    const list = document.getElementById('libraryList');
    if (list) {
        list.innerHTML = '<div class="library-empty">Загрузка библиотеки...</div>';
    }

    try {
        const result = await QuizService.getLibrary();
        quizLibraryItems = result.quizzes || [];
        updateLibraryStats(quizLibraryItems, result.meta || {});
        renderQuizLibrary(getFilteredLibraryItems());
    } catch (error) {
        showLibraryStatus(error.message || 'Не удалось загрузить библиотеку');
        if (list) {
            list.innerHTML = '<div class="library-empty">Не удалось загрузить квизы.</div>';
        }
    }
}

async function initMyQuizzesPage() {
    if (window.Navigation) {
        Navigation.render('app-navigation', { currentPage: 'my-quizzes' });
    }

    const isAuthenticated = await checkAuth();
    const authSection = document.getElementById('authSection');
    const librarySection = document.getElementById('librarySection');

    if (!isAuthenticated) {
        if (authSection) authSection.style.display = 'block';
        if (librarySection) librarySection.style.display = 'none';
        return;
    }

    if (authSection) authSection.style.display = 'none';
    if (librarySection) librarySection.style.display = 'block';

    if (window.Navigation && currentUser) {
        Navigation.updateUser(currentUser.name, getUserInitials());
    }

    document.getElementById('librarySearch')?.addEventListener('input', () => {
        renderQuizLibrary(getFilteredLibraryItems());
    });

    document.getElementById('librarySource')?.addEventListener('change', () => {
        renderQuizLibrary(getFilteredLibraryItems());
    });

    await loadQuizLibrary();
}

document.addEventListener('DOMContentLoaded', initMyQuizzesPage);

window.loadQuizLibrary = loadQuizLibrary;
