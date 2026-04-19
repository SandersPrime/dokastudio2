// public/js/homework-student.js

let studentPinCode = '';
let studentHomework = null;
let studentSubmission = null;
let studentQuestions = [];
let studentAnswers = {};
let currentQuestionIndex = 0;

function studentEscapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showHomeworkScreen(screenId) {
    document.querySelectorAll('[data-screen]').forEach((node) => {
        node.style.display = 'none';
    });

    const target = document.getElementById(screenId);
    if (target) {
        target.style.display = 'block';
    }
}

function showStudentError(message) {
    const node = document.getElementById('studentError');
    node.textContent = message;
    node.style.display = 'block';
    setTimeout(() => {
        node.style.display = 'none';
    }, 3500);
}

function hydratePinFromUrl() {
    const lastPart = window.location.pathname.split('/').filter(Boolean).pop();
    if (/^\d{6}$/.test(lastPart || '')) {
        document.getElementById('pinInput').value = lastPart;
    }
}

async function loadHomeworkPreview() {
    try {
        const pinCode = document.getElementById('pinInput').value.trim();
        const studentName = document.getElementById('studentNameInput').value.trim();

        if (!/^\d{6}$/.test(pinCode)) throw new Error('Введите 6-значный PIN');
        if (!studentName) throw new Error('Введите имя');

        const preview = await HomeworkService.getByPin(pinCode);
        studentPinCode = pinCode;
        studentHomework = preview.homework;

        document.getElementById('previewTitle').textContent = studentHomework.title;
        document.getElementById('previewDescription').textContent = studentHomework.description || 'Без описания';
        document.getElementById('previewQuiz').textContent = studentHomework.quiz?.title || 'Квиз';
        document.getElementById('previewDueDate').textContent = studentHomework.dueDate
            ? new Date(studentHomework.dueDate).toLocaleString('ru-RU')
            : 'Без дедлайна';
        document.getElementById('previewAttempts').textContent = String(studentHomework.maxAttempts);

        showHomeworkScreen('previewScreen');
    } catch (error) {
        showStudentError(error.message || 'Домашнее задание не найдено');
    }
}

async function startHomeworkAttempt() {
    try {
        const studentName = document.getElementById('studentNameInput').value.trim();
        const result = await HomeworkService.start(studentPinCode, studentName);

        studentHomework = result.homework;
        studentSubmission = result.submission;
        studentQuestions = studentHomework.quiz?.questions || [];
        studentAnswers = {};
        currentQuestionIndex = 0;

        document.getElementById('studentNameDisplay').textContent = studentName;
        renderStudentQuestion();
        showHomeworkScreen('questionScreen');
    } catch (error) {
        showStudentError(error.message || 'Не удалось начать попытку');
    }
}

function renderStudentQuestion() {
    const question = studentQuestions[currentQuestionIndex];
    if (!question) return;

    document.getElementById('questionCounter').textContent = `${currentQuestionIndex + 1} / ${studentQuestions.length}`;
    document.getElementById('questionText').textContent = question.text;
    document.getElementById('progressFill').style.width = `${((currentQuestionIndex + 1) / studentQuestions.length) * 100}%`;

    const mediaNode = document.getElementById('questionMedia');
    mediaNode.innerHTML = '';

    if (question.imageUrl) {
        mediaNode.innerHTML = `<img src="${question.imageUrl}" alt="" class="homework-media">`;
    } else if (question.audioUrl) {
        mediaNode.innerHTML = `<audio controls src="${question.audioUrl}" class="homework-media"></audio>`;
    } else if (question.videoUrl) {
        mediaNode.innerHTML = `<video controls src="${question.videoUrl}" class="homework-media"></video>`;
    }

    const selectedAnswerId = studentAnswers[question.id] || null;
    const answersNode = document.getElementById('answersList');
    answersNode.innerHTML = (question.answers || []).map((answer, index) => `
        <button
            class="answer-option ${selectedAnswerId === answer.id ? 'selected' : ''}"
            onclick="selectStudentAnswer('${question.id}', '${answer.id}')"
        >
            <span>${String.fromCharCode(65 + index)}</span>
            ${studentEscapeHtml(answer.text)}
        </button>
    `).join('');

    document.getElementById('prevQuestionBtn').disabled = currentQuestionIndex === 0;
    document.getElementById('nextQuestionBtn').textContent =
        currentQuestionIndex === studentQuestions.length - 1 ? 'Завершить' : 'Далее';
}

function selectStudentAnswer(questionId, answerId) {
    studentAnswers[questionId] = answerId;
    renderStudentQuestion();
}

function prevStudentQuestion() {
    if (currentQuestionIndex <= 0) return;
    currentQuestionIndex -= 1;
    renderStudentQuestion();
}

function nextStudentQuestion() {
    if (currentQuestionIndex < studentQuestions.length - 1) {
        currentQuestionIndex += 1;
        renderStudentQuestion();
        return;
    }

    submitHomeworkAttempt();
}

async function submitHomeworkAttempt() {
    try {
        const studentName = document.getElementById('studentNameInput').value.trim();
        const answers = studentQuestions.map((question) => ({
            questionId: question.id,
            answerId: studentAnswers[question.id] || null,
        }));

        const result = await HomeworkService.submit(studentPinCode, {
            studentName,
            submissionId: studentSubmission.id,
            answers,
        });

        renderStudentResult(result);
    } catch (error) {
        showStudentError(error.message || 'Ошибка отправки результата');
    }
}

function renderStudentResult(result) {
    const submission = result.submission;
    document.getElementById('finalScore').textContent = `${submission.score} / ${submission.maxScore}`;
    document.getElementById('finalMessage').textContent = submission.isCompleted
        ? 'Попытка сохранена'
        : 'Попытка не завершена';

    const reviewNode = document.getElementById('answersReview');
    const answers = result.results?.answers || [];

    if (!result.results?.showCorrectAnswers || !answers.length) {
        reviewNode.innerHTML = '<div class="text-secondary">Учитель отключил показ правильных ответов.</div>';
    } else {
        reviewNode.innerHTML = answers.map((answer, index) => `
            <div class="review-row ${answer.isCorrect ? 'correct' : 'wrong'}">
                <strong>${index + 1}. ${studentEscapeHtml(answer.text)}</strong>
                <div>${answer.isCorrect ? 'Верно' : 'Неверно'} · ${answer.pointsAwarded} баллов</div>
                <div class="text-secondary">Правильный ответ: ${answer.correctAnswers.map((item) => studentEscapeHtml(item.text)).join(', ')}</div>
            </div>
        `).join('');
    }

    showHomeworkScreen('resultScreen');
}

document.addEventListener('DOMContentLoaded', () => {
    hydratePinFromUrl();
    showHomeworkScreen('joinScreen');
});

window.loadHomeworkPreview = loadHomeworkPreview;
window.startHomeworkAttempt = startHomeworkAttempt;
window.selectStudentAnswer = selectStudentAnswer;
window.prevStudentQuestion = prevStudentQuestion;
window.nextStudentQuestion = nextStudentQuestion;
