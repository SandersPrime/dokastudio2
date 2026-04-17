// public/js/quiz-constructor.js

// Управление состоянием перенесено в public/js/state/constructor.state.js
// Остается для обратной совместимости
let sortableInstance = null;
const AUTO_SAVE_ORDER_KEY = 'dokastudio.constructor.autoSaveOrder';
var currentQuiz = window.currentQuiz || null;
var questions = Array.isArray(window.questions) ? window.questions : [];
var currentQuestionIndex = Number.isInteger(window.currentQuestionIndex) ? window.currentQuestionIndex : -1;

function syncLegacyGlobalsFromState() {
    if (!window.ConstructorState) {
        window.currentQuiz = currentQuiz;
        window.questions = questions;
        window.currentQuestionIndex = currentQuestionIndex;
        return;
    }

    const state = ConstructorState.getState();
    currentQuiz = state.currentQuiz || currentQuiz || window.currentQuiz || null;
    questions = Array.isArray(state.questions) && state.questions.length
        ? state.questions
        : (Array.isArray(questions) ? questions : []);
    currentQuestionIndex = Number.isInteger(state.currentQuestionIndex)
        ? state.currentQuestionIndex
        : currentQuestionIndex;

    window.currentQuiz = currentQuiz;
    window.questions = questions;
    window.currentQuestionIndex = currentQuestionIndex;
}

function syncStateFromLegacyGlobals(markDirty = true) {
    window.currentQuiz = currentQuiz;
    window.questions = questions;
    window.currentQuestionIndex = currentQuestionIndex;

    if (!window.ConstructorState) return;

    ConstructorState.setCurrentQuiz(currentQuiz);
    if (markDirty) {
        ConstructorState.setQuestions(questions);
    }
    ConstructorState.setCurrentQuestionIndex(currentQuestionIndex);
}

function getActiveQuiz() {
    const stateQuiz = window.ConstructorState?.getState?.().currentQuiz || null;
    currentQuiz = currentQuiz || window.currentQuiz || stateQuiz || null;
    window.currentQuiz = currentQuiz;
    return currentQuiz;
}

const STUDIO_MODE_DEFAULTS = {
    QUESTION: { elementType: 'QUESTION', mode: 'EVERYONE_ANSWERS', layoutType: 'QUESTION', text: 'Новый вопрос' },
    INFO_SLIDE: { elementType: 'INFO_SLIDE', mode: 'INFO_SLIDE', layoutType: 'INFO_SLIDE', text: 'Информационный слайд' },
    ROUND_INTRO: { elementType: 'ROUND_INTRO', mode: 'ROUND_INTRO', layoutType: 'ROUND_INTRO', text: 'Новый раунд' },
    GAME_ROUND: { elementType: 'GAME_ROUND', mode: 'JEOPARDY_ROUND', layoutType: 'GAME_ROUND', text: 'Игровой раунд' },
};

// Оркестрирует всю логику конструктора

function initConstructor() {
    syncLegacyGlobalsFromState();

    const authSection = document.getElementById('authSection');
    const appSection = document.getElementById('appSection');
    const logoutBtn = document.getElementById('logoutBtn');

    if (authSection) authSection.style.display = 'none';
    if (appSection) appSection.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';

    if (typeof currentUser !== 'undefined' && currentUser && window.Navigation) {
        Navigation.updateUser(currentUser.name, getUserInitials());
    }

    updateSaveStatus('Готов к работе');
    initQuizMetaInlineEditing();
    initAutoSaveOrderToggle();
    updateConstructorAvailability();
    openQuizFromQuery();
}

function initQuizMetaInlineEditing() {
    const titleEl = document.getElementById('currentQuizTitle');
    const descEl = document.getElementById('currentQuizDesc');

    if (!titleEl || !descEl) return;
    if (titleEl.dataset.inlineBound === 'true') return;

    titleEl.dataset.inlineBound = 'true';
    titleEl.dataset.field = 'title';
    titleEl.classList.add('quiz-meta-editable');

    descEl.dataset.field = 'description';
    descEl.classList.add('quiz-meta-editable');

    [titleEl, descEl].forEach((node) => {
        node.addEventListener('click', () => startQuizMetaInlineEdit(node));
        node.addEventListener('keydown', (event) => handleQuizMetaInlineKeydown(event, node));
        node.addEventListener('blur', () => commitQuizMetaInlineEdit(node));
    });
}

