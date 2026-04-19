class RatingQuestionType extends QuestionType {
    constructor() {
        super();
        this.type = 'RATING';
        this.name = 'Оценка';
        this.icon = '⭐';
        this.hasMedia = false;
        this.hasAnswers = false;
    }

    renderForGame(question) {
        return {
            type: this.type,
            text: question.text,
            min: 1,
            max: 5,
            labels: ['Плохо', 'Отлично']
        };
    }
}
QuestionTypeFactory.register(RatingQuestionType);