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

function hasQuizIdInUrl() {
    return Boolean(new URLSearchParams(window.location.search).get('quizId'));
}

const ENTRY_MODES = {
    START: 'start',
    EDITOR: 'editor',
    TEMPLATES: 'templates',
    DOKALAB: 'dokalab',
};

let constructorEntryMode = getDefaultEntryMode();
let enteredViaBlankScenario = false;

function setConstructorEntryMode(nextMode) {
    constructorEntryMode = nextMode || ENTRY_MODES.START;
    updateConstructorEntryMode();
}

function updateConstructorEntryMode() {
    const hasQuiz = Boolean(getActiveQuiz());
    const hasQuizInUrl = hasQuizIdInUrl();
    if (!constructorEntryMode) {
        constructorEntryMode = getDefaultEntryMode();
    }
    const isTemplatesMode = constructorEntryMode === ENTRY_MODES.TEMPLATES;
    const isDokaLabMode = constructorEntryMode === ENTRY_MODES.DOKALAB;
    const shouldShowEditor = !isTemplatesMode
        && !isDokaLabMode
        && (constructorEntryMode === ENTRY_MODES.EDITOR || hasQuiz || hasQuizInUrl);
    const shouldShowStart = constructorEntryMode === ENTRY_MODES.START
        && !hasQuiz
        && !hasQuizInUrl;

    const startScreen = document.getElementById('constructorStartScreen');
    const workspace = document.getElementById('constructorWorkspace');
    const topActions = document.querySelector('.constructor-top-actions');
    const header = document.querySelector('.constructor-header');
    const templatesScreen = document.getElementById('templateLibraryScreen');
    const dokaLabScreen = document.getElementById('dokaLabScreen');
    const backBtn = document.getElementById('backToStartScreenBtn');

    if (startScreen) startScreen.hidden = !shouldShowStart;
    if (workspace) workspace.hidden = !shouldShowEditor;
    if (topActions) topActions.hidden = !shouldShowEditor;
    if (templatesScreen) templatesScreen.hidden = !isTemplatesMode;
    if (dokaLabScreen) dokaLabScreen.hidden = !isDokaLabMode;
    if (header) header.hidden = !shouldShowEditor;
    if (backBtn) backBtn.hidden = !(shouldShowEditor && enteredViaBlankScenario);

    document.body.classList.toggle('constructor-has-launcher', !shouldShowEditor);
    document.body.classList.toggle('constructor-has-editor', shouldShowEditor);
}

function getDefaultEntryMode() {
    return (Boolean(getActiveQuiz()) || hasQuizIdInUrl())
        ? ENTRY_MODES.EDITOR
        : ENTRY_MODES.START;
}

function shouldConfirmReturnToStart() {
    const state = window.ConstructorState?.getState?.();
    if (state?.isDirty) return true;
    if (Array.isArray(questions) && questions.length > 0) return true;
    return Boolean(currentQuiz);
}

function resetConstructorSession() {
    currentQuiz = null;
    questions = [];
    currentQuestionIndex = -1;
    window.ConstructorState?.reset?.();
    updateQuizDisplay();
    renderQuestionsList();
    resetEditor();
    updateConstructorAvailability();
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
    updateBackgroundToolbar();
    updateConstructorAvailability();
    setConstructorEntryMode(getDefaultEntryMode());
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
    updateConstructorEntryMode();
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
        setConstructorEntryMode(ENTRY_MODES.EDITOR);
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
        setConstructorEntryMode(ENTRY_MODES.EDITOR);
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
        const pageDescription = document.getElementById('constructorPageDescription');
        if (pageDescription) pageDescription.textContent = 'Выберите или создайте квиз, чтобы начать сборку сценария.';
        updateSaveStatus('Выберите или создайте квиз');
        return;
    }

    titleEl.textContent = currentQuiz.title;
    descEl.textContent = currentQuiz.description || 'Без описания';
    const pageTitle = document.getElementById('constructorPageTitle');
    if (pageTitle) pageTitle.textContent = currentQuiz.title;
    const pageDescription = document.getElementById('constructorPageDescription');
    if (pageDescription) pageDescription.textContent = currentQuiz.description || 'Без описания';
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

function updateQuizThumbnailStatus(kind, url = '') {
    const status = document.getElementById(kind === 'edit' ? 'editQuizThumbnailStatus' : 'newQuizThumbnailStatus');
    if (!status) return;
    status.textContent = url ? 'Обложка загружена' : 'Файл не выбран';
}

function triggerQuizThumbnailUpload(kind) {
    const input = document.getElementById(kind === 'edit' ? 'editQuizThumbnailFile' : 'newQuizThumbnailFile');
    input?.click();
}

async function uploadQuizThumbnail(event, kind) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Выберите файл изображения', 'error');
        event.target.value = '';
        return;
    }

    const targetId = kind === 'edit' ? 'editQuizThumbnailUrl' : 'newQuizThumbnailUrl';
    const target = document.getElementById(targetId);
    const status = document.getElementById(kind === 'edit' ? 'editQuizThumbnailStatus' : 'newQuizThumbnailStatus');

    try {
        if (status) status.textContent = 'Загрузка...';
        const response = await UploadAPI.uploadFile(file);
        if (target) target.value = response.url || '';
        updateQuizThumbnailStatus(kind, response.url || '');
        showToast('Обложка загружена', 'success');
    } catch (error) {
        updateQuizThumbnailStatus(kind, target?.value || '');
        showToast(error.message || 'Ошибка загрузки обложки', 'error');
    } finally {
        event.target.value = '';
    }
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
        updateQuizThumbnailStatus('edit', quiz.thumbnailUrl || '');

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