function startQuizMetaInlineEdit(node) {
    if (!currentQuiz || !node || node.dataset.editing === 'true') return;

    const field = node.dataset.field;
    const currentValue = String(currentQuiz?.[field] || '').trim();

    node.dataset.editing = 'true';
    node.dataset.originalValue = currentValue;
    node.contentEditable = 'true';
    node.classList.add('is-editing');

    if (field === 'description' && (!currentValue || currentValue === 'Без описания')) {
        node.textContent = '';
    }

    node.focus();
    const selection = window.getSelection();
    if (selection) {
        const range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function handleQuizMetaInlineKeydown(event, node) {
    if (node.dataset.editing !== 'true') return;

    if (event.key === 'Enter') {
        event.preventDefault();
        node.blur();
        return;
    }

    if (event.key === 'Escape') {
        event.preventDefault();
        node.textContent = node.dataset.originalValue || '';
        finishQuizMetaInlineEdit(node);
    }
}

function finishQuizMetaInlineEdit(node) {
    node.contentEditable = 'false';
    node.classList.remove('is-editing');
    delete node.dataset.editing;
    delete node.dataset.originalValue;
}

async function commitQuizMetaInlineEdit(node) {
    if (!node || node.dataset.editing !== 'true') return;
    if (!currentQuiz) {
        finishQuizMetaInlineEdit(node);
        return;
    }

    const field = node.dataset.field;
    const originalValue = String(node.dataset.originalValue || '').trim();
    const nextValue = node.textContent.trim();

    if (field === 'title' && !nextValue) {
        node.textContent = originalValue || currentQuiz.title || '';
        showToast('Название квиза не может быть пустым', 'error');
        finishQuizMetaInlineEdit(node);
        return;
    }

    if (nextValue === originalValue) {
        updateQuizDisplay();
        finishQuizMetaInlineEdit(node);
        return;
    }

    try {
        updateSaveStatus('Сохранение...', 'saving');
        const payload = field === 'title'
            ? { title: nextValue }
            : { description: nextValue };

        const response = await QuizService.update(currentQuiz.id, payload);
        currentQuiz = {
            ...currentQuiz,
            ...response.quiz,
        };
        ConstructorState.setCurrentQuiz(currentQuiz);
        updateQuizDisplay();
        updateSaveStatus('Сохранено', 'saved');
        showToast('Изменения квиза сохранены', 'success');
    } catch (error) {
        updateQuizDisplay();
        updateSaveStatus('Ошибка сохранения', 'error');
        showToast(error.message || 'Ошибка сохранения', 'error');
    } finally {
        finishQuizMetaInlineEdit(node);
    }
}

function initAutoSaveOrderToggle() {
    const toggle = document.getElementById('autoSaveOrderToggle');
    if (!toggle || toggle.dataset.bound === 'true') return;

    toggle.checked = localStorage.getItem(AUTO_SAVE_ORDER_KEY) === '1';
    toggle.dataset.bound = 'true';

    toggle.addEventListener('change', () => {
        localStorage.setItem(AUTO_SAVE_ORDER_KEY, toggle.checked ? '1' : '0');
        showToast(toggle.checked ? 'Автосохранение порядка включено' : 'Автосохранение порядка отключено', 'info');
    });
}

function isAutoSaveOrderEnabled() {
    const toggle = document.getElementById('autoSaveOrderToggle');
    return Boolean(toggle && toggle.checked && !toggle.disabled);
}

function updateSaveStatus(message, state = 'idle') {
    const node = document.getElementById('saveStatus');
    if (!node) return;
    node.textContent = message;
    node.dataset.state = state;
    const ribbonMirror = document.getElementById('ribbonSaveStatusMirror');
    if (ribbonMirror) {
        ribbonMirror.textContent = message;
        ribbonMirror.dataset.state = state;
    }
}

function updateConstructorAvailability() {
    syncLegacyGlobalsFromState();

    const hasQuiz = Boolean(getActiveQuiz());
    document.querySelectorAll('[data-requires-quiz="true"]').forEach((node) => {
        node.disabled = !hasQuiz;
        node.classList.toggle('is-disabled', !hasQuiz);
    });

    document.querySelectorAll('[data-requires-question="true"]').forEach((node) => {
        const disabled = currentQuestionIndex < 0 || !questions[currentQuestionIndex];
        node.disabled = disabled;
        node.classList.toggle('is-disabled', disabled);
    });

    window.DokaRibbon?.refresh?.();
}

async function createNewQuiz(titleOrPayload, description = '') {
    try {
        const payload = typeof titleOrPayload === 'object'
            ? titleOrPayload
            : { title: titleOrPayload, description };

        const response = await QuizService.create(payload);

        currentQuiz = response.quiz;
        questions = [];
        currentQuestionIndex = -1;

        ConstructorState.setCurrentQuiz(currentQuiz);
        ConstructorState.setQuestions(questions);
        syncQuizEditorState();

        updateQuizDisplay();
        renderQuestionsList();
        enableQuizActions();
        resetEditor();
        updateConstructorAvailability();
        updateSaveStatus('Квиз создан', 'saved');

        return { success: true, quiz: response.quiz };
    } catch (error) {
        return { success: false, error: error.message || 'Ошибка создания квиза' };
    }
}

async function loadMyQuizzes() {
    window.location.href = '/my-quizzes.html';
}

function openQuizFromQuery() {
    const quizId = new URLSearchParams(window.location.search).get('quizId');
    if (!quizId) return;

    selectQuiz(quizId).catch((error) => {
        showToast(error.message || 'Ошибка загрузки квиза', 'error');
    });
}

async function loadMyQuizzesLegacyModal() {
    try {
        const response = await QuizService.getAll({
            authorId: currentUser.id,
        });

        window.__lastLoadedQuizzes = response.quizzes || [];
        renderQuizzesList(response.quizzes || []);
        showModal('quizzesListModal');
    } catch (error) {
        showToast(error.message || 'Ошибка загрузки квизов', 'error');
    }
}

async function selectQuiz(quizId) {
    try {
        const response = await QuizService.getById(quizId);

        currentQuiz = response.quiz;
        questions = Array.isArray(response.quiz?.questions) ? response.quiz.questions : [];
        questions.sort((a, b) => (a.order || 0) - (b.order || 0));

        ConstructorState.setCurrentQuiz(currentQuiz);
        ConstructorState.setQuestions(questions);
        syncQuizEditorState();

        updateQuizDisplay();
        renderQuestionsList();
        enableQuizActions();
        if (questions.length > 0) {
            editQuestion(0);
        } else {
            resetEditor();
        }
        updateConstructorAvailability();
        closeModal('quizzesListModal');
        updateSaveStatus('Квиз загружен', 'saved');

        showToast(`Загружен квиз "${currentQuiz.title}"`, 'success');
    } catch (error) {
        showToast(error.message || 'Ошибка загрузки квиза', 'error');
    }
}

function renderQuizzesList(quizzes) {
    const listEl = document.getElementById('myQuizzesList');
    if (!listEl) return;

    if (!quizzes.length) {
        listEl.innerHTML = '<div class="empty-state">У вас пока нет квизов</div>';
        return;
    }

    listEl.innerHTML = quizzes.map((quiz) => `
        <div class="card mb-2 quiz-library-card">
            <div>
                <strong>${escapeHtml(quiz.title)}</strong>
                <p class="text-secondary" style="font-size:0.9rem;">${escapeHtml(quiz.description || 'Без описания')}</p>
                <div class="d-flex gap-1 flex-wrap">
                    <span class="badge">${quiz._count?.questions || 0} вопросов</span>
                    <span class="badge">${escapeHtml(quiz.category || 'Без категории')}</span>
                    <span class="badge ${quiz.isPublished ? 'badge-success' : ''}">
                        ${quiz.isPublished ? 'Опубликован' : 'Черновик'}
                    </span>
                </div>
            </div>
            <div class="d-flex gap-1 justify-end mt-2">
                <button class="btn btn-primary btn-sm" onclick="selectQuiz('${quiz.id}')">Открыть</button>
                <button class="btn btn-outline btn-sm" onclick="openEditQuizModal('${quiz.id}')">Редактировать</button>
                <button class="btn btn-danger btn-sm" onclick="deleteQuizById('${quiz.id}')">Удалить</button>
            </div>
        </div>
    `).join('');
}

function updateQuizDisplay() {
    const titleEl = document.getElementById('currentQuizTitle');
    const descEl = document.getElementById('currentQuizDesc');

    if (!titleEl || !descEl) return;

    if (!currentQuiz) {
        titleEl.textContent = 'Квиз не выбран';
        descEl.textContent = '';
        updateSaveStatus('Выберите или создайте квиз');
        return;
    }

    titleEl.textContent = currentQuiz.title;
    descEl.textContent = currentQuiz.description || 'Без описания';
    const pageTitle = document.getElementById('constructorPageTitle');
    if (pageTitle) pageTitle.textContent = currentQuiz.title;
}

function enableQuizActions() {
    ['previewBtn', 'publishBtn', 'exportBtn'].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !currentQuiz;
    });
}

