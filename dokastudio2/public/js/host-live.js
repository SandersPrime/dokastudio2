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

const DEFAULT_TEAMS = [
    { value: '', label: 'Не назначено' },
    { value: 'team-1', label: 'Команда 1' },
    { value: 'team-2', label: 'Команда 2' },
    { value: 'team-3', label: 'Команда 3' },
    { value: 'team-4', label: 'Команда 4' },
];

let hostTeams = [];

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

function normalizeTeams(teams = []) {
    if (!Array.isArray(teams) || !teams.length) return [];
    return teams.map((team) => ({
        value: team.id || team.value || '',
        label: team.name || team.label || 'Команда',
    }));
}

function setHostTeams(teams = []) {
    hostTeams = normalizeTeams(teams);
}

function getTeamsForSelect() {
    return hostTeams.length ? [{ value: '', label: 'Не назначено' }, ...hostTeams] : DEFAULT_TEAMS;
}

function setStatusPill(node, state, label) {
    if (!node) return;
    node.classList.remove('good', 'bad', 'warn');
    if (state === 'good') node.classList.add('good');
    if (state === 'bad') node.classList.add('bad');
    if (state === 'warn') node.classList.add('warn');
    node.textContent = label;
}

function formatQuestionType(payload = {}) {
    const question = payload.question || payload;
    const buzzerMode = String(payload.buzzerMode || buzzerState.runtime?.mode || '').toUpperCase();
    const type = String(question.type || '').toUpperCase();

    if (buzzerMode === 'FASTEST_FINGER' || type === 'FASTEST_FINGER') return 'fastest finger';
    if (type === 'MULTIPLE_CORRECT' || type === 'MULTIPLE_ANSWERS') return 'multiple answers';
    if (type === 'BUZZER') return 'buzzer';
    if (buzzerMode === 'EVERYONE_ANSWERS') return 'single answer';
    return type ? type.toLowerCase().replace(/_/g, ' ') : 'single answer';
}

function updatePlayerPreview(pinCode) {
    const iframe = document.getElementById('playerPreview');
    if (!iframe) return;
    iframe.src = pinCode ? `/play/${pinCode}` : '/play';
}

