// public/js/constructor-ui.js

function renderQuestionTypeSelector() {
    const container = document.getElementById('questionTypeSelector');
    const select = document.getElementById('questionTypeSelect');
    if (!container) return;

    const types = window.STUDIO_QUESTION_TYPES || [
        { type: 'EVERYONE_ANSWERS', name: 'Everyone Answers', icon: 'A' },
        { type: 'FASTEST_FINGER', name: 'Fastest Finger', icon: 'F' },
        { type: 'MULTIPLE_CORRECT', name: 'Multiple Correct', icon: 'M' },
        { type: 'ORDERED', name: 'Ordered', icon: 'O' },
        { type: 'TRUE_FALSE', name: 'True / False', icon: 'T' },
        { type: 'TEXT', name: 'Text', icon: 'Tx' },
        { type: 'IMAGE', name: 'Image', icon: 'Img' },
        { type: 'AUDIO', name: 'Audio', icon: 'Aud' },
        { type: 'VIDEO', name: 'Video', icon: 'Vid' },
        { type: 'DECREASING_POINTS', name: 'Decreasing Points', icon: 'D' },
        { type: 'WAGER', name: 'Wager', icon: 'W' },
        { type: 'MAJORITY_RULES', name: 'Majority Rules', icon: 'MR' },
        { type: 'LAST_MAN_STANDING', name: 'Last Man Standing', icon: 'LMS' },
        { type: 'JEOPARDY_ROUND', name: 'Jeopardy Round', icon: 'J' },
        { type: 'MILLIONAIRE_ROUND', name: 'Millionaire Round', icon: '$' },
    ];

    container.innerHTML = types.map((type) => `
        <div class="type-btn" data-type="${type.type}" onclick="setQuestionType('${type.type}')">
            ${type.icon} ${type.name}
        </div>
    `).join('');

    if (select) {
        select.innerHTML = types.map((type) => `
            <option value="${type.type}">${type.name}</option>
        `).join('');
    }
}

function renderMediaUploadSection() {
    const container = document.getElementById('mediaUploadSection');
    if (!container) return;

    container.innerHTML = `
        <div class="media-upload-area" id="mediaUploadArea" onclick="document.getElementById('mediaFile').click()">
            <p id="uploadPlaceholder">Нажмите, чтобы прикрепить image / audio / video</p>
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
            <button type="button" class="btn btn-outline btn-sm" onclick="addAnswer()">Добавить</button>
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
            <select class="input" id="trueFalseSelect" onchange="syncPreviewFromProperties()">
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
    setValue('questionSubtitle', question.subtitle, '');
    setValue('backgroundColor', question.backgroundColor, '#f6f8fb');
    setValue('backgroundImageUrl', question.backgroundImageUrl, '');
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
    // Теперь делегируется в QuestionEditorService
    return { ...question, ...QuestionEditorService.collectAdvancedSettings(document) };
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