function getQuizCreatePayloadFromModal() {
    return {
        title: document.getElementById('newQuizTitle')?.value?.trim() || '',
        description: document.getElementById('newQuizDesc')?.value?.trim() || '',
        thumbnailUrl: document.getElementById('newQuizThumbnailUrl')?.value?.trim() || '',
    };
}

function getQuizMetaPayloadFromModal() {
    return {
        title: document.getElementById('editQuizTitle')?.value?.trim() || '',
        description: document.getElementById('editQuizDescription')?.value?.trim() || '',
        category: document.getElementById('editQuizCategory')?.value?.trim() || '',
        thumbnailUrl: document.getElementById('editQuizThumbnailUrl')?.value?.trim() || '',
    };
}

function findQuizInLibrary(quizId) {
    return (window.__lastLoadedQuizzes || []).find((quiz) => quiz.id === quizId) || null;
}

async function openEditQuizModal(quizId) {
    try {
        let quiz = findQuizInLibrary(quizId);

        if (!quiz) {
            const response = await QuizService.getById(quizId);
            quiz = response.quiz;
        }

        document.getElementById('editQuizId').value = quiz.id;
        document.getElementById('editQuizTitle').value = quiz.title || '';
        document.getElementById('editQuizDescription').value = quiz.description || '';
        document.getElementById('editQuizCategory').value = quiz.category || '';
        document.getElementById('editQuizThumbnailUrl').value = quiz.thumbnailUrl || '';

        const errorNode = document.getElementById('editQuizError');
        if (errorNode) {
            errorNode.textContent = '';
            errorNode.style.display = 'none';
        }

        showModal('editQuizModal');
    } catch (error) {
        showToast(error.message || 'Не удалось открыть настройки квиза', 'error');
    }
}

