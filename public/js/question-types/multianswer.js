class MultiAnswerQuestionType extends QuestionType {
    constructor() {
        super();
        this.type = 'MULTIANSWER';
        this.name = 'Множественный выбор';
        this.icon = '☑️';
        this.hasMedia = true;
        this.hasAnswers = true;
    }

    renderEditor(question) {
        document.getElementById('answersSection').style.display = 'block';
        // Множественный выбор через чекбоксы
    }

    renderForGame(question) {
        return {
            type: this.type,
            text: question.text,
            points: question.points,
            timeLimit: question.timeLimit,
            answers: question.answers,
            multipleCorrect: true
        };
    }
}
QuestionTypeFactory.register(MultiAnswerQuestionType);