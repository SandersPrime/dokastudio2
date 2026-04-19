class CloudWordQuestionType extends QuestionType {
    constructor() {
        super();
        this.type = 'CLOUDWORD';
        this.name = 'Облако слов';
        this.icon = '☁️';
        this.hasMedia = false;
        this.hasAnswers = false;
    }

    renderEditor(question) {
        document.getElementById('answersSection').style.display = 'none';
        document.getElementById('trueFalseSection').style.display = 'none';
        document.getElementById('mediaUploadSection').style.display = 'none';
        // Показываем поле для сбора слов
    }

    renderForGame(question) {
        return {
            type: this.type,
            text: question.text,
            points: question.points,
            timeLimit: question.timeLimit,
            answers: [] // Ответы — свободный текст
        };
    }
}
QuestionTypeFactory.register(CloudWordQuestionType);