function updateStatusPanel() {
    const helperStatus = document.getElementById('helperStatus');
    const bridgeStatus = document.getElementById('bridgeStatus');
    const receiverStatus = document.getElementById('receiverStatus');

    const bridgeState = buzzerState.status?.bridgeStatus || (buzzerState.online ? 'ready' : 'offline');
    const bridgeLabel = bridgeState === 'ready' ? 'online' : bridgeState;
    const bridgeClass = bridgeState === 'ready' ? 'good' : (bridgeState === 'starting' ? 'warn' : 'bad');
    setStatusPill(helperStatus, bridgeClass, bridgeLabel);

    const wsLabel = buzzerState.wsConnected ? 'connected' : 'disconnected';
    setStatusPill(bridgeStatus, buzzerState.wsConnected ? 'good' : 'bad', wsLabel);

    const connected = (buzzerState.devices || []).some((device) => device.status === 'connected');
    setStatusPill(receiverStatus, connected ? 'good' : 'bad', connected ? 'connected' : 'disconnected');
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
    const lastPressDiag = document.getElementById('buzzerLastPressDiag');
    const lastScanDiag = document.getElementById('buzzerLastScanDiag');
    const deviceCountDiag = document.getElementById('buzzerDeviceCountDiag');
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
            const last = buzzerState.lastEvent;
            const teamLabel = last.teamName || last.label || last.teamId || 'no team';
            const pressText = `Последнее нажатие: ${last.receiverId} • ${last.keyPad ?? '—'} • ${last.buttonId} • ${teamLabel} (${new Date(last.pressedAt).toLocaleTimeString()})`;
            lastPress.textContent = pressText;
            if (lastPressDiag) lastPressDiag.textContent = pressText;
        } else {
            lastPress.textContent = 'Последнее нажатие: —';
            if (lastPressDiag) lastPressDiag.textContent = 'Последнее нажатие: —';
        }
    }

    if (lastScan) {
        const lastScanAt = buzzerState.status?.lastDeviceScanAt;
        const scanText = lastScanAt
            ? `Последний скан: ${new Date(lastScanAt).toLocaleTimeString()}`
            : 'Последний скан: —';
        lastScan.textContent = scanText;
        if (lastScanDiag) lastScanDiag.textContent = scanText;
    }

    if (deviceCountLine) {
        const count = buzzerState.status?.lastDeviceCount;
        const countText = typeof count === 'number'
            ? `Устройств найдено: ${count}`
            : 'Устройств найдено: —';
        deviceCountLine.textContent = countText;
        if (deviceCountDiag) deviceCountDiag.textContent = countText;
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
            const teams = getTeamsForSelect();
            assignmentsContainer.innerHTML = buttons.map((button) => {
                const options = teams.map((team) => {
                    const selected = team.value === (button.teamId || '') ? 'selected' : '';
                    return `<option value="${team.value}" ${selected}>${team.label}</option>`;
                }).join('');
                const displayLabel = button.keyPad ? `Кликер ${button.keyPad}` : 'Кликер';
                const statusLabel = button.teamLabel ? `Назначен: ${button.teamLabel}` : 'Не назначен';
                return `
                    <div class="assignment-row">
                        <div>
                            <strong>${escapeHtml(displayLabel)}</strong>
                            <div class="muted">${escapeHtml(button.receiverId || '')}</div>
                            <div class="muted">${escapeHtml(statusLabel)}</div>
                            <div class="muted">Последняя кнопка: ${escapeHtml(button.buttonId || '—')}</div>
                        </div>
                        <select class="input" onchange="updateBuzzerAssignment('${button.receiverId}','${button.keyPad}', '${button.buttonId}', this.value)">
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
            const fpKeyPad = fp.keyPad ?? '—';
            const firstTeam = fp.teamName || fp.label || fp.teamId || 'no team';
            firstPressLine.textContent = `Первое нажатие: ${fp.receiverId} • ${fpKeyPad} • ${fp.buttonId} • ${firstTeam}`;
        } else {
            firstPressLine.textContent = 'Первое нажатие: —';
        }
    }

    if (queueContainer) {
        const queue = buzzerState.runtime?.pressedQueue || [];
        if (!queue.length) {
            queueContainer.innerHTML = '<div class="empty-state">Нажатий пока нет</div>';
        } else {
            queueContainer.innerHTML = queue.slice(-6).reverse().map((item) => {
                const teamLabel = item.teamName || item.label || item.teamId || 'Команда';
                const keyPadLabel = item.keyPad ? `Кликер ${item.keyPad}` : 'Кликер';
                return `
                <div class="list-row">
                    <div>
                        <strong>${escapeHtml(keyPadLabel)}</strong>
                        <div class="muted">${escapeHtml(teamLabel)}</div>
                        <div class="muted">Кнопка: ${escapeHtml(item.buttonId || '—')}</div>
                    </div>
                    <span class="status-pill ${item.ignored ? 'warn' : 'good'}">${item.ignored ? 'late' : 'ok'}</span>
                </div>
            `;
            }).join('');
        }
    }

    if (answeredTeamsContainer) {
        const answeredTeams = buzzerState.runtime?.answeredTeams || [];
        if (!answeredTeams.length) {
            answeredTeamsContainer.innerHTML = '<div class="empty-state">Ответов пока нет</div>';
        } else {
            answeredTeamsContainer.innerHTML = answeredTeams.map((item) => {
                const teamLabel = item.teamName || item.label || item.teamId || 'Команда';
                const keyPadLabel = item.keyPad ? `Кликер ${item.keyPad}` : 'Кликер';
                return `
                <div class="list-row">
                    <div>
                        <strong>${escapeHtml(keyPadLabel)}</strong>
                        <div class="muted">${escapeHtml(teamLabel)}</div>
                        <div class="muted">Кнопка: ${escapeHtml(item.buttonId || '—')}</div>
                    </div>
                    <span class="status-pill good">Ответ</span>
                </div>
            `;
            }).join('');
        }
    }

    updateStatusPanel();
}

function syncBuzzerButtons() {
    const devices = buzzerState.devices || [];
    const assignments = buzzerState.assignments || [];
    const items = [];

    devices.forEach((device) => {
        const receiverId = device.receiverId;
        const buttons = device.buttons || ['A1', 'A2', 'A3', 'A4'];
        buttons.forEach((buttonId) => {
            const keyPad = Number(buttonId.replace(/\D/g, '')) || null;
            const assignment = assignments.find((item) => item.receiverId === receiverId && item.keyPad === keyPad);
            const teamLabel = assignment?.teamName || assignment?.label || assignment?.teamId || '';
            items.push({
                receiverId,
                keyPad,
                buttonId,
                label: `${device.name || receiverId} • ${receiverId} • ${keyPad ?? '—'} • ${buttonId}`,
                teamLabel,
                teamId: assignment?.teamId || '',
            });
        });
    });

    buzzerState.buttons = items;
}

function renderLeaderboard(leaderboard = []) {
    if (!Array.isArray(leaderboard) || !leaderboard.length) return;
}

function renderHostQuestion(payload) {
    currentQuestionPayload = payload;

    const question = payload.question || payload;
    const questionText = document.getElementById('questionText');
    const questionInfo = document.getElementById('questionInfo');
    const questionNumber = document.getElementById('questionNumber');
    const questionType = document.getElementById('questionType');
    const gameStatus = document.getElementById('gameStatus');

    if (gameStatus) gameStatus.textContent = 'ИДЁТ ВОПРОС';

    if (questionText) {
        questionText.textContent = question.text || 'Вопрос без текста';
    }
    if (questionInfo) {
        if (payload.questionNumber && payload.totalQuestions) {
            questionInfo.textContent = `Вопрос ${payload.questionNumber} из ${payload.totalQuestions} • ${question.points || 0} pts`;
        } else {
            questionInfo.textContent = `Вопрос • ${question.points || 0} pts`;
        }
    }

    if (questionNumber) {
        if (payload.questionNumber && payload.totalQuestions) {
            questionNumber.textContent = `#${payload.questionNumber}/${payload.totalQuestions}`;
        } else if (payload.questionNumber) {
            questionNumber.textContent = `#${payload.questionNumber}`;
        } else {
            questionNumber.textContent = '—';
        }
    }
    if (questionType) {
        questionType.textContent = formatQuestionType(payload);
    }

    updateStatusPanel();
    startHostTimer(question.timeLimit || 30);
}

