// public/js/play-live.js

let playerSocket = null;
let currentPin = '';
let currentPlayer = null;
let currentQuestion = null;
let currentScore = 0;
let answerSubmitted = false;
let questionStartAt = 0;
let playTimerInterval = null;
let playTimerRemaining = 0;
let playTimerTotal = 0;
let playTimerPaused = false;
let isQuestionPaused = false;
let currentScreenId = 'joinScreen';
let screenBeforePause = 'waitingScreen';

function syncLivePlayerState() {
    if (!window.LivePlayerState) return;
    LivePlayerState.setSocket(playerSocket);
    LivePlayerState.setPinCode(currentPin);
    LivePlayerState.setPlayer(currentPlayer);
    LivePlayerState.setScore(currentScore);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function playShowScreen(screenId) {
    document.querySelectorAll('[data-screen]').forEach((node) => {
        node.style.display = 'none';
    });

    const target = document.getElementById(screenId);
    if (target) {
        target.style.display = 'block';
        currentScreenId = screenId;
    }
}

function playShowStatus(message, isError = false) {
    const node = document.getElementById('joinStatus');
    if (!node) return;

    node.textContent = message;
    node.className = `status-toast ${isError ? 'error' : 'success'}`;
    node.style.display = 'block';

    setTimeout(() => {
        node.style.display = 'none';
    }, 3000);
}

function updatePlayerScore(score) {
    currentScore = score;
    syncLivePlayerState();
    const scoreNode = document.getElementById('scoreDisplay');
    scoreNode.textContent = `${score} pts`;
    scoreNode.style.display = 'inline-flex';
}

function connectPlayerSocket(pinCode, nickname) {
    if (playerSocket) {
        playerSocket.disconnect();
    }

    playerSocket = io();
    syncLivePlayerState();

    playerSocket.on('connect', () => {
        playerSocket.emit('player:join', {
            pinCode,
            nickname,
        });
    });

    playerSocket.on('player:joined', (payload) => {
        currentPlayer = {
            id: payload.playerId,
            nickname: payload.nickname,
        };
        syncLivePlayerState();

        document.getElementById('playerNameDisplay').textContent = payload.nickname;
        playShowScreen('waitingScreen');
    });

    playerSocket.on('lobby:update', (payload) => {
        document.getElementById('playersCount').textContent = `Игроков в лобби: ${payload.playerCount || 0}`;
    });

    playerSocket.on('game:question', (payload) => {
        renderPlayerQuestion(payload);
    });

    playerSocket.on('player:answer-result', (payload) => {
        renderImmediateAnswerResult(payload);
    });

    playerSocket.on('game:answer-reveal', (payload) => {
        renderAnswerReveal(payload);
    });

    playerSocket.on('game:paused', (payload) => {
        renderGamePaused(payload);
    });

    playerSocket.on('game:resumed', (payload) => {
        renderGameResumed(payload);
    });

    playerSocket.on('game:leaderboard', (payload) => {
        renderPlayerLeaderboard(payload);
    });

    playerSocket.on('game:leaderboard-update', (payload) => {
        updatePlayerLeaderboard(payload);
    });

    playerSocket.on('game:finished', (payload) => {
        renderPlayerFinal(payload);
    });

    playerSocket.on('error', (payload) => {
        playShowStatus(payload.message || 'Ошибка игры', true);
    });
}

async function joinGame() {
    try {
        const pin = document.getElementById('pinInput').value.trim();
        const nickname = document.getElementById('nicknameInput').value.trim();

        if (!/^\d{6}$/.test(pin)) {
            throw new Error('Введите 6-значный код');
        }

        if (!nickname) {
            throw new Error('Введите имя');
        }

        await SessionService.getByPin(pin);

        currentPin = pin;
        syncLivePlayerState();
        connectPlayerSocket(pin, nickname);
    } catch (error) {
        playShowStatus(error.message || 'Ошибка подключения', true);
    }
}

function renderPlayerQuestion(payload) {
    currentQuestion = payload.question;
    answerSubmitted = false;
    isQuestionPaused = false;
    questionStartAt = Date.now();

    document.getElementById('questionText').textContent = currentQuestion.text;
    updatePlayerScore(currentScore);

    const mediaNode = document.getElementById('questionMedia');
    mediaNode.innerHTML = '';

    if (currentQuestion.imageUrl) {
        mediaNode.innerHTML = `<img src="${currentQuestion.imageUrl}" alt="" class="question-media">`;
    } else if (currentQuestion.audioUrl) {
        mediaNode.innerHTML = `<audio controls src="${currentQuestion.audioUrl}" class="question-media"></audio>`;
    } else if (currentQuestion.videoUrl) {
        mediaNode.innerHTML = `<video controls src="${currentQuestion.videoUrl}" class="question-media"></video>`;
    }

    const answersGrid = document.getElementById('answersGrid');
    answersGrid.innerHTML = (currentQuestion.answers || []).map((answer, index) => `
        <button
            id="answer-${answer.id}"
            class="answer-btn-player"
            onclick="submitAnswer('${answer.id}')"
        >
            <span class="answer-letter">${String.fromCharCode(65 + index)}</span>
            ${escapeHtml(answer.text)}
        </button>
    `).join('');

    document.getElementById('answerStatus').style.display = 'none';
    startPlayTimer(currentQuestion.timeLimit || 30);
    playShowScreen('questionScreen');
}

function startPlayTimer(seconds) {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerProgress = document.getElementById('timerProgress');

    clearInterval(playTimerInterval);

    playTimerTotal = Math.max(1, Number(seconds) || 30);
    playTimerRemaining = playTimerTotal;
    playTimerPaused = false;

    timerDisplay.textContent = String(playTimerRemaining);
    timerProgress.style.width = '100%';

    runPlayTimer();
}

function runPlayTimer() {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerProgress = document.getElementById('timerProgress');

    clearInterval(playTimerInterval);

    playTimerInterval = setInterval(() => {
        playTimerRemaining -= 1;
        timerDisplay.textContent = String(Math.max(0, playTimerRemaining));
        timerProgress.style.width = `${Math.max(0, (playTimerRemaining / playTimerTotal) * 100)}%`;

        if (playTimerRemaining <= 0) {
            clearInterval(playTimerInterval);

            if (!answerSubmitted && !isQuestionPaused) {
                submitAnswer(null);
            }
        }
    }, 1000);
}

function pausePlayTimer() {
    playTimerPaused = true;
    clearInterval(playTimerInterval);
}

function resumePlayTimer() {
    if (!playTimerPaused || playTimerRemaining <= 0 || answerSubmitted) return;
    playTimerPaused = false;
    runPlayTimer();
}

function submitAnswer(answerId) {
    if (!playerSocket || !currentPlayer || !currentQuestion || answerSubmitted || isQuestionPaused) {
        return;
    }

    answerSubmitted = true;
    clearInterval(playTimerInterval);

    document.querySelectorAll('.answer-btn-player').forEach((button) => {
        button.disabled = true;
        if (answerId && button.id === `answer-${answerId}`) {
            button.classList.add('selected');
        }
    });

    const responseTimeMs = Date.now() - questionStartAt;

    playerSocket.emit('player:submit-answer', {
        pinCode: currentPin,
        playerId: currentPlayer.id,
        questionId: currentQuestion.id,
        answerId: answerId || null,
        responseTimeMs,
    });

    const statusNode = document.getElementById('answerStatus');
    statusNode.textContent = 'Ответ отправлен';
    statusNode.className = 'status-toast success';
    statusNode.style.display = 'block';
}

function renderImmediateAnswerResult(payload) {
    updatePlayerScore(payload.score);

    document.getElementById('resultIcon').textContent = payload.isCorrect ? '✅' : '❌';
    document.getElementById('resultTitle').textContent = payload.isCorrect ? 'Верно!' : 'Ответ принят';
    document.getElementById('resultScore').textContent = `+${payload.pointsAwarded}`;
    document.getElementById('resultMessage').textContent = payload.isCorrect
        ? 'Вы получили очки за правильный ответ'
        : 'Ожидаем показ правильного ответа';

    playShowScreen('resultScreen');
}

function renderAnswerReveal(payload) {
    if (!currentQuestion) return;

    const correctTexts = (payload.correctAnswers || []).map((answer) => answer.text).join(', ');
    const isMyAnswerCorrect = false;

    const resultMessage = document.getElementById('resultMessage');
    resultMessage.textContent = correctTexts
        ? `Правильный ответ: ${correctTexts}`
        : 'Правильный ответ показан';

    if (document.getElementById('resultScreen').style.display !== 'block') {
        document.getElementById('resultIcon').textContent = '📢';
        document.getElementById('resultTitle').textContent = 'Ответ показан';
        document.getElementById('resultScore').textContent = '+0';
        playShowScreen('resultScreen');
    }

    resultMessage.className = `result-message ${isMyAnswerCorrect ? 'correct' : 'wrong'}`;
}

function renderGamePaused() {
    isQuestionPaused = true;
    pausePlayTimer();

    document.querySelectorAll('.answer-btn-player').forEach((button) => {
        button.disabled = true;
    });

    if (currentScreenId !== 'pausedScreen') {
        screenBeforePause = currentScreenId;
    }

    playShowScreen('pausedScreen');
}

function renderGameResumed() {
    isQuestionPaused = false;

    if (currentQuestion && !answerSubmitted) {
        document.querySelectorAll('.answer-btn-player').forEach((button) => {
            button.disabled = false;
        });
        playShowScreen('questionScreen');
        resumePlayTimer();
        return;
    }

    playShowScreen(screenBeforePause || 'waitingScreen');
}

function renderPlayerLeaderboard(payload) {
    clearInterval(playTimerInterval);
    isQuestionPaused = false;
    updatePlayerLeaderboard(payload);
    playShowScreen('leaderboardScreen');
}

function updatePlayerLeaderboard(payload) {
    const leaderboard = payload.leaderboard || [];
    const boardNode = document.getElementById('playerLeaderboard');

    if (boardNode && !leaderboard.length) {
        boardNode.innerHTML = '<div class="text-secondary">Пока нет результатов</div>';
    } else if (boardNode) {
        boardNode.innerHTML = leaderboard.map((player, index) => `
            <div class="leaderboard-row-player">
                <span>#${index + 1} ${escapeHtml(player.nickname)}</span>
                <strong>${player.score} pts</strong>
            </div>
        `).join('');
    }

    const myEntry = leaderboard.find((player) => player.id === currentPlayer?.id);
    if (myEntry) {
        updatePlayerScore(myEntry.score);
    }
}

function renderPlayerFinal(payload) {
    const leaderboard = payload.leaderboard || [];
    const myIndex = leaderboard.findIndex((player) => player.id === currentPlayer?.id || player.nickname === currentPlayer?.nickname);
    const myPlace = myIndex >= 0 ? myIndex + 1 : '-';
    const myEntry = myIndex >= 0 ? leaderboard[myIndex] : null;

    document.getElementById('finalPlace').textContent = `Место: ${myPlace}`;
    document.getElementById('finalScore').textContent = `${myEntry?.score ?? currentScore} pts`;
    document.getElementById('finalMessage').textContent = payload.quiz?.title
        ? `Спасибо за игру: ${payload.quiz.title}`
        : 'Игра завершена';

    playShowScreen('finalScreen');
}

document.addEventListener('DOMContentLoaded', () => {
    const pathParts = window.location.pathname.split('/');
    const pinFromUrl = pathParts[pathParts.length - 1];

    if (/^\d{6}$/.test(pinFromUrl)) {
        document.getElementById('pinInput').value = pinFromUrl;
    }

    playShowScreen('joinScreen');
});

window.joinGame = joinGame;
window.submitAnswer = submitAnswer;
