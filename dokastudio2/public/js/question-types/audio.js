// Audio.js — Аудио-вопрос
class AudioQuestionType extends QuestionType {
    constructor() {
        super();
        this.type = 'AUDIO';
        this.name = 'Аудио';
        this.icon = '🎵';
        this.hasMedia = true;
        this.mediaType = 'audio';
        this.hasAnswers = true;
    }

    renderEditor(question) {
        document.getElementById('answersSection').style.display = 'block';
        document.getElementById('trueFalseSection').style.display = 'none';
        document.getElementById('mediaUploadSection').style.display = 'block';
        
        const fileInput = document.getElementById('mediaFile');
        if (fileInput) fileInput.accept = 'audio/*';
        
        if (question.imageUrl) {
            showMediaPreview(question.imageUrl, 'AUDIO');
        }
    }

    getDataFromEditor() {
        return {
            type: this.type
        };
    }

    validate(question) {
        const errors = super.validate(question);
        if (this.hasMedia && !question.imageUrl) {
            errors.push('Загрузите аудиофайл');
        }
        return errors;
    }

    renderForGame(question, index) {
        return {
            ...super.renderForGame(question, index),
            audioUrl: question.imageUrl,
            answers: question.answers || []
        };
    }
}

QuestionTypeFactory.register(AudioQuestionType);