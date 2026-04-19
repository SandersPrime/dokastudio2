// public/js/components/ribbon.js
window.DOKA_USE_COMPONENT_RIBBON = true;

(function () {
  const QUESTION = 'QUESTION';
  const QUESTION_MEDIA_MODES = ['IMAGE', 'AUDIO', 'VIDEO'];
  const ANSWERLESS_MODES = ['OPEN_ENDED', 'NUMERIC_INPUT', 'TEXT_INPUT', 'INITIAL_LETTER_INPUT', 'TRUE_FALSE'];

  const SLIDE_TYPE_GROUPS = [
    {
      title: 'Базовые',
      items: [
        { id: 'QUESTION', title: 'Вопрос', icon: '?', desc: 'Игровой слайд с ответами и баллами.' },
        { id: 'INFO_SLIDE', title: 'Информационный слайд', icon: 'i', desc: 'Текст, правила или переход без ответов.' },
        { id: 'ROUND_END', title: 'Конец раунда', icon: '✓', desc: 'Действия после завершения части игры.' },
      ],
    },
    {
      title: 'Игровые',
      items: [
        { id: 'LAST_MAN_STANDING', title: 'Последний выживший', icon: '1', desc: 'Ошибки исключают игроков из раунда.' },
        { id: 'AUDIENCE_RESPONSE', title: 'Опрос аудитории', icon: '◔', desc: 'Сбор мнений без правильного ответа.' },
        { id: 'WAGER', title: 'Ставка', icon: '₽', desc: 'Игроки выбирают размер ставки.' },
        { id: 'MAJORITY_RULES', title: 'Правила большинства', icon: '≡', desc: 'Побеждает самый популярный ответ.' },
        { id: 'SPEED_ROUND', title: 'Быстрый раунд', icon: '⏱', desc: 'Серия вопросов на ограниченное время.' },
      ],
    },
    {
      title: 'Раунды',
      items: [
        { id: 'TRIVIA_BOARD', title: 'Табло вопросов', icon: '▦', desc: 'Выбор темы и стоимости вопроса.' },
        { id: 'TRIVIA_LADDER', title: 'Лестница', icon: '↟', desc: 'Последовательное движение по уровням.' },
        { id: 'TRIVIA_FEUD', title: '100 к 1', icon: '100', desc: 'Популярные ответы и раскрытие вариантов.' },
        { id: 'BINGO', title: 'Бинго', icon: '□', desc: 'Игра с шаблонами и проверкой заявок.' },
        { id: 'GAME_MODULE', title: 'Игровой модуль', icon: '◆', desc: 'Подключение отдельной игровой механики.' },
      ],
    },
    {
      title: 'Служебные',
      items: [
        { id: 'DEMOGRAPHIC', title: 'Демографический слайд', icon: '👥', desc: 'Описание группы или сегмента участников.' },
      ],
    },
  ];

  const SLIDE_TYPES = SLIDE_TYPE_GROUPS.flatMap((group) => group.items);
  const slideTypeById = (id) => SLIDE_TYPES.find((type) => type.id === id);

  const SECTION_DEFINITIONS = {
    judgeSection: {
      title: 'Судейство',
      html: `
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
            <option value="nearest">Числа: ближайший ответ</option>
          </select>
        </div>
      `,
    },
    correctAnswersSection: {
      title: 'Правильные ответы',
      html: `
        <div class="grid-2">
          <input class="input" id="correctAnswerValue" placeholder="Правильный ответ" oninput="syncPreviewFromProperties()">
          <input class="input" id="acceptedAnswersRaw" placeholder="Допустимые ответы через ;" oninput="syncPreviewFromProperties()">
        </div>
      `,
    },
    specialRoundEndSection: {
      title: 'Действия конца раунда',
      html: `
        <div class="content-stack gap-1">
          <label class="form-checkbox"><input type="checkbox" id="roundEndShowRating" onchange="syncPreviewFromProperties()"> Показать промежуточный рейтинг</label>
          <label class="form-checkbox"><input type="checkbox" id="roundEndExcludeLoser" onchange="syncPreviewFromProperties()"> Исключить проигравшего</label>
          <label class="form-checkbox"><input type="checkbox" id="roundEndHostSelectLosers" onchange="syncPreviewFromProperties()"> Ведущий выбирает проигравших</label>
          <label class="form-checkbox"><input type="checkbox" id="roundEndResetScores" onchange="syncPreviewFromProperties()"> Сбросить очки после раунда</label>
        </div>
      `,
    },
    specialLastManSection: {
      title: 'Последний выживший',
      html: `
        <div class="content-stack gap-1">
          <label class="form-checkbox"><input type="checkbox" id="lmsEliminateOnWrong" checked onchange="syncPreviewFromProperties()"> Исключать игрока при ошибке</label>
          <label class="form-checkbox"><input type="checkbox" id="lmsNoEliminateIfAllWrong" checked onchange="syncPreviewFromProperties()"> Если все ошиблись, никого не исключать</label>
        </div>
      `,
    },
    specialAudienceSection: {
      title: 'Опрос аудитории',
      html: `
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
      `,
    },
    specialWagerSection: {
      title: 'Ставка',
      html: `
        <div class="grid-2">
          <select class="input" id="wagerMode" onchange="syncPreviewFromProperties()">
            <option value="percent">Процент от очков</option>
            <option value="absolute">Фиксированная сумма</option>
          </select>
          <input class="input" type="number" id="wagerMin" value="0" min="0" placeholder="Минимум" oninput="syncPreviewFromProperties()">
        </div>
        <div class="grid-2 mt-2">
          <input class="input" type="number" id="wagerMax" value="100" min="0" placeholder="Максимум" oninput="syncPreviewFromProperties()">
          <input class="input" id="wagerNextPrompt" placeholder="Текст перед следующим вопросом" oninput="syncPreviewFromProperties()">
        </div>
      `,
    },
    specialMajoritySection: {
      title: 'Правила большинства',
      html: `
        <div class="grid-2">
          <input class="input" type="number" id="majorityPoints" value="100" min="0" placeholder="Очки" oninput="syncPreviewFromProperties()">
          <select class="input" id="majorityTieMode" onchange="syncPreviewFromProperties()">
            <option value="single">При равенстве: один вариант</option>
            <option value="multiple">При равенстве: несколько вариантов</option>
          </select>
        </div>
      `,
    },
    specialTriviaBoardSection: {
      title: 'Табло вопросов',
      html: `
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
        </div>
      `,
    },
    specialTriviaLadderSection: {
      title: 'Лестница',
      html: `
        <div class="grid-2">
          <select class="input" id="ladderFailAction" onchange="syncPreviewFromProperties()">
            <option value="stay">При ошибке: остаться</option>
            <option value="step_down">При ошибке: шаг вниз</option>
            <option value="safe_haven">При ошибке: к несгораемой сумме</option>
            <option value="start">При ошибке: в начало</option>
          </select>
          <select class="input" id="ladderPosition" onchange="syncPreviewFromProperties()">
            <option value="right">Справа</option>
            <option value="center">По центру</option>
            <option value="full">На весь экран</option>
          </select>
        </div>
        <label class="form-checkbox mt-2"><input type="checkbox" id="ladderAlwaysVisible" onchange="syncPreviewFromProperties()"> Всегда показывать лестницу</label>
      `,
    },
    specialTriviaFeudSection: {
      title: '100 к 1',
      html: `
        <div class="grid-2">
          <select class="input" id="feudMode" onchange="syncPreviewFromProperties()">
            <option value="manual">Ручная игра</option>
            <option value="interactive">Интерактивная игра</option>
            <option value="multiplayer">Командная игра</option>
          </select>
          <select class="input" id="feudRevealMode" onchange="syncPreviewFromProperties()">
            <option value="manual">Раскрывать вручную</option>
            <option value="auto">Раскрывать автоматически</option>
          </select>
        </div>
        <div class="grid-2 mt-2">
          <input class="input" type="number" id="feudTeamMistakesLimit" min="0" value="3" placeholder="Лимит ошибок" oninput="syncPreviewFromProperties()">
          <input class="input" type="number" id="feudPenaltyPoints" min="0" value="0" placeholder="Штрафные очки" oninput="syncPreviewFromProperties()">
        </div>
      `,
    },
    specialSpeedRoundSection: {
      title: 'Быстрый раунд',
      html: `
        <div class="grid-2">
          <input class="input" type="number" id="speedRoundDuration" min="10" value="60" placeholder="Длительность, сек" oninput="syncPreviewFromProperties()">
          <select class="input" id="speedRoundMode" onchange="syncPreviewFromProperties()">
            <option value="host">Ручной режим</option>
            <option value="buzzer">Кнопка ответа</option>
          </select>
        </div>
      `,
    },
    specialBingoSection: {
      title: 'Бинго',
      html: `
        <div class="grid-2">
          <select class="input" id="bingoType" onchange="syncPreviewFromProperties()">
            <option value="standard">Классическое бинго</option>
            <option value="emoji">Бинго с эмодзи</option>
            <option value="trivia">Викторинное бинго</option>
            <option value="music">Музыкальное бинго</option>
          </select>
          <input class="input" type="number" id="bingoFalseLimit" min="0" value="0" placeholder="Лимит ложных бинго" oninput="syncPreviewFromProperties()">
        </div>
        <div class="grid-2 mt-2">
          <input class="input" type="number" id="bingoPatternPoints" min="0" value="100" placeholder="Очки за шаблон" oninput="syncPreviewFromProperties()">
          <input class="input" type="number" id="bingoFalsePenalty" min="0" value="0" placeholder="Штраф за ложный бинго" oninput="syncPreviewFromProperties()">
        </div>
      `,
    },
    specialGameModuleSection: {
      title: 'Игровой модуль',
      html: `
        <div class="grid-2">
          <input class="input" id="gameModuleType" placeholder="Тип модуля" oninput="syncPreviewFromProperties()">
          <input class="input" id="gameModuleTitle" placeholder="Название" oninput="syncPreviewFromProperties()">
        </div>
        <div class="grid-2 mt-2">
          <input class="input" id="gameModuleLaunchBehavior" placeholder="Поведение запуска" oninput="syncPreviewFromProperties()">
          <input class="input" id="gameModuleConfigJson" placeholder="configJson" oninput="syncPreviewFromProperties()">
        </div>
      `,
    },
    specialDemographicSection: {
      title: 'Демографический слайд',
      html: `
        <textarea class="input" id="demographicDescription" rows="3" placeholder="Описание группы" oninput="syncPreviewFromProperties()"></textarea>
      `,
    },
  };

  const TYPE_SECTION_IDS = {
    QUESTION: ['questionLogicSection', 'answersSection', 'timingSection', 'scoringSection', 'judgeSection', 'correctAnswersSection'],
    INFO_SLIDE: ['infoLogicSection'],
    ROUND_END: ['specialRoundEndSection'],
    LAST_MAN_STANDING: ['timingSection', 'specialLastManSection'],
    AUDIENCE_RESPONSE: ['specialAudienceSection'],
    WAGER: ['specialWagerSection'],
    MAJORITY_RULES: ['specialMajoritySection'],
    TRIVIA_BOARD: ['specialTriviaBoardSection'],
    TRIVIA_LADDER: ['specialTriviaLadderSection'],
    TRIVIA_FEUD: ['specialTriviaFeudSection'],
    SPEED_ROUND: ['specialSpeedRoundSection'],
    BINGO: ['specialBingoSection'],
    GAME_MODULE: ['specialGameModuleSection'],
    DEMOGRAPHIC: ['specialDemographicSection'],
  };

  const BASE_SECTION_IDS = ['slideTypeSection', 'hostNotesSection'];
  const STATIC_SECTION_IDS = ['questionLogicSection', 'answersSection', 'trueFalseSection', 'infoLogicSection', 'mediaCommonSection', 'scoringSection', 'timingSection', 'advancedSection', 'hostNotesSection'];
  const ALL_SECTION_IDS = [...STATIC_SECTION_IDS, ...Object.keys(SECTION_DEFINITIONS)];

  const SECTION_HELP = {
    slideTypeSection: 'Тип слайда определяет, какие настройки появятся в правой панели и как слайд будет вести себя во время игры.',
    questionLogicSection: 'Здесь выбирается формат вопроса и то, как участники будут отправлять ответы.',
    answersSection: 'Список вариантов, которые увидят игроки. Один или несколько вариантов можно отметить как верные.',
    trueFalseSection: 'Настройка правильного значения для формата "Правда / ложь".',
    infoLogicSection: 'Поля для слайда без ответа: текст, объяснение, правила или переход между частями игры.',
    mediaCommonSection: 'Файл, который будет использоваться как часть вопроса: изображение, аудио или видео.',
    scoringSection: 'Правила начисления и снятия очков за текущий вопрос.',
    timingSection: 'Время на ответ и способ запуска таймера во время игры.',
    advancedSection: 'Дополнительные правила показа, подсказок и автоматической проверки ответа.',
    hostNotesSection: 'Внутренние заметки для ведущего. Игроки их не видят.',
    judgeSection: 'Правила проверки ответа: автоматически, вручную или с допуском для чисел и текста.',
    correctAnswersSection: 'Эталонные ответы для открытых, числовых и текстовых форматов.',
    specialRoundEndSection: 'Действия, которые выполняются после завершения раунда.',
    specialLastManSection: 'Настройки выбывания игроков в формате "Последний выживший".',
    specialAudienceSection: 'Настройки отображения результатов опроса аудитории.',
    specialWagerSection: 'Ограничения и текст для слайда со ставкой.',
    specialMajoritySection: 'Правила начисления очков, когда правильным считается ответ большинства.',
    specialTriviaBoardSection: 'Поведение игрового табло с темами и стоимостью вопросов.',
    specialTriviaLadderSection: 'Настройки движения по лестнице и реакции на ошибку.',
    specialTriviaFeudSection: 'Правила игры в формате популярных ответов "100 к 1".',
    specialSpeedRoundSection: 'Ограничение времени и способ ответа в быстром раунде.',
    specialBingoSection: 'Правила бинго: тип шаблона, очки и штрафы за ложную заявку.',
    specialGameModuleSection: 'Параметры подключения отдельной игровой механики.',
    specialDemographicSection: 'Описание группы участников или сегмента аудитории.',
  };

  const CONTROL_HELP = {
    slideTypePickerBtn: 'Открывает выбор типа слайда. Выбранный тип подсвечивается в модальном окне.',
    questionInputModeSelect: 'Определяет, какой формат ответа будет у игроков: выбор, текст, число, медиа или правда/ложь.',
    answerModeSelect: 'Выберите, отвечают ли все участники или право ответа получает самый быстрый игрок.',
    multipleCorrectModeSelect: 'Задаёт правило для вопросов с несколькими правильными вариантами.',
    orderedModeSelect: 'Определяет, насколько строго проверять порядок ответов.',
    trueFalseSelect: 'Выберите, какое значение считается правильным для слайда "Правда / ложь".',
    infoTitleInput: 'Короткий заголовок информационного слайда. Он помогает быстро понять смысл перехода или правила.',
    infoTextInput: 'Основной текст информационного слайда, который видят участники.',
    infoDisplayMode: 'Решает, переключает ли слайд ведущий вручную или он уходит дальше по таймеру.',
    questionPoints: 'Количество очков, которое игрок получает за правильный ответ.',
    penaltyPoints: 'Сколько очков снимается за неправильный ответ или ошибку.',
    pointsAtStart: 'Стартовое значение очков для форматов, где сумма меняется по ходу вопроса.',
    pointsAtEnd: 'Итоговое значение очков после завершения вопроса или раунда.',
    questionTime: 'Сколько секунд даётся участникам на ответ.',
    countdownMode: 'Автоматический таймер стартует сам, ручной запускается ведущим.',
    autoJudge: 'Если включено, система сама проверяет ответ по заданным правилам.',
    lockoutOnWrong: 'После неправильного ответа игрок больше не может отвечать на этот слайд.',
    showCorrectAnswer: 'Показывает правильный ответ после завершения вопроса.',
    jokersEnabled: 'Разрешает использовать подсказки, если они включены в игровом режиме.',
    speedBonus1: 'Бонус за самый быстрый правильный ответ первого уровня.',
    speedBonus2: 'Бонус за второй по скорости правильный ответ.',
    speedBonus3: 'Бонус за третий по скорости правильный ответ.',
    textReveal: 'Анимация раскрытия текста вопроса во время показа.',
    questionNotes: 'Служебные подсказки для ведущего. Они не показываются игрокам.',
    demographicGroup: 'Название группы или сегмента, к которому относится слайд.',
    slideRouting: 'Подсказка для перехода: куда вести игру после этого слайда.',
    judgeModeSelect: 'Автоматическая проверка удобна для точных ответов, ручная оставляет решение ведущему.',
    textJudgeMode: 'Точное совпадение требует полный ответ, приблизительное допускает близкие формулировки.',
    answerTolerance: 'Допустимое отклонение для числовых ответов.',
    numericJudgeMode: 'Точная проверка требует совпадение числа, ближайший ответ выбирает наиболее близкое значение.',
    correctAnswerValue: 'Основной правильный ответ, с которым сравнивается ответ игрока.',
    acceptedAnswersRaw: 'Дополнительные допустимые варианты. Разделяйте их точкой с запятой.',
    roundEndShowRating: 'Показывает промежуточный рейтинг после завершения раунда.',
    roundEndExcludeLoser: 'Автоматически исключает проигравшего из дальнейшей игры.',
    roundEndHostSelectLosers: 'Позволяет ведущему вручную выбрать игроков на выбывание.',
    roundEndResetScores: 'Сбрасывает очки перед следующим раундом.',
    lmsEliminateOnWrong: 'Игрок выбывает сразу после неправильного ответа.',
    lmsNoEliminateIfAllWrong: 'Если ошиблись все, раунд продолжается без выбывания.',
    audienceGraphMode: 'Когда показывать результаты опроса: во время ответов или только после завершения.',
    audienceChartType: 'Форма визуализации результатов опроса.',
    wagerMode: 'Ставка может считаться процентом от очков или фиксированной суммой.',
    wagerMin: 'Минимальная ставка, которую может выбрать игрок.',
    wagerMax: 'Максимальная ставка, доступная игроку.',
    wagerNextPrompt: 'Текст, который подводит игроков к следующему вопросу после ставки.',
    majorityPoints: 'Очки за совпадение с самым популярным ответом аудитории.',
    majorityTieMode: 'Что делать, если несколько вариантов набрали одинаковое большинство.',
    boardPickMode: 'Выбор ячейки на табло вручную или случайным образом.',
    boardMaxQuestions: 'Максимальное число вопросов, доступных на табло.',
    boardHideEmpty: 'Скрывает ячейки, в которых нет вопроса.',
    boardTopicsOnly: 'Показывает только темы без отдельных вопросов.',
    ladderFailAction: 'Что происходит с игроком на лестнице после ошибки.',
    ladderPosition: 'Где отображать лестницу на игровом экране.',
    ladderAlwaysVisible: 'Лестница остаётся на экране на протяжении всего слайда.',
    feudMode: 'Определяет, как команды взаимодействуют с форматом "100 к 1".',
    feudRevealMode: 'Как раскрывать найденные ответы: вручную или автоматически.',
    feudTeamMistakesLimit: 'Сколько ошибок команда может сделать до штрафа или передачи хода.',
    feudPenaltyPoints: 'Очки, которые снимаются за ошибки в формате "100 к 1".',
    speedRoundDuration: 'Общая длительность быстрого раунда в секундах.',
    speedRoundMode: 'Ручной режим ведёт ведущий, кнопка ответа отдаёт ход первому нажавшему.',
    bingoType: 'Тип бинго определяет набор карточек и способ проверки заявки.',
    bingoFalseLimit: 'Сколько ложных заявок бинго допускается до штрафа.',
    bingoPatternPoints: 'Очки за правильно собранный шаблон.',
    bingoFalsePenalty: 'Штраф за ложную заявку бинго.',
    gameModuleType: 'Технический тип модуля, который нужно запустить.',
    gameModuleTitle: 'Название модуля, понятное ведущему и редактору.',
    gameModuleLaunchBehavior: 'Как запускать модуль: сразу, вручную или по событию.',
    gameModuleConfigJson: 'Дополнительные настройки модуля в формате configJson.',
    demographicDescription: 'Описание группы или признака, по которому разделяются участники.',
    mediaFile: 'Загрузите файл с компьютера. Он будет прикреплён к текущему вопросу.',
  };

  const val = (id, fallback = '') => document.getElementById(id)?.value ?? fallback;
  const set = (id, value, fallback = '') => {
    const node = document.getElementById(id);
    if (node) node.value = value ?? fallback;
  };
  const setChecked = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.checked = Boolean(value);
  };
  const setPressed = (id, active) => {
    const node = document.getElementById(id);
    if (node) {
      node.value = Boolean(active) ? 'true' : 'false';
      node.classList.toggle('is-active', Boolean(active));
      node.setAttribute('aria-pressed', Boolean(active) ? 'true' : 'false');
    }
    const button = document.querySelector(`[data-toggle="${id}"]`);
    if (button) {
      button.classList.toggle('is-active', Boolean(active));
      button.setAttribute('aria-pressed', Boolean(active) ? 'true' : 'false');
    }
  };
  const show = (id, visible) => {
    const node = document.getElementById(id);
    if (node) node.style.display = visible ? '' : 'none';
  };

  function createInfoTip(text, key) {
    const tip = document.createElement('span');
    tip.className = 'logic-info-tip';
    tip.textContent = 'i';
    tip.setAttribute('role', 'button');
    tip.setAttribute('tabindex', '0');
    tip.setAttribute('aria-label', text);
    tip.dataset.tip = text;
    tip.dataset.helpKey = key;
    return tip;
  }

  function appendInfoTip(target, text, key) {
    if (!target || !text || target.querySelector?.(`.logic-info-tip[data-help-key="${key}"]`)) return;
    target.appendChild(createInfoTip(text, key));
  }

  function controlHelp(control) {
    if (!control || control.classList?.contains('logic-info-tip')) return '';
    if (control.closest?.('#answersSection')) return '';
    if (CONTROL_HELP[control.id]) return CONTROL_HELP[control.id];
    return '';
  }

  function attachControlTip(control, text) {
    const key = control.id || control.className.replace(/\s+/g, '-');
    const checkboxLabel = control.closest?.('.form-checkbox');
    if (checkboxLabel) {
      appendInfoTip(checkboxLabel, text, key);
      return;
    }

    const formLabel = control.closest?.('.form-group')?.querySelector('.form-label');
    if (formLabel) {
      appendInfoTip(formLabel, text, key);
      return;
    }

    if (control.parentElement?.classList.contains('logic-field-with-tip')) {
      appendInfoTip(control.parentElement, text, key);
      return;
    }

    const wrapper = document.createElement('span');
    wrapper.className = 'logic-field-with-tip';
    control.parentNode.insertBefore(wrapper, control);
    wrapper.appendChild(control);
    wrapper.appendChild(createInfoTip(text, key));
  }

  function enhanceLogicTooltips() {
    const panel = document.getElementById('logicPanel');
    if (!panel) return;
    document.getElementById('answersSection')?.querySelectorAll('.logic-info-tip').forEach((tip) => tip.remove());

    panel.querySelectorAll('.panel-section').forEach((section) => {
      const heading = section.querySelector(':scope > h4');
      appendInfoTip(heading, SECTION_HELP[section.id], `${section.id}-section`);
    });

    panel.querySelectorAll('input, select, textarea, button').forEach((control) => {
      if (control.type === 'hidden' || control.type === 'file' || control.classList.contains('logic-info-tip')) return;
      const text = controlHelp(control);
      if (text) attachControlTip(control, text);
    });
  }

  function enhanceLogicSections() {
    const panel = document.getElementById('logicPanel');
    if (!panel) return;

    panel.querySelectorAll('.panel-section').forEach((section) => {
      const heading = section.querySelector(':scope > h4');
      if (!heading || section.id === 'slideTypeSection' || heading.querySelector('.logic-collapse-toggle')) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'logic-collapse-toggle';
      button.setAttribute('aria-label', 'Свернуть секцию');
      button.setAttribute('aria-expanded', 'true');
      button.textContent = '⌄';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const collapsed = section.classList.toggle('is-collapsed');
        button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        button.setAttribute('aria-label', collapsed ? 'Развернуть секцию' : 'Свернуть секцию');
      });
      heading.appendChild(button);
    });
  }

  function watchLogicTooltips() {
    const panel = document.getElementById('logicPanel');
    if (!panel || panel.dataset.tooltipObserverReady === 'true') return;
    panel.dataset.tooltipObserverReady = 'true';

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        enhanceLogicTooltips();
        enhanceLogicSections();
      });
    });
    observer.observe(panel, { childList: true, subtree: true });
  }

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
    const legacyTypeMap = {
      JEOPARDY_ROUND: 'TRIVIA_BOARD',
      MILLIONAIRE_ROUND: 'TRIVIA_LADDER',
      MILLIONAIRE_INTRO: 'TRIVIA_LADDER',
      FAMILY100_ROUND: 'TRIVIA_FEUD',
    };
    if (cfg.slideType) return slideTypeById(cfg.slideType) ? cfg.slideType : (legacyTypeMap[cfg.slideType] || QUESTION);
    const mode = question?.gameMode || question?.type || 'EVERYONE_ANSWERS';
    const elementType = question?.elementType || question?.layoutType || QUESTION;

    if (elementType === 'INFO_SLIDE' || mode === 'INFO_SLIDE') return 'INFO_SLIDE';
    if (legacyTypeMap[mode]) return legacyTypeMap[mode];
    if (['WAGER', 'MAJORITY_RULES', 'LAST_MAN_STANDING', 'ROUND_END', 'DEMOGRAPHIC', 'AUDIENCE_RESPONSE', 'SPEED_ROUND', 'BINGO', 'GAME_MODULE', 'TRIVIA_FEUD'].includes(mode)) {
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
    if (!select || [...select.options].some((opt) => opt.value === value)) return;
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  function ensureSlideTypePickerButton() {
    const typeSection = document.getElementById('slideTypeSelect')?.closest('.panel-section');
    const nativeSelect = document.getElementById('slideTypeSelect');
    if (!typeSection || !nativeSelect) return;

    typeSection.id = 'slideTypeSection';
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
    if (heading) heading.textContent = 'Режим ответа';

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
              <option value="MULTIPLE_CHOICE">Выбор ответа</option>
              <option value="OPEN_ENDED">Открытый ответ</option>
              <option value="NUMERIC_INPUT">Числовой ответ</option>
              <option value="TEXT_INPUT">Текстовый ответ</option>
              <option value="INITIAL_LETTER_INPUT">Первая буква</option>
              <option value="MULTIPLE_CORRECT_SINGLE_PICK">Несколько верных: один выбор</option>
              <option value="MULTIPLE_CORRECT_MULTI_PICK">Несколько верных: несколько выборов</option>
              <option value="ORDERED_ANSWERS">Упорядочивание</option>
              <option value="IMAGE">Вопрос с картинкой</option>
              <option value="AUDIO">Вопрос с аудио</option>
              <option value="VIDEO">Вопрос с видео</option>
              <option value="TRUE_FALSE">Правда / ложь</option>
            </select>
          </div>
          <div></div>
        </div>
        <div class="grid-2 mt-2">
          <select class="input" id="multipleCorrectModeSelect" onchange="syncPreviewFromProperties()">
            <option value="none">Несколько верных: нет</option>
            <option value="single_pick">Один выбор</option>
            <option value="multi_pick">Несколько выборов</option>
            <option value="exact_match">Точное совпадение</option>
          </select>
          <select class="input" id="orderedModeSelect" onchange="syncPreviewFromProperties()">
            <option value="exact">Порядок: точное совпадение</option>
            <option value="partial">Порядок: частичное совпадение</option>
          </select>
        </div>
      </div>
    `);
  }

  function ensureSection(id) {
    if (document.getElementById(id)) return;
    const definition = SECTION_DEFINITIONS[id];
    const panel = document.getElementById('logicPanel');
    if (!definition || !panel) return;

    const section = document.createElement('section');
    section.className = 'panel-section logic-section';
    section.id = id;
    section.innerHTML = `<h4>${definition.title}</h4>${definition.html}`;
    panel.appendChild(section);
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
    const button = document.getElementById('slideTypePickerBtn');
    const meta = slideTypeById(slideType);
    if (button) {
      button.textContent = meta ? `${meta.icon || ''} ${meta.title}`.trim() : 'Выбрать тип слайда';
      button.title = 'Выбрать тип слайда';
    }
    if (current) current.textContent = meta ? 'Нажмите, чтобы изменить тип слайда' : 'Тип не выбран';
  }

  function renderSlideTypeCards(activeType) {
    const grid = document.getElementById('slideTypeCardGrid');
    if (!grid) return;

    grid.innerHTML = SLIDE_TYPE_GROUPS.map((group) => `
      <section class="slide-type-group">
        <h4>${group.title}</h4>
        <div class="slide-type-group-grid">
          ${group.items.map((type) => `
            <button type="button" class="slide-type-card ${type.id === activeType ? 'active' : ''}" data-slide-type="${type.id}">
              <span class="slide-type-card-head">
                <span class="slide-type-card-icon" aria-hidden="true">${type.icon}</span>
                <span class="slide-type-card-title">${type.title}</span>
              </span>
              <span class="slide-type-card-desc">${type.desc}</span>
            </button>
          `).join('')}
        </div>
      </section>
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

  function visibleSectionsFor(slideType, inputMode) {
    const ids = [...BASE_SECTION_IDS, ...(TYPE_SECTION_IDS[slideType] || [])];

    if (slideType === QUESTION) {
      if (inputMode === 'TRUE_FALSE') ids.push('trueFalseSection');
      if (ANSWERLESS_MODES.includes(inputMode)) {
        const index = ids.indexOf('answersSection');
        if (index >= 0) ids.splice(index, 1);
      }
      if (QUESTION_MEDIA_MODES.includes(inputMode)) ids.push('mediaCommonSection');
    }

    return [...new Set(ids)];
  }

  function setPanelSections(visibleIds) {
    visibleIds.forEach(ensureSection);
    ALL_SECTION_IDS.forEach((id) => show(id, visibleIds.includes(id)));
    show('questionModeBlock', visibleIds.includes('questionLogicSection'));
    enhanceLogicTooltips();
    enhanceLogicSections();
  }

  function applyContext(slideType, inputMode) {
    setPanelSections(visibleSectionsFor(slideType, inputMode));
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
      TRIVIA_FEUD: 'FAMILY100_ROUND',
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
    set('mediaTypeSelect', QUESTION_MEDIA_MODES.includes(inputMode) || inputMode === 'TRUE_FALSE' ? inputMode : 'TEXT', 'TEXT');
  }

  function fillTypeSpecificFields(cfg, logic) {
    set('judgeModeSelect', logic.judgeMode, 'auto');
    set('textJudgeMode', logic.textJudgeMode, 'exact');
    set('answerTolerance', logic.answerTolerance, 0);
    set('numericJudgeMode', logic.numericJudgeMode, 'exact');
    set('correctAnswerValue', logic.correctAnswerValue, '');
    set('acceptedAnswersRaw', logic.acceptedAnswersRaw, '');

    setChecked('roundEndShowRating', logic.roundEndShowRating);
    setChecked('roundEndExcludeLoser', logic.roundEndExcludeLoser);
    setChecked('roundEndHostSelectLosers', logic.roundEndHostSelectLosers);
    setChecked('roundEndResetScores', logic.roundEndResetScores);

    setChecked('lmsEliminateOnWrong', logic.lmsEliminateOnWrong !== false);
    setChecked('lmsNoEliminateIfAllWrong', logic.lmsNoEliminateIfAllWrong !== false);

    set('audienceGraphMode', logic.audienceGraphMode, 'realtime');
    set('audienceChartType', logic.audienceChartType, 'bar');
    set('wagerMode', logic.wagerMode, 'percent');
    set('wagerMin', logic.wagerMin, 0);
    set('wagerMax', logic.wagerMax, 100);
    set('wagerNextPrompt', logic.wagerNextPrompt, '');
    set('majorityPoints', logic.majorityPoints, 100);
    set('majorityTieMode', logic.majorityTieMode, 'single');
    set('boardPickMode', logic.boardPickMode, 'manual');
    set('boardMaxQuestions', logic.boardMaxQuestions, 20);
    setChecked('boardHideEmpty', logic.boardHideEmpty);
    setChecked('boardTopicsOnly', logic.boardTopicsOnly);
    set('ladderFailAction', logic.ladderFailAction, 'stay');
    set('ladderPosition', logic.ladderPosition, 'right');
    setChecked('ladderAlwaysVisible', logic.ladderAlwaysVisible);
    set('feudMode', logic.feudMode, 'manual');
    set('feudRevealMode', logic.feudRevealMode, 'manual');
    set('feudTeamMistakesLimit', logic.feudTeamMistakesLimit, 3);
    set('feudPenaltyPoints', logic.feudPenaltyPoints, 0);
    set('speedRoundDuration', logic.speedRoundDuration, 60);
    set('speedRoundMode', logic.speedRoundMode, 'host');
    set('bingoType', logic.bingoType, 'standard');
    set('bingoFalseLimit', logic.bingoFalseLimit, 0);
    set('bingoPatternPoints', logic.bingoPatternPoints, 100);
    set('bingoFalsePenalty', logic.bingoFalsePenalty, 0);
    set('gameModuleType', logic.gameModuleType || cfg.gameModuleType, '');
    set('gameModuleTitle', logic.gameModuleTitle || cfg.gameModuleTitle, '');
    set('gameModuleLaunchBehavior', logic.gameModuleLaunchBehavior || cfg.gameModuleLaunchBehavior, '');
    set('gameModuleConfigJson', logic.gameModuleConfigJson || cfg.gameModuleConfigJson, '');
    set('demographicDescription', logic.demographicDescription || cfg.demographicDescription, '');
  }

  function syncRightPanel(question) {
    const cfg = parseConfig(question);
    const logic = cfg.logic || {};
    const slideType = question ? inferSlideType(question, cfg) : QUESTION;
    const questionMode = question ? inferQuestionMode(question, cfg) : 'EVERYONE_ANSWERS';
    const inputMode = question ? inferInputMode(question, cfg) : 'MULTIPLE_CHOICE';

    set('slideTypeSelect', slideType, QUESTION);
    set('answerModeSelect', questionMode, 'EVERYONE_ANSWERS');
    set('questionInputModeSelect', inputMode, 'MULTIPLE_CHOICE');
    set('multipleCorrectModeSelect', cfg.multipleCorrectMode || logic.multipleCorrectMode, 'none');
    set('orderedModeSelect', cfg.orderedMode || logic.orderedMode, 'exact');
    set('serviceElementTitle', cfg.serviceElementTitle, '');
    set('categoryPreset', cfg.categoryPreset, '');
    set('transitionMode', cfg.transitionMode, 'default');
    set('showAnswerPolicy', cfg.showAnswerPolicy, 'global');

    updateCompatFields();
    applyContext(slideType, inputMode);
    fillTypeSpecificFields(cfg, logic);
    updatePickerButtonLabel(question ? slideType : null);
  }

  function syncAppearance(question) {
    if (!question) return;
    const appearance = parseConfig(question).appearance || {};
    set('answerAccentColor', appearance.answerChipColor, '#6a4fff');
    set('answerChipColor', appearance.answerChipColor, '#6a4fff');
    set('answerCardColor', appearance.answerCardColor, '#ffffff');
    set('answerCardStyle', appearance.answerCardStyle, 'rounded');
    set('answerBorderWeight', appearance.answerAccentWeight, 1);
    set('answerAccentWeight', appearance.answerAccentWeight, 1);
    set('answerGap', appearance.answerGap, 12);
    set('answerCardOpacity', appearance.answerCardOpacity, 92);
    set('questionColor', appearance.titleColor, '#111827');
    set('titleColor', appearance.titleColor, '#111827');
    set('answerColor', appearance.answerColor, '#111827');
    set('questionFont', appearance.questionFont, "'Inter', sans-serif");
    set('answerFont', appearance.answerFont, "'Inter', sans-serif");
    set('questionSize', appearance.titleSize, 48);
    set('titleSize', appearance.titleSize, 48);
    set('answerSize', appearance.answerSize, 18);
    set('answerLayout', appearance.answerLayout, 'grid-2');
    set('questionTemplate', appearance.template, 'classic');
    set('questionAlign', appearance.questionAlign || appearance.textAlign, 'left');
    set('answerAlign', appearance.answerAlign || appearance.textAlign, 'left');
    set('textAlign', appearance.questionAlign || appearance.textAlign, 'left');
    set('backgroundColor', question.backgroundColor, '#f6f8fb');
    set('backgroundImageUrl', question.backgroundImageUrl, '');
    const backgroundImageStatus = document.getElementById('backgroundImageStatus');
    if (backgroundImageStatus) {
      backgroundImageStatus.textContent = question.backgroundImageUrl ? 'Фон загружен' : 'Файл не выбран';
    }
    set('backgroundType', appearance.backgroundType || (question.backgroundImageUrl ? 'image' : (appearance.backgroundGradient ? 'gradient' : 'color')), 'color');
    set('backgroundGradientStart', appearance.backgroundGradientStart, '#f6f8fb');
    set('backgroundGradientEnd', appearance.backgroundGradientEnd, '#dfe7ff');
    set('backgroundGradientDirection', appearance.backgroundGradientDirection, '135deg');
    set('backgroundGradient', appearance.backgroundGradient, '');
    set('backgroundImageFit', appearance.backgroundImageFit, 'cover');
    set('backgroundVideoUrl', appearance.backgroundVideoUrl, '');
    set('backgroundOverlayColor', appearance.backgroundOverlayColor, '#000000');
    set('backgroundOverlayOpacity', appearance.backgroundOverlayOpacity, 0);
    set('contentAlign', appearance.contentAlign, 'stretch');
    set('contentVertical', appearance.contentVertical, 'center');
    const muted = document.getElementById('backgroundVideoMuted');
    const loop = document.getElementById('backgroundVideoLoop');
    if (muted) muted.checked = appearance.backgroundVideoMuted !== false;
    if (loop) loop.checked = appearance.backgroundVideoLoop !== false;
    setPressed('questionBold', appearance.questionBold);
    setPressed('questionItalic', appearance.questionItalic);
    setPressed('questionUnderline', appearance.questionUnderline);
    setPressed('answerBold', appearance.answerBold);
    setPressed('answerItalic', appearance.answerItalic);
    setPressed('answerUnderline', appearance.answerUnderline);
    document.querySelectorAll('[data-align-group]').forEach((node) => {
      const id = node.dataset.alignGroup;
      const value = document.getElementById(id)?.value;
      node.classList.toggle('is-active', node.dataset.alignValue === value);
      node.setAttribute('aria-pressed', node.dataset.alignValue === value ? 'true' : 'false');
    });
    window.refreshActiveTextControls?.();
    window.updateBackgroundToolbar?.();
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
      setPanelSections(BASE_SECTION_IDS);
    }

    const panel = document.getElementById('logicPanel');
    if (panel) {
      panel.querySelectorAll('input,select,textarea,button').forEach((node) => {
        if (node.id === 'slideTypeSelect') return;
        node.disabled = !hasSelection;
      });
    }
    enhanceLogicTooltips();
    enhanceLogicSections();
  }

  function propagateChange() {
    const slideType = val('slideTypeSelect', QUESTION);
    const inputMode = val('questionInputModeSelect', 'MULTIPLE_CHOICE');
    updateCompatFields();
    applyContext(slideType, inputMode);
    updatePickerButtonLabel(slideType);
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
    ensurePickerModal();
    watchLogicTooltips();
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
