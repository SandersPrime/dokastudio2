// public/js/constructor-ui.js

function renderQuestionTypeSelector() {
    const container = document.getElementById('questionTypeSelector');
    const select = document.getElementById('questionTypeSelect');
    if (!container) return;

    const types = window.STUDIO_QUESTION_TYPES || [
        { type: 'EVERYONE_ANSWERS', name: 'Все отвечают', icon: 'A' },
        { type: 'FASTEST_FINGER', name: 'Кто быстрее', icon: 'F' },
        { type: 'MULTIPLE_CORRECT', name: 'Несколько правильных', icon: 'M' },
        { type: 'ORDERED', name: 'Верный порядок', icon: 'O' },
        { type: 'TRUE_FALSE', name: 'Правда / Ложь', icon: 'T' },
        { type: 'TEXT', name: 'Текстовый вопрос', icon: 'Tx' },
        { type: 'IMAGE', name: 'Вопрос с изображением', icon: '🖼' },
        { type: 'AUDIO', name: 'Вопрос с аудио', icon: '♪' },
        { type: 'VIDEO', name: 'Вопрос с видео', icon: '▶' },
        { type: 'DECREASING_POINTS', name: 'Убывающие очки', icon: '⇣' },
        { type: 'WAGER', name: 'Ставка', icon: '$' },
        { type: 'MAJORITY_RULES', name: 'Большинство / Семейная', icon: '♣' },
        { type: 'LAST_MAN_STANDING', name: 'Последний выживший', icon: '⚡' },
        { type: 'JEOPARDY_ROUND', name: 'Раунд «Своя игра»', icon: '▦' },
        { type: 'MILLIONAIRE_ROUND', name: 'Раунд «Миллионер»', icon: '◆' },
        { type: 'INFO_SLIDE', name: 'Инфо-слайд', icon: 'i' },
        { type: 'ROUND_INTRO', name: 'Вступление раунда', icon: 'R' },
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
            <p id="uploadPlaceholder">Перетащите файл сюда или нажмите, чтобы загрузить image / audio / video</p>
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

function initSettingsToolbarDropdowns() {
    const toolbar = document.querySelector('.constructor-settings-panel');
    if (!toolbar || toolbar.dataset.dropdownsReady === 'true') return;

    if (window.DOKA_USE_COMPONENT_RIBBON) {
        toolbar.dataset.dropdownsReady = 'component-ribbon';
        if (window.DokaRibbon?.init) window.DokaRibbon.init();
        return;
    }

    initStudioRibbonTabs(toolbar);

    toolbar.querySelectorAll('.panel-section').forEach((section) => {
        const title = section.querySelector('h3');
        if (!title) return;

        let body = section.querySelector('.panel-section-body');
        if (!body) {
            body = document.createElement('div');
            body.className = 'panel-section-body';

            Array.from(section.children).forEach((child) => {
                if (child !== title) body.appendChild(child);
            });

            section.appendChild(body);
        }

        title.setAttribute('role', 'button');
        title.setAttribute('tabindex', '0');
        title.setAttribute('aria-expanded', 'false');

        const toggle = (event) => {
            if (toolbar.classList.contains('ribbon-mode')) return;
            event.stopPropagation();
            const isOpen = section.classList.contains('is-open');

            toolbar.querySelectorAll('.panel-section.is-open').forEach((openSection) => {
                openSection.classList.remove('is-open');
                openSection.querySelector('h3')?.setAttribute('aria-expanded', 'false');
            });

            if (!isOpen) {
                section.classList.add('is-open');
                title.setAttribute('aria-expanded', 'true');
            }
        };

        title.addEventListener('click', toggle);
        title.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggle(event);
            }
        });

        body.addEventListener('click', (event) => event.stopPropagation());
    });

    document.addEventListener('click', () => {
        if (toolbar.classList.contains('ribbon-mode')) return;
        toolbar.querySelectorAll('.panel-section.is-open').forEach((section) => {
            section.classList.remove('is-open');
            section.querySelector('h3')?.setAttribute('aria-expanded', 'false');
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        toolbar.querySelectorAll('.panel-section.is-open').forEach((section) => {
            section.classList.remove('is-open');
            section.querySelector('h3')?.setAttribute('aria-expanded', 'false');
        });
    });

    toolbar.dataset.dropdownsReady = 'true';
}

function initStudioRibbonTabs(toolbar) {
    toolbar.classList.add('ribbon-mode');

    const panelHeader = toolbar.querySelector('.panel-header');
    if (panelHeader) {
        panelHeader.innerHTML = `
            <div class="studio-ribbon-title">Studio</div>
            <div class="save-status ribbon-save-status" id="ribbonSaveStatusMirror">Готово</div>
        `;
    }

    ensureRibbonCommandSections(toolbar);
    assignRibbonTabs(toolbar);

    const tabs = [
        { id: 'file', label: 'Файл' },
        { id: 'home', label: 'Главная' },
        { id: 'insert', label: 'Вставить' },
        { id: 'question', label: 'Вопрос' },
        { id: 'design', label: 'Дизайн' },
        { id: 'view', label: 'Вид' },
        { id: 'quiz', label: 'Викторина' },
    ];

    if (!toolbar.querySelector('.studio-ribbon-tabs')) {
        const tabsNode = document.createElement('div');
        tabsNode.className = 'studio-ribbon-tabs';
        tabsNode.innerHTML = tabs.map((tab) => `
            <button type="button" class="studio-ribbon-tab" data-ribbon-tab="${tab.id}" onclick="setStudioRibbonTab('${tab.id}')">${tab.label}</button>
        `).join('');
        toolbar.prepend(tabsNode);
    }

    setStudioRibbonTab(toolbar.dataset.activeRibbonTab || 'home');
}

function ensureRibbonCommandSections(toolbar) {
    if (toolbar.querySelector('[data-ribbon-generated="file"]')) return;

    const fileSection = document.createElement('section');
    fileSection.className = 'panel-section ribbon-command-section';
    fileSection.dataset.ribbonGenerated = 'file';
    fileSection.dataset.ribbonTabs = 'file';
    fileSection.innerHTML = `
        <h3>Файл</h3>
        <div class="ribbon-command-grid">
            <button type="button" class="ribbon-command primary" onclick="showCreateQuizModal()"><span>＋</span><b>Новый квиз</b></button>
            <button type="button" class="ribbon-command" onclick="loadMyQuizzes()"><span>▤</span><b>Мои квизы</b></button>
            <button type="button" class="ribbon-command" onclick="document.getElementById('importFile').click()"><span>⇧</span><b>Импорт</b></button>
            <button type="button" class="ribbon-command" onclick="exportQuiz()"><span>⇩</span><b>Экспорт</b></button>
        </div>
    `;

    const insertSection = document.createElement('section');
    insertSection.className = 'panel-section ribbon-command-section';
    insertSection.dataset.ribbonGenerated = 'insert';
    insertSection.dataset.ribbonTabs = 'insert home';
    insertSection.innerHTML = `
        <h3>Добавить</h3>
        <div class="ribbon-command-grid">
            <button type="button" class="ribbon-command primary" onclick="addQuizElement('QUESTION')"><span>?</span><b>Вопрос</b></button>
            <button type="button" class="ribbon-command" onclick="addQuizElement('INFO_SLIDE')"><span>i</span><b>Инфо</b></button>
            <button type="button" class="ribbon-command" onclick="addQuizElement('ROUND_INTRO')"><span>R</span><b>Интро</b></button>
            <button type="button" class="ribbon-command" onclick="addQuizElement('GAME_ROUND')"><span>▦</span><b>Раунд</b></button>
        </div>
    `;

    const viewSection = document.createElement('section');
    viewSection.className = 'panel-section ribbon-command-section';
    viewSection.dataset.ribbonGenerated = 'view';
    viewSection.dataset.ribbonTabs = 'view';
    viewSection.innerHTML = `
        <h3>Вид</h3>
        <div class="ribbon-command-grid">
            <button type="button" class="ribbon-command" onclick="setStudioViewMode('slides')"><span>▥</span><b>Слайды</b></button>
            <button type="button" class="ribbon-command" onclick="setStudioViewMode('canvas')"><span>□</span><b>Холст</b></button>
            <button type="button" class="ribbon-command" onclick="setStudioViewMode('notes')"><span>✎</span><b>Заметки</b></button>
            <button type="button" class="ribbon-command" onclick="fitStudioCanvas()"><span>⤢</span><b>По размеру</b></button>
        </div>
    `;

    const quizSection = document.createElement('section');
    quizSection.className = 'panel-section ribbon-command-section';
    quizSection.dataset.ribbonGenerated = 'quiz';
    quizSection.dataset.ribbonTabs = 'quiz';
    quizSection.innerHTML = `
        <h3>Запуск</h3>
        <div class="ribbon-command-grid">
            <button type="button" class="ribbon-command primary" onclick="previewQuiz()"><span>▶</span><b>Preview</b></button>
            <button type="button" class="ribbon-command" onclick="publishQuiz()"><span>✓</span><b>Publish</b></button>
            <button type="button" class="ribbon-command" onclick="showAIGenerator()"><span>AI</span><b>Генератор</b></button>
            <a class="ribbon-command" href="/host.html"><span>★</span><b>Ведущий</b></a>
        </div>
    `;

    const firstSection = toolbar.querySelector('.panel-section');
    toolbar.insertBefore(fileSection, firstSection);
    toolbar.insertBefore(insertSection, firstSection);
    toolbar.appendChild(viewSection);
    toolbar.appendChild(quizSection);
}

function assignRibbonTabs(toolbar) {
    toolbar.querySelectorAll('.panel-section').forEach((section) => {
        const title = section.querySelector('h3')?.textContent.trim().toLowerCase() || '';
        if (section.dataset.ribbonTabs) return;

        const map = {
            content: 'home question',
            media: 'insert design',
            appearance: 'design',
            templates: 'insert design',
            scoring: 'question quiz',
            timing: 'question quiz',
            'host notes': 'view question',
            advanced: 'question quiz',
        };

        section.dataset.ribbonTabs = map[title] || 'home';
    });
}

function setStudioRibbonTab(tab) {
    const toolbar = document.querySelector('.constructor-settings-panel');
    if (!toolbar) return;

    toolbar.dataset.activeRibbonTab = tab;
    toolbar.querySelectorAll('.studio-ribbon-tab').forEach((button) => {
        button.classList.toggle('active', button.dataset.ribbonTab === tab);
    });

    toolbar.querySelectorAll('.panel-section').forEach((section) => {
        const tabs = (section.dataset.ribbonTabs || '').split(/\s+/);
        const visible = tabs.includes(tab);
        section.classList.toggle('ribbon-visible', visible);
        section.classList.toggle('is-open', false);
        section.querySelector('h3')?.setAttribute('aria-expanded', String(visible));
    });
}

function setStudioViewMode(mode) {
    document.body.dataset.studioView = mode;
}

function fitStudioCanvas() {
    const panel = document.querySelector('.studio-preview-panel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    const config = QuestionEditorComponent?.parseConfig
        ? QuestionEditorComponent.parseConfig(question)
        : {};
    const appearance = config.appearance || {};
    setValue('questionTemplate', appearance.template, 'classic');
    setValue('titleColor', appearance.titleColor, '#111827');
    setValue('answerColor', appearance.answerColor, '#111827');
    setValue('titleSize', appearance.titleSize, 48);
    setValue('answerSize', appearance.answerSize, 18);
    setValue('answerLayout', appearance.answerLayout, 'grid-2');
    if (typeof window.updateTemplateGallerySelection === 'function') {
        window.updateTemplateGallerySelection(appearance.template || 'classic');
    }

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
    initSettingsToolbarDropdowns();
    if (typeof initMediaDragAndDrop === 'function') {
        initMediaDragAndDrop();
    }
}

document.addEventListener('DOMContentLoaded', initConstructorUI);

window.renderQuestionTypeSelector = renderQuestionTypeSelector;
window.renderMediaUploadSection = renderMediaUploadSection;
window.renderAnswersSection = renderAnswersSection;
window.renderTrueFalseSection = renderTrueFalseSection;
window.renderAdvancedSettingsPanel = renderAdvancedSettingsPanel;
window.loadAdvancedSettings = loadAdvancedSettings;
window.saveAdvancedSettings = saveAdvancedSettings;
window.initSettingsToolbarDropdowns = initSettingsToolbarDropdowns;
window.setStudioRibbonTab = setStudioRibbonTab;
window.setStudioViewMode = setStudioViewMode;
window.fitStudioCanvas = fitStudioCanvas;
