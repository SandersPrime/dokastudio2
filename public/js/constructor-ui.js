// Constructor-UI.js — UI-компоненты конструктора

// Рендер селектора типов вопросов
function renderQuestionTypeSelector() {
    const container = document.getElementById('questionTypeSelector');
    const types = QuestionTypeFactory.getAllTypes();
    
    container.innerHTML = types.map(t => `
        <div class="type-btn" data-type="${t.type}" onclick="setQuestionType('${t.type}')">
            ${t.icon} ${t.name}
        </div>
    `).join('');
}

// Рендер панели расширенных настроек
function renderAdvancedSettingsPanel() {
    const container = document.getElementById('advancedSettingsContainer');
    
    container.innerHTML = `
        <div id="advancedSettingsPanel" style="display: none;" class="card-pill mt-3">
            <h4 style="margin-bottom: 16px;">⚙️ Расширенные настройки вопроса</h4>
            
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">🎯 Очки в начале</label>
                    <input type="number" class="input" id="pointsAtStart" value="100" min="0">
                    <small class="text-muted">Очки при мгновенном ответе</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">⏱️ Очки в конце</label>
                    <input type="number" class="input" id="pointsAtEnd" value="100" min="0">
                    <small class="text-muted">Очки в последнюю секунду</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">❌ Штраф за ошибку</label>
                    <input type="number" class="input" id="penaltyPoints" value="0" min="0">
                </div>
                
                <div class="form-group">
                    <label class="form-label">⏸️ Штраф за пропуск</label>
                    <input type="number" class="input" id="penaltyNoAnswer" value="0" min="0">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">🏆 Бонусы за скорость</label>
                <div class="d-flex gap-2">
                    <input type="number" class="input" id="speedBonus1" placeholder="🥇 1 место" value="0" min="0">
                    <input type="number" class="input" id="speedBonus2" placeholder="🥈 2 место" value="0" min="0">
                    <input type="number" class="input" id="speedBonus3" placeholder="🥉 3 место" value="0" min="0">
                </div>
            </div>
            
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-checkbox">
                        <input type="checkbox" id="autoJudge" checked> 🤖 Автоматическое судейство
                    </label>
                </div>
                
                <div class="form-group">
                    <label class="form-checkbox">
                        <input type="checkbox" id="lockoutOnWrong" checked> 🔒 Блокировать после ошибки
                    </label>
                </div>
                
                <div class="form-group">
                    <label class="form-checkbox">
                        <input type="checkbox" id="showCorrectAnswer" checked> ✅ Показывать правильный ответ
                    </label>
                </div>
                
                <div class="form-group">
                    <label class="form-checkbox">
                        <input type="checkbox" id="jokersEnabled" checked> 🃏 Джокеры разрешены
                    </label>
                </div>
            </div>
            
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">⏲️ Режим таймера</label>
                    <select class="input" id="countdownMode">
                        <option value="auto">Автоматический</option>
                        <option value="manual">Ручной</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">✨ Анимация текста</label>
                    <select class="input" id="textReveal">
                        <option value="none">Без анимации</option>
                        <option value="letter">По буквам</option>
                        <option value="word">По словам</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">👥 Демографическая группа</label>
                <input type="text" class="input" id="demographicGroup" placeholder="Например: Мужчины">
            </div>
            
            <div class="form-group">
                <label class="form-label">🔀 Ветвление (Slide Routing)</label>
                <input type="text" class="input" id="slideRouting" placeholder="ID следующего слайда">
            </div>
            
            <div class="form-group">
                <label class="form-label">📝 Заметки для ведущего</label>
                <textarea class="input" id="questionNotes" rows="2" placeholder="Подсказки, факты..."></textarea>
            </div>
        </div>
    `;
}

// Рендер секции загрузки медиа
function renderMediaUploadSection() {
    const container = document.getElementById('mediaUploadSection');
    container.innerHTML = `
        <div class="media-upload-area" id="mediaUploadArea" onclick="document.getElementById('mediaFile').click()">
            <p id="uploadPlaceholder">📁 Нажмите или перетащите файл</p>
            <input type="file" id="mediaFile" accept="image/*,audio/*,video/*" style="display: none;" onchange="uploadMedia(event)">
        </div>
        <div class="media-preview" id="mediaPreview"></div>
    `;
}

// Рендер секции ответов
function renderAnswersSection() {
    const container = document.getElementById('answersSection');
    container.innerHTML = `
        <div class="d-flex justify-between items-center mb-2">
            <label class="form-label">Варианты ответов</label>
            <button class="btn btn-outline btn-sm" onclick="addAnswer()">➕ Добавить</button>
        </div>
        <div class="answers-editor" id="answersEditor"></div>
    `;
}

// Рендер секции Правда/Ложь
function renderTrueFalseSection() {
    const container = document.getElementById('trueFalseSection');
    container.innerHTML = `
        <div class="form-group">
            <label class="form-label">Правильный ответ</label>
            <select class="input" id="trueFalseSelect">
                <option value="true">✅ Правда</option>
                <option value="false">❌ Ложь</option>
            </select>
        </div>
    `;
}

// Инициализация UI-компонентов
function initConstructorUI() {
    renderAdvancedSettingsPanel();
    renderMediaUploadSection();
    renderAnswersSection();
    renderTrueFalseSection();
}

// Вызываем при загрузке
document.addEventListener('DOMContentLoaded', initConstructorUI);

// Экспорт функций
window.renderQuestionTypeSelector = renderQuestionTypeSelector;
window.toggleAdvancedSettings = () => {
    const panel = document.getElementById('advancedSettingsPanel');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
};