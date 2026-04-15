(function () {
    const QuizEditorState = {
        quizzes: [],
        currentQuiz: null,
        currentQuestion: null,
        selectedQuestionType: 'TEXT',
        setQuizzes(quizzes) { this.quizzes = Array.isArray(quizzes) ? quizzes : []; },
        setCurrentQuiz(quiz) { this.currentQuiz = quiz || null; },
        setCurrentQuestion(question) { this.currentQuestion = question || null; },
        setQuestionType(type) { this.selectedQuestionType = type || 'TEXT'; },
    };
    window.QuizEditorState = window.QuizEditorState || QuizEditorState;
})();
