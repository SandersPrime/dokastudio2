// Base.js — Базовый класс для всех типов вопросов
class QuestionType {
    constructor() {
        this.type = 'BASE';
        this.name = 'Базовый тип';
        this.icon = '📝';
        this.hasMedia = false;
        this.hasAnswers = true;
        this.mediaType = null; // 'image', 'audio', 'video'
    }

    // Рендерит UI для редактирования (вызывается при выборе типа)
    renderEditor(question) {
        console.warn('renderEditor должен быть переопределён');
    }

    // Получает данные из UI перед сохранением
    getDataFromEditor() {
        console.warn('getDataFromEditor должен быть переопределён');
        return {};
    }

    // Валидация перед сохранением
    validate(question) {
        const errors = [];
        if (!question.text || question.text.trim() === '') {
            errors.push('Текст вопроса обязателен');
        }
        return errors;
    }

    // Рендерит превью для списка вопросов
    renderPreview(question) {
        return `
            <div class="question-preview">
                <strong>${question.text || 'Без текста'}</strong>
                <span class="badge">${this.icon} ${this.name}</span>
            </div>
        `;
    }

    // Рендерит вопрос для игры (то, что видит игрок)
    renderForGame(question, index) {
        return {
            type: this.type,
            text: question.text,
            points: question.points,
            timeLimit: question.timeLimit
        };
    }
}

// Фабрика типов вопросов
class QuestionTypeFactory {
    static types = {};
    
    static register(typeClass) {
        const instance = new typeClass();
        this.types[instance.type] = instance;
    }
    
    static getType(type) {
        return this.types[type] || this.types['TEXT'];
    }
    
    static getAllTypes() {
        return Object.values(this.types);
    }
}