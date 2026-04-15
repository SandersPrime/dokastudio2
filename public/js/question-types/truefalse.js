// TrueFalse.js — Правда/Ложь
class TrueFalseQuestionType extends QuestionType {
    constructor() {
        super();
        this.type = 'TRUEFALSE';
        this.name = 'Правда/Ложь';
        this.icon = '✅';
        this.hasMedia = false;
        this.hasAnswers = false;
    }

    renderEditor(question) {
        document.getElementById('answersSection').style.display = 'none';
        document.getElementById('trueFalseSection').style.display = 'block';
        document.getElementById('mediaUploadSection').style.display = 'none';
        
        // Устанавливаем значение из данных вопроса
        const select = document.getElementById('trueFalseSelect');
        if (select) {
            const isTrue = question.answers?.[0]?.isCorrect;
            select.value = isTrue ? 'true' : 'false';
        }
    }

    getDataFromEditor() {
        const select = document.getElementById('trueFalseSelect');
        const isTrue = select?.value === 'true';
        
        return {
            type: this.type,
            answers: [
                { text: 'Правда', isCorrect: isTrue },
                { text: 'Ложь', isCorrect: !isTrue }
            ]
        };
    }

    renderForGame(question, index) {
        return {
            ...super.renderForGame(question, index),
            answers: [
                { text: 'Правда', isCorrect: question.answers?.[0]?.isCorrect || false },
                { text: 'Ложь', isCorrect: !question.answers?.[0]?.isCorrect }
            ]
        };
    }
}

QuestionTypeFactory.register(TrueFalseQuestionType);