async function saveQuizMeta() {
    const quizId = document.getElementById('editQuizId')?.value;
    const errorNode = document.getElementById('editQuizError');

    if (!quizId) return;

    try {
        const payload = getQuizMetaPayloadFromModal();

        if (!payload.title) {
            throw new Error('Введите название квиза');
        }

        const response = await QuizService.update(quizId, payload);

        if (currentQuiz?.id === quizId) {
            currentQuiz = {
                ...currentQuiz,
                ...response.quiz,
            };
            ConstructorState.setCurrentQuiz(currentQuiz);
            updateQuizDisplay();
        }

        closeModal('editQuizModal');
        showToast('Настройки квиза сохранены', 'success');
        await loadMyQuizzes();
    } catch (error) {
        if (errorNode) {
            errorNode.textContent = error.message || 'Ошибка сохранения';
            errorNode.style.display = 'block';
        } else {
            showToast(error.message || 'Ошибка сохранения', 'error');
        }
    }
}

async function deleteQuizById(quizId) {
    const quiz = findQuizInLibrary(quizId);
    const title = quiz?.title || 'этот квиз';

    if (!window.confirm(`Удалить "${title}"? Вопросы и связанные данные квиза будут удалены.`)) {
        return;
    }

    try {
        await QuizService.remove(quizId);

        if (currentQuiz?.id === quizId) {
            currentQuiz = null;
            questions = [];
            currentQuestionIndex = -1;
            ConstructorState.setCurrentQuiz(null);
            ConstructorState.setQuestions([]);
            updateQuizDisplay();
            renderQuestionsList();
            resetEditor();
            enableQuizActions();
            updateConstructorAvailability();
        }

        showToast('Квиз удален', 'success');
        await loadMyQuizzes();
    } catch (error) {
        showToast(error.message || 'Ошибка удаления квиза', 'error');
    }
}

function renderQuestionsList() {
    syncLegacyGlobalsFromState();
    if (window.QuestionListComponent?.renderQuestionsList) {
        window.QuestionListComponent.renderQuestionsList(questions, currentQuestionIndex, 'editQuestion');
    }
    initDragAndDrop();
}

function initDragAndDrop() {
    const container = document.getElementById('questionsList');
    if (!container) return;

    if (sortableInstance) {
        sortableInstance.destroy();
    }

    sortableInstance = new Sortable(container, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'dragging',
        onEnd() {
            const items = container.querySelectorAll('.question-item');
            const reordered = [];

            items.forEach((item) => {
                const id = item.dataset.id;
                const match = questions.find((question) => (question.id || question.tempId) === id);
                if (match) reordered.push(match);
            });

            questions = reordered.map((question, index) => ({
                ...question,
                order: index,
            }));
            ConstructorState.setQuestions(questions);
            renderQuestionsList();
            if (isAutoSaveOrderEnabled()) {
                updateSaveStatus('Автосохранение порядка...', 'saving');
                saveQuizOrder().catch(() => {});
            } else {
                updateSaveStatus('Порядок изменен', 'dirty');
                showToast('Порядок изменен. Включите автосохранение для автоматической отправки', 'info');
            }
        },
    });
}

async function saveQuizOrder() {
    if (!currentQuiz) {
        showToast('Сначала выберите квиз', 'error');
        return;
    }

    const persistedIds = questions.filter((q) => q.id).map((q) => q.id);

    if (!persistedIds.length) {
        showToast('Сначала сохраните вопросы', 'error');
        return;
    }

    try {
        const response = await QuizService.reorderQuestions(currentQuiz.id, persistedIds);
        questions = response.questions || questions;
        ConstructorState.setQuestions(questions);
        renderQuestionsList();
        updateSaveStatus('Порядок сохранен', 'saved');
        showToast('Порядок сохранен', 'success');
    } catch (error) {
        showToast(error.message || 'Ошибка сохранения порядка', 'error');
    }
}

function createDefaultQuestion(kind = 'QUESTION') {
    syncLegacyGlobalsFromState();
    const mode = STUDIO_MODE_DEFAULTS[kind] || STUDIO_MODE_DEFAULTS.QUESTION;
    const isAnswerless = ['INFO_SLIDE', 'ROUND_INTRO', 'JEOPARDY_ROUND'].includes(mode.mode);
    const stateQuestionCount = window.ConstructorState?.getState?.().questions?.length;
    return {
        tempId: generateTempId(),
        text: mode.text,
        subtitle: '',
        elementType: mode.elementType,
        type: mode.mode,
        layoutType: mode.layoutType,
        gameMode: mode.mode,
        backgroundColor: '#f6f8fb',
        backgroundImageUrl: null,
        configJson: JSON.stringify(getDefaultModeConfig(mode.mode, mode.elementType)),
        points: 100,
        timeLimit: 30,
        order: Number.isInteger(stateQuestionCount) ? stateQuestionCount : questions.length,
        pointsAtStart: 100,
        pointsAtEnd: 100,
        penaltyPoints: 0,
        penaltyNoAnswer: 0,
        speedBonus1: 0,
        speedBonus2: 0,
        speedBonus3: 0,
        autoJudge: true,
        lockoutOnWrong: true,
        showCorrectAnswer: true,
        countdownMode: 'auto',
        textReveal: 'none',
        jokersEnabled: true,
        demographicGroup: null,
        slideRouting: null,
        notes: null,
        imageUrl: null,
        audioUrl: null,
        videoUrl: null,
        answers: isAnswerless ? [] : [
            { text: 'Правильный ответ', isCorrect: true, order: 0 },
            { text: 'Неправильный ответ', isCorrect: false, order: 1 },
        ],
    };
}