function openCurrentQuizSettings() {
    syncLegacyGlobalsFromState();

    if (!currentQuiz?.id) {
        showToast('Сначала выберите или создайте квиз', 'error');
        return;
    }

    openEditQuizModal(currentQuiz.id);
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

function duplicateQuestion(index) {
    syncLegacyGlobalsFromState();

    if (!getActiveQuiz()) {
        updateSaveStatus('Сначала создайте или откройте квиз', 'error');
        showToast('Сначала создайте или откройте квиз', 'error');
        return;
    }

    const source = questions[index];
    if (!source) {
        showToast('Элемент не найден', 'error');
        return;
    }

    const clone = JSON.parse(JSON.stringify(source));
    delete clone.id;
    delete clone.quizId;
    clone.tempId = generateTempId();
    clone.text = `${clone.text || 'Без текста'} копия`;
    clone.order = index + 1;
    clone.answers = Array.isArray(clone.answers)
        ? clone.answers.map((answer, answerIndex) => ({
            ...answer,
            id: undefined,
            questionId: undefined,
            order: answerIndex,
        }))
        : [];

    questions.splice(index + 1, 0, clone);
    questions = questions.map((question, questionIndex) => ({
        ...question,
        order: questionIndex,
    }));

    syncStateFromLegacyGlobals(true);
    renderQuestionsList();
    editQuestion(index + 1);
    updateConstructorAvailability();
    updateSaveStatus('Копия элемента не сохранена', 'dirty');
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
    updateConstructorEntryMode();
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
        updateDerivedAppearanceFields();
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

function updateDerivedAppearanceFields() {
    syncActiveTextControlsToAppearance();

    const questionAlign = document.getElementById('questionAlign')?.value || 'left';
    const legacyAlign = document.getElementById('textAlign');
    if (legacyAlign) legacyAlign.value = questionAlign;

    const gradient = document.getElementById('backgroundGradient');
    const start = document.getElementById('backgroundGradientStart')?.value;
    const end = document.getElementById('backgroundGradientEnd')?.value;
    const direction = document.getElementById('backgroundGradientDirection')?.value || '135deg';
    if (gradient && start && end) {
        gradient.value = `linear-gradient(${direction}, ${start}, ${end})`;
    }

    document.querySelectorAll('[data-align-group]').forEach((button) => {
        const input = document.getElementById(button.dataset.alignGroup);
        const isActive = input && button.dataset.alignValue === input.value;
        button.classList.toggle('is-active', Boolean(isActive));
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('[data-align-target]').forEach((button) => {
        const input = document.getElementById(button.dataset.alignTarget);
        const isActive = input && button.dataset.align === input.value;
        button.classList.toggle('is-active', Boolean(isActive));
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('[data-toggle]').forEach((button) => {
        const input = document.getElementById(button.dataset.toggle);
        const isActive = input?.value === 'true' || input?.checked === true;
        button.classList.toggle('is-active', Boolean(isActive));
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    refreshActiveTextControls();
}

function getActiveTextTarget() {
    const value = document.getElementById('activeTextTarget')?.value;
    return value === 'answer' ? 'answer' : 'question';
}

function getTextTargetIds(target = getActiveTextTarget()) {
    const prefix = target === 'answer' ? 'answer' : 'question';
    return {
        prefix,
        font: `${prefix}Font`,
        size: `${prefix}Size`,
        color: `${prefix}Color`,
        bold: `${prefix}Bold`,
        italic: `${prefix}Italic`,
        underline: `${prefix}Underline`,
        align: `${prefix}Align`,
    };
}

function setControlValue(id, value) {
    const control = document.getElementById(id);
    if (!control || value === undefined || value === null) return;
    control.value = value;
}

function syncActiveTextControlsToAppearance() {
    if (!document.getElementById('textFont')) return;

    const ids = getTextTargetIds();
    setControlValue(ids.font, document.getElementById('textFont')?.value || "'Inter', sans-serif");
    setControlValue(ids.size, document.getElementById('textSize')?.value || (ids.prefix === 'question' ? '48' : '18'));
    setControlValue(ids.color, document.getElementById('textColor')?.value || '#111827');
}

function refreshActiveTextControls() {
    if (!document.getElementById('textFont')) return;

    const target = getActiveTextTarget();
    const ids = getTextTargetIds(target);
    const defaults = target === 'answer'
        ? { font: "'Inter', sans-serif", size: '18', color: '#111827', align: 'left' }
        : { font: "'Inter', sans-serif", size: '48', color: '#111827', align: 'left' };

    setControlValue('textFont', document.getElementById(ids.font)?.value || defaults.font);
    setControlValue('textSize', document.getElementById(ids.size)?.value || defaults.size);
    setControlValue('textColor', document.getElementById(ids.color)?.value || defaults.color);
    const sizeControl = document.getElementById('textSize');
    if (sizeControl) {
        sizeControl.min = target === 'answer' ? '12' : '20';
        sizeControl.max = target === 'answer' ? '48' : '96';
        sizeControl.setAttribute('aria-label', target === 'answer' ? 'Размер ответов' : 'Размер вопроса');
    }
    document.getElementById('textFont')?.setAttribute('aria-label', target === 'answer' ? 'Шрифт ответов' : 'Шрифт вопроса');
    document.getElementById('textColor')?.setAttribute('aria-label', target === 'answer' ? 'Цвет ответов' : 'Цвет вопроса');

    document.querySelectorAll('[data-text-target]').forEach((button) => {
        const isActive = button.dataset.textTarget === target;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('[data-text-toggle]').forEach((button) => {
        const id = ids[button.dataset.textToggle];
        const isActive = document.getElementById(id)?.value === 'true';
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    const currentAlign = document.getElementById(ids.align)?.value || defaults.align;
    document.querySelectorAll('[data-text-align]').forEach((button) => {
        const isActive = button.dataset.textAlign === currentAlign;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function setActiveTextTarget(target) {
    const input = document.getElementById('activeTextTarget');
    if (!input) return;
    input.value = target === 'answer' ? 'answer' : 'question';
    refreshActiveTextControls();
}

function toggleActiveTextStyle(style) {
    const ids = getTextTargetIds();
    const input = document.getElementById(ids[style]);
    if (!input) return;
    input.value = input.value === 'true' ? 'false' : 'true';
    updateDerivedAppearanceFields();
    syncPreviewFromProperties();
}

function setActiveTextAlign(value) {
    const ids = getTextTargetIds();
    const input = document.getElementById(ids.align);
    if (!input) return;
    input.value = value;
    updateDerivedAppearanceFields();
    syncPreviewFromProperties();
}

function openTemplateLibrary() {
    setConstructorEntryMode(ENTRY_MODES.TEMPLATES);
    openTemplateLibraryScreen();
}

function openMarketplaceStart() {
    window.location.href = '/marketplace.html';
}

function openDokaLabRequest() {
    showModal('dokaLabRequestModal');
}

function openDokaLabScreen() {
    setConstructorEntryMode(ENTRY_MODES.DOKALAB);
}

function closeDokaLabScreen() {
    setConstructorEntryMode(getDefaultEntryMode());
}

async function startBlankQuiz() {
    enteredViaBlankScenario = true;
    updateSaveStatus('Создаем новую викторину...', 'saving');
    const result = await createNewQuiz({
        title: 'Новая викторина',
        description: '',
    });

    if (!result.success) {
        updateSaveStatus('Ошибка создания квиза', 'error');
        showToast(result.error || 'Ошибка создания квиза', 'error');
        return;
    }

    setConstructorEntryMode(ENTRY_MODES.EDITOR);
    showToast('Новая викторина создана', 'success');
}

function submitDokaLabLandingRequest() {
    const name = document.getElementById('dokaLabLandingName')?.value?.trim();
    const contact = document.getElementById('dokaLabLandingContact')?.value?.trim();
    const format = document.getElementById('dokaLabLandingFormat')?.value?.trim();
    const audience = document.getElementById('dokaLabLandingAudience')?.value?.trim();
    const duration = document.getElementById('dokaLabLandingDuration')?.value?.trim();
    const comment = document.getElementById('dokaLabLandingComment')?.value?.trim();

    if (!contact) {
        showToast('Оставьте контакт для связи', 'error');
        return;
    }

    const summary = [
        name ? `Имя: ${name}` : null,
        contact ? `Контакт: ${contact}` : null,
        format ? `Формат: ${format}` : null,
        audience ? `Аудитория: ${audience}` : null,
        duration ? `Длительность: ${duration}` : null,
        comment ? `Комментарий: ${comment}` : null,
    ].filter(Boolean).join('\n');

    if (summary) {
        console.info('DokaLab landing request:', summary);
    }

    showToast('Заявка в DokaLab отправлена. Мы свяжемся с вами.', 'success');
    setConstructorEntryMode(ENTRY_MODES.START);

    ['dokaLabLandingName', 'dokaLabLandingContact', 'dokaLabLandingFormat', 'dokaLabLandingAudience', 'dokaLabLandingDuration', 'dokaLabLandingComment']
        .forEach((id) => {
            const field = document.getElementById(id);
            if (field) field.value = '';
        });
}

function returnToStartScenario() {
    if (!enteredViaBlankScenario) return;
    if (shouldConfirmReturnToStart()) {
        const confirmed = window.confirm('Вы уверены, что хотите вернуться к выбору сценария? Несохранённые изменения могут быть потеряны.');
        if (!confirmed) return;
    }
    enteredViaBlankScenario = false;
    resetConstructorSession();
    setConstructorEntryMode(ENTRY_MODES.START);
    updateSaveStatus('Выберите сценарий старта');
}

function submitDokaLabRequest() {
    const contact = document.getElementById('dokaLabContact')?.value?.trim();
    if (!contact) {
        showToast('Оставьте контакт для связи', 'error');
        return;
    }
    closeModal('dokaLabRequestModal');
    showToast('Заявка DokaLab принята. Мы свяжемся с вами.', 'success');
}

async function startQuizFromTemplate(templateId = '') {
    closeTemplateLibraryScreen();

    const template = resolveTemplateById(templateId);
    if (!template) {
        showToast('Шаблон не найден', 'error');
        return;
    }

    updateSaveStatus('Создаем квиз по шаблону...', 'saving');

    try {
        const createPayload = {
            title: template.title || 'Новый квиз по шаблону',
            description: template.description || '',
            thumbnailUrl: template.thumbnailUrl || '',
            category: template.category || '',
            ageGroup: template.ageGroup || '',
            format: template.format || '',
        };

        const result = await createNewQuiz(createPayload);
        if (!result.success) {
            throw new Error(result.error || 'Ошибка создания квиза');
        }

        const quizId = result.quiz.id;
        const settingsPayload = filterTemplateSettings(template.settings);

        if (Object.keys(settingsPayload).length) {
            await QuizService.update(quizId, settingsPayload);
        }

        if (Array.isArray(template.questions) && template.questions.length) {
            for (let index = 0; index < template.questions.length; index += 1) {
                const payload = buildTemplateQuestionPayload(template.questions[index], index);
                await QuestionService.create(quizId, payload);
            }
        }

        await selectQuiz(quizId);
        updateSaveStatus('Шаблон применен', 'saved');
        showToast(`Квиз "${template.title}" создан по шаблону`, 'success');
    } catch (error) {
        updateSaveStatus('Ошибка создания по шаблону', 'error');
        showToast(error.message || 'Ошибка создания по шаблону', 'error');
    }
}

const LOCAL_TEMPLATE_LIBRARY = [
    {
        id: 'classic-quiz',
        title: 'Классическая викторина',
        tag: 'Квиз',
        description: 'Готовая классика с раундами, баллами и финальным рейтингом. Отлично подходит для любых аудиторий.',
        duration: '45–60 мин',
        audience: '16+ участников',
        tags: ['Популярный', 'Универсальный', 'Классика'],
        category: 'Классика',
        ageGroup: '16+',
        format: 'Сцена',
        length: 'Длинный',
        collections: ['популярные', 'по формату', 'длинные'],
        recommended: true,
        settings: {
            hasTimer: true,
            timePerQuestion: 30,
            showLeaderboard: true,
            allowReconnect: true,
            isPrivate: false,
        },
        highlight: 'Самый популярный формат для онлайн и офлайн игр.',
        preview: {
            rounds: ['Разминка', 'Раунд с вариантами', 'Финальный блиц'],
            slides: ['Интро', 'Вопросы', 'Лидерборд'],
            mechanics: ['Очки', 'Таймер', 'Рейтинг'],
        },
        questions: [
            {
                text: 'Добро пожаловать в игру! Сейчас будет разминка, подготовьтесь к быстрым ответам.',
                type: 'INFO_SLIDE',
                elementType: 'INFO_SLIDE',
                layoutType: 'INFO_SLIDE',
                notes: 'Слайд-вступление',
            },
            {
                text: 'Раунд 1. Разогрев',
                type: 'ROUND_INTRO',
                elementType: 'ROUND_INTRO',
                layoutType: 'ROUND_INTRO',
            },
            {
                text: 'Какой город является столицей Австралии?',
                type: 'EVERYONE_ANSWERS',
                answers: [
                    { text: 'Канберра', isCorrect: true },
                    { text: 'Сидней', isCorrect: false },
                    { text: 'Мельбурн', isCorrect: false },
                    { text: 'Перт', isCorrect: false },
                ],
            },
            {
                text: 'Самая длинная река в мире — это Амазонка.',
                type: 'TRUE_FALSE',
                answers: [
                    { text: 'Правда', isCorrect: true },
                    { text: 'Ложь', isCorrect: false },
                ],
            },
            {
                text: 'Финал',
                type: 'ROUND_INTRO',
                elementType: 'ROUND_INTRO',
                layoutType: 'ROUND_INTRO',
            },
            {
                text: 'Какой фильм получил «Оскар» за лучший фильм в 2024 году?',
                type: 'EVERYONE_ANSWERS',
                answers: [
                    { text: 'Оппенгеймер', isCorrect: true },
                    { text: 'Барби', isCorrect: false },
                    { text: 'Убийцы цветочной луны', isCorrect: false },
                    { text: 'Маэстро', isCorrect: false },
                ],
            },
        ],
    },
    {
        id: 'team-battle',
        title: 'Командный баттл',
        tag: 'Команды',
        description: 'Динамичный матч для корпоративов и вечеринок: команды, капитаны и борьба за лидерство.',
        duration: '35–50 мин',
        audience: '8–24 участника',
        tags: ['Командная', 'Соревнование', 'Популярный'],
        category: 'Командная игра',
        ageGroup: '14+',
        format: 'Командный',
        length: 'Средний',
        collections: ['популярные', 'для корпоратива', 'по формату'],
        recommended: true,
        settings: {
            hasTimer: true,
            timePerQuestion: 20,
            showLeaderboard: true,
            allowReconnect: true,
            isPrivate: false,
        },
        highlight: 'Идеально для тимбилдингов и корпоративных событий.',
        preview: {
            rounds: ['Разогрев', 'Баттл', 'Финальный спринт'],
            slides: ['Интро', 'Командные вопросы', 'Финал'],
            mechanics: ['Командные очки', 'Скоростные ответы', 'Супер-раунд'],
        },
        questions: [
            {
                text: 'Командный баттл стартует! Выберите капитанов и приготовьтесь отвечать быстро.',
                type: 'INFO_SLIDE',
                elementType: 'INFO_SLIDE',
                layoutType: 'INFO_SLIDE',
            },
            {
                text: 'Раунд 1. Быстрый старт',
                type: 'ROUND_INTRO',
                elementType: 'ROUND_INTRO',
                layoutType: 'ROUND_INTRO',
            },
            {
                text: 'Сколько минут в 2,5 часах?',
                type: 'EVERYONE_ANSWERS',
                answers: [
                    { text: '150', isCorrect: true },
                    { text: '120', isCorrect: false },
                    { text: '180', isCorrect: false },
                    { text: '210', isCorrect: false },
                ],
            },
            {
                text: 'Раунд 2. Истина или ложь',
                type: 'ROUND_INTRO',
                elementType: 'ROUND_INTRO',
                layoutType: 'ROUND_INTRO',
            },
            {
                text: 'В радуге семь цветов.',
                type: 'TRUE_FALSE',
                answers: [
                    { text: 'Правда', isCorrect: true },
                    { text: 'Ложь', isCorrect: false },
                ],
            },
        ],
    },
    {
        id: 'knowledge-check',
        title: 'Проверка знаний',
        tag: 'Обучение',
        description: 'Готовая структура для уроков, тренингов и проверочных сессий с аккуратной логикой.',
        duration: '30–45 мин',
        audience: 'Обучение',
        tags: ['Обучение', 'Контроль', 'Новый'],
        category: 'Для школы',
        ageGroup: '18+',
        format: 'Тренинг',
        length: 'Средний',
        collections: ['новые', 'для школы', 'по формату'],
        quickStart: true,
        settings: {
            hasTimer: true,
            timePerQuestion: 35,
            showLeaderboard: false,
            allowReconnect: true,
            isPrivate: true,
        },
        highlight: 'Сценарий для преподавателей и тренеров с методической логикой.',
        preview: {
            rounds: ['Введение', 'Проверка знаний', 'Закрепление'],
            slides: ['Инфо', 'Вопросы', 'Обсуждение'],
            mechanics: ['Контроль', 'Тихий режим', 'Разбор'],
        },
        questions: [
            {
                text: 'Учебный квиз: ответьте на вопросы и закрепите материал.',
                type: 'INFO_SLIDE',
                elementType: 'INFO_SLIDE',
                layoutType: 'INFO_SLIDE',
            },
            {
                text: 'Какая формула описывает площадь круга?',
                type: 'EVERYONE_ANSWERS',
                answers: [
                    { text: 'πr²', isCorrect: true },
                    { text: '2πr', isCorrect: false },
                    { text: 'r²', isCorrect: false },
                    { text: 'πd', isCorrect: false },
                ],
            },
            {
                text: 'Метод SMART используется для постановки целей.',
                type: 'TRUE_FALSE',
                answers: [
                    { text: 'Правда', isCorrect: true },
                    { text: 'Ложь', isCorrect: false },
                ],
            },
        ],
    },
    {
        id: 'blitz-night',
        title: 'Блиц-игра на вечер',
        tag: 'Развлечение',
        description: 'Энергичный блиц на 15–20 вопросов. Запускайте за 10 минут до события.',
        duration: '25–35 мин',
        audience: '10–30 игроков',
        tags: ['Развлечение', 'Быстро', 'Вечеринка'],
        category: 'Для вечеринки',
        ageGroup: '16+',
        format: 'Блиц',
        length: 'Короткий',
        collections: ['быстрый старт', 'для вечеринки', 'короткие'],
        quickStart: true,
        settings: {
            hasTimer: true,
            timePerQuestion: 15,
            showLeaderboard: true,
            allowReconnect: true,
            isPrivate: false,
        },
        highlight: 'Для вечеринок, когда нужно быстро вовлечь гостей.',
        preview: {
            rounds: ['Разогрев', 'Блиц-раунды', 'Финал'],
            slides: ['Интро', '15-секундные вопросы', 'Результаты'],
            mechanics: ['Быстрые ответы', 'Таймер', 'Моментальный рейтинг'],
        },
        questions: [
            {
                text: 'Блиц стартует! Ответы — в течение 15 секунд.',
                type: 'INFO_SLIDE',
                elementType: 'INFO_SLIDE',
                layoutType: 'INFO_SLIDE',
            },
            {
                text: 'Какой океан самый большой?',
                type: 'EVERYONE_ANSWERS',
                answers: [
                    { text: 'Тихий', isCorrect: true },
                    { text: 'Атлантический', isCorrect: false },
                    { text: 'Индийский', isCorrect: false },
                    { text: 'Северный Ледовитый', isCorrect: false },
                ],
            },
            {
                text: 'У Юпитера больше всего спутников в Солнечной системе.',
                type: 'TRUE_FALSE',
                answers: [
                    { text: 'Правда', isCorrect: true },
                    { text: 'Ложь', isCorrect: false },
                ],
            },
        ],
    },
    {
        id: 'storyline-quest',
        title: 'Сюжетный квест',
        tag: 'Сценарий',
        description: 'Погружение в историю с последовательными раундами и атмосферой квеста.',
        duration: '60–90 мин',
        audience: 'Клубы, вечеринки',
        tags: ['Сюжет', 'Эмоции', 'Длинный формат'],
        category: 'По формату',
        ageGroup: '18+',
        format: 'Квест',
        length: 'Длинный',
        collections: ['длинные', 'по формату'],
        settings: {
            hasTimer: true,
            timePerQuestion: 40,
            showLeaderboard: false,
            allowReconnect: true,
            isPrivate: false,
        },
        highlight: 'Подходит для вечерних мероприятий и игровых клубов.',
        preview: {
            rounds: ['Погружение', 'Квест', 'Развязка'],
            slides: ['История', 'Вопросы', 'Финальная сцена'],
            mechanics: ['Сюжетные подсказки', 'Раунды', 'Итоги'],
        },
        questions: [
            {
                text: 'Вы — команда исследователей, которые раскрывают тайну исчезнувшего города.',
                type: 'INFO_SLIDE',
                elementType: 'INFO_SLIDE',
                layoutType: 'INFO_SLIDE',
            },
            {
                text: 'Раунд 1. Первые улики',
                type: 'ROUND_INTRO',
                elementType: 'ROUND_INTRO',
                layoutType: 'ROUND_INTRO',
            },
            {
                text: 'Что обозначает найденный символ в древней карте?',
                type: 'EVERYONE_ANSWERS',
                answers: [
                    { text: 'Подземный вход', isCorrect: true },
                    { text: 'Горный перевал', isCorrect: false },
                    { text: 'Сокровищница', isCorrect: false },
                    { text: 'Лагерь', isCorrect: false },
                ],
            },
            {
                text: 'Раунд 2. Проверка гипотез',
                type: 'ROUND_INTRO',
                elementType: 'ROUND_INTRO',
                layoutType: 'ROUND_INTRO',
            },
            {
                text: 'Герои квеста нашли ключ в храме. Нужно ли расшифровать послание, прежде чем идти дальше?',
                type: 'TRUE_FALSE',
                answers: [
                    { text: 'Правда', isCorrect: true },
                    { text: 'Ложь', isCorrect: false },
                ],
            },
        ],
    },
    {
        id: 'corporate-warmup',
        title: 'Корпоративный разогрев',
        tag: 'Ивенты',
        description: 'Мягкий старт для тимбилдинга: знакомство, разогрев и командная динамика.',
        duration: '20–30 мин',
        audience: 'Команда',
        tags: ['Корпоратив', 'Разогрев', 'Icebreaker'],
        category: 'Для корпоратива',
        ageGroup: '18+',
        format: 'Разогрев',
        length: 'Короткий',
        collections: ['быстрый старт', 'для корпоратива', 'короткие'],
        quickStart: true,
        settings: {
            hasTimer: false,
            timePerQuestion: 25,
            showLeaderboard: false,
            allowReconnect: true,
            isPrivate: true,
        },
        highlight: 'Идеально для знакомства и включения команды.',
        preview: {
            rounds: ['Icebreaker', 'Командные вопросы', 'Финальное слово'],
            slides: ['Инфо', 'Вопросы', 'Обратная связь'],
            mechanics: ['Нет таймера', 'Диалог', 'Командная энергия'],
        },
        questions: [
            {
                text: 'Добро пожаловать! Задача — познакомиться и настроиться на совместную работу.',
                type: 'INFO_SLIDE',
                elementType: 'INFO_SLIDE',
                layoutType: 'INFO_SLIDE',
            },
            {
                text: 'Что помогает команде работать эффективнее?',
                type: 'EVERYONE_ANSWERS',
                answers: [
                    { text: 'Прозрачная коммуникация', isCorrect: true },
                    { text: 'Индивидуальные цели', isCorrect: false },
                    { text: 'Минимум синков', isCorrect: false },
                    { text: 'Сильная конкуренция', isCorrect: false },
                ],
            },
            {
                text: 'В команде полезно делать короткие ретроспективы.',
                type: 'TRUE_FALSE',
                answers: [
                    { text: 'Правда', isCorrect: true },
                    { text: 'Ложь', isCorrect: false },
                ],
            },
        ],
    },
];

const templateRegistryState = {
    items: LOCAL_TEMPLATE_LIBRARY,
    status: 'ready',
    error: null,
    promise: null,
};

const activeTemplateFilters = {
    goal: 'all',
    format: 'all',
    duration: 'all',
    collection: 'all',
};

async function loadTemplateRegistry() {
    if (templateRegistryState.status === 'loading') {
        return templateRegistryState.promise;
    }

    if (templateRegistryState.status === 'ready' && Array.isArray(templateRegistryState.items)) {
        return templateRegistryState.items;
    }

    templateRegistryState.status = 'loading';
    templateRegistryState.error = null;

    templateRegistryState.promise = (async () => {
        try {
            if (window.TemplateService?.getAll) {
                const result = await window.TemplateService.getAll();
                const templates = result?.templates || result?.data || [];
                const normalized = Array.isArray(templates)
                    ? templates.map((template) => normalizeTemplateFromApi(template)).filter(Boolean)
                    : [];
                if (normalized.length) {
                    templateRegistryState.items = normalized;
                }
            }
        } catch (error) {
            templateRegistryState.error = error;
        } finally {
            templateRegistryState.status = 'ready';
        }

        return templateRegistryState.items;
    })();

    return templateRegistryState.promise;
}

function normalizeTemplateFromApi(template = {}) {
    if (!template) return null;
    const id = template.id || template.slug || template.code;
    if (!id) return null;

    return {
        id: String(id),
        title: template.title || 'Шаблон без названия',
        description: template.description || '',
        tag: template.tag || template.category || 'Шаблон',
        duration: template.duration || template.durationLabel || '—',
        audience: template.audience || template.audienceLabel || '—',
        tags: template.tags || [],
        category: template.category || '',
        ageGroup: template.ageGroup || '',
        format: template.format || '',
        thumbnailUrl: template.thumbnailUrl || template.coverImage || '',
        settings: template.settings || template.logicPreset || template.baseSettings || {},
        questions: template.questions || template.slides || template.structure || [],
    };
}

function getTemplateRegistry() {
    return Array.isArray(templateRegistryState.items) ? templateRegistryState.items : [];
}

function openTemplateLibraryScreen() {
    setConstructorEntryMode(ENTRY_MODES.TEMPLATES);
    renderTemplateLibrary();
}

function closeTemplateLibraryScreen() {
    setConstructorEntryMode(getDefaultEntryMode());
}

function getTemplateLibraryGoalFilters() {
    const goals = new Set(['all']);
    getTemplateRegistry().forEach((template) => {
        if (template.tag) goals.add(template.tag);
        if (template.category) goals.add(template.category);
        (template.tags || []).forEach((item) => goals.add(item));
    });
    return Array.from(goals);
}

function getTemplateLibraryCollectionFilters() {
    const collections = new Set(['all']);
    getTemplateRegistry().forEach((template) => {
        (template.collections || []).forEach((item) => collections.add(item));
        if (template.recommended) collections.add('рекомендуем');
        if (template.quickStart) collections.add('быстрый старт');
        if (template.length) collections.add(template.length.toLowerCase());
    });
    return Array.from(collections);
}

function getTemplateLibraryFormatFilters() {
    const formats = new Set(['all']);
    getTemplateRegistry().forEach((template) => {
        if (template.format) formats.add(template.format);
    });
    return Array.from(formats);
}

function getTemplateLibraryDurationFilters() {
    const durations = new Set(['all']);
    getTemplateRegistry().forEach((template) => {
        if (template.duration) durations.add(template.duration);
    });
    return Array.from(durations);
}

function renderTemplateFilterChips(container, items, activeValue, group) {
    if (!container) return;
    container.innerHTML = items.map((item) => {
        const label = item === 'all' ? 'Все' : item;
        const isActive = activeValue === item;
        return `<button type="button" class="template-filter-chip ${isActive ? 'is-active' : ''}" data-filter-group="${group}" data-filter-value="${item}">${label}</button>`;
    }).join('');
}

function renderTemplateLibrary() {
    const collectionFilters = document.getElementById('templateLibraryCollectionFilters');
    const goalFilters = document.getElementById('templateLibraryGoalFilters');
    const formatFilters = document.getElementById('templateLibraryFormatFilters');
    const durationFilters = document.getElementById('templateLibraryDurationFilters');
    const grid = document.getElementById('templateLibraryGrid');
    const recommendations = document.getElementById('templateLibraryRecommendations');
    const quickStart = document.getElementById('templateLibraryQuickStart');
    const searchInput = document.getElementById('templateLibrarySearch');
    if (!grid) return;

    if (templateRegistryState.status !== 'ready') {
        if (collectionFilters) collectionFilters.innerHTML = '';
        if (goalFilters) goalFilters.innerHTML = '';
        if (formatFilters) formatFilters.innerHTML = '';
        if (durationFilters) durationFilters.innerHTML = '';
        grid.innerHTML = '<div class="empty-state">Загрузка шаблонов...</div>';
        if (recommendations) recommendations.innerHTML = '';
        if (quickStart) quickStart.innerHTML = '';
        loadTemplateRegistry().then(() => renderTemplateLibrary());
        return;
    }

    renderTemplateFilterChips(
        collectionFilters,
        getTemplateLibraryCollectionFilters(),
        activeTemplateFilters.collection,
        'collection',
    );
    renderTemplateFilterChips(
        goalFilters,
        getTemplateLibraryGoalFilters(),
        activeTemplateFilters.goal,
        'goal',
    );
    renderTemplateFilterChips(
        formatFilters,
        getTemplateLibraryFormatFilters(),
        activeTemplateFilters.format,
        'format',
    );
    renderTemplateFilterChips(
        durationFilters,
        getTemplateLibraryDurationFilters(),
        activeTemplateFilters.duration,
        'duration',
    );

    const query = searchInput?.value?.trim().toLowerCase() || '';
    const registry = getTemplateRegistry();
    const filtered = registry.filter((template) => {
        const collectionValue = activeTemplateFilters.collection;
        const matchesCollection = collectionValue === 'all'
            || (collectionValue === 'рекомендуем' && template.recommended)
            || (collectionValue === 'быстрый старт' && template.quickStart)
            || (template.collections || []).includes(collectionValue)
            || template.length?.toLowerCase() === collectionValue;
        const matchesGoal = activeTemplateFilters.goal === 'all'
            || template.tag === activeTemplateFilters.goal
            || template.category === activeTemplateFilters.goal
            || (template.tags || []).includes(activeTemplateFilters.goal);
        const matchesFormat = activeTemplateFilters.format === 'all'
            || template.format === activeTemplateFilters.format;
        const matchesDuration = activeTemplateFilters.duration === 'all'
            || template.duration === activeTemplateFilters.duration;
        if (!matchesCollection || !matchesGoal || !matchesFormat || !matchesDuration) return false;
        if (!query) return true;
        const haystack = [
            template.title,
            template.description,
            template.tag,
            template.category,
            template.format,
            template.audience,
            template.duration,
            template.length,
            ...(template.tags || []),
            ...(template.collections || []),
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return haystack.includes(query);
    });

    if (recommendations) {
        const featured = registry.filter((template) => template.recommended).slice(0, 4);
        recommendations.innerHTML = featured.map((template) => renderTemplateLibraryCard(template, { featured: true })).join('')
            || '<div class="template-library-empty">Подбираем лучшие сценарии для вас.</div>';
    }

    if (quickStart) {
        const quick = registry.filter((template) => template.quickStart).slice(0, 4);
        quickStart.innerHTML = quick.map((template) => renderTemplateLibraryCard(template, { quick: true })).join('')
            || '<div class="template-library-empty">Добавим короткие сценарии в ближайшее время.</div>';
    }

    grid.innerHTML = filtered.map((template) => renderTemplateLibraryCard(template)).join('')
        || '<div class="empty-state">Ничего не найдено. Попробуйте другой запрос.</div>';

    document.querySelectorAll('[data-filter-group]').forEach((button) => {
        button.addEventListener('click', () => {
            const group = button.dataset.filterGroup;
            const value = button.dataset.filterValue || 'all';
            if (!group) return;
            activeTemplateFilters[group] = value;
            renderTemplateLibrary();
        });
    });

    if (searchInput && !searchInput.dataset.listenerAttached) {
        searchInput.dataset.listenerAttached = 'true';
        searchInput.addEventListener('input', () => renderTemplateLibrary());
    }
}

function renderTemplateLibraryCard(template, options = {}) {
    const { featured = false, quick = false } = options;
    const safeId = template.id.replace(/'/g, "&#39;");
    const tags = Array.isArray(template.tags) ? template.tags.slice(0, 3) : [];
    const preview = template.preview || {};
    const previewRounds = (preview.rounds || []).slice(0, 3);
    const previewSlides = (preview.slides || []).slice(0, 3);
    const previewMechanics = (preview.mechanics || []).slice(0, 3);
    const cardClass = `template-library-card${featured ? ' is-featured' : ''}${quick ? ' is-quick' : ''}`;

    return `
        <article class="${cardClass}" data-template-id="${template.id}">
            <div class="template-card-cover">
                <div class="template-card-cover-inner">
                    <span>${template.tag || template.format || 'Шаблон'}</span>
                    <strong>${template.title}</strong>
                </div>
                <div class="template-card-cover-badges">
                    ${template.recommended ? '<span class="template-badge">Рекомендуем</span>' : ''}
                    ${template.quickStart ? '<span class="template-badge template-badge--accent">Быстрый старт</span>' : ''}
                </div>
            </div>
            <div class="template-library-card-header">
                <span class="template-tag">${template.tag}</span>
                <div class="template-library-badges">
                    ${template.length ? `<span class="template-badge template-badge--soft">${template.length}</span>` : ''}
                </div>
            </div>
            <div class="template-card-body">
                <h3>${template.title}</h3>
                <p>${template.description}</p>
                ${template.highlight ? `<p class="template-highlight">${template.highlight}</p>` : ''}
                <div class="template-library-meta">
                    <span>⏱ ${template.duration || '30–45 мин'}</span>
                    <span>👥 ${template.audience || '8–20 игроков'}</span>
                </div>
                <div class="template-library-tags">
                    ${(tags.length ? tags : [template.category, template.format]).filter(Boolean).slice(0, 4).map((tag) => `<span class="template-card-tag">${tag}</span>`).join('')}
                </div>
                <div class="template-library-preview">
                    <div>
                        <span>Структура</span>
                        <strong>${previewRounds.join(' · ') || '3–4 раунда'}</strong>
                    </div>
                    <div>
                        <span>Слайды</span>
                        <strong>${previewSlides.join(' · ') || 'Интро · Вопросы · Финал'}</strong>
                    </div>
                    <div>
                        <span>Механики</span>
                        <strong>${previewMechanics.join(' · ') || 'Таймер · Очки · Рейтинг'}</strong>
                    </div>
                </div>
            </div>
            <div class="template-library-footer">
                <button type="button" class="btn btn-primary btn-sm" onclick="startQuizFromTemplate('${safeId}')">Использовать</button>
                <button type="button" class="btn btn-outline btn-sm" onclick="openTemplateDetails('${template.id}')">Подробнее</button>
            </div>
        </article>
    `;
}

function openTemplateDetails(templateId) {
    const template = getTemplateRegistry().find((item) => item.id === templateId);
    if (!template) return;
    const summary = [
        template.description,
        template.highlight,
        `Формат: ${template.format || '—'}`,
        `Длительность: ${template.duration || '—'}`,
        `Аудитория: ${template.audience || '—'}`,
    ]
        .filter(Boolean)
        .join(' ');
    showToast(`${template.title}: ${summary}`, 'info');
}

function resolveTemplateById(templateId) {
    if (!templateId) return null;
    const normalized = String(templateId).trim();
    return getTemplateRegistry().find((template) => template.id === normalized)
        || getTemplateRegistry().find((template) => template.title === normalized)
        || null;
}

function filterTemplateSettings(settings = {}) {
    const payload = {};
    if (!settings || typeof settings !== 'object') return payload;
    Object.entries(settings).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            payload[key] = value;
        }
    });
    return payload;
}

function buildTemplateQuestionPayload(question = {}, order = 0) {
    const type = String(question.type || question.mode || 'EVERYONE_ANSWERS').trim().toUpperCase();
    const elementType = question.elementType || getElementTypeForMode(type, question.elementType);
    const layoutType = question.layoutType || getLayoutTypeForMode(type, elementType);
    const isAnswerless = ['INFO_SLIDE', 'ROUND_INTRO', 'JEOPARDY_ROUND'].includes(type);

    let answers = Array.isArray(question.answers)
        ? question.answers.map((answer, index) => ({
            text: String(answer.text || '').trim(),
            imageUrl: answer.imageUrl || null,
            isCorrect: Boolean(answer.isCorrect),
            order: Number.isInteger(answer.order) ? answer.order : index,
        }))
        : [];

    if (!answers.length && !isAnswerless) {
        if (type === 'TRUE_FALSE' || type === 'TRUEFALSE') {
            answers = [
                { text: 'Правда', isCorrect: true, order: 0 },
                { text: 'Ложь', isCorrect: false, order: 1 },
            ];
        } else if (type === 'MULTIPLE_CORRECT') {
            answers = [
                { text: 'Вариант A', isCorrect: true, order: 0 },
                { text: 'Вариант B', isCorrect: true, order: 1 },
                { text: 'Вариант C', isCorrect: false, order: 2 },
                { text: 'Вариант D', isCorrect: false, order: 3 },
            ];
        } else if (type === 'ORDERED') {
            answers = [
                { text: 'Элемент 1', isCorrect: true, order: 0 },
                { text: 'Элемент 2', isCorrect: true, order: 1 },
                { text: 'Элемент 3', isCorrect: true, order: 2 },
            ];
        } else {
            answers = [
                { text: 'Правильный ответ', isCorrect: true, order: 0 },
                { text: 'Неправильный ответ', isCorrect: false, order: 1 },
            ];
        }
    }

    const config = question.configJson || question.config || getDefaultModeConfig(type, elementType);
    const configJson = typeof config === 'string' ? config : JSON.stringify(config);

    const sanitizedText = String(question.text ?? '').trim();

    const fallbackText = type === 'INFO_SLIDE'
        ? 'Информационный слайд'
        : type === 'ROUND_INTRO'
            ? 'Новый раунд'
            : 'Новый вопрос';

    return {
        text: sanitizedText || fallbackText,
        subtitle: question.subtitle || '',
        imageUrl: question.imageUrl || null,
        audioUrl: question.audioUrl || null,
        videoUrl: question.videoUrl || null,
        elementType,
        type,
        layoutType,
        gameMode: question.gameMode || type,
        backgroundColor: question.backgroundColor || '#f6f8fb',
        backgroundImageUrl: question.backgroundImageUrl || null,
        configJson,
        points: Number.isFinite(question.points) ? question.points : 100,
        timeLimit: Number.isFinite(question.timeLimit) ? question.timeLimit : 30,
        order: Number.isInteger(question.order) ? question.order : order,
        pointsAtStart: Number.isFinite(question.pointsAtStart) ? question.pointsAtStart : 100,
        pointsAtEnd: Number.isFinite(question.pointsAtEnd) ? question.pointsAtEnd : 100,
        penaltyPoints: Number.isFinite(question.penaltyPoints) ? question.penaltyPoints : 0,
        penaltyNoAnswer: Number.isFinite(question.penaltyNoAnswer) ? question.penaltyNoAnswer : 0,
        speedBonus1: Number.isFinite(question.speedBonus1) ? question.speedBonus1 : 0,
        speedBonus2: Number.isFinite(question.speedBonus2) ? question.speedBonus2 : 0,
        speedBonus3: Number.isFinite(question.speedBonus3) ? question.speedBonus3 : 0,
        autoJudge: question.autoJudge ?? true,
        lockoutOnWrong: question.lockoutOnWrong ?? true,
        showCorrectAnswer: question.showCorrectAnswer ?? true,
        countdownMode: question.countdownMode || 'auto',
        textReveal: question.textReveal || 'none',
        jokersEnabled: question.jokersEnabled ?? true,
        demographicGroup: question.demographicGroup || null,
        slideRouting: question.slideRouting || null,
        notes: question.notes || null,
        answers: isAnswerless ? [] : answers,
    };
}

function toggleAppearanceButton(id) {
    const input = document.getElementById(id);
    const button = document.getElementById(id) || document.querySelector(`[data-toggle="${id}"]`);
    const current = input?.value === 'true' || button?.classList.contains('is-active');
    const next = !current;
    if (input) input.value = next ? 'true' : 'false';
    if (!button) return;
    button.classList.toggle('is-active', next);
    button.setAttribute('aria-pressed', next ? 'true' : 'false');
    syncPreviewFromProperties();
}

function setAppearanceChoice(id, value) {
    const input = document.getElementById(id);
    if (input) input.value = value;
    updateDerivedAppearanceFields();
    syncPreviewFromProperties();
}

function updateBackgroundToolbar() {
    const type = document.getElementById('backgroundType')?.value || 'color';
    document.querySelectorAll('.bg-color-control').forEach((node) => node.classList.toggle('is-hidden', type !== 'color'));
    document.querySelectorAll('.bg-gradient-control').forEach((node) => node.classList.toggle('is-hidden', type !== 'gradient'));
    document.querySelectorAll('.bg-image-control').forEach((node) => node.classList.toggle('is-hidden', type !== 'image'));
    document.querySelectorAll('.bg-video-control').forEach((node) => node.classList.toggle('is-hidden', type !== 'video'));
    document.querySelectorAll('[data-bg-type]').forEach((node) => {
        node.hidden = node.dataset.bgType !== type;
    });
}

function initAppearanceToolbarControls() {
    const toolbar = document.getElementById('constructorToolbar');
    if (!toolbar || toolbar.dataset.controlsReady === 'true') return;
    toolbar.dataset.controlsReady = 'true';

    toolbar.addEventListener('input', (event) => {
        if (event.target.matches('input, select')) {
            updateDerivedAppearanceFields();
            syncPreviewFromProperties();
        }
    });

    toolbar.addEventListener('change', (event) => {
        if (event.target.id === 'activeTextTarget') {
            refreshActiveTextControls();
            return;
        }
        if (event.target.id === 'backgroundType') updateBackgroundToolbar();
        if (event.target.id === 'backgroundImageFile') {
            uploadBackgroundMedia(event, 'image');
            return;
        }
        if (event.target.id === 'backgroundVideoFile') {
            uploadBackgroundMedia(event, 'video');
            return;
        }
        if (event.target.matches('input, select')) {
            updateDerivedAppearanceFields();
            syncPreviewFromProperties();
        }
    });

    toolbar.addEventListener('click', (event) => {
        const textTarget = event.target.closest('[data-text-target]');
        if (textTarget) {
            setActiveTextTarget(textTarget.dataset.textTarget);
            return;
        }

        const textToggle = event.target.closest('[data-text-toggle]');
        if (textToggle) {
            toggleActiveTextStyle(textToggle.dataset.textToggle);
            return;
        }

        const textAlign = event.target.closest('[data-text-align]');
        if (textAlign) {
            setActiveTextAlign(textAlign.dataset.textAlign);
            return;
        }

        const toggle = event.target.closest('[data-toggle]');
        if (toggle) {
            toggleAppearanceButton(toggle.dataset.toggle);
            return;
        }

        const align = event.target.closest('[data-align-target]');
        if (align) {
            setAppearanceChoice(align.dataset.alignTarget, align.dataset.align);
            return;
        }

        if (event.target.closest('#pickBackgroundImageBtn')) {
            triggerBackgroundUpload('image');
            return;
        }

        if (event.target.closest('#pickBackgroundVideoBtn')) {
            triggerBackgroundUpload('video');
        }
    });

    updateBackgroundToolbar();
    refreshActiveTextControls();
    updateDerivedAppearanceFields();
}

function triggerBackgroundUpload(kind) {
    const input = document.getElementById(kind === 'video' ? 'backgroundVideoFile' : 'backgroundImageFile');
    input?.click();
}

async function uploadBackgroundMedia(event, kind) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (currentQuestionIndex < 0 || !questions[currentQuestionIndex]) {
        showToast('Сначала выберите вопрос', 'error');
        event.target.value = '';
        return;
    }

    try {
        updateSaveStatus('Загрузка фона...', 'saving');
        const response = await UploadAPI.uploadFile(file);
        const target = document.getElementById(kind === 'video' ? 'backgroundVideoUrl' : 'backgroundImageUrl');
        const type = document.getElementById('backgroundType');
        const status = document.getElementById('backgroundImageStatus');
        if (target) target.value = response.url || '';
        if (type) type.value = kind === 'video' ? 'video' : 'image';
        if (kind === 'image' && status) status.textContent = response.url ? 'Фон загружен' : 'Файл не выбран';
        updateBackgroundToolbar();
        syncPreviewFromProperties();
        showToast(kind === 'video' ? 'Видеофон загружен' : 'Фон загружен', 'success');
    } catch (error) {
        updateSaveStatus('Ошибка загрузки фона', 'error');
        showToast(error.message || 'Ошибка загрузки фона', 'error');
    } finally {
        event.target.value = '';
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
    const titleSize = document.getElementById('questionSize') || document.getElementById('titleSize');

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
window.duplicateQuestion = duplicateQuestion;
window.editQuestion = editQuestion;
window.saveCurrentQuestion = saveCurrentQuestion;
window.deleteCurrentQuestion = deleteCurrentQuestion;
window.setQuestionType = setQuestionType;
window.resetEditor = resetEditor;
window.saveQuizOrder = saveQuizOrder;
window.openEditQuizModal = openEditQuizModal;
window.openCurrentQuizSettings = openCurrentQuizSettings;
window.saveQuizMeta = saveQuizMeta;
window.triggerQuizThumbnailUpload = triggerQuizThumbnailUpload;
window.uploadQuizThumbnail = uploadQuizThumbnail;
window.deleteQuizById = deleteQuizById;
window.syncPreviewFromProperties = syncPreviewFromProperties;
window.updatePreviewField = updatePreviewField;
window.updateConstructorAvailability = updateConstructorAvailability;
window.updateConstructorEntryMode = updateConstructorEntryMode;
window.setConstructorEntryMode = setConstructorEntryMode;
window.openMarketplaceStart = openMarketplaceStart;
window.openTemplateLibrary = openTemplateLibrary;
window.openDokaLabRequest = openDokaLabRequest;
window.openDokaLabScreen = openDokaLabScreen;
window.closeDokaLabScreen = closeDokaLabScreen;
window.startBlankQuiz = startBlankQuiz;
window.submitDokaLabRequest = submitDokaLabRequest;
window.submitDokaLabLandingRequest = submitDokaLabLandingRequest;
window.startQuizFromTemplate = startQuizFromTemplate;
window.returnToStartScenario = returnToStartScenario;
window.selectQuestionTemplate = selectQuestionTemplate;
window.updateTemplateGallerySelection = updateTemplateGallerySelection;
window.toggleAppearanceButton = toggleAppearanceButton;
window.setAppearanceChoice = setAppearanceChoice;
window.updateBackgroundToolbar = updateBackgroundToolbar;
window.refreshActiveTextControls = refreshActiveTextControls;
window.triggerBackgroundUpload = triggerBackgroundUpload;
window.uploadBackgroundMedia = uploadBackgroundMedia;
window.initAppearanceToolbarControls = initAppearanceToolbarControls;

document.addEventListener('DOMContentLoaded', initAppearanceToolbarControls);

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
