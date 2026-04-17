// public/js/components/ribbon.js
window.DOKA_USE_COMPONENT_RIBBON = true;

(function () {
  const QUESTION = 'QUESTION';

  const SLIDE_TYPES = [
    {
      id: 'QUESTION',
      title: 'Вопрос',
      icon: 'Q',
      desc: 'Обычный игровой слайд с вопросом, ответами, таймером, очками и логикой ответа.',
    },
    {
      id: 'INFO_SLIDE',
      title: 'Информационный слайд',
      icon: 'i',
      desc: 'Слайд без ответов, для правил, объявлений, пояснений и переходов между частями игры.',
    },
    {
      id: 'ROUND_END',
      title: 'Конец раунда',
      icon: 'R',
      desc: 'Слайд завершения раунда с промежуточным итогом, переходом к следующей части и действиями конца раунда.',
    },
    {
      id: 'DEMOGRAPHIC',
      title: 'Демографический слайд',
      icon: 'D',
      desc: 'Слайд для разделения участников на группы по выбранному признаку.',
    },
    {
      id: 'LAST_MAN_STANDING',
      title: 'Последний выживший',
      icon: 'L',
      desc: 'Формат, где все отвечают, а участники с неправильным ответом выбывают.',
    },
    {
      id: 'AUDIENCE_RESPONSE',
      title: 'Опрос аудитории',
      icon: 'A',
      desc: 'Слайд для сбора ответов без влияния на очки, с возможностью показать распределение ответов.',
    },
    {
      id: 'WAGER',
      title: 'Ставка',
      icon: 'S',
      desc: 'Слайд, где игроки делают ставку перед следующим вопросом.',
    },
    {
      id: 'MAJORITY_RULES',
      title: 'Правила большинства',
      icon: 'M',
      desc: 'Слайд, где правильным считается самый популярный ответ аудитории.',
    },
    {
      id: 'TRIVIA_BOARD',
      title: 'Табло вопросов',
      icon: 'T',
      desc: 'Игровое табло в стиле выбора тем и стоимости вопросов.',
    },
    {
      id: 'TRIVIA_LADDER',
      title: 'Лестница',
      icon: 'L',
      desc: 'Раунд в формате последовательного продвижения по уровням с несгораемыми точками.',
    },
    {
      id: 'TRIVIA_FEUD',
      title: '100 к 1',
      icon: 'F',
      desc: 'Раунд с популярными ответами и логикой угадывания самых частых вариантов.',
    },
    {
      id: 'SPEED_ROUND',
      title: 'Быстрый раунд',
      icon: 'S',
      desc: 'Серия быстрых вопросов подряд с общим ограничением по времени.',
    },
    {
      id: 'BINGO',
      title: 'Бинго',
      icon: 'B',
      desc: 'Раунд бинго с шаблонами победы, проверкой заявок и отдельной игровой логикой.',
    },
    {
      id: 'GAME_MODULE',
      title: 'Игровой модуль',
      icon: 'G',
      desc: 'Отдельный мини-игровой модуль, который запускается как самостоятельная часть шоу.',
    },
  ];

  const SPECIAL_SECTIONS = {
    ROUND_END: { id: 'specialRoundEndSection', title: 'Конец раунда' },
    DEMOGRAPHIC: { id: 'specialDemographicSection', title: 'Демографический слайд' },
    LAST_MAN_STANDING: { id: 'specialLastManSection', title: 'Последний выживший' },
    AUDIENCE_RESPONSE: { id: 'specialAudienceSection', title: 'Опрос аудитории' },
    WAGER: { id: 'specialWagerSection', title: 'Ставка' },
    MAJORITY_RULES: { id: 'specialMajoritySection', title: 'Правила большинства' },
    TRIVIA_BOARD: { id: 'specialTriviaBoardSection', title: 'Табло вопросов' },
    TRIVIA_LADDER: { id: 'specialTriviaLadderSection', title: 'Лестница' },
    TRIVIA_FEUD: { id: 'specialTriviaFeudSection', title: '100 к 1' },
    SPEED_ROUND: { id: 'specialSpeedRoundSection', title: 'Быстрый раунд' },
    BINGO: { id: 'specialBingoSection', title: 'Бинго' },
    GAME_MODULE: { id: 'specialGameModuleSection', title: 'Игровой модуль' },
  };

  const val = (id, fallback = '') => document.getElementById(id)?.value ?? fallback;
  const set = (id, value, fallback = '') => {
    const node = document.getElementById(id);
    if (node) node.value = value ?? fallback;
  };
  const show = (id, visible) => {
    const node = document.getElementById(id);
    if (node) node.style.display = visible ? '' : 'none';
  };

  function parseConfig(question) {
    try {
      if (!question?.configJson) return {};
      return typeof question.configJson === 'string' ? JSON.parse(question.configJson) : question.configJson;
    } catch {
      return {};
    }
  }

  function getCurrentQuestion() {
    const state = window.ConstructorState?.getState?.() || {};
    const index = Number.isInteger(state.currentQuestionIndex)
      ? state.currentQuestionIndex
      : (Number.isInteger(window.currentQuestionIndex) ? window.currentQuestionIndex : -1);
    const list = Array.isArray(state.questions) ? state.questions : (Array.isArray(window.questions) ? window.questions : []);
    return index >= 0 ? list[index] || null : null;
  }

  function inferSlideType(question, cfg) {
    if (cfg.slideType) return cfg.slideType;
    const mode = question?.gameMode || question?.type || 'EVERYONE_ANSWERS';
    const elementType = question?.elementType || question?.layoutType || QUESTION;

    if (elementType === 'INFO_SLIDE' || mode === 'INFO_SLIDE') return 'INFO_SLIDE';
    if (mode === 'JEOPARDY_ROUND') return 'TRIVIA_BOARD';
    if (mode === 'MILLIONAIRE_ROUND') return 'TRIVIA_LADDER';
    if (['WAGER', 'MAJORITY_RULES', 'LAST_MAN_STANDING', 'ROUND_END', 'DEMOGRAPHIC', 'AUDIENCE_RESPONSE', 'SPEED_ROUND', 'BINGO', 'GAME_MODULE'].includes(mode)) {
      return mode;
    }
    return QUESTION;
  }

  function inferQuestionMode(question, cfg) {
    if (cfg.questionMode) return cfg.questionMode;
    const mode = question?.gameMode || question?.type;
    return mode === 'FASTEST_FINGER' ? 'FASTEST_FINGER' : 'EVERYONE_ANSWERS';
  }

  function inferInputMode(question, cfg) {
    if (cfg.inputMode) return cfg.inputMode;
    const mode = question?.gameMode || question?.type || '';
    const map = {
      IMAGE: 'IMAGE',
      AUDIO: 'AUDIO',
      VIDEO: 'VIDEO',
      TRUE_FALSE: 'TRUE_FALSE',
      TRUEFALSE: 'TRUE_FALSE',
      ORDERED: 'ORDERED_ANSWERS',
      MULTIPLE_CORRECT: 'MULTIPLE_CORRECT_MULTI_PICK',
    };
    return map[mode] || 'MULTIPLE_CHOICE';
  }

  function ensureOption(selectId, value, label) {
    const select = document.getElementById(selectId);
    if (!select) return;
    if ([...select.options].some((opt) => opt.value === value)) return;
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  function appendSection(panel, id, title, html) {
    if (document.getElementById(id)) return;
    const section = document.createElement('section');
    section.className = 'panel-section logic-section';
    section.id = id;
    section.innerHTML = `<h4>${title}</h4>${html}`;
    panel.appendChild(section);
  }

  function ensureSlideTypePickerButton() {
    const typeSection = document.getElementById('slideTypeSelect')?.closest('.panel-section');
    const nativeSelect = document.getElementById('slideTypeSelect');
    if (!typeSection || !nativeSelect) return;

    nativeSelect.classList.add('slide-type-native-select');
    nativeSelect.style.display = 'none';

    if (!document.getElementById('slideTypePickerBtn')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'slideTypePickerBtn';
      button.className = 'btn btn-outline slide-type-picker-btn';
      button.textContent = 'Выбрать тип слайда';
      button.onclick = openSlideTypePicker;
      typeSection.appendChild(button);
    }

    if (!document.getElementById('slideTypePickerCurrent')) {
      const meta = document.createElement('div');
      meta.id = 'slideTypePickerCurrent';
      meta.className = 'slide-type-picker-current';
      typeSection.appendChild(meta);
    }
  }

  function ensureQuestionModeBlock() {
    const section = document.getElementById('questionLogicSection');
    if (!section) return;

    const heading = section.querySelector('h4');
    if (heading) heading.textContent = 'Свойства вопроса';

    const legacyGroups = section.querySelectorAll('.grid-2 .form-group');
    if (legacyGroups[0]) {
      const label = legacyGroups[0].querySelector('.form-label');
      if (label) label.textContent = 'Режим ответа';
    }
    if (legacyGroups[1]) legacyGroups[1].style.display = 'none';

    const mediaTypeSelect = document.getElementById('mediaTypeSelect');
    if (mediaTypeSelect) mediaTypeSelect.style.display = 'none';

    if (document.getElementById('questionInputModeSelect')) return;
    section.insertAdjacentHTML('afterbegin', `
      <div id="questionModeBlock" class="mb-2">
        <h4>Режим вопроса</h4>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Формат вопроса</label>
            <select class="input" id="questionInputModeSelect" onchange="setQuestionInputMode(this.value)">
              <option value="MULTIPLE_CHOICE">Множественный выбор</option>
              <option value="OPEN_ENDED">Открытый ответ</option>
              <option value="NUMERIC_INPUT">Числовой ввод</option>
              <option value="TEXT_INPUT">Текстовый ввод</option>
              <option value="INITIAL_LETTER_INPUT">Первая буква</option>
              <option value="MULTIPLE_CORRECT_SINGLE_PICK">Несколько правильных (single pick)</option>
              <option value="MULTIPLE_CORRECT_MULTI_PICK">Несколько правильных (multi pick)</option>
              <option value="ORDERED_ANSWERS">Упорядочивание</option>
              <option value="IMAGE">Вопрос с изображением</option>
              <option value="AUDIO">Вопрос с аудио</option>
              <option value="VIDEO">Вопрос с видео</option>
              <option value="TRUE_FALSE">Правда / Ложь</option>
            </select>
          </div>
          <div></div>
        </div>
        <div class="grid-2 mt-2">
          <select class="input" id="multipleCorrectModeSelect" onchange="syncPreviewFromProperties()">
            <option value="none">Несколько правильных: нет</option>
            <option value="single_pick">Одна попытка</option>
            <option value="multi_pick">Множественный выбор</option>
            <option value="exact_match">Точное совпадение</option>
          </select>
          <select class="input" id="orderedModeSelect" onchange="syncPreviewFromProperties()">
            <option value="exact">Упорядочивание: точное совпадение</option>
            <option value="partial">Упорядочивание: частичное совпадение</option>
          </select>
        </div>
      </div>
    `);
  }

  function ensureAdditionalSections(panel) {
    appendSection(panel, 'judgeSection', 'Судейство', `
      <div class="grid-2">
        <select class="input" id="judgeModeSelect" onchange="syncPreviewFromProperties()">
          <option value="auto">Автоматически</option>
          <option value="manual">Вручную ведущим</option>
        </select>
        <select class="input" id="textJudgeMode" onchange="syncPreviewFromProperties()">
          <option value="exact">Текст: точное совпадение</option>
          <option value="approx">Текст: приблизительное совпадение</option>
        </select>
      </div>
      <div class="grid-2 mt-2">
        <input class="input" type="number" id="answerTolerance" value="0" min="0" placeholder="Допуск" oninput="syncPreviewFromProperties()">
        <select class="input" id="numericJudgeMode" onchange="syncPreviewFromProperties()">
          <option value="exact">Числа: точное совпадение</option>
          <option value="nearest">Числа: nearest wins</option>
        </select>
      </div>
    `);

    appendSection(panel, 'correctAnswersSection', 'Правильные ответы', `
      <div class="grid-2">
        <input class="input" id="correctAnswerValue" placeholder="Значение правильного ответа" oninput="syncPreviewFromProperties()">
        <input class="input" id="acceptedAnswersRaw" placeholder="Допустимые ответы через ;" oninput="syncPreviewFromProperties()">
      </div>
    `);

    appendSection(panel, SPECIAL_SECTIONS.ROUND_END.id, SPECIAL_SECTIONS.ROUND_END.title, `
      <div class="content-stack gap-1">
        <label class="form-checkbox"><input type="checkbox" id="roundEndShowRating" onchange="syncPreviewFromProperties()"> Показать промежуточный рейтинг</label>
        <label class="form-checkbox"><input type="checkbox" id="roundEndExcludeLoser" onchange="syncPreviewFromProperties()"> Исключить проигравшего</label>
        <label class="form-checkbox"><input type="checkbox" id="roundEndHostSelectLosers" onchange="syncPreviewFromProperties()"> Ведущий выбирает проигравших</label>
        <label class="form-checkbox"><input type="checkbox" id="roundEndResetScores" onchange="syncPreviewFromProperties()"> Сбросить очки после раунда</label>
      </div>
    `);

    appendSection(panel, SPECIAL_SECTIONS.DEMOGRAPHIC.id, SPECIAL_SECTIONS.DEMOGRAPHIC.title, `
      <textarea class="input" id="demographicDescription" rows="3" placeholder="Описание группы" oninput="syncPreviewFromProperties()"></textarea>
    `);

    appendSection(panel, SPECIAL_SECTIONS.LAST_MAN_STANDING.id, SPECIAL_SECTIONS.LAST_MAN_STANDING.title, `
      <div class="content-stack gap-1">
        <label class="form-checkbox"><input type="checkbox" id="lmsEliminateOnWrong" checked onchange="syncPreviewFromProperties()"> Исключать игрока при ошибке</label>
        <label class="form-checkbox"><input type="checkbox" id="lmsNoEliminateIfAllWrong" checked onchange="syncPreviewFromProperties()"> Если все ошиблись, никого не исключать</label>
      </div>
    `);

    appendSection(panel, SPECIAL_SECTIONS.AUDIENCE_RESPONSE.id, SPECIAL_SECTIONS.AUDIENCE_RESPONSE.title, `
      <div class="grid-2">
        <select class="input" id="audienceGraphMode" onchange="syncPreviewFromProperties()">
          <option value="realtime">График в реальном времени</option>
          <option value="final">График после завершения</option>
        </select>
        <select class="input" id="audienceChartType" onchange="syncPreviewFromProperties()">
          <option value="bar">Столбчатая диаграмма</option>
          <option value="pie">Круговая диаграмма</option>
        </select>
      </div>
    `);

    appendSection(panel, SPECIAL_SECTIONS.WAGER.id, SPECIAL_SECTIONS.WAGER.title, `
      <div class="grid-2">
        <select class="input" id="wagerMode" onchange="syncPreviewFromProperties()">
          <option value="percent">Ставка в процентах</option>
          <option value="absolute">Фиксированная сумма</option>
        </select>
        <input class="input" type="number" id="wagerMin" value="0" min="0" placeholder="Минимальная ставка" oninput="syncPreviewFromProperties()">
      </div>
      <div class="grid-2 mt-2">
        <input class="input" type="number" id="wagerMax" value="100" min="0" placeholder="Максимальная ставка" oninput="syncPreviewFromProperties()">
        <input class="input" id="wagerNextPrompt" placeholder="Текст перед следующим вопросом" oninput="syncPreviewFromProperties()">
      </div>
    `);

    appendSection(panel, SPECIAL_SECTIONS.MAJORITY_RULES.id, SPECIAL_SECTIONS.MAJORITY_RULES.title, `
      <div class="grid-2">
        <input class="input" type="number" id="majorityPoints" value="100" min="0" placeholder="Очки за большинство" oninput="syncPreviewFromProperties()">
        <select class="input" id="majorityTieMode" onchange="syncPreviewFromProperties()">
          <option value="single">При равенстве: один вариант</option>
          <option value="multiple">При равенстве: несколько вариантов</option>
        </select>
      </div>
    `);

    appendSection(panel, SPECIAL_SECTIONS.TRIVIA_BOARD.id, SPECIAL_SECTIONS.TRIVIA_BOARD.title, `
      <div class="grid-2">
        <select class="input" id="boardPickMode" onchange="syncPreviewFromProperties()">
          <option value="manual">Выбор вручную</option>
          <option value="random">Случайный выбор</option>
        </select>
        <input class="input" type="number" id="boardMaxQuestions" min="1" value="20" placeholder="Максимум вопросов" oninput="syncPreviewFromProperties()">
      </div>
      <div class="content-stack gap-1 mt-2">
        <label class="form-checkbox"><input type="checkbox" id="boardHideEmpty" onchange="syncPreviewFromProperties()"> Скрывать пустые ячейки</label>
        <label class="form-checkbox"><input type="checkbox" id="boardTopicsOnly" onchange="syncPreviewFromProperties()"> Показывать только темы</label>
        <label class="form-checkbox"><input type="checkbox" id="boardRandomFromCell" onchange="syncPreviewFromProperties()"> Случайный вопрос из ячейки</label>
      </div>
    `);

    appendSection(panel, SPECIAL_SECTIONS.TRIVIA_LADDER.id, SPECIAL_SECTIONS.TRIVIA_LADDER.title, `
      <div class="grid-2">
        <select class="input" id="ladderFailAction" onchange="syncPreviewFromProperties()">
          <option value="stay">При ошибке: остаться на месте</option>
          <option value="step_down">При ошибке: шаг вниз</option>
          <option value="safe_haven">При ошибке: к несгораемой сумме</option>
          <option value="start">При ошибке: вернуться в начало</option>
        </select>
        <select class="input" id="ladderPosition" onchange="syncPreviewFromProperties()">
          <option value="right">Положение: справа</option>
          <option value="center">Положение: по центру</option>
          <option value="full">Положение: на весь экран</option>
        </select>
      </div>
      <label class="form-checkbox mt-2"><input type="checkbox" id="ladderAlwaysVisible" onchange="syncPreviewFromProperties()"> Всегда показывать лестницу</label>
    `);

    appendSection(panel, SPECIAL_SECTIONS.TRIVIA_FEUD.id, SPECIAL_SECTIONS.TRIVIA_FEUD.title, `
      <div class="grid-2">
        <select class="input" id="feudMode" onchange="syncPreviewFromProperties()">
          <option value="manual">Режим игры: ручной</option>
          <option value="interactive">Режим игры: интерактивный</option>
          <option value="multiplayer">Режим игры: многопользовательский</option>
        </select>
        <select class="input" id="feudRevealMode" onchange="syncPreviewFromProperties()">
          <option value="manual">Раскрытие: вручную</option>
          <option value="auto">Раскрытие: автоматически</option>
        </select>
      </div>
      <div class="grid-2 mt-2">
        <input class="input" type="number" id="feudTeamMistakesLimit" min="0" value="3" placeholder="Лимит ошибок команды" oninput="syncPreviewFromProperties()">
        <input class="input" type="number" id="feudPenaltyPoints" min="0" value="0" placeholder="Штрафные очки" oninput="syncPreviewFromProperties()">
      </div>
    `);

    appendSection(panel, SPECIAL_SECTIONS.SPEED_ROUND.id, SPECIAL_SECTIONS.SPEED_ROUND.title, `
      <div class="grid-2">
        <input class="input" type="number" id="speedRoundDuration" min="10" value="60" placeholder="Длительность (сек)" oninput="syncPreviewFromProperties()">
        <select class="input" id="speedRoundMode" onchange="syncPreviewFromProperties()">
          <option value="host">Ведущий управляет вручную</option>
          <option value="buzzer">Режим buzzer-ответов</option>
        </select>
      </div>
    `);

    appendSection(panel, SPECIAL_SECTIONS.BINGO.id, SPECIAL_SECTIONS.BINGO.title, `
      <div class="grid-2">
        <select class="input" id="bingoType" onchange="syncPreviewFromProperties()">
          <option value="standard">Стандартный бинго</option>
          <option value="emoji">Emoji bingo</option>
          <option value="trivia">Trivia bingo</option>
          <option value="music">Music bingo</option>
        </select>
        <input class="input" type="number" id="bingoFalseLimit" min="0" value="0" placeholder="Лимит ложных bingo" oninput="syncPreviewFromProperties()">
      </div>
      <div class="grid-2 mt-2">
        <input class="input" type="number" id="bingoPatternPoints" min="0" value="100" placeholder="Очки за шаблон" oninput="syncPreviewFromProperties()">
        <input class="input" type="number" id="bingoFalsePenalty" min="0" value="0" placeholder="Штраф за ложный bingo" oninput="syncPreviewFromProperties()">
      </div>
    `);

    appendSection(panel, SPECIAL_SECTIONS.GAME_MODULE.id, SPECIAL_SECTIONS.GAME_MODULE.title, `
      <div class="grid-2">
        <input class="input" id="gameModuleType" placeholder="Тип модуля" oninput="syncPreviewFromProperties()">
        <input class="input" id="gameModuleTitle" placeholder="Название модуля" oninput="syncPreviewFromProperties()">
      </div>
      <div class="grid-2 mt-2">
        <input class="input" id="gameModuleLaunchBehavior" placeholder="Поведение запуска" oninput="syncPreviewFromProperties()">
        <input class="input" id="gameModuleConfigJson" placeholder="configJson модуля" oninput="syncPreviewFromProperties()">
      </div>
    `);
  }

  function ensurePickerModal() {
    if (document.getElementById('slideTypePickerModal')) return;

    const modal = document.createElement('div');
    modal.id = 'slideTypePickerModal';
    modal.className = 'slide-type-modal';
    modal.innerHTML = `
      <div class="slide-type-modal-backdrop" onclick="closeSlideTypePicker()"></div>
      <div class="slide-type-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="slideTypePickerTitle">
        <div class="slide-type-modal-header">
          <h3 id="slideTypePickerTitle">Выберите тип слайда</h3>
          <button type="button" class="btn btn-outline btn-sm" onclick="closeSlideTypePicker()">Закрыть</button>
        </div>
        <div class="slide-type-card-grid" id="slideTypeCardGrid"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function updatePickerButtonLabel(slideType) {
    const current = document.getElementById('slideTypePickerCurrent');
    if (!current) return;
    const meta = SLIDE_TYPES.find((type) => type.id === slideType);
    current.textContent = meta ? `Выбранный тип: ${meta.title}` : 'Тип не выбран';
  }

  function renderSlideTypeCards(activeType) {
    const grid = document.getElementById('slideTypeCardGrid');
    if (!grid) return;

    grid.innerHTML = SLIDE_TYPES.map((type) => `
      <button type="button" class="slide-type-card ${type.id === activeType ? 'active' : ''}" data-slide-type="${type.id}">
        <span class="slide-type-card-icon">${type.icon}</span>
        <span class="slide-type-card-title">${type.title}</span>
        <span class="slide-type-card-desc">${type.desc}</span>
      </button>
    `).join('');

    grid.querySelectorAll('.slide-type-card').forEach((card) => {
      card.addEventListener('click', () => {
        const type = card.dataset.slideType;
        if (!type) return;
        window.setSlideType(type);
        closeSlideTypePicker();
      });
    });
  }

  function openSlideTypePicker() {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;
    ensurePickerModal();
    renderSlideTypeCards(val('slideTypeSelect', QUESTION));
    document.getElementById('slideTypePickerModal')?.classList.add('is-open');
  }

  function closeSlideTypePicker() {
    document.getElementById('slideTypePickerModal')?.classList.remove('is-open');
  }

  function applyContext(slideType, inputMode) {
    const isQuestion = slideType === QUESTION;

    show('questionModeBlock', isQuestion);
    show('questionLogicSection', isQuestion);
    show('answersSection', isQuestion && !['OPEN_ENDED', 'NUMERIC_INPUT', 'TEXT_INPUT', 'INITIAL_LETTER_INPUT', 'TRUE_FALSE'].includes(inputMode));
    show('trueFalseSection', isQuestion && inputMode === 'TRUE_FALSE');
    show('timingSection', isQuestion || ['INFO_SLIDE', 'LAST_MAN_STANDING', 'MAJORITY_RULES'].includes(slideType));
    show('scoringSection', isQuestion || ['LAST_MAN_STANDING', 'MAJORITY_RULES'].includes(slideType));
    show('advancedSection', isQuestion);
    show('judgeSection', isQuestion);
    show('correctAnswersSection', isQuestion);
    show('mediaCommonSection', isQuestion || slideType === 'INFO_SLIDE');
    show('infoLogicSection', slideType === 'INFO_SLIDE');

    Object.values(SPECIAL_SECTIONS).forEach((section) => show(section.id, false));
    if (SPECIAL_SECTIONS[slideType]) {
      show(SPECIAL_SECTIONS[slideType].id, true);
    }
  }

  function updateCompatFields() {
    const slideType = val('slideTypeSelect', QUESTION);
    const answerMode = val('answerModeSelect', 'EVERYONE_ANSWERS');
    const inputMode = val('questionInputModeSelect', 'MULTIPLE_CHOICE');

    const specialLegacy = {
      INFO_SLIDE: 'INFO_SLIDE',
      LAST_MAN_STANDING: 'LAST_MAN_STANDING',
      WAGER: 'WAGER',
      MAJORITY_RULES: 'MAJORITY_RULES',
      TRIVIA_BOARD: 'JEOPARDY_ROUND',
      TRIVIA_LADDER: 'MILLIONAIRE_ROUND',
      TRIVIA_FEUD: 'MAJORITY_RULES',
      ROUND_END: 'ROUND_END',
      DEMOGRAPHIC: 'DEMOGRAPHIC',
      AUDIENCE_RESPONSE: 'AUDIENCE_RESPONSE',
      SPEED_ROUND: 'SPEED_ROUND',
      BINGO: 'BINGO',
      GAME_MODULE: 'GAME_MODULE',
    };
    const questionLegacy = {
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
      MULTIPLE_CHOICE: answerMode === 'FASTEST_FINGER' ? 'FASTEST_FINGER' : 'EVERYONE_ANSWERS',
    };

    const legacy = slideType === QUESTION
      ? (questionLegacy[inputMode] || 'EVERYONE_ANSWERS')
      : (specialLegacy[slideType] || 'EVERYONE_ANSWERS');

    set('questionTypeSelect', legacy, legacy);
    set('mediaTypeSelect', ['IMAGE', 'AUDIO', 'VIDEO', 'TRUE_FALSE'].includes(inputMode) ? inputMode : 'TEXT', 'TEXT');
  }

  function syncRightPanel(question) {
    const cfg = parseConfig(question);
    const logic = cfg.logic || {};
    const slideType = inferSlideType(question, cfg);
    const questionMode = inferQuestionMode(question, cfg);
    const inputMode = inferInputMode(question, cfg);

    set('slideTypeSelect', slideType, QUESTION);
    set('answerModeSelect', questionMode, 'EVERYONE_ANSWERS');
    set('questionInputModeSelect', inputMode, 'MULTIPLE_CHOICE');
    set('multipleCorrectModeSelect', cfg.multipleCorrectMode || logic.multipleCorrectMode, 'none');
    set('orderedModeSelect', cfg.orderedMode || logic.orderedMode, 'exact');
    set('serviceElementTitle', cfg.serviceElementTitle, '');
    set('categoryPreset', cfg.categoryPreset, '');
    set('transitionMode', cfg.transitionMode, 'default');
    set('showAnswerPolicy', cfg.showAnswerPolicy, 'global');
    set('judgeModeSelect', logic.judgeMode, 'auto');
    set('textJudgeMode', logic.textJudgeMode, 'exact');
    set('answerTolerance', logic.answerTolerance, 0);
    set('numericJudgeMode', logic.numericJudgeMode, 'exact');
    set('correctAnswerValue', logic.correctAnswerValue, '');
    set('acceptedAnswersRaw', logic.acceptedAnswersRaw, '');

    updateCompatFields();
    applyContext(slideType, inputMode);
    updatePickerButtonLabel(slideType);
  }

  function syncAppearance(question) {
    if (!question) return;
    const appearance = parseConfig(question).appearance || {};
    set('answerChipColor', appearance.answerChipColor, '#6a4fff');
    set('titleColor', appearance.titleColor, '#111827');
    set('answerColor', appearance.answerColor, '#111827');
    set('questionFont', appearance.questionFont, "'Inter', sans-serif");
    set('answerFont', appearance.answerFont, "'Inter', sans-serif");
    set('titleSize', appearance.titleSize, 48);
    set('answerSize', appearance.answerSize, 18);
    set('answerLayout', appearance.answerLayout, 'grid-2');
    set('questionTemplate', appearance.template, 'classic');
    set('textAlign', appearance.textAlign, 'left');
    set('backgroundColor', question.backgroundColor, '#f6f8fb');
    set('backgroundImageUrl', question.backgroundImageUrl, '');
    set('backgroundGradient', appearance.backgroundGradient, '');
  }

  function refresh() {
    const question = getCurrentQuestion();
    const hasQuiz = Boolean(window.ConstructorState?.getState?.().currentQuiz || window.currentQuiz);
    const hasSelection = Boolean(question);

    document.querySelectorAll('[data-requires-quiz="true"]').forEach((node) => {
      node.disabled = !hasQuiz;
      node.classList.toggle('is-disabled', !hasQuiz);
    });
    document.querySelectorAll('[data-requires-question="true"]').forEach((node) => {
      node.disabled = !hasSelection;
      node.classList.toggle('is-disabled', !hasSelection);
    });

    syncAppearance(question);
    syncRightPanel(question);

    if (!hasSelection) {
      [
        'questionLogicSection',
        'timingSection',
        'scoringSection',
        'advancedSection',
        'judgeSection',
        'correctAnswersSection',
        'mediaCommonSection',
        'infoLogicSection',
        ...Object.values(SPECIAL_SECTIONS).map((entry) => entry.id),
      ].forEach((id) => show(id, false));
    }

    const panel = document.getElementById('logicPanel');
    if (panel) {
      panel.querySelectorAll('input,select,textarea,button').forEach((node) => {
        if (node.id === 'slideTypeSelect') return;
        node.disabled = !hasSelection;
      });
    }
  }

  function propagateChange() {
    updateCompatFields();
    applyContext(val('slideTypeSelect', QUESTION), val('questionInputModeSelect', 'MULTIPLE_CHOICE'));
    updatePickerButtonLabel(val('slideTypeSelect', QUESTION));
    if (typeof window.syncPreviewFromProperties === 'function') {
      window.syncPreviewFromProperties();
    }
  }

  function init() {
    const toolbar = document.getElementById('constructorToolbar');
    if (!toolbar || toolbar.dataset.ready === 'true') return;
    toolbar.dataset.ready = 'true';

    const panel = document.getElementById('logicPanel');
    if (!panel || panel.dataset.modelReady === 'true') return;
    panel.dataset.modelReady = 'true';

    SLIDE_TYPES.forEach((type) => ensureOption('slideTypeSelect', type.id, type.title));
    ensureSlideTypePickerButton();
    ensureQuestionModeBlock();
    ensureAdditionalSections(panel);
    ensurePickerModal();
    refresh();
  }

  window.setSlideType = (value) => {
    set('slideTypeSelect', value, QUESTION);
    propagateChange();
  };
  window.setAnswerMode = (value) => {
    set('answerModeSelect', value, 'EVERYONE_ANSWERS');
    propagateChange();
  };
  window.setQuestionInputMode = (value) => {
    set('questionInputModeSelect', value, 'MULTIPLE_CHOICE');
    propagateChange();
  };
  window.setMediaType = (value) => window.setQuestionInputMode(value);
  window.openSlideTypePicker = openSlideTypePicker;
  window.closeSlideTypePicker = closeSlideTypePicker;
  window.updateInfoFields = () => {
    const title = val('infoTitleInput', '');
    const text = val('infoTextInput', '');
    if (document.getElementById('questionSubtitle')) document.getElementById('questionSubtitle').value = title;
    if (document.getElementById('questionText')) document.getElementById('questionText').value = text;
    propagateChange();
  };

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSlideTypePicker();
  });
  document.addEventListener('DOMContentLoaded', init);

  window.DokaRibbon = { init, refresh };
})();
