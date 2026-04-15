// Modals.js — Все модальные окна конструктора
const Modals = {
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <!-- Модалка создания квиза -->
            <div class="preview-modal" id="createQuizModal">
                <div class="preview-content">
                    <h2>📋 Создание нового квиза</h2>
                    <div class="form-group">
                        <label class="form-label">Название</label>
                        <input type="text" class="input" id="newQuizTitle" placeholder="Например: Киновикторина">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Описание</label>
                        <textarea class="input" id="newQuizDesc" rows="3" placeholder="О чём этот квиз?"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Режим игры</label>
                        <select class="input" id="gameMode">
                            <option value="standard">Стандартный</option>
                            <option value="lastmanstanding">Last Man Standing</option>
                            <option value="speedround">Speed Round</option>
                        </select>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-primary" onclick="createQuiz()">Создать</button>
                        <button class="btn btn-outline" onclick="closeModal('createQuizModal')">Отмена</button>
                    </div>
                </div>
            </div>

            <!-- Модалка списка квизов -->
            <div class="preview-modal" id="quizzesListModal">
                <div class="preview-content" style="max-width: 600px;">
                    <h2>📂 Мои квизы</h2>
                    <div id="myQuizzesList" style="max-height: 400px; overflow-y: auto;"></div>
                    <button class="btn btn-outline w-full mt-3" onclick="closeModal('quizzesListModal')">Закрыть</button>
                </div>
            </div>

            <!-- Модалка предпросмотра -->
            <div class="preview-modal" id="previewModal">
                <div class="preview-content" style="max-width: 700px;">
                    <h2>👁️ Предпросмотр квиза</h2>
                    <div id="previewContent" style="max-height: 500px; overflow-y: auto;"></div>
                    <button class="btn btn-outline w-full mt-3" onclick="closeModal('previewModal')">Закрыть</button>
                </div>
            </div>

            <!-- Модалка ИИ-генератора -->
            <div class="preview-modal" id="aiGeneratorModal">
                <div class="preview-content">
                    <h2>🤖 ИИ-генератор квиза</h2>
                    <div class="form-group">
                        <label class="form-label">Тема квиза</label>
                        <input type="text" class="input" id="aiTopic" placeholder="Например: История России">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Количество вопросов</label>
                        <input type="number" class="input" id="aiQuestionCount" value="10" min="1" max="50">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Сложность</label>
                        <select class="input" id="aiDifficulty">
                            <option value="easy">Лёгкая</option>
                            <option value="medium" selected>Средняя</option>
                            <option value="hard">Сложная</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Язык</label>
                        <select class="input" id="aiLanguage">
                            <option value="ru">Русский</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-primary" onclick="generateQuizAI()">🤖 Сгенерировать</button>
                        <button class="btn btn-outline" onclick="closeModal('aiGeneratorModal')">Отмена</button>
                    </div>
                    <div id="aiProgress" style="display: none; margin-top: 16px;">
                        <div class="timer-bar">
                            <div class="timer-progress" style="width: 100%; animation: pulse 1.5s infinite;"></div>
                        </div>
                        <p class="text-center mt-2">Генерация вопросов...</p>
                    </div>
                </div>
            </div>
        `;
    }
};

window.Modals = Modals;