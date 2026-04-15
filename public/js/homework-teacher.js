// public/js/homework-teacher.js

let homeworkCurrentUser = null;
let homeworkItems = [];
let selectedHomework = null;

function homeworkEscapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function homeworkShowStatus(message, isError = false) {
    const node = document.getElementById('teacherStatus');
    if (!node) return;

    node.textContent = message;
    node.className = `status-box ${isError ? 'error' : 'success'}`;
    node.style.display = 'block';

    setTimeout(() => {
        node.style.display = 'none';
    }, 3500);
}

function formatDate(value) {
    if (!value) return 'Без дедлайна';
    return new Date(value).toLocaleString('ru-RU');
}

async function initHomeworkTeacher() {
    try {
        if (!getToken()) {
            window.location.href = '/constructor';
            return;
        }

        const me = await AuthService.me();
        homeworkCurrentUser = me.user;

        await loadTeacherQuizzes();
        await loadTeacherHomework();
    } catch (error) {
        homeworkShowStatus(error.message || 'Ошибка загрузки страницы', true);
    }
}

async function loadTeacherQuizzes() {
    const response = await QuizService.getAll({ authorId: homeworkCurrentUser.id });
    const select = document.getElementById('quizSelect');
    const quizzes = response.quizzes || [];

    if (!quizzes.length) {
        select.innerHTML = '<option value="">Нет квизов</option>';
        return;
    }

    select.innerHTML = '<option value="">Выберите квиз</option>' + quizzes.map((quiz) => `
        <option value="${quiz.id}">${homeworkEscapeHtml(quiz.title)} (${quiz._count?.questions || 0})</option>
    `).join('');
}

async function loadTeacherHomework() {
    const response = await HomeworkService.getAll();
    homeworkItems = response.homework || [];
    renderHomeworkList();
}

function renderHomeworkList() {
    const container = document.getElementById('homeworkList');
    if (!container) return;

    if (!homeworkItems.length) {
        container.innerHTML = '<div class="empty-state">Пока нет домашних заданий</div>';
        return;
    }

    container.innerHTML = homeworkItems.map((homework) => {
        const shareUrl = homework.shareUrl || `${window.location.origin}/homework/${homework.pinCode}`;
        return `
            <article class="homework-item">
                <div>
                    <div class="homework-title">${homeworkEscapeHtml(homework.title)}</div>
                    <div class="text-secondary">${homeworkEscapeHtml(homework.quiz?.title || 'Квиз')}</div>
                    <div class="small-text">Дедлайн: ${formatDate(homework.dueDate)}</div>
                    <div class="small-text">PIN: <strong>${homework.pinCode}</strong></div>
                    <div class="small-text share-line">${homeworkEscapeHtml(shareUrl)}</div>
                </div>
                <div class="homework-actions">
                    <button class="btn btn-outline" onclick="selectHomework('${homework.id}')">Открыть</button>
                    <button class="btn btn-outline" onclick="showHomeworkReport('${homework.id}')">Отчёт</button>
                    <button class="btn btn-outline danger" onclick="deleteHomework('${homework.id}')">Удалить</button>
                </div>
            </article>
        `;
    }).join('');
}

async function createHomework() {
    try {
        const quizId = document.getElementById('quizSelect').value;
        const title = document.getElementById('homeworkTitleInput').value.trim();
        const description = document.getElementById('homeworkDescriptionInput').value.trim();
        const dueDateValue = document.getElementById('dueDateInput').value;
        const maxAttempts = Number(document.getElementById('maxAttemptsInput').value || 1);
        const showCorrectAnswers = document.getElementById('showCorrectAnswersInput').checked;

        if (!quizId) throw new Error('Выберите квиз');
        if (!title) throw new Error('Введите название задания');

        const result = await HomeworkService.create({
            quizId,
            title,
            description,
            dueDate: dueDateValue ? new Date(dueDateValue).toISOString() : null,
            maxAttempts,
            showCorrectAnswers,
        });

        document.getElementById('createHomeworkForm').reset();
        document.getElementById('maxAttemptsInput').value = '1';
        homeworkShowStatus('Домашнее задание создано');
        await loadTeacherHomework();
        await selectHomework(result.homework.id);
    } catch (error) {
        homeworkShowStatus(error.message || 'Ошибка создания задания', true);
    }
}

