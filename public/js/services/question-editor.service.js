// public/js/services/question-editor.service.js
const QuestionEditorService = {
  normalizeFormData(question, document = window.document) {
    const base = this.collectFormValues(question.type || 'EVERYONE_ANSWERS', document, question.configJson);
    const advanced = this.collectAdvancedSettings(document);
    const answers = this.collectAnswers(base.slideType, base.inputMode, document);
    const { slideType, questionMode, inputMode, multipleCorrectMode, orderedMode, ...persistedBase } = base;

    return {
      ...question,
      ...persistedBase,
      ...advanced,
      answers,
    };
  },

  collectFormValues(type, document, existingConfigJson = null) {
    const existing = this.parseJson(existingConfigJson);
    const slideType = this.getValue(document, 'slideTypeSelect', existing.slideType || this.inferSlideType(type));
    const questionMode = this.getValue(document, 'answerModeSelect', existing.questionMode || 'EVERYONE_ANSWERS');
    const inputMode = this.getValue(document, 'questionInputModeSelect', existing.inputMode || 'MULTIPLE_CHOICE');
    const multipleCorrectMode = this.getValue(document, 'multipleCorrectModeSelect', existing.multipleCorrectMode || 'none');
    const orderedMode = this.getValue(document, 'orderedModeSelect', existing.orderedMode || 'exact');
    const elementType = this.getElementTypeForSlideType(slideType);
    const compatibilityType = this.getValue(document, 'questionTypeSelect', this.resolveLegacyMode(slideType, questionMode, inputMode));

    return {
      slideType,
      questionMode,
      inputMode,
      multipleCorrectMode,
      orderedMode,
      text: this.getValue(document, 'questionText'),
      subtitle: this.getValue(document, 'questionSubtitle'),
      points: this.getIntValue(document, 'questionPoints', 100),
      timeLimit: this.getIntValue(document, 'questionTime', 30),
      elementType,
      type: compatibilityType,
      gameMode: compatibilityType,
      layoutType: elementType,
      backgroundColor: this.getValue(document, 'backgroundColor'),
      backgroundImageUrl: this.getValue(document, 'backgroundImageUrl'),
      configJson: this.buildConfig({
        existing,
        slideType,
        questionMode,
        inputMode,
        multipleCorrectMode,
        orderedMode,
      }, document),
    };
  },

  collectAnswers(slideType, inputMode, document) {
    if (slideType !== 'QUESTION') return [];
    if (['OPEN_ENDED', 'NUMERIC_INPUT', 'TEXT_INPUT', 'INITIAL_LETTER_INPUT'].includes(inputMode)) return [];

    if (inputMode === 'TRUE_FALSE') {
      const isCorrect = document.getElementById('trueFalseSelect')?.value === 'true';
      return [
        { text: 'Правда', isCorrect, order: 0 },
        { text: 'Ложь', isCorrect: !isCorrect, order: 1 },
      ];
    }

    const editor = document.getElementById('answersEditor');
    if (!editor) return [];
    return [...editor.querySelectorAll('.answer-item')].map((el, index) => ({
      text: el.querySelector('.answer-input')?.value?.trim() || '',
      isCorrect: el.classList.contains('correct'),
      order: index,
    }));
  },

  collectAdvancedSettings(document) {
    return {
      pointsAtStart: this.getIntValue(document, 'pointsAtStart', 100),
      pointsAtEnd: this.getIntValue(document, 'pointsAtEnd', 100),
      penaltyPoints: this.getIntValue(document, 'penaltyPoints', 0),
      penaltyNoAnswer: this.getIntValue(document, 'penaltyNoAnswer', 0),
      speedBonus1: this.getIntValue(document, 'speedBonus1', 0),
      speedBonus2: this.getIntValue(document, 'speedBonus2', 0),
      speedBonus3: this.getIntValue(document, 'speedBonus3', 0),
      countdownMode: this.getValue(document, 'countdownMode', 'auto'),
      textReveal: this.getValue(document, 'textReveal', 'none'),
      demographicGroup: this.getValue(document, 'demographicGroup', ''),
      slideRouting: this.getValue(document, 'slideRouting', ''),
      notes: this.getValue(document, 'questionNotes', ''),
      autoJudge: this.getChecked(document, 'autoJudge', true),
      lockoutOnWrong: this.getChecked(document, 'lockoutOnWrong', true),
      showCorrectAnswer: this.getChecked(document, 'showCorrectAnswer', true),
      jokersEnabled: this.getChecked(document, 'jokersEnabled', true),
    };
  },

  buildConfig(model, document) {
    const appearance = this.collectAppearance(document);
    const logic = {
      judgeMode: this.getValue(document, 'judgeModeSelect', 'auto'),
      textJudgeMode: this.getValue(document, 'textJudgeMode', 'exact'),
      answerTolerance: this.getIntValue(document, 'answerTolerance', 0),
      numericJudgeMode: this.getValue(document, 'numericJudgeMode', 'exact'),
      nearestWinnersCount: this.getIntValue(document, 'nearestWinnersCount', 1),
      fastestWrongBehavior: this.getValue(document, 'fastestWrongBehavior', 'lockout'),
      stealPointsEnabled: this.getChecked(document, 'stealPointsEnabled', false),
      correctAnswerValue: this.getValue(document, 'correctAnswerValue', ''),
      acceptedAnswersRaw: this.getValue(document, 'acceptedAnswersRaw', ''),
      orderedScoringMode: this.getValue(document, 'orderedScoringMode', model.orderedMode || 'exact'),
      initialLetterShuffleMode: this.getValue(document, 'initialLetterShuffleMode', 'none'),
      answersRevealDelay: this.getIntValue(document, 'answersRevealDelay', 0),
      answersRevealMode: this.getValue(document, 'answersRevealMode', 'all'),
      answersStepDelay: this.getIntValue(document, 'answersStepDelay', 0),
      answerLimit: this.getIntValue(document, 'answerLimit', 0),
      disableTimer: this.getChecked(document, 'disableTimer', false),
      allowAnswerChange: this.getChecked(document, 'allowAnswerChange', false),
      continueAfterCorrect: this.getChecked(document, 'continueAfterCorrect', false),
      muteCountdown: this.getChecked(document, 'muteCountdown', false),
      penaltyAtStart: this.getIntValue(document, 'penaltyAtStart', 0),
      penaltyAtEnd: this.getIntValue(document, 'penaltyAtEnd', 0),
      scoringModeSelect: this.getValue(document, 'scoringModeSelect', 'standard'),
    };

    const special = {
      roundEndShowRating: this.getChecked(document, 'roundEndShowRating', false),
      roundEndExcludeLoser: this.getChecked(document, 'roundEndExcludeLoser', false),
      roundEndHostSelectLosers: this.getChecked(document, 'roundEndHostSelectLosers', false),
      roundEndResetScores: this.getChecked(document, 'roundEndResetScores', false),
      demographicDescription: this.getValue(document, 'demographicDescription', ''),
      lmsEliminateOnWrong: this.getChecked(document, 'lmsEliminateOnWrong', true),
      lmsNoEliminateIfAllWrong: this.getChecked(document, 'lmsNoEliminateIfAllWrong', true),
      audienceGraphMode: this.getValue(document, 'audienceGraphMode', 'realtime'),
      audienceChartType: this.getValue(document, 'audienceChartType', 'bar'),
      wagerMode: this.getValue(document, 'wagerMode', 'percent'),
      wagerMin: this.getIntValue(document, 'wagerMin', 0),
      wagerMax: this.getIntValue(document, 'wagerMax', 100),
      wagerNextPrompt: this.getValue(document, 'wagerNextPrompt', ''),
      majorityPoints: this.getIntValue(document, 'majorityPoints', 100),
      majorityTieMode: this.getValue(document, 'majorityTieMode', 'single'),
      boardPickMode: this.getValue(document, 'boardPickMode', 'manual'),
      boardMaxQuestions: this.getIntValue(document, 'boardMaxQuestions', 20),
      boardHideEmpty: this.getChecked(document, 'boardHideEmpty', false),
      boardTopicsOnly: this.getChecked(document, 'boardTopicsOnly', false),
      boardRandomFromCell: this.getChecked(document, 'boardRandomFromCell', false),
      ladderFailAction: this.getValue(document, 'ladderFailAction', 'stay'),
      ladderPosition: this.getValue(document, 'ladderPosition', 'right'),
      ladderAlwaysVisible: this.getChecked(document, 'ladderAlwaysVisible', false),
      feudMode: this.getValue(document, 'feudMode', 'manual'),
      feudRevealMode: this.getValue(document, 'feudRevealMode', 'manual'),
      feudTeamMistakesLimit: this.getIntValue(document, 'feudTeamMistakesLimit', 3),
      feudPenaltyPoints: this.getIntValue(document, 'feudPenaltyPoints', 0),
      speedRoundDuration: this.getIntValue(document, 'speedRoundDuration', 60),
      speedRoundMode: this.getValue(document, 'speedRoundMode', 'host'),
      bingoType: this.getValue(document, 'bingoType', 'standard'),
      bingoFalseLimit: this.getIntValue(document, 'bingoFalseLimit', 0),
      bingoPatternPoints: this.getIntValue(document, 'bingoPatternPoints', 100),
      bingoFalsePenalty: this.getIntValue(document, 'bingoFalsePenalty', 0),
      gameModuleType: this.getValue(document, 'gameModuleType', ''),
      gameModuleTitle: this.getValue(document, 'gameModuleTitle', ''),
      gameModuleConfigJson: this.getValue(document, 'gameModuleConfigJson', ''),
      gameModuleLaunchBehavior: this.getValue(document, 'gameModuleLaunchBehavior', 'manual'),
    };

    return JSON.stringify({
      ...model.existing,
      slideType: model.slideType,
      questionMode: model.questionMode,
      inputMode: model.inputMode,
      multipleCorrectMode: model.multipleCorrectMode,
      orderedMode: model.orderedMode,
      transitionMode: this.getValue(document, 'transitionMode', 'default'),
      showAnswerPolicy: this.getValue(document, 'showAnswerPolicy', 'global'),
      serviceElementTitle: this.getValue(document, 'serviceElementTitle', ''),
      categoryPreset: this.getValue(document, 'categoryPreset', ''),
      appearance,
      logic,
      special,
    });
  },

  collectAppearance(document) {
    return {
      template: this.getValue(document, 'questionTemplate', 'classic'),
      titleColor: this.getValue(document, 'titleColor', '#111827'),
      answerColor: this.getValue(document, 'answerColor', '#111827'),
      answerChipColor: this.getValue(document, 'answerChipColor', '#6a4fff'),
      questionFont: this.getValue(document, 'questionFont', "'Inter', sans-serif"),
      answerFont: this.getValue(document, 'answerFont', "'Inter', sans-serif"),
      textAlign: this.getValue(document, 'textAlign', 'left'),
      backgroundGradient: this.getValue(document, 'backgroundGradient', ''),
      titleSize: this.getIntValue(document, 'titleSize', 48),
      answerSize: this.getIntValue(document, 'answerSize', 18),
      answerLayout: this.getValue(document, 'answerLayout', 'grid-2'),
    };
  },

  inferSlideType(type) {
    if (type === 'INFO_SLIDE') return 'INFO_SLIDE';
    if (type === 'WAGER') return 'WAGER';
    if (type === 'MAJORITY_RULES') return 'MAJORITY_RULES';
    if (type === 'LAST_MAN_STANDING') return 'LAST_MAN_STANDING';
    if (type === 'JEOPARDY_ROUND') return 'TRIVIA_BOARD';
    if (type === 'MILLIONAIRE_ROUND') return 'TRIVIA_LADDER';
    return 'QUESTION';
  },

  getElementTypeForSlideType(slideType) {
    if (slideType === 'INFO_SLIDE') return 'INFO_SLIDE';
    if (slideType === 'ROUND_END') return 'ROUND_END';
    if (slideType === 'DEMOGRAPHIC') return 'DEMOGRAPHIC';
    if (slideType === 'GAME_MODULE') return 'GAME_MODULE';
    if (slideType === 'QUESTION') return 'QUESTION';
    return 'GAME_ROUND';
  },

  resolveLegacyMode(slideType, questionMode, inputMode) {
    const slideMap = {
      INFO_SLIDE: 'INFO_SLIDE',
      ROUND_END: 'ROUND_END',
      DEMOGRAPHIC: 'DEMOGRAPHIC',
      LAST_MAN_STANDING: 'LAST_MAN_STANDING',
      AUDIENCE_RESPONSE: 'AUDIENCE_RESPONSE',
      WAGER: 'WAGER',
      MAJORITY_RULES: 'MAJORITY_RULES',
      TRIVIA_BOARD: 'JEOPARDY_ROUND',
      TRIVIA_LADDER: 'MILLIONAIRE_ROUND',
      TRIVIA_FEUD: 'MAJORITY_RULES',
      SPEED_ROUND: 'SPEED_ROUND',
      BINGO: 'BINGO',
      GAME_MODULE: 'GAME_MODULE',
    };
    if (slideType !== 'QUESTION') return slideMap[slideType] || 'EVERYONE_ANSWERS';
    const inputMap = {
      IMAGE: 'IMAGE',
      AUDIO: 'AUDIO',
      VIDEO: 'VIDEO',
      TRUE_FALSE: 'TRUE_FALSE',
      ORDERED_ANSWERS: 'ORDERED',
      MULTIPLE_CORRECT_SINGLE_PICK: 'MULTIPLE_CORRECT',
      MULTIPLE_CORRECT_MULTI_PICK: 'MULTIPLE_CORRECT',
      OPEN_ENDED: 'TEXT',
      NUMERIC_INPUT: 'TEXT',
      TEXT_INPUT: 'TEXT',
      INITIAL_LETTER_INPUT: 'TEXT',
    };
    return inputMap[inputMode] || (questionMode === 'FASTEST_FINGER' ? 'FASTEST_FINGER' : 'EVERYONE_ANSWERS');
  },

  parseJson(raw) {
    if (!raw) return {};
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return {}; }
  },
  getValue(document, id, fallback = '') { const n = document.getElementById(id); return n ? String(n.value || '').trim() : fallback; },
  getIntValue(document, id, fallback = 0) { const n = parseInt(this.getValue(document, id), 10); return Number.isNaN(n) ? fallback : n; },
  getChecked(document, id, fallback = false) { const n = document.getElementById(id); return n ? Boolean(n.checked) : fallback; },
};

window.QuestionEditorService = QuestionEditorService;
if (typeof module !== 'undefined' && module.exports) module.exports = QuestionEditorService;

