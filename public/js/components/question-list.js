// public/js/components/question-list.js

/**
 * Компонент отображения списка вопросов.
 * Вынесен из constructor-ui.js.
 */
const QuestionListComponent = {
  /**
   * Отрисовывает список вопросов.
   * @param {Array<Object>} questions
   * @param {number} currentQuestionIndex
   * @param {string} editFunctionName - Имя функции для редактирования
   */
  renderQuestionsList(questions, currentQuestionIndex = -1, editFunctionName = 'editQuestion') {
    const container = document.getElementById('questionsList');
    if (!container) return;

    container.innerHTML = questions.map((question, index) => {
      const text = question.text || 'Без текста';
      const typeLabel = this.getQuestionTypeLabel(question.type);
      const isActive = index === currentQuestionIndex;
      const layoutLabel = question.layoutType || 'QUESTION';

      return `
        <div class="question-item ${isActive ? 'active' : ''}" data-id="${question.id || question.tempId}" draggable="true">
          <div class="d-flex items-center gap-2">
            <button type="button" class="btn btn-outline btn-xs drag-handle">☰</button>
            <div class="flex-1" onclick="${editFunctionName}(${index})">
              <div class="question-text">${this.escapeHtml(text)}</div>
              <div class="question-meta">
                <span class="badge">${typeLabel}</span>
                <span>${layoutLabel}</span>
                <span>${question.points} баллов</span>
                <span>${question.timeLimit} сек</span>
              </div>
            </div>
            <button type="button" class="btn btn-danger btn-xs" onclick="deleteCurrentQuestion()">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Получает метку для типа вопроса.
   * @param {string} type
   * @returns {string}
   */
  getQuestionTypeLabel(type) {
    const labels = {
      TEXT: 'Текст',
      EVERYONE_ANSWERS: 'Everyone Answers',
      FASTEST_FINGER: 'Fastest Finger',
      MULTIPLE_CORRECT: 'Multiple Correct',
      IMAGE: 'Изображение',
      AUDIO: 'Аудио',
      VIDEO: 'Видео',
      TRUEFALSE: 'Правда/Ложь',
      TRUE_FALSE: 'Правда/Ложь',
      MULTIPLE: 'Выбор',
      ORDERED: 'Сортировка',
      DECREASING_POINTS: 'Decreasing Points',
      WAGER: 'Wager',
      MAJORITY_RULES: 'Majority Rules',
      LAST_MAN_STANDING: 'Last Man Standing',
      JEOPARDY_ROUND: 'Jeopardy Round',
      MILLIONAIRE_ROUND: 'Millionaire Round',
      INFO_SLIDE: 'Info Slide',
      ROUND_INTRO: 'Round Intro',
      RATING: 'Рейтинг',
      WORDCLOUD: 'Облако слов',
      MAJORITYRULES: 'Большинство',
      BILLBOARD: 'Билборд',
      WAGER: 'Ставка'
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

// Экспорт для совместимости
window.renderQuestionsList = (questions, currentQuestionIndex, editFunctionName) => 
  QuestionListComponent.renderQuestionsList(questions, currentQuestionIndex, editFunctionName);

// Экспорт компонента
window.QuestionListComponent = window.QuestionListComponent || QuestionListComponent;
