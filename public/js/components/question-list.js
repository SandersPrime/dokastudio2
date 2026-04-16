// public/js/components/question-list.js

const QuestionListComponent = {
  renderQuestionsList(questions, currentQuestionIndex = -1, editFunctionName = 'editQuestion') {
    const container = document.getElementById('questionsList');
    if (!container) return;

    const items = Array.isArray(questions) ? questions : [];

    if (!items.length) {
      container.innerHTML = `
        <div class="empty-state outline-empty">
          <div class="outline-empty-icon">＋</div>
          <div>
            <strong>Начните собирать квиз</strong>
            <p>Добавьте первый элемент: вопрос, инфо-слайд или раунд.</p>
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
      const type = question.gameMode || question.type || 'EVERYONE_ANSWERS';
      const typeLabel = this.getQuestionTypeLabel(type);
      const isActive = index === currentQuestionIndex;
      const elementType = question.elementType || question.layoutType || 'QUESTION';
      const icon = this.getElementIcon(elementType, type);
      const meta = `${question.points ?? 0} баллов · ${question.timeLimit ?? 30} сек`;
      const answers = Array.isArray(question.answers) ? question.answers.slice(0, 4) : [];

      return `
        <div class="question-item slide-thumb ${isActive ? 'active' : ''}" data-id="${question.id || question.tempId}" draggable="true" tabindex="0" aria-label="${this.escapeHtml(text)}" onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); ${editFunctionName}(${index}); }">
          <div class="slide-thumb-number">${index + 1}</div>
          <button type="button" class="slide-thumb-preview" onclick="${editFunctionName}(${index})" aria-label="Открыть элемент ${index + 1}">
            <div class="slide-thumb-canvas ${this.getThumbClass(elementType, type)}">
              <div class="slide-thumb-title">${this.escapeHtml(text)}</div>
              ${answers.length ? `
                <div class="slide-thumb-answers">
                  ${answers.map((answer, answerIndex) => `
                    <span class="${answer.isCorrect ? 'correct' : ''}">${String.fromCharCode(65 + answerIndex)}</span>
                  `).join('')}
                </div>
              ` : `<div class="slide-thumb-icon">${icon}</div>`}
            </div>
          </button>
          <div class="slide-thumb-meta" onclick="${editFunctionName}(${index})">
            <strong>${this.escapeHtml(text)}</strong>
            <span>${this.escapeHtml(typeLabel)}</span>
            <small>${this.escapeHtml(elementType)} · ${meta}</small>
          </div>
          <div class="slide-thumb-tools">
            <button type="button" class="btn btn-outline btn-xs drag-handle" title="Перетащить">☰</button>
            <button type="button" class="btn btn-danger btn-xs" onclick="${editFunctionName}(${index}); deleteCurrentQuestion()">×</button>
          </div>
        </div>
      `;
    }).join('');
  },

  getThumbClass(elementType, type) {
    if (elementType === 'INFO_SLIDE') return 'is-info';
    if (elementType === 'ROUND_INTRO') return 'is-intro';
    if (elementType === 'GAME_ROUND' || ['JEOPARDY_ROUND', 'MILLIONAIRE_ROUND'].includes(type)) return 'is-round';
    return 'is-question';
  },

  getElementIcon(elementType, type) {
    if (['INFO_SLIDE', 'ROUND_INTRO'].includes(elementType)) return 'i';
    if (elementType === 'GAME_ROUND' || ['JEOPARDY_ROUND', 'MILLIONAIRE_ROUND'].includes(type)) return 'R';
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
      RATING: 'Рейтинг',
      WORDCLOUD: 'Облако слов',
      MAJORITYRULES: 'Большинство',
      BILLBOARD: 'Билборд',
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
