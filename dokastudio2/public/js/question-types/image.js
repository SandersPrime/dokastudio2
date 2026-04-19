// Image.js — Вопрос с картинкой
class ImageQuestionType extends QuestionType {
    constructor() {
        super();
        this.type = 'IMAGE';
        this.name = 'Картинка';
        this.icon = '🖼️';
        this.hasMedia = true;
        this.mediaType = 'image';
        this.hasAnswers = true;
    }

    renderEditor(question) {
        document.getElementById('answersSection').style.display = 'block';
        document.getElementById('trueFalseSection').style.display = 'none';
        document.getElementById('mediaUploadSection').style.display = 'block';
        
        // Настраиваем accept для input
        const fileInput = document.getElementById('mediaFile');
        if (fileInput) fileInput.accept = 'image/*';
        
        // Показываем превью, если есть
        if (question.imageUrl) {
            showMediaPreview(question.imageUrl, 'IMAGE');
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
            errors.push('Загрузите картинку для вопроса');
        }
        return errors;
    }

    renderForGame(question, index) {
        return {
            ...super.renderForGame(question, index),
            imageUrl: question.imageUrl,
            answers: question.answers || []
        };
    }
}

QuestionTypeFactory.register(ImageQuestionType);