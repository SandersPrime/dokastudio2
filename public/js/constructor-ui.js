// public/js/constructor-ui.js

function renderQuestionTypeSelector() {
    const container = document.getElementById('questionTypeSelector');
    if (!container || typeof QuestionTypeFactory === 'undefined') return;

    const types = QuestionTypeFactory.getAllTypes();

    container.innerHTML = types.map((type) => `
        <div class="type-btn" data-type="${type.type}" onclick="setQuestionType('${type.type}')">
            ${type.icon} ${type.name}
        </div>
    `).join('');
}

function renderMediaUploadSection() {
    const container = document.getElementById('mediaUploadSection');
    if (!container) return;

    container.innerHTML = `
        <div class="media-upload-area" id="mediaUploadArea" onclick="document.getElementById('mediaFile').click()">
            <p id="uploadPlaceholder">📁 Нажмите или перетащите файл</p>
            <input
                type="file"
                id="mediaFile"
                accept="image/*,audio/*,video/*"
                style="display:none"
                onchange="uploadMedia(event)"
            >
        </div>
        <div class="media-preview" id="mediaPreview"></div>
    `;
}

function renderAnswersSection() {
    const container = document.getElementById('answersSection');
    if (!container) return;

    container.innerHTML = `
        <div class="d-flex justify-between items-center mb-2">
            <label class="form-label">Варианты ответов</label>
            <button type="button" class="btn btn-outline btn-sm" onclick="addAnswer()">➕ Добавить</button>
        </div>
        <div class="answers-editor" id="answersEditor"></div>
    `;
}

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

function renderAdvancedSettingsPanel() {
    // В текущем HTML расширенные настройки уже встроены в страницу.
    // Функция оставлена специально, чтобы не ломать существующий вызов из constructor.html
    return true;
}

function loadAdvancedSettings(question) {
    const setValue = (id, value, fallback = '') => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = value ?? fallback;
    };

    const setChecked = (id, value, fallback = true) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.checked = value ?? fallback;
    };

    setValue('pointsAtStart', question.pointsAtStart, 100);
    setValue('pointsAtEnd', question.pointsAtEnd, 100);
    setValue('penaltyPoints', question.penaltyPoints, 0);
    setValue('penaltyNoAnswer', question.penaltyNoAnswer, 0);
    setValue('speedBonus1', question.speedBonus1, 0);
    setValue('speedBonus2', question.speedBonus2, 0);
    setValue('speedBonus3', question.speedBonus3, 0);
    setValue('countdownMode', question.countdownMode, 'auto');
    setValue('textReveal', question.textReveal, 'none');
    setValue('demographicGroup', question.demographicGroup, '');
    setValue('slideRouting', question.slideRouting, '');
    setValue('questionNotes', question.notes, '');

    setChecked('autoJudge', question.autoJudge, true);
    setChecked('lockoutOnWrong', question.lockoutOnWrong, true);
    setChecked('showCorrectAnswer', question.showCorrectAnswer, true);
    setChecked('jokersEnabled', question.jokersEnabled, true);
}

function saveAdvancedSettings(question) {
    question.pointsAtStart = parseInt(document.getElementById('pointsAtStart')?.value, 10) || 100;
    question.pointsAtEnd = parseInt(document.getElementById('pointsAtEnd')?.value, 10) || 100;
    question.penaltyPoints = parseInt(document.getElementById('penaltyPoints')?.value, 10) || 0;
    question.penaltyNoAnswer = parseInt(document.getElementById('penaltyNoAnswer')?.value, 10) || 0;
    question.speedBonus1 = parseInt(document.getElementById('speedBonus1')?.value, 10) || 0;
    question.speedBonus2 = parseInt(document.getElementById('speedBonus2')?.value, 10) || 0;
    question.speedBonus3 = parseInt(document.getElementById('speedBonus3')?.value, 10) || 0;

    question.autoJudge = document.getElementById('autoJudge')?.checked ?? true;
    question.lockoutOnWrong = document.getElementById('lockoutOnWrong')?.checked ?? true;
    question.showCorrectAnswer = document.getElementById('showCorrectAnswer')?.checked ?? true;
    question.jokersEnabled = document.getElementById('jokersEnabled')?.checked ?? true;

    question.countdownMode = document.getElementById('countdownMode')?.value || 'auto';
    question.textReveal = document.getElementById('textReveal')?.value || 'none';
    question.demographicGroup = document.getElementById('demographicGroup')?.value || null;
    question.slideRouting = document.getElementById('slideRouting')?.value || null;
    question.notes = document.getElementById('questionNotes')?.value || null;

    return question;
}

function initConstructorUI() {
    renderQuestionTypeSelector();
    renderMediaUploadSection();
    renderAnswersSection();
    renderTrueFalseSection();
    renderAdvancedSettingsPanel();
}

document.addEventListener('DOMContentLoaded', initConstructorUI);

window.renderQuestionTypeSelector = renderQuestionTypeSelector;
window.renderMediaUploadSection = renderMediaUploadSection;
window.renderAnswersSection = renderAnswersSection;
window.renderTrueFalseSection = renderTrueFalseSection;
window.renderAdvancedSettingsPanel = renderAdvancedSettingsPanel;
window.loadAdvancedSettings = loadAdvancedSettings;
window.saveAdvancedSettings = saveAdvancedSettings;