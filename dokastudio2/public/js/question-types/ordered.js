class OrderedQuestionType extends QuestionType {
    constructor() {
        super();
        this.type = 'ORDERED';
        this.name = 'Порядок';
        this.icon = '🔢';
        this.hasMedia = true;
        this.hasAnswers = true;
    }

    renderForGame(question) {
        return {
            type: this.type,
            text: question.text,
            points: question.points,
            timeLimit: question.timeLimit,
            answers: question.answers,
            correctOrder: question.answers.filter(a => a.isCorrect).map(a => a.order)
        };
    }
}
QuestionTypeFactory.register(OrderedQuestionType);