// Modals.js - модальные окна конструктора
const Modals = {
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="preview-modal" id="createQuizModal">
                <div class="preview-content">
                    <h2>Создание нового квиза</h2>
                    <div class="form-group">
                        <label class="form-label">Название</label>
                        <input type="text" class="input" id="newQuizTitle" placeholder="Например: Киновикторина">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Краткое описание</label>
                        <textarea class="input" id="newQuizDesc" rows="3" placeholder="О чём этот квиз?"></textarea>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-primary" onclick="createQuiz()">Создать</button>
                        <button class="btn btn-outline" onclick="closeModal('createQuizModal')">Отмена</button>
                    </div>
                </div>
            </div>

            <div class="preview-modal" id="quizzesListModal">
                <div class="preview-content" style="max-width: 760px;">
                    <h2>Мои квизы</h2>
                    <div id="myQuizzesList" style="max-height: 400px; overflow-y: auto;"></div>
                    <button class="btn btn-outline w-full mt-3" onclick="closeModal('quizzesListModal')">Закрыть</button>
                </div>
            </div>

            <div class="preview-modal" id="templateLibraryModal">
                <div class="preview-content template-library-modal">
                    <div class="template-library-head">
                        <div>
                            <div class="page-kicker">Библиотека шаблонов</div>
                            <h2>Выберите основу игры</h2>
                        </div>
                        <button class="btn btn-outline btn-sm" onclick="closeModal('templateLibraryModal')">Закрыть</button>
                    </div>
                    <div class="template-library-grid">
                        <article class="template-library-card">
                            <span class="template-tag">Квиз</span>
                            <h3>Классическая викторина</h3>
                            <p>Вопросы, варианты ответов, очки, таймер и финальный рейтинг.</p>
                            <button class="btn btn-primary btn-sm" onclick="startQuizFromTemplate('Классическая викторина')">Использовать</button>
                        </article>
                        <article class="template-library-card">
                            <span class="template-tag">Команды</span>
                            <h3>Командный баттл</h3>
                            <p>Несколько раундов для командной игры с быстрыми ответами.</p>
                            <button class="btn btn-primary btn-sm" onclick="startQuizFromTemplate('Командный баттл')">Использовать</button>
                        </article>
                        <article class="template-library-card">
                            <span class="template-tag">Обучение</span>
                            <h3>Проверка знаний</h3>
                            <p>Сценарий для урока, тренинга, вебинара или корпоративной сессии.</p>
                            <button class="btn btn-primary btn-sm" onclick="startQuizFromTemplate('Проверка знаний')">Использовать</button>
                        </article>
                    </div>
                </div>
            </div>

            <div class="preview-modal" id="dokaLabRequestModal">
                <div class="preview-content">
                    <h2>Заявка в DokaLab</h2>
                    <p class="text-secondary">Опишите задачу, и команда DokaLab подготовит игру под ваш формат, аудиторию и цели.</p>
                    <div class="form-group">
                        <label class="form-label">Формат мероприятия</label>
                        <input type="text" class="input" id="dokaLabFormat" placeholder="Например: корпоратив, урок, вечеринка">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Аудитория и цель</label>
                        <textarea class="input" id="dokaLabBrief" rows="4" placeholder="Кто будет играть, какая тема, сколько длится игра?"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Контакт</label>
                        <input type="text" class="input" id="dokaLabContact" placeholder="Email или Telegram">
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-primary" onclick="submitDokaLabRequest()">Отправить заявку</button>
                        <button class="btn btn-outline" onclick="closeModal('dokaLabRequestModal')">Отмена</button>
                    </div>
                </div>
            </div>

            <div class="preview-modal" id="editQuizModal">
                <div class="preview-content" style="max-width: 680px;">
                    <h2>Настройки квиза</h2>
                    <input type="hidden" id="editQuizId">
                    <div class="form-group">
                        <label class="form-label">Название</label>
                        <input type="text" class="input" id="editQuizTitle" maxlength="160" placeholder="Название квиза">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Описание</label>
                        <textarea class="input" id="editQuizDescription" rows="4" maxlength="2000" placeholder="Кратко опишите сценарий и аудиторию"></textarea>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Категория</label>
                            <input type="text" class="input" id="editQuizCategory" maxlength="80" placeholder="Например: школа">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Обложка</label>
                            <div class="media-upload-control">
                                <button type="button" class="btn btn-outline" onclick="triggerQuizThumbnailUpload('edit')">Добавить</button>
                                <span class="media-upload-status" id="editQuizThumbnailStatus">Файл не выбран</span>
                            </div>
                            <input type="hidden" id="editQuizThumbnailUrl">
                            <input type="file" id="editQuizThumbnailFile" accept="image/*" style="display:none" onchange="uploadQuizThumbnail(event, 'edit')">
                        </div>
                    </div>
                    <div id="editQuizError" class="status-toast error"></div>
                    <div class="d-flex gap-2 mt-3">
                        <button class="btn btn-primary" onclick="saveQuizMeta()">Сохранить</button>
                        <button class="btn btn-outline" onclick="closeModal('editQuizModal')">Отмена</button>
                    </div>
                </div>
            </div>

            <div class="preview-modal" id="previewModal">
                <div class="preview-content" style="max-width: 700px;">
                    <h2>Предпросмотр квиза</h2>
                    <div id="previewContent" style="max-height: 500px; overflow-y: auto;"></div>
                    <button class="btn btn-outline w-full mt-3" onclick="closeModal('previewModal')">Закрыть</button>
                </div>
            </div>

            <div class="preview-modal" id="aiGeneratorModal">
                <div class="preview-content">
                    <h2>ИИ-генератор квиза</h2>
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
                        <button class="btn btn-primary" onclick="generateQuizAI()">Сгенерировать</button>
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
