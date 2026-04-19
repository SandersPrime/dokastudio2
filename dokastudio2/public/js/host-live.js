// public/js/host-live.js

let hostSocket = null;
let currentHostUser = null;
let currentSession = null;
let currentQuestionPayload = null;
let hostTimerInterval = null;
let hostTimerRemaining = 0;
let hostTimerTotal = 0;
let hostTimerPaused = false;
let buzzerState = {
    online: false,
    wsConnected: false,
    status: null,
    devices: [],
    lastEvent: null,
    assignments: [],
    runtime: {
        mode: 'IDLE',
        modeSource: 'manual',
        pinCode: null,
        questionId: null,
        isLocked: false,
        firstPress: null,
        pressedQueue: [],
        answeredTeams: [],
    },
    buttons: [],
};

const BUZZER_TEAMS = [
    { value: '', label: 'Не назначено' },
    { value: 'team-1', label: 'Команда 1' },
    { value: 'team-2', label: 'Команда 2' },
    { value: 'team-3', label: 'Команда 3' },
    { value: 'team-4', label: 'Команда 4' },
];

function syncLiveHostState() {
    if (!window.LiveHostState) return;
    LiveHostState.setSocket(hostSocket);
    LiveHostState.setSession(currentSession);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function hostShowError(message) {
    const el = document.getElementById('hostError');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
}

function hostClearError() {
    const el = document.getElementById('hostError');
    if (!el) return;
    el.textContent = '';
    el.style.display = 'none';
}

function renderHostPlayers(players = []) {
    const playersList = document.getElementById('playersList');
    const playerCount = document.getElementById('playerCount');

    if (playerCount) {
        playerCount.textContent = String(players.length);
    }

    if (!playersList) return;

    if (!players.length) {
        playersList.innerHTML = '<div class="empty-state">Ожидание игроков...</div>';
        return;
    }

    playersList.innerHTML = players.map((player) => `
        <div class="player-row">
            <div>
                <strong>${escapeHtml(player.nickname)}</strong>
                <div class="text-secondary small">${player.connected ? 'Онлайн' : 'Отключён'}</div>
            </div>
            <div class="player-score-actions">
                <div class="badge">${player.score} pts</div>
                <button class="score-btn" onclick="adjustScore('${player.id}', 100)">+100</button>
                <button class="score-btn" onclick="adjustScore('${player.id}', -100)">-100</button>
                <button class="score-btn" onclick="adjustScore('${player.id}', 500)">+500</button>
                <button class="score-btn" onclick="adjustScore('${player.id}', -500)">-500</button>
            </div>
        </div>
    `).join('');
}

function renderBuzzerPanel() {
    const statusLine = document.getElementById('buzzerStatusLine');
    const testLine = document.getElementById('buzzerTestLine');
    const lastPress = document.getElementById('buzzerLastPress');
    const lastScan = document.getElementById('buzzerLastScan');
    const deviceCountLine = document.getElementById('buzzerDeviceCount');
    const devicesContainer = document.getElementById('buzzerDevices');
    const assignmentsContainer = document.getElementById('buzzerAssignments');
    const modeLine = document.getElementById('buzzerModeLine');
    const modeSourceLine = document.getElementById('buzzerModeSource');
    const lockLine = document.getElementById('buzzerLockLine');
    const firstPressLine = document.getElementById('buzzerFirstPress');
    const answeredTeamsContainer = document.getElementById('buzzerAnsweredTeams');
    const queueContainer = document.getElementById('buzzerQueue');

    if (statusLine) {
        const online = buzzerState.online ? 'онлайн' : 'офлайн';
        const ws = buzzerState.wsConnected ? 'ws connected' : 'ws offline';
        statusLine.textContent = `Bridge: ${online} (${ws})`;
    }

    if (testLine) {
        const testMode = buzzerState.status?.testMode ? 'ON' : 'OFF';
        testLine.textContent = `Test mode: ${testMode}`;
    }

    if (lastPress) {
        if (buzzerState.lastEvent) {
            lastPress.textContent = `Последнее нажатие: ${buzzerState.lastEvent.buttonId} (${new Date(buzzerState.lastEvent.pressedAt).toLocaleTimeString()})`;
        } else {
            lastPress.textContent = 'Последнее нажатие: —';
        }
    }

    if (lastScan) {
        const lastScanAt = buzzerState.status?.lastDeviceScanAt;
        lastScan.textContent = lastScanAt
            ? `Последний скан: ${new Date(lastScanAt).toLocaleTimeString()}`
            : 'Последний скан: —';
    }

    if (deviceCountLine) {
        const count = buzzerState.status?.lastDeviceCount;
        deviceCountLine.textContent = typeof count === 'number'
            ? `Устройств найдено: ${count}`
            : 'Устройств найдено: —';
    }

    if (devicesContainer) {
        const devices = buzzerState.devices || [];
        if (!devices.length) {
            devicesContainer.innerHTML = '<div class="empty-state">Устройства не обнаружены</div>';
        } else {
            devicesContainer.innerHTML = devices.map((device) => `
                <div class="stat-row">
                    <span>${escapeHtml(device.name || device.receiverId)}</span>
                    <strong>${escapeHtml(device.status)} • ${escapeHtml(device.provider || '—')}</strong>
                </div>
            `).join('');
        }
    }

    if (assignmentsContainer) {
        const buttons = buzzerState.buttons || [];
        if (!buttons.length) {
            assignmentsContainer.innerHTML = '<div class="empty-state">Нет кнопок для назначения</div>';
        } else {
            assignmentsContainer.innerHTML = buttons.map((button) => {
                const options = BUZZER_TEAMS.map((team) => {
                    const selected = team.value === (button.teamId || '') ? 'selected' : '';
                    return `<option value="${team.value}" ${selected}>${team.label}</option>`;
                }).join('');
                return `
                    <div class="stat-row">
                        <span>${escapeHtml(button.label)}</span>
                        <select class="input" style="max-width:160px;" onchange="updateBuzzerAssignment('${button.receiverId}','${button.buttonId}', this.value)">
                            ${options}
                        </select>
                    </div>
                `;
            }).join('');
        }
    }

    if (modeLine) {
        modeLine.textContent = `Mode: ${buzzerState.runtime?.mode || 'IDLE'}`;
    }
    if (modeSourceLine) {
        const source = buzzerState.runtime?.modeSource || 'manual';
        modeSourceLine.textContent = `Источник: ${source === 'question' ? 'вопрос' : 'ручной'}`;
    }
    if (lockLine) {
        lockLine.textContent = `Lock: ${buzzerState.runtime?.isLocked ? 'LOCKED' : 'UNLOCKED'}`;
    }
    if (firstPressLine) {
        if (buzzerState.runtime?.firstPress) {
            const fp = buzzerState.runtime.firstPress;
            firstPressLine.textContent = `Первое нажатие: ${fp.label || fp.buttonId} (${fp.teamId || 'no team'})`;
        } else {
            firstPressLine.textContent = 'Первое нажатие: —';
        }
    }

    if (queueContainer) {
        const queue = buzzerState.runtime?.pressedQueue || [];
        if (!queue.length) {
            queueContainer.innerHTML = '<div class="empty-state">Нажатий пока нет</div>';
        } else {
            queueContainer.innerHTML = queue.slice(-6).reverse().map((item) => `
                <div class="stat-row">
                    <span>${escapeHtml(item.label || item.buttonId)}</span>
                    <strong>${item.ignored ? 'late' : 'ok'}</strong>
                </div>
            `).join('');
        }
    }

    if (answeredTeamsContainer) {
        const answeredTeams = buzzerState.runtime?.answeredTeams || [];
        if (!answeredTeams.length) {
            answeredTeamsContainer.innerHTML = '<div class="empty-state">Ответов пока нет</div>';
        } else {
            answeredTeamsContainer.innerHTML = answeredTeams.map((item) => `
                <div class="stat-row">
                    <span>${escapeHtml(item.label || item.teamId || 'Команда')}</span>
                    <strong>${escapeHtml(item.teamId || '')}</strong>
                </div>
            `).join('');
        }
    }
}

function syncBuzzerButtons() {
    const devices = buzzerState.devices || [];
    const assignments = buzzerState.assignments || [];
    const items = [];

    devices.forEach((device) => {
        const receiverId = device.receiverId;
        const buttons = device.buttons || ['A1', 'A2', 'A3', 'A4'];
        buttons.forEach((buttonId) => {
            const assignment = assignments.find((item) => item.receiverId === receiverId && item.buttonId === buttonId);
            items.push({
                receiverId,
                buttonId,
                label: `${device.name || receiverId} • ${buttonId}`,
                teamId: assignment?.teamId || '',
            });
        });
    });

    buzzerState.buttons = items;
}

function renderLeaderboard(leaderboard = []) {
    const container = document.getElementById('leaderboard');
    if (!container) return;

    if (!leaderboard.length) {
        container.innerHTML = '<div class="empty-state">Пока нет результатов</div>';
        return;
    }

    container.innerHTML = leaderboard.map((player, index) => `
        <div class="leaderboard-row">
            <div class="leaderboard-rank">${index + 1}</div>
            <div class="leaderboard-name">${escapeHtml(player.nickname)}</div>
            <div class="leaderboard-score">${player.score}</div>
        </div>
    `).join('');
}

function renderHostQuestion(payload) {
    currentQuestionPayload = payload;

    const question = payload.question || payload;
    const questionText = document.getElementById('questionText');
    const questionInfo = document.getElementById('questionInfo');
    const answersGrid = document.getElementById('answersGrid');
    const answerStats = document.getElementById('answerStats');

    document.getElementById('lobbySection').style.display = 'none';
    document.getElementById('questionSection').style.display = 'block';

    document.getElementById('startGameBtn').style.display = 'none';
    document.getElementById('showAnswerBtn').style.display = 'inline-flex';
    document.getElementById('pauseQuestionBtn').style.display = 'inline-flex';
    document.getElementById('resumeQuestionBtn').style.display = 'none';
    document.getElementById('showLeaderboardBtn').style.display = 'inline-flex';
    document.getElementById('nextQuestionBtn').style.display = 'none';
    document.getElementById('finishGameBtn').style.display = 'inline-flex';

    document.getElementById('gameStatus').textContent = 'ИДЁТ ВОПРОС';
    document.getElementById('gameStatus').className = 'status-badge active';
    if (answerStats) {
        answerStats.style.display = 'none';
    }

    questionText.textContent = question.text;
    if (payload.questionNumber && payload.totalQuestions) {
        questionInfo.textContent = `Вопрос ${payload.questionNumber} из ${payload.totalQuestions} • ${question.points} pts`;
    } else {
        questionInfo.textContent = `Вопрос • ${question.points} pts`;
    }
    renderHostNotes(question.notes);

    answersGrid.innerHTML = (question.answers || []).map((answer, index) => `
        <div class="answer-card-host" data-answer-id="${answer.id}">
            <span class="answer-letter">${String.fromCharCode(65 + index)}</span>
            ${escapeHtml(answer.text)}
        </div>
    `).join('');

    renderLeaderboard(payload.leaderboard || []);
    startHostTimer(question.timeLimit || 30);
}

function revealHostAnswer(payload) {
    const answersGrid = document.getElementById('answersGrid');
    const statsContent = document.getElementById('statsContent');
    const answerStats = document.getElementById('answerStats');

    document.getElementById('gameStatus').textContent = 'ПОКАЗАН ОТВЕТ';
    document.getElementById('gameStatus').className = 'status-badge reveal';

    document.getElementById('showAnswerBtn').style.display = 'none';
    document.getElementById('pauseQuestionBtn').style.display = 'none';
    document.getElementById('resumeQuestionBtn').style.display = 'none';
    document.getElementById('showLeaderboardBtn').style.display = 'inline-flex';
    document.getElementById('nextQuestionBtn').style.display = 'inline-flex';
    pauseHostTimer();

    const correctIds = new Set(payload.correctAnswerIds || []);

    answersGrid.querySelectorAll('.answer-card-host').forEach((node) => {
        const answerId = node.dataset.answerId;
        node.classList.toggle('correct', correctIds.has(answerId));
    });

    if (answerStats && statsContent) {
        answerStats.style.display = 'block';
        statsContent.innerHTML = (payload.answerStats || []).map((item) => `
            <div class="stat-row">
                <span>${escapeHtml(item.text)}</span>
                <strong>${item.count}</strong>
            </div>
        `).join('');
    }

    renderLeaderboard(payload.leaderboard || []);
}

function renderHostNotes(notes) {
    const notesBox = document.getElementById('hostNotesBox');
    const notesContent = document.getElementById('hostNotesContent');
    if (!notesBox || !notesContent) return;

    const safeNotes = String(notes || '').trim();
    notesBox.style.display = safeNotes ? 'block' : 'none';
    notesContent.textContent = safeNotes;
}

function renderHostLeaderboardScreen(payload) {
    document.getElementById('gameStatus').textContent = 'РЕЙТИНГ';
    document.getElementById('gameStatus').className = 'status-badge leaderboard';
    document.getElementById('showAnswerBtn').style.display = 'none';
    document.getElementById('pauseQuestionBtn').style.display = 'none';
    document.getElementById('resumeQuestionBtn').style.display = 'none';
    document.getElementById('showLeaderboardBtn').style.display = 'none';
    document.getElementById('nextQuestionBtn').style.display = 'inline-flex';
    document.getElementById('finishGameBtn').style.display = 'inline-flex';
    pauseHostTimer();
    renderLeaderboard(payload.leaderboard || []);
    renderHostPlayers(payload.leaderboard || []);
}

function markHostPaused(payload) {
    document.getElementById('gameStatus').textContent = 'ПАУЗА';
    document.getElementById('gameStatus').className = 'status-badge paused';
    document.getElementById('pauseQuestionBtn').style.display = 'none';
    document.getElementById('resumeQuestionBtn').style.display = 'inline-flex';
    pauseHostTimer();
    renderLeaderboard(payload.leaderboard || []);
}

function markHostResumed(payload) {
    document.getElementById('gameStatus').textContent = 'ИДЁТ ВОПРОС';
    document.getElementById('gameStatus').className = 'status-badge active';
    document.getElementById('pauseQuestionBtn').style.display = 'inline-flex';
    document.getElementById('resumeQuestionBtn').style.display = 'none';
    resumeHostTimer();
    renderLeaderboard(payload.leaderboard || []);
}

function renderFinalResults(payload) {
    document.getElementById('gameStatus').textContent = 'ИГРА ЗАВЕРШЕНА';
    document.getElementById('gameStatus').className = 'status-badge finished';

    document.getElementById('questionSection').style.display = 'none';
    document.getElementById('lobbySection').style.display = 'block';
    document.getElementById('showAnswerBtn').style.display = 'none';
    document.getElementById('pauseQuestionBtn').style.display = 'none';
    document.getElementById('resumeQuestionBtn').style.display = 'none';
    document.getElementById('showLeaderboardBtn').style.display = 'none';
    document.getElementById('nextQuestionBtn').style.display = 'none';
    document.getElementById('finishGameBtn').style.display = 'none';
    pauseHostTimer();

    const playersList = document.getElementById('playersList');
    playersList.innerHTML = (payload.leaderboard || []).map((player, index) => `
        <div class="player-row">
            <div>
                <strong>#${index + 1} ${escapeHtml(player.nickname)}</strong>
            </div>
            <div class="badge">${player.score} pts</div>
        </div>
    `).join('');

    renderLeaderboard(payload.leaderboard || []);
}

function startHostTimer(seconds) {
    const timerNode = document.getElementById('timer');
    const timerProgress = document.getElementById('timerProgress');

    clearInterval(hostTimerInterval);

    hostTimerTotal = Math.max(1, Number(seconds) || 30);
    hostTimerRemaining = hostTimerTotal;
    hostTimerPaused = false;

    timerNode.textContent = String(hostTimerRemaining);
    timerProgress.style.width = '100%';

    runHostTimer();
}

function runHostTimer() {
    const timerNode = document.getElementById('timer');
    const timerProgress = document.getElementById('timerProgress');

    clearInterval(hostTimerInterval);

    hostTimerInterval = setInterval(() => {
        hostTimerRemaining -= 1;
        timerNode.textContent = String(Math.max(0, hostTimerRemaining));
        timerProgress.style.width = `${Math.max(0, (hostTimerRemaining / hostTimerTotal) * 100)}%`;

        if (hostTimerRemaining <= 0) {
            clearInterval(hostTimerInterval);
        }
    }, 1000);
}

function pauseHostTimer() {
    hostTimerPaused = true;
    clearInterval(hostTimerInterval);
}

function resumeHostTimer() {
    if (!hostTimerPaused || hostTimerRemaining <= 0) return;
    hostTimerPaused = false;
    runHostTimer();
}

async function loadHostUser() {
    const token = getToken();
    if (!token) {
        window.location.href = '/constructor';
        return;
    }

    const me = await AuthService.me();
    currentHostUser = me.user;
}

async function loadHostQuizzes() {
    const response = await QuizService.getAll({
        authorId: currentHostUser.id,
    });

    const select = document.getElementById('quizSelect');
    const quizzes = response.quizzes || [];

    if (!quizzes.length) {
        select.innerHTML = '<option value="">Нет квизов</option>';
        return;
    }

    select.innerHTML = quizzes.map((quiz) => `
        <option value="${quiz.id}">
            ${escapeHtml(quiz.title)} (${quiz._count?.questions || 0} вопросов)
        </option>
    `).join('');
}

function connectHostSocket() {
    if (hostSocket) {
        hostSocket.disconnect();
    }

    hostSocket = io();
    syncLiveHostState();

    hostSocket.on('connect', () => {
        if (!currentSession) return;

        hostSocket.emit('host:create-room', {
            sessionId: currentSession.id,
            pinCode: currentSession.pinCode,
            token: getToken(),
        });
        hostSocket.emit('buzzer:subscribe');
    });

    hostSocket.on('host:room-created', () => {
        // room ready
    });

    hostSocket.on('host:player-joined', (payload) => {
        renderHostPlayers(payload.players || []);
    });

    hostSocket.on('lobby:update', (payload) => {
        renderHostPlayers(payload.players || []);
    });

    hostSocket.on('game:question', (payload) => {
        renderHostQuestion(payload);
    });

    hostSocket.on('game:answer-reveal', (payload) => {
        revealHostAnswer(payload);
    });

    hostSocket.on('game:paused', (payload) => {
        markHostPaused(payload);
    });

    hostSocket.on('game:resumed', (payload) => {
        markHostResumed(payload);
    });

    hostSocket.on('game:leaderboard', (payload) => {
        renderHostLeaderboardScreen(payload);
    });

    hostSocket.on('game:leaderboard-update', (payload) => {
        renderLeaderboard(payload.leaderboard || []);
        renderHostPlayers(payload.leaderboard || []);
    });

    hostSocket.on('game:finished', (payload) => {
        renderFinalResults(payload);
    });

    hostSocket.on('buzzer:status', (payload) => {
        buzzerState = {
            ...buzzerState,
            ...payload,
            status: payload.status || buzzerState.status,
        };
        renderBuzzerPanel();
    });

    hostSocket.on('buzzer:devices', (payload) => {
        buzzerState.devices = payload.devices || [];
        syncBuzzerButtons();
        renderBuzzerPanel();
    });

    hostSocket.on('buzzer:pressed', (payload) => {
        buzzerState.lastEvent = payload;
        renderBuzzerPanel();
    });

    hostSocket.on('buzzer:assignments', (payload) => {
        buzzerState.assignments = payload.assignments || [];
        syncBuzzerButtons();
        renderBuzzerPanel();
    });

    hostSocket.on('buzzer:assignment-updated', (payload) => {
        const assignments = buzzerState.assignments.filter(
            (item) => !(item.receiverId === payload.receiverId && item.buttonId === payload.buttonId)
        );
        assignments.push(payload);
        buzzerState.assignments = assignments;
        syncBuzzerButtons();
        renderBuzzerPanel();
    });

    hostSocket.on('buzzer:mode', (payload) => {
        buzzerState.runtime = {
            ...buzzerState.runtime,
            ...payload,
        };
        renderBuzzerPanel();
    });

    hostSocket.on('buzzer:lock', (payload) => {
        buzzerState.runtime = {
            ...buzzerState.runtime,
            isLocked: payload.isLocked,
            firstPress: payload.firstPress || buzzerState.runtime.firstPress,
        };
        renderBuzzerPanel();
    });

    hostSocket.on('buzzer:first-press', (payload) => {
        buzzerState.runtime = {
            ...buzzerState.runtime,
            firstPress: payload,
        };
        renderBuzzerPanel();
    });

    hostSocket.on('buzzer:test-event', () => {
        renderBuzzerPanel();
    });

    hostSocket.on('buzzer:reset', () => {
        renderBuzzerPanel();
    });

    hostSocket.on('error', (payload) => {
        hostShowError(payload.message || 'Ошибка сокета');
    });
}

async function loadBuzzerState() {
    try {
        const statusResponse = await BuzzerService.getStatus();
        buzzerState.online = statusResponse.online ?? true;
        buzzerState.status = statusResponse.status || null;
        const devicesResponse = await BuzzerService.getDevices();
        buzzerState.devices = devicesResponse.devices || [];
        const assignmentsResponse = await BuzzerService.getAssignments();
        buzzerState.assignments = assignmentsResponse.assignments || [];
        const runtimeResponse = await BuzzerService.getRuntime();
        buzzerState.runtime = runtimeResponse.runtime || buzzerState.runtime;
        syncBuzzerButtons();
    } catch (error) {
        buzzerState.online = false;
    }
    renderBuzzerPanel();
}

async function createLiveSession() {
    try {
        hostClearError();

        const quizId = document.getElementById('quizSelect').value;
        if (!quizId) {
            throw new Error('Выберите квиз');
        }

        const response = await SessionService.create(quizId);
        currentSession = response.session;
        syncLiveHostState();

        document.getElementById('quizSelectionPanel').style.display = 'none';
        document.getElementById('gamePanel').style.display = 'grid';

        document.getElementById('pinDisplay').textContent = currentSession.pinCode;
        document.getElementById('joinUrl').textContent = response.joinUrl;
        document.getElementById('qrContainer').innerHTML = `<img src="${response.qrCode}" alt="QR">`;

        renderHostPlayers(currentSession.players || []);
        connectHostSocket();
    } catch (error) {
        hostShowError(error.message || 'Ошибка создания сессии');
    }
}

function startGame() {
    if (!hostSocket || !currentSession) return;
    hostSocket.emit('host:start-game', { pinCode: currentSession.pinCode });
}

function showAnswer() {
    if (!hostSocket || !currentSession) return;
    hostSocket.emit('host:show-answer', { pinCode: currentSession.pinCode });
}

function pauseQuestion() {
    if (!hostSocket || !currentSession) return;
    hostSocket.emit('host:pause-question', { pinCode: currentSession.pinCode });
}

function resumeQuestion() {
    if (!hostSocket || !currentSession) return;
    hostSocket.emit('host:resume-question', { pinCode: currentSession.pinCode });
}

function showLeaderboard() {
    if (!hostSocket || !currentSession) return;
    hostSocket.emit('host:show-leaderboard', { pinCode: currentSession.pinCode });
}

function adjustScore(playerId, delta) {
    if (!hostSocket || !currentSession) return;
    hostSocket.emit('host:adjust-score', {
        pinCode: currentSession.pinCode,
        playerId,
        delta,
    });
}

function nextQuestion() {
    if (!hostSocket || !currentSession) return;
    hostSocket.emit('host:next-question', { pinCode: currentSession.pinCode });
}

function finishGame() {
    if (!hostSocket || !currentSession) return;
    hostSocket.emit('host:finish-game', { pinCode: currentSession.pinCode });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadHostUser();
        await loadHostQuizzes();
        await loadBuzzerState();
    } catch (error) {
        hostShowError(error.message || 'Ошибка инициализации');
    }
});

