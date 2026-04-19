// Video.js — Видео-вопрос
class VideoQuestionType extends QuestionType {
    constructor() {
        super();
        this.type = 'VIDEO';
        this.name = 'Видео';
        this.icon = '🎬';
        this.hasMedia = true;
        this.mediaType = 'video';
        this.hasAnswers = true;
    }

    renderEditor(question) {
        document.getElementById('answersSection').style.display = 'block';
        document.getElementById('trueFalseSection').style.display = 'none';
        document.getElementById('mediaUploadSection').style.display = 'block';
        
        const fileInput = document.getElementById('mediaFile');
        if (fileInput) fileInput.accept = 'video/*';
        
        if (question.imageUrl) {
            showMediaPreview(question.imageUrl, 'VIDEO');
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
            errors.push('Загрузите видеофайл');
        }
        return errors;
    }

    renderForGame(question, index) {
        return {
            ...super.renderForGame(question, index),
            videoUrl: question.imageUrl,
            answers: question.answers || []
        };
    }
}

QuestionTypeFactory.register(VideoQuestionType);