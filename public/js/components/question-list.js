// public/js/components/question-list.js

const QuestionListComponent = {
  parseConfig(question) {
    try {
      return question?.configJson
        ? (typeof question.configJson === 'string' ? JSON.parse(question.configJson) : question.configJson)
        : {};
    } catch (error) {
      return {};
    }
  },

  renderQuestionsList(questions, currentQuestionIndex = -1, editFunctionName = 'editQuestion') {
    const container = document.getElementById('questionsList');
    if (!container) return;
    const items = Array.isArray(questions) ? questions : [];

    if (!items.length) {
      container.innerHTML = `
        <div class="empty-state outline-empty">
          <div class="outline-empty-icon">+</div>
          <div>
            <strong>Начните собирать квиз</strong>
            <p>Добавьте первый элемент: вопрос, инфо-слайд или игровой модуль.</p>
          </div>
          <div class="outline-empty-actions">
            <button type="button" class="btn btn-primary btn-sm" onclick="addQuizElement('QUESTION')">+ Вопрос</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="addQuizElement('INFO_SLIDE')">+ Инфо</button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map((question, index) => {
      const text = question.text || 'Без текста';
      const cfg = this.parseConfig(question);
      const slideType = cfg.slideType || question.elementType || question.layoutType || 'QUESTION';
      const mode = cfg.inputMode || question.gameMode || question.type || 'EVERYONE_ANSWERS';
      const typeLabel = this.getQuestionTypeLabel(slideType === 'QUESTION' ? mode : slideType);
      const isActive = index === currentQuestionIndex;
      const elementType = question.elementType || question.layoutType || 'QUESTION';
      const icon = this.getElementIcon(elementType, slideType);
      const meta = `${question.points ?? 0} баллов · ${question.timeLimit ?? 30} сек`;
      const answers = Array.isArray(question.answers) ? question.answers.slice(0, 4) : [];

      return `
        <div class="question-item slide-thumb ${isActive ? 'active' : ''}" data-id="${question.id || question.tempId}" draggable="true" tabindex="0" aria-label="${this.escapeHtml(text)}" onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); ${editFunctionName}(${index}); }">
          <div class="slide-thumb-number">${index + 1}</div>
          <button type="button" class="slide-thumb-preview" onclick="${editFunctionName}(${index})" aria-label="Открыть элемент ${index + 1}">
            <div class="slide-thumb-canvas ${this.getThumbClass(elementType, slideType)}">
              <div class="slide-thumb-title">${this.escapeHtml(text)}</div>
              ${answers.length ? `<div class="slide-thumb-answers">${answers.map((answer, answerIndex) => `<span class="${answer.isCorrect ? 'correct' : ''}">${String.fromCharCode(65 + answerIndex)}</span>`).join('')}</div>` : `<div class="slide-thumb-icon">${icon}</div>`}
            </div>
          </button>
          <div class="slide-thumb-meta" onclick="${editFunctionName}(${index})">
            <strong>${this.escapeHtml(text)}</strong>
            <span>${this.escapeHtml(typeLabel)}</span>
            <small>${this.escapeHtml(elementType)} · ${meta}</small>
          </div>
          <div class="slide-thumb-tools">
            <button type="button" class="btn btn-outline btn-xs drag-handle" title="Перетащить">≡</button>
            <button type="button" class="btn btn-danger btn-xs" onclick="${editFunctionName}(${index}); deleteCurrentQuestion()">✕</button>
          </div>
        </div>
      `;
    }).join('');
  },

  getThumbClass(elementType, slideType) {
    if (elementType === 'INFO_SLIDE' || slideType === 'INFO_SLIDE') return 'is-info';
    if (['ROUND_INTRO', 'ROUND_END', 'GAME_MODULE'].includes(elementType) || slideType !== 'QUESTION') return 'is-round';
    return 'is-question';
  },

  getElementIcon(elementType, slideType) {
    if (['INFO_SLIDE', 'ROUND_INTRO'].includes(elementType) || slideType === 'INFO_SLIDE') return 'i';
    if (slideType !== 'QUESTION' || elementType === 'GAME_ROUND') return 'R';
    return '?';
  },

  getQuestionTypeLabel(type) {
    const labels = {
      TEXT: 'Текстовый вопрос',
      EVERYONE_ANSWERS: 'Все отвечают',
      FASTEST_FINGER: 'Кто быстрее',
      MULTIPLE_CORRECT: 'Несколько правильных',
      IMAGE: 'Изображение',
      AUDIO: 'Аудио',
      VIDEO: 'Видео',
      TRUE_FALSE: 'Правда / Ложь',
      ORDERED: 'Верный порядок',
      WAGER: 'Ставка',
      MAJORITY_RULES: 'Большинство',
      LAST_MAN_STANDING: 'Последний выживший',
      INFO_SLIDE: 'Инфо-слайд',
      ROUND_END: 'Конец раунда',
      DEMOGRAPHIC: 'Демографический',
      AUDIENCE_RESPONSE: 'Опрос аудитории',
      TRIVIA_BOARD: 'Trivia board',
      TRIVIA_LADDER: 'Trivia ladder',
      TRIVIA_FEUD: 'Trivia feud',
      SPEED_ROUND: 'Speed round',
      BINGO: 'Bingo',
      GAME_MODULE: 'Game module',
      MULTIPLE_CHOICE: 'Множественный выбор',
      MULTIPLE_CORRECT_SINGLE_PICK: 'Несколько правильных (single)',
      MULTIPLE_CORRECT_MULTI_PICK: 'Несколько правильных (multi)',
      ORDERED_ANSWERS: 'Упорядочивание',
      OPEN_ENDED: 'Открытый ответ',
      NUMERIC_INPUT: 'Числовой ввод',
      TEXT_INPUT: 'Текстовый ввод',
      INITIAL_LETTER_INPUT: 'Первая буква',
    };
    return labels[type] || type;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};

window.renderQuestionsList = (questions, currentQuestionIndex, editFunctionName) =>
  QuestionListComponent.renderQuestionsList(questions, currentQuestionIndex, editFunctionName);

window.QuestionListComponent = window.QuestionListComponent || QuestionListComponent;