function getDefaultModeConfig(mode, elementType) {
    const modeToSlideType = {
        INFO_SLIDE: 'INFO_SLIDE',
        ROUND_INTRO: 'ROUND_END',
        JEOPARDY_ROUND: 'TRIVIA_BOARD',
        MILLIONAIRE_ROUND: 'TRIVIA_LADDER',
        MAJORITY_RULES: 'MAJORITY_RULES',
        LAST_MAN_STANDING: 'LAST_MAN_STANDING',
        WAGER: 'WAGER',
    };

    const slideType = modeToSlideType[mode] || 'QUESTION';
    const inputMode = ['IMAGE', 'AUDIO', 'VIDEO', 'TRUE_FALSE', 'TRUEFALSE'].includes(mode)
        ? (mode === 'TRUEFALSE' ? 'TRUE_FALSE' : mode)
        : 'MULTIPLE_CHOICE';
    const questionMode = mode === 'FASTEST_FINGER' ? 'FASTEST_FINGER' : 'EVERYONE_ANSWERS';

    const config = {
        mode,
        elementType,
        slideType,
        questionMode,
        inputMode,
        multipleCorrectMode: 'none',
        orderedMode: 'exact',
        transitionMode: 'default',
        showAnswerPolicy: 'global',
        logic: {},
        special: {},
    };

    if (mode === 'JEOPARDY_ROUND') {
        return {
            ...config,
            categories: ['Тема 1', 'Тема 2', 'Тема 3', 'Тема 4'],
            values: [100, 200, 300, 400, 500],
        };
    }

    if (mode === 'MILLIONAIRE_ROUND') {
        return {
            ...config,
            ladder: [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000],
        };
    }

    return config;
}

function addNewQuestion() {
    addQuizElement('QUESTION');
}

function addQuizElement(kind = 'QUESTION') {
    syncLegacyGlobalsFromState();

    if (!getActiveQuiz()) {
        updateSaveStatus('Сначала создайте или откройте квиз', 'error');
        showToast('Сначала создайте или откройте квиз', 'error');
        updateConstructorAvailability();
        return;
    }

    const question = createDefaultQuestion(kind);
    questions.push(question);
    syncStateFromLegacyGlobals(true);
    renderQuestionsList();
    editQuestion(questions.length - 1);
    updateConstructorAvailability();
    updateSaveStatus('Новый элемент не сохранен', 'dirty');
}

function editQuestion(index) {
    syncLegacyGlobalsFromState();
    const question = questions[index];
    if (!question) return;

    currentQuestionIndex = index;
    syncStateFromLegacyGlobals(false);
    syncQuizEditorState();

    updateQuestionEditorUI(question);
    loadAdvancedSettings(question);
    updateConstructorAvailability();
    updateSaveStatus(question.id ? 'Вопрос открыт' : 'Новый вопрос не сохранен', question.id ? 'idle' : 'dirty');
}

function resetEditor() {
    currentQuestionIndex = -1;
    syncStateFromLegacyGlobals(false);
    syncQuizEditorState();
    updateQuestionEditorUI(null);
    updateConstructorAvailability();
}