async function selectHomework(homeworkId) {
    try {
        const result = await HomeworkService.getById(homeworkId);
        selectedHomework = result.homework;
        renderHomeworkDetails(selectedHomework);
        await showHomeworkReport(homeworkId);
    } catch (error) {
        homeworkShowStatus(error.message || 'Ошибка загрузки задания', true);
    }
}

function renderHomeworkDetails(homework) {
    const panel = document.getElementById('homeworkDetails');
    const shareUrl = homework.shareUrl || `${window.location.origin}/homework/${homework.pinCode}`;
    panel.style.display = 'block';

    document.getElementById('detailsTitle').textContent = homework.title;
    document.getElementById('detailsQuiz').textContent = homework.quiz?.title || 'Квиз';
    document.getElementById('detailsDescription').textContent = homework.description || 'Без описания';
    document.getElementById('detailsPin').textContent = homework.pinCode;
    document.getElementById('detailsLink').value = shareUrl;
    document.getElementById('detailsDueDate').textContent = formatDate(homework.dueDate);
    document.getElementById('detailsAttempts').textContent = String(homework.maxAttempts);
    document.getElementById('detailsAnswers').textContent = homework.showCorrectAnswers ? 'Да' : 'Нет';
}

async function showHomeworkReport(homeworkId) {
    try {
        const result = await HomeworkService.getReport(homeworkId);
        renderHomeworkReport(result.report);
    } catch (error) {
        homeworkShowStatus(error.message || 'Ошибка загрузки отчёта', true);
    }
}

function renderHomeworkReport(report) {
    const panel = document.getElementById('reportPanel');
    const submissionsNode = document.getElementById('submissionsList');
    const bestNode = document.getElementById('bestResultsList');
    panel.style.display = 'block';

    document.getElementById('reportTotal').textContent = String(report.summary.totalSubmissions);
    document.getElementById('reportCompleted').textContent = String(report.summary.completedSubmissions);
    document.getElementById('reportAverage').textContent = String(report.summary.averageScore);

    const submissions = report.submissions || [];
    submissionsNode.innerHTML = submissions.length ? submissions.map((submission) => `
        <div class="report-row">
            <span>${homeworkEscapeHtml(submission.studentName)}</span>
            <span>Попытка ${submission.attemptNumber}</span>
            <strong>${submission.score} / ${submission.maxScore}</strong>
            <span>${submission.isCompleted ? 'Завершено' : 'В процессе'}</span>
            <span>${submission.completedAt ? formatDate(submission.completedAt) : formatDate(submission.startedAt)}</span>
        </div>
    `).join('') : '<div class="empty-state">Пока нет попыток</div>';

    const bestResults = report.bestResults || [];
    bestNode.innerHTML = bestResults.length ? bestResults.map((submission) => `
        <div class="report-row">
            <span>${homeworkEscapeHtml(submission.studentName)}</span>
            <strong>${submission.score} / ${submission.maxScore}</strong>
            <span>Попытка ${submission.attemptNumber}</span>
        </div>
    `).join('') : '<div class="empty-state">Пока нет завершённых попыток</div>';
}

function copyHomeworkLink() {
    const input = document.getElementById('detailsLink');
    input.select();
    document.execCommand('copy');
    homeworkShowStatus('Ссылка скопирована');
}

async function deleteHomework(homeworkId) {
    if (!confirm('Удалить домашнее задание и все попытки учеников?')) return;

    try {
        await HomeworkService.remove(homeworkId);
        selectedHomework = null;
        document.getElementById('homeworkDetails').style.display = 'none';
        document.getElementById('reportPanel').style.display = 'none';
        homeworkShowStatus('Домашнее задание удалено');
        await loadTeacherHomework();
    } catch (error) {
        homeworkShowStatus(error.message || 'Ошибка удаления', true);
    }
}

document.addEventListener('DOMContentLoaded', initHomeworkTeacher);

window.createHomework = createHomework;
window.selectHomework = selectHomework;
window.showHomeworkReport = showHomeworkReport;
window.copyHomeworkLink = copyHomeworkLink;
window.deleteHomework = deleteHomework;
