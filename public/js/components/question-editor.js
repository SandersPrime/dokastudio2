// public/js/components/question-editor.js

/**
 * РљРѕРјРїРѕРЅРµРЅС‚ СЂРµРґР°РєС‚РѕСЂР° РІРѕРїСЂРѕСЃР°.
 * Р’С‹РЅРµСЃРµРЅ РёР· constructor-ui.js.
 */
const QuestionEditorComponent = {
  /**
   * РћР±РЅРѕРІР»СЏРµС‚ UI СЂРµРґР°РєС‚РѕСЂР° РїРѕРґ С‚РµРєСѓС‰РёР№ РІРѕРїСЂРѕСЃ.
   * @param {Object|null} question
   */
  updateQuestionEditorUI(question) {
    if (!question) {
      this.clearEditor();
      return;
    }

    this.showEditorContent();
    this.applyQuestionTypeUI(question.gameMode || question.type);
    this.populateQuestionForm(question);
    this.renderAnswersEditor(question.answers);
    this.syncMediaPreview(question);
    this.renderQuestionSpecificInputs(question);
    this.renderStudioPreview(question);
  },

  /**
   * РћС‡РёС‰Р°РµС‚ СЂРµРґР°РєС‚РѕСЂ.
   */
  clearEditor() {
    this.showEditorPlaceholder();
    const elements = [
      'questionText', 'questionSubtitle', 'questionPoints', 'questionTime',
      'questionTypeSelect', 'backgroundColor', 'backgroundImageUrl',
      'pointsAtStart', 'pointsAtEnd', 'penaltyPoints',
      'penaltyNoAnswer', 'speedBonus1', 'speedBonus2', 'speedBonus3',
      'countdownMode', 'textReveal', 'demographicGroup',
      'slideRouting', 'questionNotes'
    ];

    elements.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = id === 'autoJudge' || id === 'lockoutOnWrong' || 
                       id === 'showCorrectAnswer' || id === 'jokersEnabled';
        } else {
          el.value = '';
        }
      }
    });

    this.clearMediaPreview();
    this.clearAnswersEditor();
    this.renderStudioPreview(null);
  },

  showEditorContent() {
    const placeholder = document.getElementById('editorPlaceholder');
    const content = document.getElementById('editorContent');
    if (placeholder) placeholder.style.display = 'none';
    if (content) content.style.display = 'block';
  },

  showEditorPlaceholder() {
    const placeholder = document.getElementById('editorPlaceholder');
    const content = document.getElementById('editorContent');
    if (placeholder) placeholder.style.display = 'grid';
    if (content) content.style.display = 'none';
  },

  /**
   * РџСЂРёРјРµРЅСЏРµС‚ UI РІ Р·Р°РІРёСЃРёРјРѕСЃС‚Рё РѕС‚ С‚РёРїР° РІРѕРїСЂРѕСЃР°.
   * @param {string} type
   */
  applyQuestionTypeUI(type) {
    const mediaSection = document.getElementById('mediaUploadSection');
    const trueFalseSection = document.getElementById('trueFalseSection');
    const answersSection = document.getElementById('answersSection');

    if (mediaSection) mediaSection.style.display = 'block';
    if (trueFalseSection) trueFalseSection.style.display = ['TRUEFALSE', 'TRUE_FALSE'].includes(type) ? 'block' : 'none';
    if (answersSection) answersSection.style.display = ['INFO_SLIDE', 'ROUND_INTRO', 'JEOPARDY_ROUND'].includes(type) ? 'none' : 'block';

    document.querySelectorAll('.type-btn').forEach((button) => {
      button.classList.toggle('active', button.dataset.type === type);
    });
  },

  /**
   * Р—Р°РїРѕР»РЅСЏРµС‚ РѕСЃРЅРѕРІРЅСѓСЋ С„РѕСЂРјСѓ РІРѕРїСЂРѕСЃР°.
   * @param {Object} question
   */
  populateQuestionForm(question) {
    const fields = {
      'questionText': question.text,
      'questionSubtitle': question.subtitle,
      'questionPoints': question.points,
      'questionTime': question.timeLimit,
      'questionTypeSelect': question.gameMode || question.type,
      'backgroundColor': question.backgroundColor || '#f6f8fb',
      'backgroundImageUrl': question.backgroundImageUrl,
      'pointsAtStart': question.pointsAtStart,
      'pointsAtEnd': question.pointsAtEnd,
      'penaltyPoints': question.penaltyPoints,
      'penaltyNoAnswer': question.penaltyNoAnswer,
      'speedBonus1': question.speedBonus1,
      'speedBonus2': question.speedBonus2,
      'speedBonus3': question.speedBonus3,
      'countdownMode': question.countdownMode,
      'textReveal': question.textReveal,
      'demographicGroup': question.demographicGroup,
      'slideRouting': question.slideRouting,
      'questionNotes': question.notes
    };

    Object.entries(fields).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el && value !== undefined) {
        if (el.type === 'checkbox') {
          el.checked = Boolean(value);
        } else {
          el.value = value;
        }
      }
    });

    // Special case for true/false
    if ((question.gameMode || question.type) === 'TRUEFALSE' || (question.gameMode || question.type) === 'TRUE_FALSE') {
      const select = document.getElementById('trueFalseSelect');
      if (select) {
        const correctAnswer = question.answers?.find(a => a.isCorrect);
        select.value = correctAnswer ? (correctAnswer.text === 'Правда' ? 'true' : 'false') : 'true';
      }
    }
  },

  /**
   * РћС‚СЂРёСЃРѕРІС‹РІР°РµС‚ СЂРµРґР°РєС‚РѕСЂ РѕС‚РІРµС‚РѕРІ.
   * @param {Array<Object>} answers
   */
  renderAnswersEditor(answers = []) {
    const container = document.getElementById('answersEditor');
    if (!container) return;

    container.innerHTML = answers.map((answer, index) => `
      <div class="answer-item ${answer.isCorrect ? 'correct' : ''}" data-index="${index}">
        <div class="d-flex items-center gap-2">
          <button type="button" class="btn btn-outline btn-xs drag-handle">≡</button>
          <input
            type="text"
            class="input answer-input flex-1"
            value="${this.escapeHtml(answer.text)}"
            placeholder="Введите ответ..."
            oninput="updateAnswerText(${index}, this.value); syncPreviewFromProperties()"
          >
          <button type="button" class="btn btn-success btn-xs" onclick="setCorrectAnswer(${index})">
            ${answer.isCorrect ? '✓' : '○'}
          </button>
          <button type="button" class="btn btn-danger btn-xs" onclick="removeAnswer(${index})">✕</button>
        </div>
      </div>
    `).join('');
  },

  /**
   * РћС‚СЂРёСЃРѕРІС‹РІР°РµС‚ СЃРїРµС†РёС„РёС‡РЅС‹Рµ РґР»СЏ С‚РёРїР° РІРѕРїСЂРѕСЃР° РїРѕР»СЏ.
   * @param {Object} question
   */
  renderQuestionSpecificInputs(question) {
    // РњРѕР¶РЅРѕ СЂР°СЃС€РёСЂРёС‚СЊ РґР»СЏ РґСЂСѓРіРёС… С‚РёРїРѕРІ
    const mode = question.gameMode || question.type;
    if (mode === 'TRUEFALSE' || mode === 'TRUE_FALSE') {
      this.updateTrueFalseUI(question);
    }
  },

  renderStudioPreview(question) {
    const canvas = document.getElementById('slideCanvas');
    const title = document.getElementById('previewQuestionText');
    const subtitle = document.getElementById('previewSubtitle');
    const typeBadge = document.getElementById('previewTypeBadge');
    const modeLabel = document.getElementById('previewModeLabel');
    const elementTitle = document.getElementById('previewElementTitle');
    const answersGrid = document.getElementById('previewAnswersGrid');
    const mediaLayer = document.getElementById('previewMediaLayer');
    const special = document.getElementById('previewSpecialLayout');
    const timer = document.getElementById('previewTimer');
    const points = document.getElementById('previewPoints');

    if (!canvas || !title || !answersGrid) return;

    if (!question) {
      title.textContent = 'Введите текст вопроса';
      if (subtitle) subtitle.textContent = '';
      answersGrid.innerHTML = '';
      if (special) special.innerHTML = '';
      return;
    }

    const type = question.gameMode || question.type || 'EVERYONE_ANSWERS';
    const elementType = question.elementType || question.layoutType || 'QUESTION';
    const config = this.parseConfig(question);
    const slideType = config.slideType || (elementType === 'INFO_SLIDE' ? 'INFO_SLIDE' : 'QUESTION');
    const appearance = config.appearance || {};
    const typeLabel = this.getQuestionTypeLabel(slideType === 'QUESTION' ? type : slideType);
    canvas.dataset.mode = type;
    canvas.dataset.elementType = elementType;
    canvas.dataset.template = appearance.template || 'classic';
    canvas.dataset.answerLayout = appearance.answerLayout || 'grid-2';
    canvas.style.backgroundColor = question.backgroundColor || '#f6f8fb';
    canvas.style.backgroundImage = question.backgroundImageUrl ? `url("${question.backgroundImageUrl}")` : 'none';
    canvas.style.setProperty('--studio-bg-gradient', appearance.backgroundGradient || '');
    canvas.style.setProperty('--studio-title-color', appearance.titleColor || '#111827');
    canvas.style.setProperty('--studio-answer-color', appearance.answerColor || '#111827');
    canvas.style.setProperty('--studio-answer-chip-color', appearance.answerChipColor || '#6a4fff');
    canvas.style.setProperty('--studio-title-size', `${appearance.titleSize || 48}px`);
    canvas.style.setProperty('--studio-answer-size', `${appearance.answerSize || 18}px`);
    canvas.style.setProperty('--studio-question-font', appearance.questionFont || "'Inter', sans-serif");
    canvas.style.setProperty('--studio-answer-font', appearance.answerFont || "'Inter', sans-serif");
    canvas.style.setProperty('--studio-text-align', appearance.textAlign || 'left');

    title.textContent = question.text || 'Введите текст вопроса';
    if (subtitle) subtitle.textContent = question.subtitle || '';
    if (subtitle) subtitle.style.textAlign = appearance.textAlign || 'left';
    if (typeBadge) typeBadge.textContent = typeLabel;
    if (modeLabel) modeLabel.textContent = elementType;
    if (elementTitle) elementTitle.textContent = `${typeLabel} - ${elementType}`;
    if (timer) timer.textContent = `${question.timeLimit || 30} сек`;
    if (points) points.textContent = `${question.points || 100} очков`;
    if (mediaLayer) mediaLayer.innerHTML = this.renderPreviewMedia(question);
    if (special) special.innerHTML = this.renderSpecialLayout(question);

    const answers = Array.isArray(question.answers) ? question.answers : [];
    const hideAnswers = slideType !== 'QUESTION' || ['INFO_SLIDE', 'ROUND_INTRO', 'JEOPARDY_ROUND'].includes(type);
    answersGrid.style.display = hideAnswers ? 'none' : 'grid';
    answersGrid.innerHTML = hideAnswers ? '' : answers.map((answer, index) => `
      <button class="preview-answer ${answer.isCorrect ? 'correct' : ''}" type="button">
        <span>${String.fromCharCode(65 + index)}</span>
        <strong
          contenteditable="true"
          data-answer-index="${index}"
          oninput="updateAnswerText(${index}, this.textContent)"
        >${this.escapeHtml(answer.text || `Ответ ${index + 1}`)}</strong>
      </button>
    `).join('');
  },

  renderPreviewMedia(question) {
    if (question.imageUrl) return `<img src="${question.imageUrl}" alt="">`;
    if (question.videoUrl) return `<video controls src="${question.videoUrl}"></video>`;
    if (question.audioUrl) return `<div class="preview-audio-chip">Аудио прикреплено</div><audio controls src="${question.audioUrl}"></audio>`;
    return '';
  },

  renderSpecialLayout(question) {
    const type = question.gameMode || question.type || 'EVERYONE_ANSWERS';
    const config = this.parseConfig(question);
    const slideType = config.slideType || 'QUESTION';
    const previewMode = slideType !== 'QUESTION' ? slideType : type;

    if (previewMode === 'JEOPARDY_ROUND' || previewMode === 'TRIVIA_BOARD') {
      const categories = config.categories || ['Тема 1', 'Тема 2', 'Тема 3', 'Тема 4'];
      const values = config.values || [100, 200, 300, 400, 500];
      return `
        <div class="special-layout-header">
          <span>Сетка категорий</span>
          <span class="badge">Редактируемая</span>
        </div>
        <div class="jeopardy-grid">
          ${categories.map((category, index) => `
            <div class="jeopardy-cell jeopardy-head" contenteditable="true" oninput="QuestionEditorComponent.updateJeopardyCategory(${index}, this.textContent)">${this.escapeHtml(category)}</div>
          `).join('')}
          ${values.flatMap((value, valueIndex) => categories.map(() => `
            <div class="jeopardy-cell" contenteditable="true" oninput="QuestionEditorComponent.updateJeopardyValue(${valueIndex}, this.textContent)">${this.escapeHtml(String(value))}</div>
          `)).join('')}
        </div>
      `;
    }

    if (previewMode === 'MILLIONAIRE_ROUND' || previewMode === 'TRIVIA_LADDER') {
      const ladder = config.ladder || [100, 200, 400, 800, 1500, 3000, 6000, 12000, 25000, 50000, 100000, 250000, 500000, 1000000];
      return `
        <div class="special-layout-header">
          <span>Лестница призов</span>
          <span class="badge">Редактируемая</span>
        </div>
        <div class="millionaire-layout">
          ${ladder.map((value, index) => `
            <div class="ladder-step ${index === ladder.length - 1 ? 'top' : ''}" contenteditable="true" oninput="QuestionEditorComponent.updateMillionaireValue(${index}, this.textContent)">${this.escapeHtml(String(value))}</div>
          `).join('')}
        </div>
      `;
    }

    const callouts = {
      FASTEST_FINGER: 'Режим на скорость: игроки отвечают первыми, блокировка включена.',
      WAGER: 'Игроки делают ставку перед ответом.',
      MAJORITY_RULES: 'Показывайте популярные ответы по одному.',
      DECREASING_POINTS: 'Очки снижаются от стартовых к финальным по мере времени.',
      LAST_MAN_STANDING: 'Неверный ответ исключает игрока до финала.',
      ROUND_END: 'Слайд завершает раунд и готовит переход к следующей части.',
      DEMOGRAPHIC: 'Слайд делит участников на группы по выбранному признаку.',
      AUDIENCE_RESPONSE: 'Опрос без влияния на очки, результаты можно показать графиком.',
      TRIVIA_FEUD: 'Режим 100 к 1: угадывание самых популярных ответов.',
      SPEED_ROUND: 'Серия быстрых вопросов с общим таймером.',
      BINGO: 'Режим бинго с проверкой заявок и подсчетом очков.',
      GAME_MODULE: 'Слайд запускает отдельный игровой модуль.',
    };

    return callouts[previewMode] ? `<div class="mode-callout">${callouts[previewMode]}</div>` : '';
  },

  updateJeopardyCategory(index, value) {
    const question = this.getCurrentQuestion();
    if (!question) return;
    const config = this.parseConfig(question);
    const categories = Array.isArray(config.categories) ? [...config.categories] : ['Тема 1', 'Тема 2', 'Тема 3', 'Тема 4'];
    categories[index] = value.trim() || categories[index];
    const updated = { ...config, categories };
    question.configJson = JSON.stringify(updated);
    this.pushInlineConfigUpdate(question);
  },

  updateJeopardyValue(index, value) {
    const question = this.getCurrentQuestion();
    if (!question) return;
    const config = this.parseConfig(question);
    const values = Array.isArray(config.values) ? [...config.values] : [100, 200, 300, 400, 500];
    const parsed = parseInt(value.replace(/\D/g, ''), 10);
    values[index] = Number.isNaN(parsed) ? values[index] : parsed;
    const updated = { ...config, values };
    question.configJson = JSON.stringify(updated);
    this.pushInlineConfigUpdate(question);
  },

  updateMillionaireValue(index, value) {
    const question = this.getCurrentQuestion();
    if (!question) return;
    const config = this.parseConfig(question);
    const ladder = Array.isArray(config.ladder) ? [...config.ladder] : [100, 200, 400, 800, 1500, 3000, 6000, 12000, 25000, 50000, 100000, 250000, 500000, 1000000];
    const parsed = parseInt(value.replace(/\D/g, ''), 10);
    ladder[index] = Number.isNaN(parsed) ? ladder[index] : parsed;
    const updated = { ...config, ladder };
    question.configJson = JSON.stringify(updated);
    this.pushInlineConfigUpdate(question);
  },

  parseConfig(question) {
    if (!question?.configJson) return {};
    try {
      return typeof question.configJson === 'string'
        ? JSON.parse(question.configJson)
        : question.configJson;
    } catch (error) {
      return {};
    }
  },

  getCurrentQuestion() {
    if (typeof currentQuestionIndex === 'undefined' || typeof questions === 'undefined') return null;
    return questions[currentQuestionIndex] || null;
  },

  pushInlineConfigUpdate(question) {
    if (typeof questions !== 'undefined' && typeof currentQuestionIndex === 'number') {
      questions[currentQuestionIndex] = question;
    }
    if (window.ConstructorState && typeof questions !== 'undefined') {
      window.ConstructorState.setQuestions(questions);
    }
    if (typeof updateSaveStatus === 'function') {
      updateSaveStatus('Есть несохраненные изменения', 'dirty');
    }
  },

  /**
   * РћР±РЅРѕРІР»СЏРµС‚ UI РґР»СЏ РІРѕРїСЂРѕСЃР° С‚РёРїР° TRUEFALSE.
   * @param {Object} question
   */
  updateTrueFalseUI(question) {
    const select = document.getElementById('trueFalseSelect');
    if (select) {
      const correctAnswer = question.answers?.find(a => a.isCorrect);
      select.value = correctAnswer ? (correctAnswer.text === 'Правда' ? 'true' : 'false') : 'true';
    }
  },

  /**
   * РЎРёРЅС…СЂРѕРЅРёР·РёСЂСѓРµС‚ РїСЂРµРІСЊСЋ РјРµРґРёР°.
   * @param {Object} question
   */
  syncMediaPreview(question) {
    const preview = document.getElementById('mediaPreview');
    const uploadArea = document.getElementById('mediaUploadArea');

    if (!preview || !uploadArea) return;

    preview.innerHTML = '';

    if (question.imageUrl) {
      preview.innerHTML = `<img src="${question.imageUrl}" alt="" style="max-width: 100%; border-radius: 8px;" onerror="this.remove()">`;
      uploadArea.classList.add('has-file');
    } else if (question.audioUrl) {
      preview.innerHTML = `<audio controls style="width: 100%"><source src="${question.audioUrl}" type="audio/mpeg">Ваш браузер не поддерживает аудио.</audio>`;
      uploadArea.classList.add('has-file');
    } else if (question.videoUrl) {
      preview.innerHTML = `<video controls style="width: 100%; border-radius: 8px;"><source src="${question.videoUrl}" type="video/mp4">Ваш браузер не поддерживает видео.</video>`;
      uploadArea.classList.add('has-file');
    } else {
      uploadArea.classList.remove('has-file');
    }
  },

  /**
   * РћС‡РёС‰Р°РµС‚ РїСЂРµРІСЊСЋ РјРµРґРёР°.
   */
  clearMediaPreview() {
    const preview = document.getElementById('mediaPreview');
    const uploadArea = document.getElementById('mediaUploadArea');
    if (preview) preview.innerHTML = '';
    if (uploadArea) uploadArea.classList.remove('has-file');
  },

  /**
   * РћС‡РёС‰Р°РµС‚ СЂРµРґР°РєС‚РѕСЂ РѕС‚РІРµС‚РѕРІ.
   */
  clearAnswersEditor() {
    const container = document.getElementById('answersEditor');
    if (container) container.innerHTML = '';
  },

  getQuestionTypeLabel(type) {
    const labels = {
      TEXT: 'Текстовый вопрос',
      EVERYONE_ANSWERS: 'Все отвечают',
      FASTEST_FINGER: 'Кто быстрее',
      MULTIPLE_CORRECT: 'Несколько правильных',
      IMAGE: 'Вопрос с изображением',
      AUDIO: 'Вопрос с аудио',
      VIDEO: 'Вопрос с видео',
      TRUEFALSE: 'Правда / Ложь',
      TRUE_FALSE: 'Правда / Ложь',
      MULTIPLE: 'Выбор',
      ORDERED: 'Верный порядок',
      DECREASING_POINTS: 'Убывающие очки',
      WAGER: 'Ставка',
      MAJORITY_RULES: 'Большинство / Семейная',
      LAST_MAN_STANDING: 'Последний выживший',
      JEOPARDY_ROUND: 'Раунд «Своя игра»',
      MILLIONAIRE_ROUND: 'Раунд «Миллионер»',
      INFO_SLIDE: 'Инфо-слайд',
      ROUND_INTRO: 'Вступление раунда',
      ROUND_END: 'Конец раунда',
      DEMOGRAPHIC: 'Демографический',
      AUDIENCE_RESPONSE: 'Опрос аудитории',
      TRIVIA_BOARD: 'Табло вопросов',
      TRIVIA_LADDER: 'Лестница',
      TRIVIA_FEUD: '100 к 1',
      SPEED_ROUND: 'Быстрый раунд',
      BINGO: 'Бинго',
      GAME_MODULE: 'Игровой модуль',
      MULTIPLE_CHOICE: 'Множественный выбор',
      MULTIPLE_CORRECT_SINGLE_PICK: 'Несколько правильных (single)',
      MULTIPLE_CORRECT_MULTI_PICK: 'Несколько правильных (multi)',
      ORDERED_ANSWERS: 'Упорядочивание',
      OPEN_ENDED: 'Открытый ответ',
      NUMERIC_INPUT: 'Числовой ввод',
      TEXT_INPUT: 'Текстовый ввод',
      INITIAL_LETTER_INPUT: 'Первая буква',
    };

    return labels[type] || type || 'Элемент';
  },

  /**
   * Р­РєСЂР°РЅРёСЂСѓРµС‚ HTML РґР»СЏ Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё.
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Р­РєСЃРїРѕСЂС‚ С„СѓРЅРєС†РёР№ РґР»СЏ СЃРѕРІРјРµСЃС‚РёРјРѕСЃС‚Рё
window.updateQuestionEditorUI = (question) => QuestionEditorComponent.updateQuestionEditorUI(question);
window.renderQuestionSpecificInputs = (question) => QuestionEditorComponent.renderQuestionSpecificInputs(question);
window.syncMediaPreview = (question) => QuestionEditorComponent.syncMediaPreview(question);
window.applyQuestionTypeUI = (type) => QuestionEditorComponent.applyQuestionTypeUI(type);
window.renderAnswersEditor = (answers) => QuestionEditorComponent.renderAnswersEditor(answers);

// Р­РєСЃРїРѕСЂС‚ РєРѕРјРїРѕРЅРµРЅС‚Р°
window.QuestionEditorComponent = window.QuestionEditorComponent || QuestionEditorComponent;

