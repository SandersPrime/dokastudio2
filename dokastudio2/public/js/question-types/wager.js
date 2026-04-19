class WagerQuestionType extends QuestionType {
    constructor() {
        super();
        this.type = 'WAGER';
        this.name = 'Ставка';
        this.icon = '🎲';
        this.hasMedia = true;
        this.hasAnswers = true;
    }

    renderEditor(question) {
        document.getElementById('answersSection').style.display = 'block';
        document.getElementById('trueFalseSection').style.display = 'none';
        document.getElementById('mediaUploadSection').style.display = 'block';
    }

    getDataFromEditor() {
        const wagerPercentages = [];
        document.querySelectorAll('.wager-input').forEach(input => {
            wagerPercentages.push(parseInt(input.value) || 0);
        });
        return { wagerPercentages };
    }

    renderForGame(question) {
        return {
            type: this.type,
            text: question.text,
            answers: question.answers.map((a, i) => ({
                text: a.text,
                wagerPercent: question.wagerPercentages?.[i] || 0
            }))
        };
    }
}
QuestionTypeFactory.register(WagerQuestionType);