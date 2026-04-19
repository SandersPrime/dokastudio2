class BillboardQuestionType extends QuestionType {
    constructor() {
        super();
        this.type = 'BILLBOARD';
        this.name = 'Инфо-слайд';
        this.icon = '📺';
        this.hasMedia = true;
        this.hasAnswers = false;
        this.hasPoints = false;
        this.hasTimer = false;
    }

    renderEditor(question) {
        document.getElementById('answersSection').style.display = 'none';
        document.getElementById('trueFalseSection').style.display = 'none';
        document.getElementById('pointsSection').style.display = 'none';
        document.getElementById('timerSection').style.display = 'none';
        document.getElementById('mediaUploadSection').style.display = 'block';
    }

    renderForGame(question) {
        return {
            type: this.type,
            text: question.text,
            imageUrl: question.imageUrl,
            videoUrl: question.videoUrl,
            audioUrl: question.audioUrl,
            isInteractive: false
        };
    }
}
QuestionTypeFactory.register(BillboardQuestionType);