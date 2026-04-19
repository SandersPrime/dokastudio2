// Text.js — Текстовый вопрос
class TextQuestionType extends QuestionType {
    constructor() {
        super();
        this.type = 'TEXT';
        this.name = 'Текст';
        this.icon = '📝';
        this.hasMedia = false;
        this.hasAnswers = true;
    }

    renderEditor(question) {
        // Показываем секцию ответов, скрываем медиа
        document.getElementById('answersSection').style.display = 'block';
        document.getElementById('trueFalseSection').style.display = 'none';
        document.getElementById('mediaUploadSection').style.display = 'none';
    }

    getDataFromEditor() {
        return {
            type: this.type
        };
    }

    renderForGame(question, index) {
        return {
            ...super.renderForGame(question, index),
            answers: question.answers || []
        };
    }
}

QuestionTypeFactory.register(TextQuestionType);