function setQuestionType(type) {
    syncLegacyGlobalsFromState();

    if (currentQuestionIndex < 0 || !questions[currentQuestionIndex]) {
        showToast('Сначала выберите вопрос', 'error');
        return;
    }

    const question = questions[currentQuestionIndex];
    question.elementType = getElementTypeForMode(type, question.elementType);
    question.type = type;
    question.gameMode = type;
    question.layoutType = getLayoutTypeForMode(type, question.elementType);
    updateSaveStatus('Тип вопроса изменен', 'dirty');

    if (type === 'TRUE_FALSE' || type === 'TRUEFALSE') {
        question.answers = [
            { text: 'Правда', isCorrect: true, order: 0 },
            { text: 'Ложь', isCorrect: false, order: 1 },
        ];
    } else if (type === 'JEOPARDY_ROUND') {
        question.answers = [];
        question.configJson = JSON.stringify({
            mode: type,
            elementType: question.elementType,
            categories: ['Тема 1', 'Тема 2', 'Тема 3', 'Тема 4'],
            values: [100, 200, 300, 400, 500],
        });
    } else if (type === 'MILLIONAIRE_ROUND') {
        question.answers = [
            { text: 'Вариант A', isCorrect: true, order: 0 },
            { text: 'Вариант B', isCorrect: false, order: 1 },
            { text: 'Вариант C', isCorrect: false, order: 2 },
            { text: 'Вариант D', isCorrect: false, order: 3 },
        ];
        question.configJson = JSON.stringify({
            mode: type,
            elementType: question.elementType,
            ladder: [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000],
        });
    } else if (!Array.isArray(question.answers) || !question.answers.length) {
        question.answers = [
            { text: 'Правильный ответ', isCorrect: true, order: 0 },
            { text: 'Неправильный ответ', isCorrect: false, order: 1 },
        ];
    }

    const config = (typeof QuestionEditorComponent !== 'undefined' && QuestionEditorComponent.parseConfig)
        ? QuestionEditorComponent.parseConfig(question)
        : {};
    const modeToSlideType = {
        INFO_SLIDE: 'INFO_SLIDE',
        ROUND_INTRO: 'ROUND_END',
        JEOPARDY_ROUND: 'TRIVIA_BOARD',
        MILLIONAIRE_ROUND: 'TRIVIA_LADDER',
        MAJORITY_RULES: 'MAJORITY_RULES',
        LAST_MAN_STANDING: 'LAST_MAN_STANDING',
        WAGER: 'WAGER',
    };
    const inferredSlideType = modeToSlideType[type] || 'QUESTION';
    const inferredInputMode = ['IMAGE', 'AUDIO', 'VIDEO', 'TRUE_FALSE', 'TRUEFALSE'].includes(type)
        ? (type === 'TRUEFALSE' ? 'TRUE_FALSE' : type)
        : (type === 'ORDERED' ? 'ORDERED_ANSWERS' : (type === 'MULTIPLE_CORRECT' ? 'MULTIPLE_CORRECT_MULTI_PICK' : 'MULTIPLE_CHOICE'));

    question.configJson = JSON.stringify({
        ...config,
        mode: type,
        elementType: question.elementType,
        slideType: config.slideType || inferredSlideType,
        questionMode: type === 'FASTEST_FINGER' ? 'FASTEST_FINGER' : (config.questionMode || 'EVERYONE_ANSWERS'),
        inputMode: config.inputMode || inferredInputMode,
        multipleCorrectMode: config.multipleCorrectMode || 'none',
        orderedMode: config.orderedMode || 'exact',
        transitionMode: config.transitionMode || 'default',
        showAnswerPolicy: config.showAnswerPolicy || 'global',
        logic: config.logic || {},
        special: config.special || {},
    });

    applyQuestionTypeUI(type);
    syncMediaPreview(question);
    renderQuestionSpecificInputs(question);
    ConstructorState.setQuestions(questions);
    updateQuestionEditorUI(question);
    renderQuestionsList();
    updateConstructorAvailability();
}

function getElementTypeForMode(type, currentElementType = 'QUESTION') {
    if (type === 'INFO_SLIDE') return 'INFO_SLIDE';
    if (type === 'ROUND_INTRO') return 'ROUND_INTRO';
    if (['JEOPARDY_ROUND', 'MILLIONAIRE_ROUND'].includes(type)) return 'GAME_ROUND';
    return currentElementType && !['INFO_SLIDE', 'ROUND_INTRO', 'GAME_ROUND'].includes(currentElementType)
        ? currentElementType
        : 'QUESTION';
}

function getLayoutTypeForMode(type, elementType = null) {
    if (elementType) return elementType;
    if (type === 'INFO_SLIDE') return 'INFO_SLIDE';
    if (type === 'ROUND_INTRO') return 'ROUND_INTRO';
    if (['JEOPARDY_ROUND', 'MILLIONAIRE_ROUND'].includes(type)) return 'GAME_ROUND';
    return 'QUESTION';
}

function collectQuestionFromEditor() {
    if (currentQuestionIndex < 0 || !questions[currentQuestionIndex]) {
        throw new Error('Вопрос не выбран');
    }

    const existing = questions[currentQuestionIndex];

    const question = {
        ...existing,
        text: document.getElementById('questionText').value.trim(),
        points: parseInt(document.getElementById('questionPoints').value, 10) || 100,
        timeLimit: parseInt(document.getElementById('questionTime').value, 10) || 30,
        order: existing.order ?? currentQuestionIndex,
    };

    // Сбор данных из формы
    return QuestionEditorService.normalizeFormData(question, document);
}

function syncPreviewFromProperties() {
    if (currentQuestionIndex < 0 || !questions[currentQuestionIndex]) return;

    try {
        const question = collectQuestionFromEditor();
        questions[currentQuestionIndex] = question;
        ConstructorState.setQuestions(questions);
        QuestionEditorComponent.renderStudioPreview(question);
        renderQuestionsList();
        updateSaveStatus('Есть несохраненные изменения', 'dirty');
    } catch (error) {
        updateSaveStatus('Проверьте поля элемента', 'error');
    }
}

function updateTemplateGallerySelection(template) {
    document.querySelectorAll('.template-tile').forEach((tile) => {
        const isActive = tile.dataset.template === template;
        tile.classList.toggle('active', isActive);
    });
}

