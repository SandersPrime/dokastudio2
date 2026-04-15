// QuizConstructor.js — Основная логика конструктора
let currentQuiz = null;
let questions = [];
let currentQuestionIndex = -1;
let sortableInstance = null;

// Инициализация
function initConstructor() {
    const authSection = document.getElementById('authSection');
    const appSection = document.getElementById('appSection');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (authSection) authSection.style.display = 'none';
    if (appSection) appSection.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    
    if (currentUser) {
        Navigation.updateUser(currentUser.name, getUserInitials());
    }
}

// Управление квизами
async function createNewQuiz(title, description, gameMode = 'standard') {
    try {
        const response = await QuizAPI.create({ title, description, gameMode });
        if (response.quiz) {
            currentQuiz = response.quiz;
            questions = [];
            updateQuizDisplay();
            enableQuizActions();
            return { success: true, quiz: response.quiz };
        }
        return { success: false, error: response.error };
    } catch (error) {
        return { success: false, error: 'Ошибка создания квиза' };
    }
}

async function loadMyQuizzes() {
    try {
        const response = await QuizAPI.getAll({ authorId: currentUser.id });
        renderQuizzesList(response.quizzes || []);
        showModal('quizzesListModal');
    } catch (error) {
        showToast('Ошибка загрузки квизов', 'error');
    }
}

async function selectQuiz(quizId) {
    try {
        const response = await QuizAPI.getById(quizId);
        if (response.quiz) {
            currentQuiz = response.quiz;
            questions = response.quiz.questions || [];
            questions.sort((a, b) => (a.order || 0) - (b.order || 0));
            updateQuizDisplay();
            renderQuestionsList();
            closeModal('quizzesListModal');
            enableQuizActions();
            resetEditor();
            showToast(`Загружен квиз "${currentQuiz.title}"`, 'success');
        }
    } catch (error) {
        showToast('Ошибка загрузки квиза', 'error');
    }
}

function renderQuizzesList(quizzes) {
    const listEl = document.getElementById('myQuizzesList');
    if (!quizzes?.length) {
        listEl.innerHTML = '<div class="empty-state">У вас пока нет квизов</div>';
        return;
    }
    
    listEl.innerHTML = quizzes.map(q => `
        <div class="card-pill d-flex justify-between items-center mb-2" style="cursor: pointer;" onclick="selectQuiz('${q.id}')">
            <div>
                <strong>${escapeHtml(q.title)}</strong>
                <p class="text-secondary" style="font-size: 0.85rem;">${q._count?.questions || 0} вопросов</p>
            </div>
            <span class="badge ${q.isPublished ? 'badge-success' : ''}">${q.isPublished ? '📢 Опубликован' : '📝 Черновик'}</span>
        </div>
    `).join('');
}

function updateQuizDisplay() {
    if (currentQuiz) {
        document.getElementById('currentQuizTitle').textContent = currentQuiz.title;
        document.getElementById('currentQuizDesc').textContent = currentQuiz.description || 'Без описания';
    }
}

function enableQuizActions() {
    ['previewBtn', 'publishBtn', 'exportBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = false;
    });
}

