class MajorityRulesQuestionType extends QuestionType {
    constructor() {
        super();
        this.type = 'MAJORITY';
        this.name = 'Большинство';
        this.icon = '👥';
        this.hasMedia = true;
        this.hasAnswers = true;
    }

    renderEditor(question) {
        document.getElementById('answersSection').style.display = 'block';
        document.getElementById('trueFalseSection').style.display = 'none';
        document.getElementById('mediaUploadSection').style.display = 'block';
    }

    renderForGame(question) {
        return {
            type: this.type,
            text: question.text,
            points: question.points,
            timeLimit: question.timeLimit,
            answers: question.answers || [],
            correctAnswerMode: 'majority'
        };
    }
}
QuestionTypeFactory.register(MajorityRulesQuestionType);