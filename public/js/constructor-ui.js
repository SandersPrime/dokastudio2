// Constructor-UI.js — UI-компоненты конструктора

// Рендер селектора типов вопросов
function renderQuestionTypeSelector() {
    const container = document.getElementById('questionTypeSelector');
    if (!container) return;
    
    const types = QuestionTypeFactory.getAllTypes();
    
    container.innerHTML = types.map(t => `
        <div class="type-btn" data-type="${t.type}" onclick="setQuestionType('${t.type}')">
            ${t.icon} ${t.name}
        </div>
    `).join('');
}

// Рендер секции загрузки медиа
function renderMediaUploadSection() {
    const container = document.getElementById('mediaUploadSection');
    if (!container) return;
    
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
    if (!container) return;
    
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
    if (!container) return;
    
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

// Загрузка расширенных настроек в форму (поля уже есть в HTML)
function loadAdvancedSettings(question) {
    const fields = ['pointsAtStart', 'pointsAtEnd', 'penaltyPoints', 'penaltyNoAnswer', 
                    'speedBonus1', 'speedBonus2', 'speedBonus3', 'countdownMode', 'textReveal',
                    'demographicGroup', 'slideRouting', 'questionNotes'];
    
    fields.forEach(field => {
        const el = document.getElementById(field);
        if (el) {
            if (field === 'countdownMode') el.value = question.countdownMode ?? 'auto';
            else if (field === 'textReveal') el.value = question.textReveal ?? 'none';
            else if (field === 'demographicGroup') el.value = question.demographicGroup || '';
            else if (field === 'slideRouting') el.value = question.slideRouting || '';
            else if (field === 'questionNotes') el.value = question.notes || '';
            else if (field.startsWith('speedBonus')) {
                const num = field.replace('speedBonus', '');
                el.value = question[`speedBonus${num}`] ?? 0;
            } else {
                el.value = question[field] ?? (field.includes('Points') ? 100 : 0);
            }
        }
    });
    
    // Чекбоксы
    const checkboxes = ['autoJudge', 'lockoutOnWrong', 'showCorrectAnswer', 'jokersEnabled'];
    checkboxes.forEach(cb => {
        const el = document.getElementById(cb);
        if (el) el.checked = question[cb] ?? true;
    });
}

// Сохранение расширенных настроек из формы в объект вопроса
function saveAdvancedSettings(question) {
    // Числовые поля
    question.pointsAtStart = parseInt(document.getElementById('pointsAtStart')?.value) || 100;
    question.pointsAtEnd = parseInt(document.getElementById('pointsAtEnd')?.value) || 100;
    question.penaltyPoints = parseInt(document.getElementById('penaltyPoints')?.value) || 0;
    question.penaltyNoAnswer = parseInt(document.getElementById('penaltyNoAnswer')?.value) || 0;
    question.speedBonus1 = parseInt(document.getElementById('speedBonus1')?.value) || 0;
    question.speedBonus2 = parseInt(document.getElementById('speedBonus2')?.value) || 0;
    question.speedBonus3 = parseInt(document.getElementById('speedBonus3')?.value) || 0;
    
    // Чекбоксы
    question.autoJudge = document.getElementById('autoJudge')?.checked ?? true;
    question.lockoutOnWrong = document.getElementById('lockoutOnWrong')?.checked ?? true;
    question.showCorrectAnswer = document.getElementById('showCorrectAnswer')?.checked ?? true;
    question.jokersEnabled = document.getElementById('jokersEnabled')?.checked ?? true;
    
    // Селекты
    question.countdownMode = document.getElementById('countdownMode')?.value || 'auto';
    question.textReveal = document.getElementById('textReveal')?.value || 'none';
    
    // Текстовые поля
    question.demographicGroup = document.getElementById('demographicGroup')?.value || null;
    question.slideRouting = document.getElementById('slideRouting')?.value || null;
    question.notes = document.getElementById('questionNotes')?.value || null;
    
    return question;
}

// Инициализация UI-компонентов
function initConstructorUI() {
    renderMediaUploadSection();
    renderAnswersSection();
    renderTrueFalseSection();
}

// Вызываем при загрузке
document.addEventListener('DOMContentLoaded', initConstructorUI);

// Экспорт функций в глобальную область
window.renderQuestionTypeSelector = renderQuestionTypeSelector;
window.loadAdvancedSettings = loadAdvancedSettings;
window.saveAdvancedSettings = saveAdvancedSettings;
window.renderMediaUploadSection = renderMediaUploadSection;
window.renderAnswersSection = renderAnswersSection;
window.renderTrueFalseSection = renderTrueFalseSection;