async function buzzerStartTest() {
    try {
        await BuzzerService.testStart();
        await loadBuzzerState();
    } catch (error) {
        hostShowError(error.message || 'Ошибка запуска теста');
    }
}

async function buzzerStopTest() {
    try {
        await BuzzerService.testStop();
        await loadBuzzerState();
    } catch (error) {
        hostShowError(error.message || 'Ошибка остановки теста');
    }
}

async function buzzerReset() {
    try {
        await BuzzerService.reset();
        await loadBuzzerState();
    } catch (error) {
        hostShowError(error.message || 'Ошибка сброса');
    }
}

async function buzzerPressTest() {
    try {
        await BuzzerService.testPress('A1');
    } catch (error) {
        hostShowError(error.message || 'Ошибка тестового нажатия');
    }
}

async function updateBuzzerAssignment(receiverId, buttonId, teamId) {
    try {
        await BuzzerService.upsertAssignment({
            receiverId,
            buttonId,
            teamId: teamId || null,
            label: `${receiverId}:${buttonId}`,
        });
    } catch (error) {
        hostShowError(error.message || 'Ошибка назначения');
    }
}

async function buzzerStartFastest() {
    try {
        const response = await BuzzerService.setMode('FASTEST_FINGER');
        buzzerState.runtime = response.runtime || buzzerState.runtime;
        renderBuzzerPanel();
    } catch (error) {
        hostShowError(error.message || 'Ошибка смены режима');
    }
}

