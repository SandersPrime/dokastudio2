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

    this.applyQuestionTypeUI(question.type);
    this.populateQuestionForm(question);
    this.renderAnswersEditor(question.answers);
    this.syncMediaPreview(question);
    this.renderQuestionSpecificInputs(question);
  },

  /**
   * Очищает редактор.
   */
  clearEditor() {
    const elements = [
      'questionText', 'questionPoints', 'questionTime',
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
  },

  /**
   * Применяет UI в зависимости от типа вопроса.
   * @param {string} type
   */
  applyQuestionTypeUI(type) {
    const mediaSection = document.getElementById('mediaUploadSection');
    const trueFalseSection = document.getElementById('trueFalseSection');
    const answersSection = document.getElementById('answersSection');

    if (mediaSection) mediaSection.style.display = ['IMAGE', 'AUDIO', 'VIDEO'].includes(type) ? 'block' : 'none';
    if (trueFalseSection) trueFalseSection.style.display = type === 'TRUEFALSE' ? 'block' : 'none';
    if (answersSection) answersSection.style.display = type !== 'TRUEFALSE' ? 'block' : 'none';
  },

  /**
   * Заполняет основную форму вопроса.
   * @param {Object} question
   */
  populateQuestionForm(question) {
    const fields = {
      'questionText': question.text,
      'questionPoints': question.points,
      'questionTime': question.timeLimit,
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
    if (question.type === 'TRUEFALSE') {
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
            oninput="updateAnswerText(${index}, this.value)"
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
    if (question.type === 'TRUEFALSE') {
      this.updateTrueFalseUI(question);
    }
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