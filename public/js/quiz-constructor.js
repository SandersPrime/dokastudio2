// public/js/quiz-constructor.js

let currentQuiz = null;
let questions = [];
let currentQuestionIndex = -1;
let sortableInstance = null;

function syncQuizEditorState() {
    if (!window.QuizEditorState) return;
    QuizEditorState.setCurrentQuiz(currentQuiz);
    QuizEditorState.setCurrentQuestion(questions[currentQuestionIndex] || null);
}

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
    const container = document.getElementById('questionsList');
    if (!container) return;

    if (!questions.length) {
        container.innerHTML = '<div class="empty-state">📭 Нет вопросов</div>';
        return;
    }

    container.innerHTML = questions.map((question, index) => {
        const handler = typeof QuestionTypeFactory !== 'undefined'
            ? QuestionTypeFactory.getType(question.type)
            : { icon: '📝', name: question.type || 'TEXT' };

        return `
            <div class="question-item ${index === currentQuestionIndex ? 'active' : ''}" data-id="${question.id || question.tempId}" onclick="editQuestion(${index})">
                <div class="question-header">
                    <span class="drag-handle">⋮⋮</span>
                    <span class="question-number">${index + 1}</span>
                    <span class="question-title" title="${escapeHtml(question.text || '')}">
                        ${escapeHtml(truncateText(question.text || 'Без текста', 30))}
                    </span>
                    <div class="question-badges">
                        <span class="badge" title="${handler.name}">${handler.icon}</span>
                        <span class="badge badge-primary">${question.points || 100}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    initDragAndDrop(container);
}

function initDragAndDrop(container) {
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
        order: questions.length,
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
        showToast('Сначала создайте квиз', 'error');
        return;
    }

    const question = createDefaultQuestion();
    questions.push(question);
    renderQuestionsList();
    editQuestion(questions.length - 1);
}

function editQuestion(index) {
    const question = questions[index];
    if (!question) return;

    currentQuestionIndex = index;
    syncQuizEditorState();

    document.getElementById('editorPlaceholder').style.display = 'none';
    document.getElementById('editorContent').style.display = 'block';

    document.getElementById('questionText').value = question.text || '';
    document.getElementById('questionPoints').value = question.points ?? 100;
    document.getElementById('questionTime').value = question.timeLimit ?? 30;

    if (typeof loadAdvancedSettings === 'function') {
        loadAdvancedSettings(question);
    }

    applyQuestionTypeUI(question.type);
    syncMediaPreview(question);
    renderQuestionSpecificInputs(question);
    renderQuestionsList();
}

function resetEditor() {
    currentQuestionIndex = -1;
    syncQuizEditorState();

    const placeholder = document.getElementById('editorPlaceholder');
    const content = document.getElementById('editorContent');

    if (placeholder) placeholder.style.display = 'block';
    if (content) content.style.display = 'none';

    const textEl = document.getElementById('questionText');
    const pointsEl = document.getElementById('questionPoints');
    const timeEl = document.getElementById('questionTime');
    const mediaPreview = document.getElementById('mediaPreview');
    const mediaUploadArea = document.getElementById('mediaUploadArea');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');

    if (textEl) textEl.value = '';
    if (pointsEl) pointsEl.value = 100;
    if (timeEl) timeEl.value = 30;
    if (mediaPreview) mediaPreview.innerHTML = '';
    if (mediaUploadArea) mediaUploadArea.classList.remove('has-file');
    if (uploadPlaceholder) uploadPlaceholder.textContent = '📁 Нажмите или перетащите файл';

    const answersEditor = document.getElementById('answersEditor');
    if (answersEditor) answersEditor.innerHTML = '';

    const trueFalseSelect = document.getElementById('trueFalseSelect');
    if (trueFalseSelect) trueFalseSelect.value = 'true';

    document.querySelectorAll('#questionTypeSelector .type-btn').forEach((btn) => {
        btn.classList.remove('active');
    });
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

function applyQuestionTypeUI(type) {
    document.querySelectorAll('#questionTypeSelector .type-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    const answersSection = document.getElementById('answersSection');
    const trueFalseSection = document.getElementById('trueFalseSection');

    if (type === 'TRUEFALSE') {
        if (answersSection) answersSection.style.display = 'none';
        if (trueFalseSection) trueFalseSection.style.display = 'block';
    } else {
        if (answersSection) answersSection.style.display = 'block';
        if (trueFalseSection) trueFalseSection.style.display = 'none';
    }
}

function renderQuestionSpecificInputs(question) {
    if (question.type === 'TRUEFALSE') {
        const trueAnswer = Array.isArray(question.answers)
            ? question.answers.find((answer) => answer.text === 'Правда')
            : null;

        const select = document.getElementById('trueFalseSelect');
        if (select) {
            select.value = trueAnswer?.isCorrect ? 'true' : 'false';
        }
        return;
    }

    renderAnswersEditor();
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

    if (typeof saveAdvancedSettings === 'function') {
        saveAdvancedSettings(question);
    }

    if (question.type === 'TRUEFALSE') {
        const trueSelected = document.getElementById('trueFalseSelect')?.value === 'true';
        question.answers = [
            { text: 'Правда', isCorrect: trueSelected, order: 0 },
            { text: 'Ложь', isCorrect: !trueSelected, order: 1 },
        ];
    } else {
        question.answers = normalizeEditorAnswers(existing.answers || []);
    }

    return question;
}

function normalizeEditorAnswers(fallbackAnswers) {
    const items = document.querySelectorAll('.answer-item');

    if (!items.length) {
        return Array.isArray(fallbackAnswers) ? fallbackAnswers : [];
    }

    return Array.from(items).map((item, index) => {
        const text = item.querySelector('.answer-text')?.value?.trim() || '';
        const correct = item.querySelector('.answer-correct')?.checked || false;

        return {
            text,
            isCorrect: correct,
            order: index,
        };
    });
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
        renderQuestionsList();
        editQuestion(currentQuestionIndex);
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

        renderQuestionsList();
        resetEditor();
        showToast('🗑️ Вопрос удалён', 'success');
    } catch (error) {
        showToast(error.message || 'Ошибка удаления вопроса', 'error');
    }
}

function renderAnswersEditor() {
    const container = document.getElementById('answersEditor');
    if (!container || currentQuestionIndex < 0 || !questions[currentQuestionIndex]) return;

    const question = questions[currentQuestionIndex];
    const answers = Array.isArray(question.answers) ? question.answers : [];

    container.innerHTML = answers.map((answer, index) => `
        <div class="answer-item d-flex gap-2 items-center mb-2">
            <input
                type="radio"
                name="correctAnswer"
                class="answer-correct"
                ${answer.isCorrect ? 'checked' : ''}
                onchange="setCorrectAnswer(${index})"
            >
            <input
                type="text"
                class="input answer-text"
                value="${escapeHtml(answer.text || '')}"
                oninput="updateAnswerText(${index}, this.value)"
                placeholder="Текст ответа"
            >
            <button type="button" class="btn btn-outline btn-sm" onclick="removeAnswer(${index})">✖</button>
        </div>
    `).join('');
}

function setCorrectAnswer(index) {
    if (currentQuestionIndex < 0 || !questions[currentQuestionIndex]) return;

    questions[currentQuestionIndex].answers = questions[currentQuestionIndex].answers.map((answer, i) => ({
        ...answer,
        isCorrect: i === index,
    }));

    renderAnswersEditor();
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
    renderAnswersEditor();
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

    renderAnswersEditor();
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

function syncMediaPreview(question) {
    const preview = document.getElementById('mediaPreview');
    if (!preview) return;

    const handler = typeof QuestionTypeFactory !== 'undefined'
        ? QuestionTypeFactory.getType(question.type)
        : null;

    const mediaType = handler?.mediaType || null;
    const mediaUrl =
        mediaType === 'image'
            ? question.imageUrl
            : mediaType === 'audio'
              ? question.audioUrl
              : mediaType === 'video'
                ? question.videoUrl
                : null;

    if (!mediaUrl) {
        preview.innerHTML = '';
        document.getElementById('mediaUploadArea')?.classList.remove('has-file');
        return;
    }

    document.getElementById('mediaUploadArea')?.classList.add('has-file');

    if (mediaType === 'image') {
        preview.innerHTML = `<img src="${mediaUrl}" alt="Preview" style="max-width:100%; border-radius:8px;">`;
        return;
    }

    if (mediaType === 'audio') {
        preview.innerHTML = `<audio controls src="${mediaUrl}" style="width:100%;"></audio>`;
        return;
    }

    if (mediaType === 'video') {
        preview.innerHTML = `<video controls src="${mediaUrl}" style="max-width:100%; border-radius:8px;"></video>`;
        return;
    }

    preview.innerHTML = '';
}

window.renderAnswersEditor = renderAnswersEditor;
window.setCorrectAnswer = setCorrectAnswer;
window.updateAnswerText = updateAnswerText;
window.addAnswer = addAnswer;
window.removeAnswer = removeAnswer;
window.uploadMedia = uploadMedia;

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