async function buzzerSetIdle() {
    try {
        const response = await BuzzerService.setMode('IDLE');
        buzzerState.runtime = response.runtime || buzzerState.runtime;
        renderBuzzerPanel();
    } catch (error) {
        hostShowError(error.message || 'Ошибка смены режима');
    }
}

async function buzzerResetLock() {
    try {
        const response = await BuzzerService.resetLock();
        buzzerState.runtime = response.runtime || buzzerState.runtime;
        renderBuzzerPanel();
    } catch (error) {
        hostShowError(error.message || 'Ошибка сброса');
    }
}

window.startSession = createLiveSession;
window.startGame = startGame;
window.showAnswer = showAnswer;
window.pauseQuestion = pauseQuestion;
window.resumeQuestion = resumeQuestion;
window.showLeaderboard = showLeaderboard;
window.adjustScore = adjustScore;
window.nextQuestion = nextQuestion;
window.finishGame = finishGame;
window.buzzerStartTest = buzzerStartTest;
window.buzzerStopTest = buzzerStopTest;
window.buzzerReset = buzzerReset;
window.buzzerPressTest = buzzerPressTest;
window.updateBuzzerAssignment = updateBuzzerAssignment;
window.buzzerStartFastest = buzzerStartFastest;
window.buzzerSetIdle = buzzerSetIdle;
window.buzzerResetLock = buzzerResetLock;
