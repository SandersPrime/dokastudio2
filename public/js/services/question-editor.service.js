// public/js/services/question-editor.service.js

/**
 * Сервис для нормализации и обработки данных вопроса из формы редактора.
 * Вынесен из quiz-constructor.js для разделения ответственности.
 */
const QuestionEditorService = {
  /**
   * Собирает и нормализует данные вопроса из DOM-элементов.
   * @param {Object} question - Исходный объект вопроса
   * @param {Document} document - DOM-документ (для тестирования)
   * @returns {Object} Нормализованный объект вопроса
   */
  normalizeFormData(question, document = window.document) {
    const type = question.type || 'TEXT';
    const formValues = this.collectFormValues(type, document);
    const answers = this.collectAnswers(formValues.type, document);

    return {
      ...question,
      ...formValues,
      answers,
    };
  },

  /**
   * Собирает базовые значения формы.
   * @param {Document} document
   * @returns {Object}
   */
  collectFormValues(type, document) {
    const selectedType = document.getElementById('questionTypeSelect')?.value || type;
    return {
      text: this.getValue(document, 'questionText'),
      subtitle: this.getValue(document, 'questionSubtitle'),
      points: this.getIntValue(document, 'questionPoints', 100),
      timeLimit: this.getIntValue(document, 'questionTime', 30),
      type: selectedType,
      gameMode: selectedType,
      layoutType: this.getLayoutTypeForMode(selectedType),
      backgroundColor: this.getValue(document, 'backgroundColor'),
      backgroundImageUrl: this.getValue(document, 'backgroundImageUrl'),
      configJson: this.buildModeConfig(selectedType, document),
    };
  },

  getLayoutTypeForMode(type) {
    if (type === 'INFO_SLIDE') return 'INFO_SLIDE';
    if (type === 'ROUND_INTRO') return 'ROUND_INTRO';
    if (['JEOPARDY_ROUND', 'MILLIONAIRE_ROUND'].includes(type)) return 'GAME_ROUND';
    return 'QUESTION';
  },

  buildModeConfig(type, document) {
    const baseConfig = {
      mode: type,
      backgroundColor: this.getValue(document, 'backgroundColor'),
      backgroundImageUrl: this.getValue(document, 'backgroundImageUrl'),
    };

    if (type === 'JEOPARDY_ROUND') {
      return JSON.stringify({
        ...baseConfig,
        categories: ['Тема 1', 'Тема 2', 'Тема 3', 'Тема 4'],
        values: [100, 200, 300, 400, 500],
      });
    }

    if (type === 'MILLIONAIRE_ROUND') {
      return JSON.stringify({
        ...baseConfig,
        ladder: [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000],
      });
    }

    return JSON.stringify(baseConfig);
  },

  /**
   * Собирает ответы в зависимости от типа вопроса.
   * @param {string} type - Тип вопроса
   * @param {Document} document
   * @returns {Array<Object>}
   */
  collectAnswers(type, document) {
    if (['INFO_SLIDE', 'ROUND_INTRO', 'JEOPARDY_ROUND'].includes(type)) {
      return [];
    }

    if (type === 'TRUEFALSE' || type === 'TRUE_FALSE') {
      const isCorrect = document.getElementById('trueFalseSelect')?.value === 'true';
      return [
        { text: 'Правда', isCorrect, order: 0 },
        { text: 'Ложь', isCorrect: !isCorrect, order: 1 },
      ];
    }

    const answers = [];
    const editor = document.getElementById('answersEditor');
    if (!editor) return answers;

    const answerElements = editor.querySelectorAll('.answer-item');
    answerElements.forEach((el, index) => {
      const text = el.querySelector('.answer-input')?.value?.trim() || '';
      const isCorrect = el.classList.contains('correct');
      answers.push({
        text,
        isCorrect,
        order: index,
      });
    });

    return answers;
  },

  /**
   * Собирает расширенные настройки вопроса.
   * @param {Document} document
   * @returns {Object}
   */
  collectAdvancedSettings(document) {
    const getValue = (id, fallback = '') => {
      const el = document.getElementById(id);
      return el ? el.value || fallback : fallback;
    };

    const getChecked = (id, fallback = true) => {
      const el = document.getElementById(id);
      return el ? el.checked : fallback;
    };

    return {
      pointsAtStart: this.getIntValue(document, 'pointsAtStart', 100),
      pointsAtEnd: this.getIntValue(document, 'pointsAtEnd', 100),
      penaltyPoints: this.getIntValue(document, 'penaltyPoints', 0),
      penaltyNoAnswer: this.getIntValue(document, 'penaltyNoAnswer', 0),
      speedBonus1: this.getIntValue(document, 'speedBonus1', 0),
      speedBonus2: this.getIntValue(document, 'speedBonus2', 0),
      speedBonus3: this.getIntValue(document, 'speedBonus3', 0),
      countdownMode: getValue('countdownMode', 'auto'),
      textReveal: getValue('textReveal', 'none'),
      demographicGroup: getValue('demographicGroup', ''),
      slideRouting: getValue('slideRouting', ''),
      notes: getValue('questionNotes', ''),
      backgroundColor: getValue('backgroundColor', ''),
      backgroundImageUrl: getValue('backgroundImageUrl', ''),
      autoJudge: getChecked('autoJudge', true),
      lockoutOnWrong: getChecked('lockoutOnWrong', true),
      showCorrectAnswer: getChecked('showCorrectAnswer', true),
      jokersEnabled: getChecked('jokersEnabled', true),
    };
  },

  /**
   * Вспомогательная функция для получения значения из элемента.
   * @param {Document} document
   * @param {string} id
   * @param {string} fallback
   * @returns {string}
   */
  getValue(document, id, fallback = '') {
    const el = document.getElementById(id);
    return el ? el.value.trim() : fallback;
  },

  /**
   * Вспомогательная функция для получения числового значения.
   * @param {Document} document
   * @param {string} id
   * @param {number} fallback
   * @returns {number}
   */
  getIntValue(document, id, fallback = 0) {
    const value = this.getValue(document, id);
    const num = parseInt(value, 10);
    return isNaN(num) ? fallback : num;
  },
};

// Экспорт для использования в других модулях
window.QuestionEditorService = QuestionEditorService;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuestionEditorService;
}
