// public/js/state/constructor.state.js

/**
 * Централизованное состояние для конструктора викторин.
 * Заменяет собой window.QuizEditorState.
 * @type {ConstructorState}
 */
window.ConstructorState = (function () {
  /**
   * @typedef {Object} ConstructorState
   * @property {Object|null} currentQuiz - Текущий квиз
   * @property {Array<Object>} questions - Список вопросов
   * @property {number} currentQuestionIndex - Индекс текущего вопроса
   * @property {boolean} isDirty - Есть ли несохранённые изменения
   * @property {boolean} isSaving - Идёт ли сохранение
   * @property {string|null} lastSavedAt - Время последнего сохранения
   */
  const state = {
    currentQuiz: null,
    questions: [],
    currentQuestionIndex: -1,
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
  };

  const listeners = [];

  return {
    /**
     * Получить текущее состояние
     * @returns {ConstructorState}
     */
    getState() {
      return { ...state };
    },

    /**
     * Установить текущий квиз
     * @param {Object|null} quiz
     */
    setCurrentQuiz(quiz) {
      state.currentQuiz = quiz;
      this._notify();
    },

    /**
     * Установить список вопросов
     * @param {Array<Object>} questions
     */
    setQuestions(questions) {
      state.questions = Array.isArray(questions) ? [...questions] : [];
      state.isDirty = true;
      this._notify();
    },

    /**
     * Установить текущий индекс вопроса
     * @param {number} index
     */
    setCurrentQuestionIndex(index) {
      state.currentQuestionIndex = index;
      this._notify();
    },

    /**
     * Отметить, что изменения сохранены
     */
    markSaved() {
      state.isDirty = false;
      state.lastSavedAt = new Date().toISOString();
      this._notify();
    },

    /**
     * Начать сохранение
     */
    startSaving() {
      state.isSaving = true;
      this._notify();
    },

    /**
     * Завершить сохранение
     */
    stopSaving() {
      state.isSaving = false;
      this._notify();
    },

    /**
     * Подписаться на изменения состояния
     * @param {Function} callback
     * @returns {Function} Функция отписки
     */
    subscribe(callback) {
      listeners.push(callback);
      return () => {
        const index = listeners.indexOf(callback);
        if (index > -1) listeners.splice(index, 1);
      };
    },

    /**
     * Уведомить всех подписчиков
     * @private
     */
    _notify() {
      listeners.forEach(callback => {
        try {
          callback({ ...state });
        } catch (error) {
          console.error('Error in state listener:', error);
        }
      });
    },

    /**
     * Сбросить состояние
     */
    reset() {
      state.currentQuiz = null;
      state.questions = [];
      state.currentQuestionIndex = -1;
      state.isDirty = false;
      state.isSaving = false;
      state.lastSavedAt = null;
      this._notify();
    }
  };
})();

// Экспорт для модульной системы (если потребуется)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.ConstructorState;
}