function revealHostAnswer(payload) {
    const gameStatus = document.getElementById('gameStatus');
    if (gameStatus) gameStatus.textContent = 'ПОКАЗАН ОТВЕТ';
    pauseHostTimer();
}

function renderHostNotes(notes) {
    const safeNotes = String(notes || '').trim();
    return safeNotes;
}

function renderHostLeaderboardScreen(payload) {
    const gameStatus = document.getElementById('gameStatus');
    if (gameStatus) gameStatus.textContent = 'РЕЙТИНГ';
    pauseHostTimer();
    renderHostPlayers(payload.leaderboard || []);
}

function markHostPaused(payload) {
    const gameStatus = document.getElementById('gameStatus');
    if (gameStatus) gameStatus.textContent = 'ПАУЗА';
    pauseHostTimer();
}

function markHostResumed(payload) {
    const gameStatus = document.getElementById('gameStatus');
    if (gameStatus) gameStatus.textContent = 'ИДЁТ ВОПРОС';
    resumeHostTimer();
}

function renderFinalResults(payload) {
    const gameStatus = document.getElementById('gameStatus');
    if (gameStatus) gameStatus.textContent = 'ИГРА ЗАВЕРШЕНА';
    pauseHostTimer();
    renderHostPlayers(payload.leaderboard || []);
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

async function loadHostTeams(pinCode) {
    if (!pinCode) return;
    try {
        const response = await SessionService.getTeams(pinCode);
        setHostTeams(response.teams || []);
    } catch (error) {
        setHostTeams([]);
    }
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
            (item) => !(item.receiverId === payload.receiverId && item.keyPad === payload.keyPad)
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
        document.getElementById('gamePanel').style.display = 'block';

        document.getElementById('pinDisplay').textContent = currentSession.pinCode;
        document.getElementById('joinUrl').textContent = response.joinUrl;
        document.getElementById('qrContainer').innerHTML = `<img src="${response.qrCode}" alt="QR">`;

        renderHostPlayers(currentSession.players || []);
        updatePlayerPreview(currentSession.pinCode);
        await loadHostTeams(currentSession.pinCode);
        syncBuzzerButtons();
        renderBuzzerPanel();
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
        updateStatusPanel();
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
        await BuzzerService.testPress('A1', 1);
    } catch (error) {
        hostShowError(error.message || 'Ошибка тестового нажатия');
    }
}

async function updateBuzzerAssignment(receiverId, keyPad, buttonId, teamId) {
    try {
        await BuzzerService.upsertAssignment({
            receiverId,
            keyPad,
            buttonId,
            teamId: teamId || null,
            label: `${receiverId}:${keyPad ?? '—'}:${buttonId}`,
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
window.repeatQuestion = startGame;
