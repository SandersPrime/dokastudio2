(function () {
    function renderQuizCard(quiz) {
        const escape = window.DomUtils?.escapeHtml || ((value) => String(value ?? ''));
        return `
            <article class="card quiz-card" data-quiz-id="${escape(quiz.id)}">
                <h3>${escape(quiz.title)}</h3>
                <p>${escape(quiz.description || 'Без описания')}</p>
                <span class="badge badge-primary">${Number(quiz._count?.questions || quiz.questionCount || quiz.questions?.length || 0)} вопросов</span>
            </article>`;
    }
    window.QuizCardComponent = window.QuizCardComponent || { render: renderQuizCard };
})();