function selectQuestionTemplate(template) {
    const templateInput = document.getElementById('questionTemplate');
    const answerLayout = document.getElementById('answerLayout');
    const titleSize = document.getElementById('titleSize');

    if (templateInput) templateInput.value = template;

    const templateDefaults = {
        classic: { answerLayout: 'grid-2', titleSize: 48 },
        'media-left': { answerLayout: 'split-media', titleSize: 44 },
        'answers-right': { answerLayout: 'list', titleSize: 46 },
        'big-question': { answerLayout: 'bottom', titleSize: 62 },
        'media-grid': { answerLayout: 'grid-2', titleSize: 42 },
        poll: { answerLayout: 'list', titleSize: 44 },
    };
    const defaults = templateDefaults[template] || templateDefaults.classic;

    if (answerLayout) answerLayout.value = defaults.answerLayout;
    if (titleSize) titleSize.value = defaults.titleSize;

    updateTemplateGallerySelection(template);
    syncPreviewFromProperties();
}

function updatePreviewField(fieldId, value) {
    const field = document.getElementById(fieldId);
    const normalizedValue = String(value || '').trim();
    if (field) {
        field.value = normalizedValue;
    }
    if (currentQuestionIndex >= 0 && questions[currentQuestionIndex]) {
        if (fieldId === 'questionText') questions[currentQuestionIndex].text = normalizedValue;
        if (fieldId === 'questionSubtitle') questions[currentQuestionIndex].subtitle = normalizedValue;
        ConstructorState.setQuestions(questions);
        renderQuestionsList();
        updateSaveStatus('Есть несохраненные изменения', 'dirty');
    }
}

async function saveCurrentQuestion() {
    syncLegacyGlobalsFromState();

    if (!currentQuiz) {
        showToast('Сначала создайте квиз', 'error');
        return;
    }

    if (currentQuestionIndex < 0 || !questions[currentQuestionIndex]) {
        showToast('Вопрос не выбран', 'error');
        return;
    }

    let question;
    try {
        question = collectQuestionFromEditor();
    } catch (error) {
        showToast(error.message || 'Ошибка чтения формы', 'error');
        return;
    }

    if (!question.text) {
        showToast('Текст вопроса обязателен', 'error');
        return;
    }

    try {
        let response;
        updateSaveStatus('Сохраняем вопрос...', 'saving');

        if (question.id) {
            response = await QuestionService.update(question.id, question);
        } else {
            response = await QuestionService.create(currentQuiz.id, question);
        }

        if (!response.question) {
            throw new Error('Сервер не вернул question');
        }

        questions[currentQuestionIndex] = response.question;
        ConstructorState.setQuestions(questions);
        renderQuestionsList();
        editQuestion(currentQuestionIndex);
        ConstructorState.markSaved();
        updateConstructorAvailability();
        updateSaveStatus('Вопрос сохранен', 'saved');
        showToast('Вопрос сохранен', 'success');
    } catch (error) {
        updateSaveStatus('Ошибка сохранения', 'error');
        showToast(error.message || 'Ошибка сохранения вопроса', 'error');
    }
}

async function deleteCurrentQuestion() {
    syncLegacyGlobalsFromState();

    if (currentQuestionIndex < 0 || !questions[currentQuestionIndex]) {
        showToast('Вопрос не выбран', 'error');
        return;
    }

    const question = questions[currentQuestionIndex];
    const confirmed = window.confirm('Удалить этот вопрос?');

    if (!confirmed) return;

    try {
        if (question.id) {
            await QuestionService.delete(question.id);
        }

        questions.splice(currentQuestionIndex, 1);
        questions = questions.map((item, index) => ({
            ...item,
            order: index,
        }));

        ConstructorState.setQuestions(questions);
        renderQuestionsList();
        resetEditor();
        updateConstructorAvailability();
        updateSaveStatus('Вопрос удален', 'saved');
        showToast('Вопрос удален', 'success');
    } catch (error) {
        showToast(error.message || 'Ошибка удаления вопроса', 'error');
    }
}

function setCorrectAnswer(index) {
    if (currentQuestionIndex < 0 || !questions[currentQuestionIndex]) return;

    questions[currentQuestionIndex].answers = questions[currentQuestionIndex].answers.map((answer, i) => ({
        ...answer,
        isCorrect: i === index,
    }));

    renderAnswersEditor(questions[currentQuestionIndex].answers);
    QuestionEditorComponent.renderStudioPreview(questions[currentQuestionIndex]);
    ConstructorState.setQuestions(questions);
    updateSaveStatus('Правильный ответ изменен', 'dirty');
}

function updateAnswerText(index, value) {
    if (currentQuestionIndex < 0 || !questions[currentQuestionIndex]) return;
    if (!questions[currentQuestionIndex].answers[index]) return;

    questions[currentQuestionIndex].answers[index].text = value;
    const editorInput = document.querySelector(`#answersEditor .answer-item[data-index="${index}"] .answer-input`);
    if (editorInput && editorInput.value !== value) {
        editorInput.value = value;
    }
    ConstructorState.setQuestions(questions);
    updateSaveStatus('Есть несохраненные изменения', 'dirty');
}

function addAnswer() {
    if (currentQuestionIndex < 0 || !questions[currentQuestionIndex]) {
        showToast('Сначала выберите вопрос', 'error');
        return;
    }

    const answers = questions[currentQuestionIndex].answers || [];
    answers.push({
        text: '',
        isCorrect: false,
        order: answers.length,
    });

    questions[currentQuestionIndex].answers = answers;
    ConstructorState.setQuestions(questions);
    renderAnswersEditor(answers);
    QuestionEditorComponent.renderStudioPreview(questions[currentQuestionIndex]);
    updateSaveStatus('Ответ добавлен', 'dirty');
}

