// public/js/components/ribbon.js

window.DOKA_USE_COMPONENT_RIBBON = true;

(function () {
  const STORAGE_KEY = 'dokastudio.constructor.ribbon.activeTab';

  const tabs = [
    { id: 'quiz', label: 'Викторина', always: true },
    { id: 'insert', label: 'Вставка', always: true },
    { id: 'mode', label: 'Режим / Тип', always: true },
    { id: 'media', label: 'Медиа / Дизайн', always: true },
    { id: 'view', label: 'Вид', always: true },
    { id: 'host', label: 'Ведущий', always: true },
  ];

  const commands = {
    quiz: [
      group('Викторина', [
        action('Новая викторина', '＋', () => call('showCreateQuizModal'), { allowNoQuiz: true }),
        action('Открыть викторину', '▤', () => call('loadMyQuizzes'), { allowNoQuiz: true }),
        action('Сохранить', '💾', () => call('saveCurrentQuestion'), { requiresQuestion: true }),
        action('Сохранить всё', '💾', () => call('saveAllQuizChanges'), { requiresQuiz: true }),
        action('Сохранить элемент', '✦', () => call('saveCurrentQuestion'), { requiresQuestion: true }),
      ]),
      group('Проверка', [
        action('Предпросмотр', '▶', () => call('previewQuiz'), { requiresQuiz: true }),
        action('Опубликовать', '✓', () => call('publishQuiz'), { requiresQuiz: true }),
      ]),
    ],
    insert: [
      group('Вставка', [
        action('Добавить вопрос', '？', () => call('addQuizElement', 'QUESTION'), { requiresQuiz: true }),
        action('Добавить инфо-слайд', 'i', () => call('addQuizElement', 'INFO_SLIDE'), { requiresQuiz: true }),
        action('Добавить вступление раунда', 'R', () => call('addQuizElement', 'ROUND_INTRO'), { requiresQuiz: true }),
        action('Добавить игровой раунд', '▦', () => call('addQuizElement', 'GAME_ROUND'), { requiresQuiz: true }),
      ]),
      group('Быстрый режим', [
        action('Вопрос: все отвечают', 'A', () => addTypedQuestion('EVERYONE_ANSWERS'), { requiresQuiz: true }),
        action('Вопрос: кто быстрее', 'F', () => addTypedQuestion('FASTEST_FINGER'), { requiresQuiz: true }),
        action('Вопрос: несколько верных', 'M', () => addTypedQuestion('MULTIPLE_CORRECT'), { requiresQuiz: true }),
        action('Вопрос: верный порядок', 'O', () => addTypedQuestion('ORDERED'), { requiresQuiz: true }),
      ]),
    ],
    mode: [
      group('Режим ответа', [
        action('Все отвечают', 'A', () => setSelectedMode('EVERYONE_ANSWERS'), { requiresQuestion: true, modeGroup: 'question', activeMode: 'EVERYONE_ANSWERS' }),
        action('Кто быстрее', 'F', () => setSelectedMode('FASTEST_FINGER'), { requiresQuestion: true, modeGroup: 'question', activeMode: 'FASTEST_FINGER' }),
        action('Несколько правильных', 'M', () => setSelectedMode('MULTIPLE_CORRECT'), { requiresQuestion: true, modeGroup: 'question', activeMode: 'MULTIPLE_CORRECT' }),
        action('Верный порядок', 'O', () => setSelectedMode('ORDERED'), { requiresQuestion: true, modeGroup: 'question', activeMode: 'ORDERED' }),
        action('Правда / Ложь', 'T', () => setSelectedMode('TRUE_FALSE'), { requiresQuestion: true, modeGroup: 'question', activeMode: 'TRUE_FALSE' }),
      ]),
      group('Тип вопроса', [
        action('Текстовый вопрос', 'Tx', () => setSelectedMode('TEXT'), { requiresQuestion: true, modeGroup: 'question', activeMode: 'TEXT' }),
        action('Вопрос с изображением', '🖼', () => setSelectedMode('IMAGE'), { requiresQuestion: true, modeGroup: 'question', activeMode: 'IMAGE' }),
        action('Вопрос с аудио', '♪', () => setSelectedMode('AUDIO'), { requiresQuestion: true, modeGroup: 'question', activeMode: 'AUDIO' }),
        action('Вопрос с видео', '▶', () => setSelectedMode('VIDEO'), { requiresQuestion: true, modeGroup: 'question', activeMode: 'VIDEO' }),
      ]),
      group('Скоринг', [
        action('Убывающие очки', '⇣', () => setSelectedMode('DECREASING_POINTS'), { requiresQuestion: true, modeGroup: 'question', activeMode: 'DECREASING_POINTS' }),
        action('Ставка', '$', () => setSelectedMode('WAGER'), { requiresQuestion: true, modeGroup: 'question', activeMode: 'WAGER' }),
        action('Большинство / Семейная', '♣', () => setSelectedMode('MAJORITY_RULES'), { requiresQuestion: true, modeGroup: 'question', activeMode: 'MAJORITY_RULES' }),
        action('Последний выживший', '⚡', () => setSelectedMode('LAST_MAN_STANDING'), { requiresQuestion: true, modeGroup: 'question', activeMode: 'LAST_MAN_STANDING' }),
      ]),
      group('Игровые раунды', [
        action('Раунд «Своя игра»', '▦', () => setSelectedMode('JEOPARDY_ROUND'), { requiresQuestion: true, modeGroup: 'round', activeMode: 'JEOPARDY_ROUND' }),
        action('Раунд «Миллионер»', '◆', () => setSelectedMode('MILLIONAIRE_ROUND'), { requiresQuestion: true, modeGroup: 'round', activeMode: 'MILLIONAIRE_ROUND' }),
      ]),
    ],
    media: [
      group('Медиа', [
        action('Фон', '▤', () => focusPanelSection('media'), { requiresQuestion: true }),
        action('Изображение', '🖼', () => openMedia('image/*'), { requiresQuestion: true }),
        action('Видео', '🎞', () => openMedia('video/*'), { requiresQuestion: true }),
        action('Аудио', '♪', () => openMedia('audio/*'), { requiresQuestion: true }),
      ]),
      group('Дизайн', [
        action('Тема / стиль', '✎', () => focusPanelSection('appearance'), { requiresQuestion: true }),
        action('Шаблоны', '▦', () => focusPanelSection('templates'), { requiresQuestion: true }),
      ]),
    ],
    view: [
      group('Вид', [
        toggle('Фокус на превью', '▣', 'focusPreview', false, setPreviewFocus),
        toggle('Правая панель свойств', '⚙', 'showProps', true, setPanelVisibility),
        toggle('Левая структура', '▥', 'showThumbs', true, setPanelVisibility),
      ]),
    ],
    host: [
      group('Игровой показ', [
        action('Заметки ведущего', '✎', () => focusPanelSection('host-notes'), { requiresQuestion: true }),
        action('Параметры показа', '▶', () => focusPanelSection('timing'), { requiresQuestion: true }),
        action('Настройки табло', '▤', () => focusPanelSection('scoring'), { requiresQuestion: true }),
        action('Поведение таймера', '⏱', () => focusPanelSection('timing'), { requiresQuestion: true }),
        action('Показ ответа', '✓', () => focusPanelSection('advanced'), { requiresQuestion: true }),
      ]),
    ],
  };

  function action(label, icon, handler, options = {}) {
    return { kind: 'action', label, icon, handler, ...options };
  }

  function toggle(label, icon, key, defaultValue, handler = null) {
    return { kind: 'toggle', label, icon, key, defaultValue, handler };
  }

  function group(label, items) {
    return { label, items };
  }

  function init() {
    const toolbar = document.querySelector('.constructor-settings-panel');
    if (!toolbar || toolbar.dataset.componentRibbonReady === 'true') return;

    toolbar.classList.add('doka-ribbon');
    toolbar.dataset.componentRibbonReady = 'true';

    wrapExistingSections(toolbar);
    buildRibbonShell(toolbar);
    setActiveTab(localStorage.getItem(STORAGE_KEY) || 'quiz');
    bindShortcuts();
    refresh();
  }

  function wrapExistingSections(toolbar) {
    toolbar.querySelectorAll(':scope > .panel-section').forEach((section) => {
      if (!section.querySelector(':scope > .panel-section-body')) {
        const title = section.querySelector('h3');
        const body = document.createElement('div');
        body.className = 'panel-section-body';
        Array.from(section.children).forEach((child) => {
          if (child !== title) body.appendChild(child);
        });
        section.appendChild(body);
      }
      section.classList.add('doka-ribbon-group', 'doka-source-group');
      section.dataset.ribbonTabs = getSourceTabs(section);
    });
  }

  function getSourceTabs(section) {
    const title = section.querySelector('h3')?.textContent.trim().toLowerCase() || '';
    const map = {
      контент: 'mode',
      медиа: 'media',
      оформление: 'media',
      шаблоны: 'media',
      скоринг: 'host',
      тайминг: 'host',
      'заметки ведущего': 'host',
      дополнительно: 'host',
    };
    return map[title] || 'mode';
  }

  function buildRibbonShell(toolbar) {
    const header = toolbar.querySelector('.panel-header');
    if (header) {
      header.classList.add('doka-ribbon-brand');
      header.innerHTML = '<strong>DokaStudio</strong><span id="ribbonContextLabel">Панель конструктора</span>';
    }

    const tabsNode = document.createElement('div');
    tabsNode.className = 'doka-ribbon-tabs';
    tabsNode.innerHTML = `
      <button type="button" class="doka-ribbon-menu" aria-label="Toolbar menu" onclick="DokaRibbon.toggleMobile()">☰</button>
      <div class="doka-ribbon-tab-list">
        ${tabs.map((tab) => `<button type="button" class="doka-ribbon-tab" data-ribbon-tab="${tab.id}" onclick="DokaRibbon.setActiveTab('${tab.id}')">${tab.label}</button>`).join('')}
      </div>
      <select class="doka-ribbon-select" onchange="DokaRibbon.setActiveTab(this.value)">
        ${tabs.map((tab) => `<option value="${tab.id}">${tab.label}</option>`).join('')}
      </select>
    `;

    const content = document.createElement('div');
    content.className = 'doka-ribbon-content';

    toolbar.insertBefore(tabsNode, toolbar.firstChild);
    toolbar.appendChild(content);

    Object.entries(commands).forEach(([tabId, groups]) => {
      groups.forEach((entry) => content.appendChild(renderCommandGroup(tabId, entry)));
    });

    toolbar.querySelectorAll(':scope > .panel-section').forEach((section) => {
      if (!section.dataset.generatedRibbonGroup) content.appendChild(section);
    });
  }

  function renderCommandGroup(tabId, entry) {
    const section = document.createElement('section');
    section.className = 'panel-section doka-ribbon-group doka-command-group';
    section.dataset.ribbonTabs = tabId;
    section.dataset.generatedRibbonGroup = 'true';
    section.innerHTML = `
      <h3>${escapeHtml(entry.label)}</h3>
      <div class="panel-section-body doka-ribbon-buttons">
        ${entry.items.map(renderCommand).join('')}
      </div>
    `;
    return section;
  }

  function renderCommand(item) {
    if (item.kind === 'toggle') {
      const checked = localStorage.getItem(`dokastudio.ribbon.${item.key}`) ?? String(item.defaultValue);
      return `
        <button type="button" class="doka-ribbon-button doka-ribbon-toggle ${checked === 'true' ? 'active' : ''}" data-toggle-key="${item.key}" onclick="DokaRibbon.runToggle('${item.key}')">
          <span>${item.icon}</span><b>${item.label}</b>
        </button>
      `;
    }
    const id = registerHandler(item.handler);
    return `
      <button type="button" class="doka-ribbon-button" data-handler-id="${id}" ${item.requiresQuestion ? 'data-requires-question="true"' : ''} ${item.requiresQuiz ? 'data-requires-quiz="true"' : ''} ${item.modeGroup ? `data-mode-group="${item.modeGroup}"` : ''} ${item.allowNoQuiz ? 'data-allow-no-quiz="true"' : ''} ${item.activeMode ? `data-mode="${item.activeMode}"` : ''} onclick="DokaRibbon.runHandler('${id}')">
        <span>${item.icon}</span><b>${item.label}</b>
      </button>
    `;
  }

  const handlers = new Map();
  let handlerIndex = 0;
  function registerHandler(handler) {
    const id = `h${handlerIndex++}`;
    handlers.set(id, handler);
    return id;
  }

  function setActiveTab(tabId) {
    const toolbar = document.querySelector('.constructor-settings-panel');
    if (!toolbar) return;

    const visibleTabs = getVisibleTabs();
    const fallback = visibleTabs.some((tab) => tab.id === tabId) ? tabId : 'quiz';
    toolbar.dataset.activeRibbonTab = fallback;
    localStorage.setItem(STORAGE_KEY, fallback);

    toolbar.querySelectorAll('.doka-ribbon-tab').forEach((button) => {
      const tab = tabs.find((item) => item.id === button.dataset.ribbonTab);
      const isVisible = visibleTabs.includes(tab);
      button.hidden = !isVisible;
      button.classList.toggle('active', button.dataset.ribbonTab === fallback);
    });

    const select = toolbar.querySelector('.doka-ribbon-select');
    if (select) {
      select.value = fallback;
      Array.from(select.options).forEach((option) => {
        option.hidden = !visibleTabs.some((tab) => tab.id === option.value);
      });
    }

    toolbar.querySelectorAll('.doka-ribbon-group').forEach((section) => {
      const tabList = (section.dataset.ribbonTabs || '').split(/\s+/);
      section.classList.toggle('ribbon-visible', tabList.includes(fallback));
    });
  }

  function getVisibleTabs() {
    return tabs;
  }

  function getContext() {
    const state = window.ConstructorState?.getState?.() || {};
    const index = Number.isInteger(window.currentQuestionIndex) ? window.currentQuestionIndex : state.currentQuestionIndex;
    const selected = index >= 0 && (window.questions?.[index] || state.questions?.[index]);
    const elementType = selected?.elementType || selected?.layoutType || 'QUESTION';
    const mode = selected?.gameMode || selected?.type;
    return {
      hasQuiz: Boolean(state.currentQuiz || window.currentQuiz),
      hasQuestion: Boolean(selected),
      elementType,
      mode,
    };
  }

  function refresh() {
    const toolbar = document.querySelector('.constructor-settings-panel');
    if (!toolbar?.classList.contains('doka-ribbon')) return;
    setActiveTab(toolbar.dataset.activeRibbonTab || localStorage.getItem(STORAGE_KEY) || 'quiz');
    const context = getContext();
    const allButtons = toolbar.querySelectorAll('.doka-ribbon-button');
    allButtons.forEach((node) => {
      const allowNoQuiz = node.dataset.allowNoQuiz === 'true';
      if (!context.hasQuiz && !allowNoQuiz) {
        node.disabled = true;
        node.classList.add('is-disabled');
      }
    });
    toolbar.querySelectorAll('[data-requires-question="true"]').forEach((node) => {
      node.disabled = !context.hasQuestion;
      node.classList.toggle('is-disabled', !context.hasQuestion);
    });
    toolbar.querySelectorAll('[data-requires-quiz="true"]').forEach((node) => {
      node.disabled = !context.hasQuiz;
      node.classList.toggle('is-disabled', !context.hasQuiz);
    });

    if (!context.hasQuiz) {
      toolbar.querySelectorAll('.doka-ribbon-button').forEach((node) => {
        if (node.dataset.allowNoQuiz !== 'true') {
          node.disabled = true;
          node.classList.add('is-disabled');
        }
      });
    }

    toolbar.querySelectorAll('[data-mode-group]')?.forEach((node) => {
      const group = node.dataset.modeGroup;
      let visible = true;
      if (!context.hasQuestion) {
        visible = false;
      } else if (context.elementType === 'INFO_SLIDE' || context.elementType === 'ROUND_INTRO') {
        visible = false;
      } else if (context.elementType === 'GAME_ROUND') {
        visible = group === 'round';
      }
      node.hidden = !visible;
    });

    toolbar.querySelectorAll('.doka-command-group').forEach((group) => {
      if (group.dataset.ribbonTabs !== 'mode' && group.dataset.ribbonTabs !== 'media' && group.dataset.ribbonTabs !== 'host') return;
      group.classList.toggle('is-disabled', !context.hasQuestion);
    });

    togglePanelSections(context);

    toolbar.querySelectorAll('.doka-ribbon-button').forEach((node) => {
      node.classList.toggle('is-active', context.mode && node.dataset.handlerId && node.dataset.activeMode === context.mode);
    });

    highlightModeButton(context.mode);
    const label = document.getElementById('ribbonContextLabel');
    if (label) {
      label.textContent = context.hasQuestion
        ? `Выбран: ${getElementLabel(context.elementType)} · ${getModeLabel(context.mode)}`
        : 'Панель конструктора';
    }
  }

  function togglePanelSections(context) {
    const sections = {
      content: document.getElementById('contentSection'),
      media: document.getElementById('mediaSection'),
      appearance: document.getElementById('appearanceSection'),
      templates: document.getElementById('templatesSection'),
      scoring: document.getElementById('scoringSection'),
      timing: document.getElementById('timingSection'),
      hostNotes: document.getElementById('hostNotesSection'),
      advanced: document.getElementById('advancedSection'),
    };

    Object.values(sections).forEach((section) => {
      if (!section) return;
      section.classList.toggle('is-disabled', !context.hasQuestion);
      section.style.opacity = context.hasQuestion ? '1' : '0.5';
    });

    if (!context.hasQuestion) return;

    const isInfo = context.elementType === 'INFO_SLIDE';
    const isRoundIntro = context.elementType === 'ROUND_INTRO';
    const isGameRound = context.elementType === 'GAME_ROUND';

    if (sections.scoring) sections.scoring.style.display = isInfo ? 'none' : 'block';
    if (sections.timing) sections.timing.style.display = isInfo ? 'none' : 'block';
    if (sections.advanced) sections.advanced.style.display = isInfo ? 'none' : 'block';
    if (sections.hostNotes) sections.hostNotes.style.display = 'block';
    if (sections.content) sections.content.style.display = 'block';
    if (sections.media) sections.media.style.display = 'block';
    if (sections.appearance) sections.appearance.style.display = isGameRound ? 'none' : 'block';
    if (sections.templates) sections.templates.style.display = isGameRound ? 'none' : 'block';
  }

  function runHandler(id) {
    handlers.get(id)?.();
    refresh();
  }

  function runToggle(key) {
    const next = localStorage.getItem(`dokastudio.ribbon.${key}`) !== 'true';
    localStorage.setItem(`dokastudio.ribbon.${key}`, String(next));
    document.querySelectorAll(`[data-toggle-key="${key}"]`).forEach((node) => node.classList.toggle('active', next));
    const item = Object.values(commands).flatMap((list) => list.flatMap((entry) => entry.items)).find((entry) => entry.key === key);
    item?.handler?.(key, next);
  }

  function toggleMobile() {
    document.querySelector('.constructor-settings-panel')?.classList.toggle('mobile-open');
  }

  function call(name, ...args) {
    if (typeof window[name] === 'function') return window[name](...args);
    toast(`${name} is not available yet.`);
  }

  function exec(command) {
    try {
      document.execCommand(command);
    } catch (error) {
      toast(`${command} is not available in this browser.`);
    }
  }

  function addTypedQuestion(type) {
    const context = getContext();
    if (!context.hasQuiz) {
      toast('Сначала создайте или откройте викторину.');
      return;
    }
    call('addQuizElement', 'QUESTION');
    setTimeout(() => call('setQuestionType', type), 0);
  }

  function openMedia(accept) {
    const input = document.getElementById('mediaFile');
    if (input) input.accept = accept;
    input?.click();
  }

  function duplicateCurrent() {
    const state = window.ConstructorState?.getState?.() || {};
    const index = state.currentQuestionIndex;
    const source = state.questions?.[index];
    if (!source) return toast('Select a slide first.');
    const copy = JSON.parse(JSON.stringify(source));
    delete copy.id;
    copy.tempId = `tmp_${Date.now()}`;
    copy.text = `${copy.text || 'Question'} copy`;
    window.questions.splice(index + 1, 0, copy);
    window.ConstructorState.setQuestions(window.questions);
    window.renderQuestionsList?.();
    window.editQuestion?.(index + 1);
  }

  function resetSelectedSlide() {
    const fields = ['backgroundImageUrl', 'questionSubtitle', 'questionNotes'];
    fields.forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.value = '';
    });
    const color = document.getElementById('backgroundColor');
    if (color) color.value = '#f6f8fb';
    window.syncPreviewFromProperties?.();
  }

  function completeAnswers() {
    const state = window.ConstructorState?.getState?.() || {};
    const question = state.questions?.[state.currentQuestionIndex];
    if (!question) return;
    while ((question.answers || []).length < 4) window.addAnswer?.();
  }

  function clearMedia() {
    const state = window.ConstructorState?.getState?.() || {};
    const index = state.currentQuestionIndex;
    const question = state.questions?.[index];
    if (!question) return;
    question.imageUrl = null;
    question.videoUrl = null;
    question.audioUrl = null;
    state.questions[index] = question;
    window.questions = state.questions;
    window.ConstructorState.setQuestions(state.questions);
    window.QuestionEditorComponent?.renderStudioPreview(question);
  }

  function setPanelVisibility(key, visible) {
    const map = {
      showThumbs: '.constructor-outline',
      showProps: '.constructor-settings-panel',
    };
    const node = document.querySelector(map[key]);
    if (node) node.classList.toggle('ribbon-hidden', !visible);
  }

  let canvasZoom = 1;
  function zoomCanvas(delta) {
    setCanvasZoom(Math.max(0.5, Math.min(1.5, canvasZoom + delta)));
  }

  function setCanvasZoom(value) {
    canvasZoom = value;
    document.documentElement.style.setProperty('--studio-canvas-zoom', String(value));
  }

  function setStudioViewMode(mode) {
    document.body.dataset.studioView = mode;
  }

  function setPreviewFocus(key, isEnabled) {
    const focus = isEnabled ? 'canvas' : 'slides';
    setStudioViewMode(focus);
  }

  function setSelectedMode(mode) {
    call('setQuestionType', mode);
    highlightModeButton(mode);
  }

  function highlightModeButton(mode) {
    const toolbar = document.querySelector('.constructor-settings-panel');
    if (!toolbar) return;
    toolbar.querySelectorAll('[data-mode]')?.forEach((node) => {
      node.classList.toggle('is-active', node.dataset.mode === mode);
    });
  }

  function getModeLabel(mode) {
    const labels = {
      EVERYONE_ANSWERS: 'Все отвечают',
      FASTEST_FINGER: 'Кто быстрее',
      MULTIPLE_CORRECT: 'Несколько правильных',
      ORDERED: 'Верный порядок',
      TRUE_FALSE: 'Правда / Ложь',
      TEXT: 'Текстовый вопрос',
      IMAGE: 'Вопрос с изображением',
      AUDIO: 'Вопрос с аудио',
      VIDEO: 'Вопрос с видео',
      DECREASING_POINTS: 'Убывающие очки',
      WAGER: 'Ставка',
      MAJORITY_RULES: 'Большинство / Семейная',
      LAST_MAN_STANDING: 'Последний выживший',
      JEOPARDY_ROUND: 'Раунд «Своя игра»',
      MILLIONAIRE_ROUND: 'Раунд «Миллионер»',
      INFO_SLIDE: 'Инфо-слайд',
      ROUND_INTRO: 'Вступление раунда',
    };
    return labels[mode] || 'Элемент';
  }

  function getElementLabel(type) {
    const labels = {
      QUESTION: 'Вопрос',
      INFO_SLIDE: 'Инфо-слайд',
      ROUND_INTRO: 'Вступление раунда',
      GAME_ROUND: 'Игровой раунд',
    };
    return labels[type] || 'Элемент';
  }

  function bindShortcuts() {
    if (window.__dokaRibbonShortcuts) return;
    window.__dokaRibbonShortcuts = true;
    document.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (event.ctrlKey && key === 's') {
        event.preventDefault();
        call('saveCurrentQuestion');
      }
      if (event.ctrlKey && key === 'z') {
        event.preventDefault();
        document.execCommand('undo');
      }
      if (event.ctrlKey && key === 'y') {
        event.preventDefault();
        document.execCommand('redo');
      }
      if (event.key === 'F5') {
        event.preventDefault();
        call('previewQuiz');
      }
    });
  }

  function toast(message) {
    if (typeof window.showToast === 'function') window.showToast(message, 'info');
    else console.info(message);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function focusPanelSection(sectionKey) {
    const section = document.querySelector(`[data-panel-section="${sectionKey}"]`);
    if (!section) return;
    const toolbar = document.querySelector('.constructor-settings-panel');
    if (toolbar) toolbar.classList.add('ribbon-focus-mode');
    section.classList.add('is-open', 'is-focused');
    section.querySelector('h3')?.setAttribute('aria-expanded', 'true');
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    setTimeout(() => {
      section.classList.remove('is-open');
      section.classList.remove('is-focused');
      if (toolbar) toolbar.classList.remove('ribbon-focus-mode');
    }, 2200);
  }

  function saveAllQuizChanges() {
    const state = window.ConstructorState?.getState?.() || {};
    const activeIndex = state.currentQuestionIndex;
    if (!state.currentQuiz) {
      toast('Сначала создайте или откройте викторину.');
      return;
    }
    if (activeIndex >= 0 && window.questions?.[activeIndex]) {
      call('saveCurrentQuestion');
      return;
    }
    toast('Нет активного элемента для сохранения.');
  }

  function injectModeDataAttributes() {
    const mapping = new Map();
    Object.values(commands).forEach((groupList) => {
      groupList.forEach((groupItem) => {
        groupItem.items.forEach((item) => {
          if (item.kind !== 'action') return;
          if (!item.label || !item.handler) return;
          if (item.handler.name === 'setSelectedMode') return;
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  window.DokaRibbon = {
    init,
    refresh,
    setActiveTab,
    runHandler,
    runToggle,
    toggleMobile,
  };
})();
