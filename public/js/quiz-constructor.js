// public/js/quiz-constructor.js

// Управление состоянием перенесено в public/js/state/constructor.state.js
// Остается для обратной совместимости
let sortableInstance = null;

// Оркестрирует всю логику конструктора

function initConstructor() {
    const authSection = document.getElementById('authSection');
    const appSection = document.getElementById('appSection');
    const logoutBtn = document.getElementById('logoutBtn');

    if (authSection) authSection.style.display = 'none';
    if (appSection) appSection.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';

    if (typeof currentUser !== 'undefined' && currentUser && window.Navigation) {
        Navigation.updateUser(currentUser.name, getUserInitials());
    }
}

async function createNewQuiz(title, description) {
    try {
        const response = await QuizService.create({
            title,
            description,
        });

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

        return { success: true, quiz: response.quiz };
    } catch (error) {
        return { success: false, error: error.message || 'Ошибка создания квиза' };
    }
}

async function loadMyQuizzes() {
    try {
        const response = await QuizService.getAll({
            authorId: currentUser.id,
        });

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
        resetEditor();
        closeModal('quizzesListModal');

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
        <div class="card-pill d-flex justify-between items-center mb-2" style="cursor:pointer;" onclick="selectQuiz('${quiz.id}')">
            <div>
                <strong>${escapeHtml(quiz.title)}</strong>
                <p class="text-secondary" style="font-size:0.85rem;">${quiz._count?.questions || 0} вопросов</p>
            </div>
            <span class="badge ${quiz.isPublished ? 'badge-success' : ''}">
                ${quiz.isPublished ? '📢 Опубликован' : '📝 Черновик'}
            </span>
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
        return;
    }

    titleEl.textContent = currentQuiz.title;
    descEl.textContent = currentQuiz.description || 'Без описания';
}

function enableQuizActions() {
    ['previewBtn', 'publishBtn', 'exportBtn'].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !currentQuiz;
    });
}

function renderQuestionsList() {
    window.renderQuestionsList(questions, currentQuestionIndex, 'editQuestion');
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
            showToast('Порядок изменён. Нажмите "Сохранить порядок"', 'info');
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
        showToast('✅ Порядок сохранён', 'success');
    } catch (error) {
        showToast(error.message || 'Ошибка сохранения порядка', 'error');
    }
}

function createDefaultQuestion() {
    return {
        tempId: generateTempId(),
        text: 'Новый вопрос',
        type: 'TEXT',
        points: 100,
        timeLimit: 30,
        order: ConstructorState.getState().questions.length,
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
        answers: [
            { text: 'Правильный ответ', isCorrect: true, order: 0 },
            { text: 'Неправильный ответ', isCorrect: false, order: 1 },
        ],
    };
}

function addNewQuestion() {
    if (!currentQuiz) {
        showToast('Сначала создай��е квиз', 'error');
        return;
    }

    const question = createDefaultQuestion();
    questions.push(question);
    ConstructorState.setQuestions(questions);
    renderQuestionsList();
    editQuestion(questions.length - 1);
}

function editQuestion(index) {
    const question = questions[index];
    if (!question) return;

    currentQuestionIndex = index;
    ConstructorState.setCurrentQuestionIndex(index);
    syncQuizEditorState();

    updateQuestionEditorUI(question);
    loadAdvancedSettings(question);
}

function resetEditor() {
    currentQuestionIndex = -1;
    ConstructorState.setCurrentQuestionIndex(-1);
    syncQuizEditorState();
    updateQuestionEditorUI(null);
}

function setQuestionType(type) {
    if (currentQuestionIndex < 0 || !questions[currentQuestionIndex]) {
        showToast('Сначала выберите вопрос', 'error');
        return;
    }

    const question = questions[currentQuestionIndex];
    question.type = type;

    if (type === 'TRUEFALSE') {
        question.answers = [
            { text: 'Правда', isCorrect: true, order: 0 },
            { text: 'Ложь', isCorrect: false, order: 1 },
        ];
    } else if (!Array.isArray(question.answers) || !question.answers.length) {
        question.answers = [
            { text: 'Правильный ответ', isCorrect: true, order: 0 },
            { text: 'Неправильный ответ', isCorrect: false, order: 1 },
        ];
    }

    if (type !== 'IMAGE') question.imageUrl = null;
    if (type !== 'AUDIO') question.audioUrl = null;
    if (type !== 'VIDEO') question.videoUrl = null;

    applyQuestionTypeUI(type);
    syncMediaPreview(question);
    renderQuestionSpecificInputs(question);
    renderQuestionsList();
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

async function saveCurrentQuestion() {
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
        showToast('✅ Вопрос сохранён', 'success');
    } catch (error) {
        showToast(error.message || 'Ошибка сохранения вопроса', 'error');
    }
}

async function deleteCurrentQuestion() {
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
        showToast('🗑️ Вопрос удалён', 'success');
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
}

function updateAnswerText(index, value) {
    if (currentQuestionIndex < 0 || !questions[currentQuestionIndex]) return;
    if (!questions[currentQuestionIndex].answers[index]) return;

    questions[currentQuestionIndex].answers[index].text = value;
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
    renderAnswersEditor(answers);
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

    renderAnswersEditor(answers);
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
            uploadPlaceholder.textContent = '⏳ Загрузка...';
        }

        const response = await UploadAPI.uploadFile(file);

        const question = questions[currentQuestionIndex];
        if (question.type === 'IMAGE') question.imageUrl = response.url;
        if (question.type === 'AUDIO') question.audioUrl = response.url;
        if (question.type === 'VIDEO') question.videoUrl = response.url;

        syncMediaPreview(question);

        if (uploadPlaceholder) {
            uploadPlaceholder.textContent = '✅ Файл загружен';
        }

        document.getElementById('mediaUploadArea')?.classList.add('has-file');
        showToast('Файл загружен', 'success');
    } catch (error) {
        if (uploadPlaceholder) {
            uploadPlaceholder.textContent = '📁 Нажмите или перетащите файл';
        }
        showToast(error.message || 'Ошибка загрузки файла', 'error');
    }

    event.target.value = '';
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
window.editQuestion = editQuestion;
window.saveCurrentQuestion = saveCurrentQuestion;
window.deleteCurrentQuestion = deleteCurrentQuestion;
window.setQuestionType = setQuestionType;
window.resetEditor = resetEditor;
window.saveQuizOrder = saveQuizOrder;

window.createQuiz = async function createQuizFromModal() {
    const title = document.getElementById('newQuizTitle')?.value?.trim();
    const description = document.getElementById('newQuizDesc')?.value?.trim() || '';

    if (!title) {
        showToast('Введите название', 'error');
        return;
    }

    const result = await createNewQuiz(title, description);

    if (!result.success) {
        showToast(result.error || 'Ошибка создания квиза', 'error');
        return;
    }

    closeModal('createQuizModal');
    showToast(`Квиз "${title}" создан`, 'success');
};

window.showAIGenerator = function showAIGenerator() {
    showModal('aiGeneratorModal');
};