function removeAnswer(index) {
    if (currentQuestionIndex < 0 || !questions[currentQuestionIndex]) return;

    const answers = questions[currentQuestionIndex].answers || [];
    if (answers.length <= 2) {
        showToast('Должно остаться минимум 2 ответа', 'error');
        return;
    }

    answers.splice(index, 1);

    if (!answers.some((answer) => answer.isCorrect) && answers[0]) {
        answers[0].isCorrect = true;
    }

    questions[currentQuestionIndex].answers = answers.map((answer, answerIndex) => ({
        ...answer,
        order: answerIndex,
    }));

    ConstructorState.setQuestions(questions);
    renderAnswersEditor(answers);
    QuestionEditorComponent.renderStudioPreview(questions[currentQuestionIndex]);
    updateSaveStatus('Ответ удален', 'dirty');
}

async function uploadMedia(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (currentQuestionIndex < 0 || !questions[currentQuestionIndex]) {
        showToast('Сначала выберите вопрос', 'error');
        event.target.value = '';
        return;
    }

    const uploadPlaceholder = document.getElementById('uploadPlaceholder');

    try {
        if (uploadPlaceholder) {
            uploadPlaceholder.textContent = 'Загрузка...';
        }

        const response = await UploadAPI.uploadFile(file);

        const question = questions[currentQuestionIndex];
        if (file.type.startsWith('image/')) question.imageUrl = response.url;
        if (file.type.startsWith('audio/')) question.audioUrl = response.url;
        if (file.type.startsWith('video/')) question.videoUrl = response.url;

        ConstructorState.setQuestions(questions);
        syncMediaPreview(question);
        QuestionEditorComponent.renderStudioPreview(question);

        if (uploadPlaceholder) {
            uploadPlaceholder.textContent = 'Файл загружен';
        }

        document.getElementById('mediaUploadArea')?.classList.add('has-file');
        updateSaveStatus('Медиа добавлено', 'dirty');
        showToast('Файл загружен', 'success');
    } catch (error) {
        if (uploadPlaceholder) {
            uploadPlaceholder.textContent = 'Нажмите или перетащите файл';
        }
        showToast(error.message || 'Ошибка загрузки файла', 'error');
    }

    event.target.value = '';
}

function initMediaDragAndDrop() {
    const uploadArea = document.getElementById('mediaUploadArea');
    const fileInput = document.getElementById('mediaFile');
    if (!uploadArea || !fileInput) return;

    const resetHint = () => {
        const placeholder = document.getElementById('uploadPlaceholder');
        if (placeholder && !uploadArea.classList.contains('has-file')) {
            placeholder.textContent = 'Нажмите или перетащите файл';
        }
    };

    uploadArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        uploadArea.classList.add('is-dragging');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('is-dragging');
        resetHint();
    });

    uploadArea.addEventListener('drop', (event) => {
        event.preventDefault();
        uploadArea.classList.remove('is-dragging');
        const file = event.dataTransfer?.files?.[0];
        if (!file) return;
        fileInput.files = event.dataTransfer.files;
        uploadMedia({ target: fileInput });
    });
}

// Sync with legacy state
function syncQuizEditorState() {
    if (!window.QuizEditorState) return;
    QuizEditorState.setCurrentQuiz(currentQuiz);
    QuizEditorState.setCurrentQuestion(questions[currentQuestionIndex] || null);
}

// Legacy exports
window.initConstructor = initConstructor;
window.loadMyQuizzes = loadMyQuizzes;
window.selectQuiz = selectQuiz;
window.addNewQuestion = addNewQuestion;
window.addQuizElement = addQuizElement;
window.editQuestion = editQuestion;
window.saveCurrentQuestion = saveCurrentQuestion;
window.deleteCurrentQuestion = deleteCurrentQuestion;
window.setQuestionType = setQuestionType;
window.resetEditor = resetEditor;
window.saveQuizOrder = saveQuizOrder;
window.openEditQuizModal = openEditQuizModal;
window.saveQuizMeta = saveQuizMeta;
window.deleteQuizById = deleteQuizById;
window.syncPreviewFromProperties = syncPreviewFromProperties;
window.updatePreviewField = updatePreviewField;
window.updateConstructorAvailability = updateConstructorAvailability;
window.selectQuestionTemplate = selectQuestionTemplate;
window.updateTemplateGallerySelection = updateTemplateGallerySelection;

window.createQuiz = async function createQuizFromModal() {
    const payload = getQuizCreatePayloadFromModal();

    if (!payload.title) {
        showToast('Введите название', 'error');
        return;
    }

    const result = await createNewQuiz(payload);

    if (!result.success) {
        showToast(result.error || 'Ошибка создания квиза', 'error');
        return;
    }

    closeModal('createQuizModal');
    showToast(`Квиз "${payload.title}" создан`, 'success');
};

window.showAIGenerator = function showAIGenerator() {
    showModal('aiGeneratorModal');
};