// Управление вопросами
function renderQuestionsList() {
    const container = document.getElementById('questionsList');
    
    if (!questions?.length) {
        container.innerHTML = '<div class="empty-state">📭 Нет вопросов</div>';
        return;
    }
    
    container.innerHTML = questions.map((q, index) => {
        const typeHandler = QuestionTypeFactory.getType(q.type);
        return `
            <div class="question-item" data-id="${q.id || q.tempId}" onclick="editQuestion(${index})">
                <div class="question-header">
                    <span class="drag-handle">⋮⋮</span>
                    <span class="question-number">${index + 1}</span>
                    <span class="question-title" title="${escapeHtml(q.text)}">${escapeHtml(truncateText(q.text, 30))}</span>
                    <div class="question-badges">
                        <span class="badge" title="${typeHandler.name}">${typeHandler.icon}</span>
                        <span class="badge badge-primary">${q.points || 100}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    initDragAndDrop(container);
}

function initDragAndDrop(container) {
    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = new Sortable(container, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'dragging',
        onEnd: function() {
            const items = container.querySelectorAll('.question-item');
            const newQuestions = [];
            items.forEach(item => {
                const id = item.dataset.id;
                const q = questions.find(q => (q.id || q.tempId) === id);
                if (q) newQuestions.push(q);
            });
            questions = newQuestions;
            questions.forEach((q, idx) => q.order = idx);
            renderQuestionsList();
            showToast('Порядок изменён', 'info');
        }
    });
}

function addNewQuestion() {
    if (!currentQuiz) {
        showToast('Сначала создайте квиз', 'error');
        return;
    }
    
    const newQuestion = {
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
        answers: [
            { text: 'Правильный ответ', isCorrect: true },
            { text: 'Неправильный ответ', isCorrect: false }
        ]
    };
    
    questions.push(newQuestion);
    renderQuestionsList();
    editQuestion(questions.length - 1);
}

// Загрузка/сохранение расширенных настроек
function loadAdvancedSettings(question) {
    document.getElementById('pointsAtStart').value = question.pointsAtStart ?? 100;
    document.getElementById('pointsAtEnd').value = question.pointsAtEnd ?? 100;
    document.getElementById('penaltyPoints').value = question.penaltyPoints ?? 0;
    document.getElementById('penaltyNoAnswer').value = question.penaltyNoAnswer ?? 0;
    document.getElementById('speedBonus1').value = question.speedBonus1 ?? 0;
    document.getElementById('speedBonus2').value = question.speedBonus2 ?? 0;
    document.getElementById('speedBonus3').value = question.speedBonus3 ?? 0;
    document.getElementById('autoJudge').checked = question.autoJudge ?? true;
    document.getElementById('lockoutOnWrong').checked = question.lockoutOnWrong ?? true;
    document.getElementById('showCorrectAnswer').checked = question.showCorrectAnswer ?? true;
    document.getElementById('jokersEnabled').checked = question.jokersEnabled ?? true;
    document.getElementById('countdownMode').value = question.countdownMode ?? 'auto';
    document.getElementById('textReveal').value = question.textReveal ?? 'none';
    document.getElementById('demographicGroup').value = question.demographicGroup || '';
    document.getElementById('slideRouting').value = question.slideRouting || '';
    document.getElementById('questionNotes').value = question.notes || '';
}

function saveAdvancedSettings(question) {
    question.pointsAtStart = parseInt(document.getElementById('pointsAtStart').value) || 100;
    question.pointsAtEnd = parseInt(document.getElementById('pointsAtEnd').value) || 100;
    question.penaltyPoints = parseInt(document.getElementById('penaltyPoints').value) || 0;
    question.penaltyNoAnswer = parseInt(document.getElementById('penaltyNoAnswer').value) || 0;
    question.speedBonus1 = parseInt(document.getElementById('speedBonus1').value) || 0;
    question.speedBonus2 = parseInt(document.getElementById('speedBonus2').value) || 0;
    question.speedBonus3 = parseInt(document.getElementById('speedBonus3').value) || 0;
    question.autoJudge = document.getElementById('autoJudge').checked;
    question.lockoutOnWrong = document.getElementById('lockoutOnWrong').checked;
    question.showCorrectAnswer = document.getElementById('showCorrectAnswer').checked;
    question.jokersEnabled = document.getElementById('jokersEnabled').checked;
    question.countdownMode = document.getElementById('countdownMode').value;
    question.textReveal = document.getElementById('textReveal').value;
    question.demographicGroup = document.getElementById('demographicGroup').value || null;
    question.slideRouting = document.getElementById('slideRouting').value || null;
    question.notes = document.getElementById('questionNotes').value || null;
    return question;
}

function editQuestion(index) {
    currentQuestionIndex = index;
    const question = questions[index];
    const typeHandler = QuestionTypeFactory.getType(question.type);
    
    document.getElementById('editorPlaceholder').style.display = 'none';
    document.getElementById('editorContent').style.display = 'block';
    
    document.getElementById('questionText').value = question.text || '';
    document.getElementById('questionPoints').value = question.points || 100;
    document.getElementById('questionTime').value = question.timeLimit || 30;
    
    // Активируем кнопку типа
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === question.type) btn.classList.add('active');
    });
    
    typeHandler.renderEditor(question);
    loadAdvancedSettings(question);
    
    if (typeHandler.hasAnswers) {
        renderAnswersEditor(question.answers || []);
    }
}
// ============================================
// РЕДАКТОР ОТВЕТОВ
// ============================================

function renderAnswersEditor(answers) {
    const container = document.getElementById('answersEditor');
    if (!container) return;
    
    if (!answers || answers.length === 0) {
        answers = [
            { text: 'Правильный ответ', isCorrect: true },
            { text: 'Неправильный ответ', isCorrect: false }
        ];
    }
    
    container.innerHTML = answers.map((a, idx) => `
        <div class="answer-row">
            <input type="radio" name="correctAnswer" ${a.isCorrect ? 'checked' : ''} 
                   onchange="setCorrectAnswer(${idx})" title="Отметить как правильный">
            <input type="text" class="input" placeholder="Текст ответа" 
                   value="${escapeHtml(a.text || '')}"
                   onchange="updateAnswerText(${idx}, this.value)">
            <div class="answer-remove" onclick="removeAnswer(${idx})" title="Удалить ответ">🗑️</div>
        </div>
    `).join('');
}

function setCorrectAnswer(index) {
    if (currentQuestionIndex < 0) return;
    
    const question = questions[currentQuestionIndex];
    if (!question.answers) question.answers = [];
    
    question.answers.forEach((a, i) => a.isCorrect = (i === index));
    renderAnswersEditor(question.answers);
}

function updateAnswerText(index, value) {
    if (currentQuestionIndex < 0) return;
    
    const question = questions[currentQuestionIndex];
    if (!question.answers) question.answers = [];
    if (!question.answers[index]) question.answers[index] = { text: '', isCorrect: false };
    
    question.answers[index].text = value;
}

function addAnswer() {
    if (currentQuestionIndex < 0) return;
    
    const question = questions[currentQuestionIndex];
    if (!question.answers) question.answers = [];
    
    question.answers.push({ text: '', isCorrect: false });
    renderAnswersEditor(question.answers);
}

function removeAnswer(index) {
    if (currentQuestionIndex < 0) return;
    
    const question = questions[currentQuestionIndex];
    if (!question.answers) return;
    
    if (question.answers.length <= 2) {
        showToast('Должно быть минимум 2 ответа', 'error');
        return;
    }
    
    const wasCorrect = question.answers[index]?.isCorrect;
    question.answers.splice(index, 1);
    
    if (wasCorrect && question.answers.length > 0) {
        question.answers[0].isCorrect = true;
    }
    
    renderAnswersEditor(question.answers);
}

// ============================================
// ЗАГРУЗКА МЕДИА
// ============================================

async function uploadMedia(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    if (uploadPlaceholder) uploadPlaceholder.textContent = '⏳ Загрузка...';
    
    try {
        const response = await UploadAPI.uploadFile(file);
        
        if (response.url && currentQuestionIndex >= 0) {
            questions[currentQuestionIndex].imageUrl = response.url;
            showMediaPreview(response.url, questions[currentQuestionIndex].type);
            
            if (uploadPlaceholder) uploadPlaceholder.textContent = '✅ Файл загружен';
            document.getElementById('mediaUploadArea')?.classList.add('has-file');
            showToast('Файл загружен', 'success');
        } else {
            if (uploadPlaceholder) uploadPlaceholder.textContent = '📁 Нажмите или перетащите файл';
            showToast(response.error || 'Ошибка загрузки', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        if (uploadPlaceholder) uploadPlaceholder.textContent = '📁 Нажмите или перетащите файл';
        showToast('Ошибка загрузки файла', 'error');
    }
    
    event.target.value = '';
}

function showMediaPreview(url, type) {
    const preview = document.getElementById('mediaPreview');
    if (!preview) return;
    
    const typeHandler = QuestionTypeFactory.getType(type);
    
    if (typeHandler.mediaType === 'image') {
        preview.innerHTML = `<img src="${url}" alt="Preview" style="max-width:100%; border-radius:8px; cursor:pointer;" onclick="window.open('${url}')">`;
    } else if (typeHandler.mediaType === 'audio') {
        preview.innerHTML = `<audio controls src="${url}" style="width:100%;"></audio>`;
    } else if (typeHandler.mediaType === 'video') {
        preview.innerHTML = `<video controls src="${url}" style="max-width:100%; border-radius:8px;"></video>`;
    } else {
        preview.innerHTML = '';
    }
}

// ============================================
// ЭКСПОРТ ФУНКЦИЙ
// ============================================

window.renderAnswersEditor = renderAnswersEditor;
window.setCorrectAnswer = setCorrectAnswer;
window.updateAnswerText = updateAnswerText;
window.addAnswer = addAnswer;
window.removeAnswer = removeAnswer;
window.uploadMedia = uploadMedia;
window.showMediaPreview = showMediaPreview;
// Экспорт
window.initConstructor = initConstructor;
window.createQuiz = async () => {
    const title = document.getElementById('newQuizTitle').value.trim();
    const desc = document.getElementById('newQuizDesc').value.trim();
    const gameMode = document.getElementById('gameMode')?.value || 'standard';
    if (!title) { showToast('Введите название', 'error'); return; }
    const result = await createNewQuiz(title, desc, gameMode);
    if (result.success) {
        closeModal('createQuizModal');
        showToast(`Квиз "${title}" создан`, 'success');
    }
};
window.loadMyQuizzes = loadMyQuizzes;
window.selectQuiz = selectQuiz;
window.addNewQuestion = addNewQuestion;
window.editQuestion = editQuestion;

function showAIGenerator() {
    showModal('aiGeneratorModal');
}

async function generateQuizAI() {
    const topic = document.getElementById('aiTopic').value;
    const questionCount = document.getElementById('aiQuestionCount').value;
    const difficulty = document.getElementById('aiDifficulty').value;
    const language = document.getElementById('aiLanguage').value;
    
    if (!topic) {
        showToast('Введите тему квиза', 'error');
        return;
    }
    
    document.getElementById('aiProgress').style.display = 'block';
    
    try {
        const response = await fetch('/api/ai/generate-quiz', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ topic, questionCount: parseInt(questionCount), difficulty, language })
        });
        
        const data = await response.json();
        
        if (data.quiz) {
            closeModal('aiGeneratorModal');
            currentQuiz = data.quiz;
            questions = data.quiz.questions || [];
            updateQuizDisplay();
            renderQuestionsList();
            enableQuizActions();
            showToast(`✅ Сгенерировано ${questions.length} вопросов!`, 'success');
        } else {
            showToast(data.error || 'Ошибка генерации', 'error');
        }
    } catch (error) {
        showToast('Ошибка соединения', 'error');
    } finally {
        document.getElementById('aiProgress').style.display = 'none';
    }
}

window.showAIGenerator = showAIGenerator;
window.generateQuizAI = generateQuizAI;