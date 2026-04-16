// public/js/components/question-editor.js

/**
 * Компонент редактора вопроса.
 * Вынесен из constructor-ui.js.
 */
const QuestionEditorComponent = {
  /**
   * Обновляет UI редактора под текущий вопрос.
   * @param {Object|null} question
   */
  updateQuestionEditorUI(question) {
    if (!question) {
      this.clearEditor();
      return;
    }

    this.showEditorContent();
    this.applyQuestionTypeUI(question.type);
    this.populateQuestionForm(question);
    this.renderAnswersEditor(question.answers);
    this.syncMediaPreview(question);
    this.renderQuestionSpecificInputs(question);
    this.renderStudioPreview(question);
  },

  /**
   * Очищает редактор.
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
   * Применяет UI в зависимости от типа вопроса.
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
   * Заполняет основную форму вопроса.
   * @param {Object} question
   */
  populateQuestionForm(question) {
    const fields = {
      'questionText': question.text,
      'questionSubtitle': question.subtitle,
      'questionPoints': question.points,
      'questionTime': question.timeLimit,
      'questionTypeSelect': question.type,
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
    if (question.type === 'TRUEFALSE' || question.type === 'TRUE_FALSE') {
      const select = document.getElementById('trueFalseSelect');
      if (select) {
        const correctAnswer = question.answers?.find(a => a.isCorrect);
        select.value = correctAnswer ? (correctAnswer.text === 'Правда' ? 'true' : 'false') : 'true';
      }
    }
  },

  /**
   * Отрисовывает редактор ответов.
   * @param {Array<Object>} answers
   */
  renderAnswersEditor(answers = []) {
    const container = document.getElementById('answersEditor');
    if (!container) return;

    container.innerHTML = answers.map((answer, index) => `
      <div class="answer-item ${answer.isCorrect ? 'correct' : ''}" data-index="${index}">
        <div class="d-flex items-center gap-2">
          <button type="button" class="btn btn-outline btn-xs drag-handle">☰</button>
          <input
            type="text"
            class="input answer-input flex-1"
            value="${this.escapeHtml(answer.text)}"
            placeholder="Введите ответ..."
            oninput="updateAnswerText(${index}, this.value); syncPreviewFromProperties()"
          >
          <button type="button" class="btn btn-success btn-xs" onclick="setCorrectAnswer(${index})">
            ${answer.isCorrect ? '✅' : '☑️'}
          </button>
          <button type="button" class="btn btn-danger btn-xs" onclick="removeAnswer(${index})">🗑️</button>
        </div>
      </div>
    `).join('');
  },

  /**
   * Отрисовывает специфичные для типа вопроса поля.
   * @param {Object} question
   */
  renderQuestionSpecificInputs(question) {
    // Можно расширить для других типов
    if (question.type === 'TRUEFALSE' || question.type === 'TRUE_FALSE') {
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

    const type = question.type || 'EVERYONE_ANSWERS';
    const typeLabel = this.getQuestionTypeLabel(type);
    canvas.dataset.mode = type;
    canvas.style.backgroundColor = question.backgroundColor || '#f6f8fb';
    canvas.style.backgroundImage = question.backgroundImageUrl ? `url("${question.backgroundImageUrl}")` : 'none';

    title.textContent = question.text || 'Введите текст вопроса';
    if (subtitle) subtitle.textContent = question.subtitle || '';
    if (typeBadge) typeBadge.textContent = typeLabel;
    if (modeLabel) modeLabel.textContent = question.layoutType || 'QUESTION';
    if (elementTitle) elementTitle.textContent = typeLabel;
    if (timer) timer.textContent = `${question.timeLimit || 30} сек`;
    if (points) points.textContent = `${question.points || 100} очков`;
    if (mediaLayer) mediaLayer.innerHTML = this.renderPreviewMedia(question);
    if (special) special.innerHTML = this.renderSpecialLayout(question);

    const answers = Array.isArray(question.answers) ? question.answers : [];
    answersGrid.style.display = ['INFO_SLIDE', 'ROUND_INTRO', 'JEOPARDY_ROUND'].includes(type) ? 'none' : 'grid';
    answersGrid.innerHTML = answers.map((answer, index) => `
      <button class="preview-answer ${answer.isCorrect ? 'correct' : ''}" type="button">
        <span>${String.fromCharCode(65 + index)}</span>
        <strong contenteditable="true" oninput="updateAnswerText(${index}, this.textContent); syncPreviewFromProperties()">${this.escapeHtml(answer.text || `Ответ ${index + 1}`)}</strong>
      </button>
    `).join('');
  },

  renderPreviewMedia(question) {
    if (question.imageUrl) return `<img src="${question.imageUrl}" alt="">`;
    if (question.videoUrl) return `<video controls src="${question.videoUrl}"></video>`;
    if (question.audioUrl) return `<div class="preview-audio-chip">Audio attached</div><audio controls src="${question.audioUrl}"></audio>`;
    return '';
  },

  renderSpecialLayout(question) {
    const type = question.type || 'EVERYONE_ANSWERS';

    if (type === 'JEOPARDY_ROUND') {
      const categories = ['Тема 1', 'Тема 2', 'Тема 3', 'Тема 4'];
      const values = [100, 200, 300, 400, 500];
      return `<div class="jeopardy-grid">${categories.map((category) => `<div class="jeopardy-cell jeopardy-head">${category}</div>`).join('')}${values.flatMap((value) => categories.map(() => `<div class="jeopardy-cell">${value}</div>`)).join('')}</div>`;
    }

    if (type === 'MILLIONAIRE_ROUND') {
      return `<div class="millionaire-layout">${[1000000, 500000, 250000, 125000, 64000, 32000, 16000, 8000, 4000, 2000, 1000].map((value, index) => `<div class="ladder-step ${index === 0 ? 'top' : ''}">${value.toLocaleString('ru-RU')} ₽</div>`).join('')}</div>`;
    }

    const callouts = {
      FASTEST_FINGER: 'Fastest response wins. Lockout is enabled for buzzer-style play.',
      WAGER: 'Players choose a wager before answering.',
      MAJORITY_RULES: 'Reveal popular answers one by one, Family Feud style.',
      DECREASING_POINTS: 'Score decreases from start points to end points while time runs.',
      LAST_MAN_STANDING: 'Wrong answers eliminate players until one remains.',
    };

    return callouts[type] ? `<div class="mode-callout">${callouts[type]}</div>` : '';
  },

  /**
   * Обновляет UI для вопроса типа TRUEFALSE.
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
   * Синхронизирует превью медиа.
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
   * Очищает превью медиа.
   */
  clearMediaPreview() {
    const preview = document.getElementById('mediaPreview');
    const uploadArea = document.getElementById('mediaUploadArea');
    if (preview) preview.innerHTML = '';
    if (uploadArea) uploadArea.classList.remove('has-file');
  },

  /**
   * Очищает редактор ответов.
   */
  clearAnswersEditor() {
    const container = document.getElementById('answersEditor');
    if (container) container.innerHTML = '';
  },

  getQuestionTypeLabel(type) {
    const labels = {
      EVERYONE_ANSWERS: 'Everyone Answers',
      FASTEST_FINGER: 'Fastest Finger',
      MULTIPLE_CORRECT: 'Multiple Correct',
      ORDERED: 'Ordered',
      TRUEFALSE: 'True / False',
      TRUE_FALSE: 'True / False',
      TEXT: 'Text',
      IMAGE: 'Image',
      AUDIO: 'Audio',
      VIDEO: 'Video',
      DECREASING_POINTS: 'Decreasing Points',
      WAGER: 'Wager',
      MAJORITY_RULES: 'Majority Rules',
      LAST_MAN_STANDING: 'Last Man Standing',
      JEOPARDY_ROUND: 'Jeopardy Round',
      MILLIONAIRE_ROUND: 'Millionaire Round',
      INFO_SLIDE: 'Info Slide',
      ROUND_INTRO: 'Round Intro',
    };
    return labels[type] || type;
  },

  /**
   * Экранирует HTML для безопасности.
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Экспорт функций для совместимости
window.updateQuestionEditorUI = (question) => QuestionEditorComponent.updateQuestionEditorUI(question);
window.renderQuestionSpecificInputs = (question) => QuestionEditorComponent.renderQuestionSpecificInputs(question);
window.syncMediaPreview = (question) => QuestionEditorComponent.syncMediaPreview(question);
window.applyQuestionTypeUI = (type) => QuestionEditorComponent.applyQuestionTypeUI(type);
window.renderAnswersEditor = (answers) => QuestionEditorComponent.renderAnswersEditor(answers);

// Экспорт компонента
window.QuestionEditorComponent = window.QuestionEditorComponent || QuestionEditorComponent;
