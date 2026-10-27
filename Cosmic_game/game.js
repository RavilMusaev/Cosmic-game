'use strict';
// ===== Космическая миссия: общая логика игры =====
// Этот файл подключается на каждой странице. Он сам понимает, на какой странице запущен.

// Порядок страниц. Индекс в массиве = номер этапа.
var pages = ['index', 'customization', 'flight', 'knowledge', 'repair', 'alien', 'maze', 'darkroom', 'boss', 'victory'];
var SAVE_KEY = 'spaceMission';

// Состояние по умолчанию (новая игра)
function defaultState() {
  return {
    name: '',          // имя игрока
    color: '#3b82f6',  // цвет скафандра
    step: 0,           // самый дальний открытый этап
    alien: null,       // результат контакта: null / true / false
    hp: 3,             // здоровье
    boss: 0,           // прогресс боя
    over: false,       // игра завершена
    fio: '',           // ФИО из формы на стартовом экране
    phone: '',         // телефон
    email: ''          // почта
  };
}

// Загружаем сохранение из LocalStorage
var game = defaultState();
try {
  var saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (saved) {
    for (var key in saved) {
      game[key] = saved[key];
    }
  }
} catch (e) {
  game = defaultState();
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  } catch (e) {
    // если сохранить нельзя, игра просто продолжается
  }
}

function $(selector) {
  return document.querySelector(selector);
}

var app = $('#app');
var currentPage = document.body.dataset.page;
var pageIndex = pages.indexOf(currentPage);
var busy = false;      // защита от повторных нажатий при переходе
var audioCtx = null;

// ----- Звук -----
function isMuted() {
  return localStorage.getItem('sm_mute') === '1';
}

function beep(freq, duration) {
  if (isMuted()) return;
  if (freq === undefined) freq = 440;
  if (duration === undefined) duration = 0.12;
  try {
    if (audioCtx === null) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    var osc = audioCtx.createOscillator();
    var vol = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    vol.gain.value = 0.05;
    osc.connect(vol);
    vol.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // нет звука - не страшно
  }
}

// ----- Уведомления -----
var toastTimer = null;

function toast(message, ok) {
  if (ok === undefined) ok = true;
  var box = $('#toast');
  box.textContent = message;
  box.className = 'show ' + (ok ? 'ok' : 'bad');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    box.className = '';
  }, 2600);
  beep(ok ? 660 : 200);
}

// ----- Переходы -----
function goTo(i, delay) {
  if (busy) return;
  if (delay === undefined) delay = 350;
  busy = true;
  document.body.classList.add('out'); // плавное затухание страницы
  setTimeout(function () {
    location.href = pages[i] + '.html';
  }, delay);
}

// Отметить текущий этап пройденным (step никогда не уменьшается)
function completeStage() {
  if (game.step < pageIndex + 1) {
    game.step = pageIndex + 1;
  }
  saveGame();
}

// Сохранить прогресс и показать кнопку "Продолжить"
function showNext() {
  completeStage();
  if ($('#next')) return; // кнопка уже есть
  var b = document.createElement('button');
  b.className = 'btn glow';
  b.id = 'next';
  b.textContent = 'Продолжить';
  b.onclick = function () {
    goTo(pageIndex + 1);
  };
  $('#ctl').appendChild(b);
}

// ----- Помощники для рисования -----
function makeButton(text, id, extraClass) {
  if (extraClass === undefined) extraClass = '';
  return '<button class="btn ' + extraClass + '" id="' + id + '">' + text + '</button>';
}

function shipSvg() {
  return '<svg class="ship" viewBox="0 0 120 200" aria-hidden="true">' +
    '<path d="M60 5C90 40 95 100 90 150H30C25 100 30 40 60 5Z" fill="#e8eefc"/>' +
    '<circle cx="60" cy="70" r="14" fill="#38bdf8" stroke="#1e3a8a" stroke-width="4"/>' +
    '<path d="M30 110L5 165 30 150ZM90 110L115 165 90 150Z" fill="#a855f7"/>' +
    '<path d="M45 152Q60 200 75 152Z" fill="#fb923c"/></svg>';
}

function astroSvg(color) {
  return '<svg viewBox="0 0 100 140" class="astro" aria-hidden="true">' +
    '<rect x="28" y="55" width="44" height="55" rx="14" fill="' + color + '"/>' +
    '<rect x="15" y="60" width="14" height="40" rx="7" fill="' + color + '"/>' +
    '<rect x="71" y="60" width="14" height="40" rx="7" fill="' + color + '"/>' +
    '<rect x="30" y="105" width="16" height="30" rx="7" fill="' + color + '"/>' +
    '<rect x="54" y="105" width="16" height="30" rx="7" fill="' + color + '"/>' +
    '<circle cx="50" cy="35" r="28" fill="#e2e8f0"/>' +
    '<ellipse cx="50" cy="35" rx="20" ry="15" fill="#0f172a"/>' +
    '<ellipse cx="44" cy="30" rx="6" ry="3" fill="#7dd3fc"/></svg>';
}

// ===== СТРАНИЦА 1: главный экран с формой =====

// Регулярные выражения для проверки формы
// ФИО: 2-3 слова кириллицей, каждое с заглавной буквы (двойные фамилии через дефис разрешены)
var fioRegex = /^[А-ЯЁ][а-яё]+(-[А-ЯЁ][а-яё]+)?(\s+[А-ЯЁ][а-яё]+(-[А-ЯЁ][а-яё]+)?){1,2}$/;
// Телефон: допустимые символы (+ только в начале), количество цифр проверяем отдельно
var phoneFormatRegex = /^\+?[\d\s()-]+$/;
// Почта: имя@домен.зона
var emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

// Каждая функция проверки возвращает текст ошибки или пустую строку, если всё верно
function checkFio(value) {
  if (!fioRegex.test(value)) {
    return 'Введи ФИО кириллицей: Фамилия Имя Отчество, каждое слово с заглавной буквы';
  }
  return '';
}

function checkPhone(value) {
  if (!phoneFormatRegex.test(value)) {
    return 'Телефон: только цифры, пробелы, скобки, дефис и + в начале';
  }
  var digits = value.replace(/\D/g, ''); // оставляем только цифры
  if (digits.length < 10 || digits.length > 12) {
    return 'В номере должно быть от 10 до 12 цифр, например +7 999 123-45-67';
  }
  return '';
}

function checkEmail(value) {
  if (!emailRegex.test(value)) {
    return 'Введи почту в формате name@example.com';
  }
  return '';
}

function initIndex() {
  // Описание полей формы
  var fields = [
    { id: 'fio', label: 'ФИО', type: 'text', hint: 'Иванов Иван Иванович', auto: 'name', check: checkFio },
    { id: 'phone', label: 'Номер телефона', type: 'tel', hint: '+7 999 123-45-67', auto: 'tel', check: checkPhone },
    { id: 'email', label: 'Почта', type: 'email', hint: 'name@example.com', auto: 'email', check: checkEmail }
  ];

  var fieldsHtml = '';
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    fieldsHtml += '<div class="field" id="f_' + f.id + '">' +
      '<label for="' + f.id + '">' + f.label + '</label>' +
      '<input id="' + f.id + '" type="' + f.type + '" placeholder="' + f.hint + '" autocomplete="' + f.auto + '" maxlength="60">' +
      '<span class="ferr" id="e_' + f.id + '" role="alert"></span></div>';
  }

  var html = '<section class="panel center"><h1 class="title">Космическая миссия</h1>' +
    '<p class="sub">Заполни анкету космонавта, чтобы начать миссию</p>' +
    shipSvg() +
    '<form id="startForm" class="sform" novalidate>' + fieldsHtml +
    makeButton('Начать миссию', 'start', 'glow big') + '</form>';
  if (game.step > 1 && !game.over) {
    html += '<a class="link" href="' + pages[game.step] + '.html">Продолжить игру</a>';
  }
  html += '<a class="link" href="catalog.html">Арсенал миссии</a>';
  html += '</section>';
  app.innerHTML = html;
  $('#start').type = 'submit';

  // Показать или убрать ошибку у поля
  function showError(field, message) {
    $('#e_' + field.id).textContent = message;
    $('#f_' + field.id).classList.toggle('bad', message !== '');
    $('#' + field.id).setAttribute('aria-invalid', message !== '');
  }

  // Подключаем проверку к каждому полю (отдельная функция, чтобы у каждого поля была своя переменная)
  function setupField(field) {
    var input = $('#' + field.id);
    input.value = game[field.id] || ''; // подставляем ранее введённое
    input.oninput = function () {
      showError(field, ''); // при вводе ошибка исчезает
    };
    input.onblur = function () {
      var v = input.value.trim();
      if (v !== '') showError(field, field.check(v)); // проверка при выходе из поля
    };
  }
  for (var k = 0; k < fields.length; k++) {
    setupField(fields[k]);
  }

  $('#startForm').onsubmit = function (e) {
    e.preventDefault();
    var values = {};
    var firstBad = null;

    // Проверяем все поля
    for (var j = 0; j < fields.length; j++) {
      var field = fields[j];
      var input = $('#' + field.id);
      var value = input.value.trim().replace(/\s+/g, ' '); // лишние пробелы убираем
      var message = field.check(value);
      showError(field, message);
      if (message !== '' && firstBad === null) firstBad = input;
      values[field.id] = value;
    }

    if (firstBad !== null) {
      firstBad.focus();
      toast('Проверь заполнение анкеты', false);
      return; // миссия не начнётся, пока форма неверна
    }

    if (game.over) {
      game = defaultState(); // после победы начинаем с чистого состояния
    }
    game.fio = values.fio;
    game.phone = values.phone;
    game.email = values.email;
    if (game.step < 1) game.step = 1;
    saveGame();
    app.firstChild.classList.add('prep'); // анимация подготовки корабля
    beep(300, 0.5);
    goTo(1, 1200);
  };
}

// ===== СТРАНИЦА 2: кастомизация =====
function initCustomization() {
  var colors = [['Красный', '#ef4444'], ['Синий', '#3b82f6'], ['Зелёный', '#22c55e'], ['Жёлтый', '#eab308']];
  var chosenColor = game.color;

  var swatches = '';
  for (var i = 0; i < colors.length; i++) {
    swatches += '<button class="sw" role="radio" data-c="' + colors[i][1] + '" style="--c:' + colors[i][1] +
      '" aria-label="' + colors[i][0] + '" title="' + colors[i][0] + '"></button>';
  }

  app.innerHTML = '<section class="panel row">' +
    '<div class="pv"><div id="pv"></div><b id="nm"></b></div>' +
    '<div><h1>Создай исследователя</h1><p class="sub">Введи имя и выбери цвет скафандра.</p>' +
    '<label for="name">Имя</label><input id="name" maxlength="16" autocomplete="off">' +
    '<div class="colors" role="radiogroup" aria-label="Цвет скафандра">' + swatches + '</div>' +
    '<p id="err" class="err" role="alert"></p>' +
    '<div id="ctl">' + makeButton('Назад', 'back') + makeButton('Подтвердить персонажа', 'ok', 'glow') + '</div></div></section>';

  var nameInput = $('#name');
  nameInput.value = game.name;
  $('#nm').textContent = game.name; // textContent безопасно выводит имя

  var swatchList = document.querySelectorAll('.sw');

  // Подсвечиваем выбранный цвет и перерисовываем космонавта
  function updateColors() {
    for (var j = 0; j < swatchList.length; j++) {
      var isOn = swatchList[j].dataset.c === chosenColor;
      swatchList[j].classList.toggle('on', isOn);
      swatchList[j].setAttribute('aria-checked', isOn);
    }
    $('#pv').innerHTML = astroSvg(chosenColor);
  }
  updateColors();

  for (var k = 0; k < swatchList.length; k++) {
    swatchList[k].onclick = function () {
      chosenColor = this.dataset.c;
      updateColors();
      beep(520, 0.08);
    };
  }

  nameInput.oninput = function () {
    $('#nm').textContent = nameInput.value;
    $('#err').textContent = '';
  };

  $('#back').onclick = function () {
    goTo(0);
  };

  $('#ok').onclick = function () {
    var enteredName = nameInput.value.trim();
    if (enteredName === '') {
      $('#err').textContent = 'Введи имя исследователя!';
      nameInput.focus();
      toast('Имя обязательно', false);
      return;
    }
    game.name = enteredName;
    game.color = chosenColor;
    completeStage();
    goTo(2);
  };
}

// ===== СТРАНИЦА 3: взлёт и "Звёздный маршрут" =====
function initFlight() {
  var points = [[60, 230], [140, 70], [270, 180], [340, 50]];
  var next = 0; // номер точки, которую нужно нажать следующей

  var pointsHtml = '';
  for (var i = 0; i < points.length; i++) {
    pointsHtml += '<g class="pt" data-i="' + i + '" tabindex="0" role="button" aria-label="Точка ' + (i + 1) + '">' +
      '<circle cx="' + points[i][0] + '" cy="' + points[i][1] + '" r="20"/>' +
      '<text x="' + points[i][0] + '" y="' + (points[i][1] + 6) + '" text-anchor="middle">' + (i + 1) + '</text></g>';
  }

  app.innerHTML = '<section class="panel"><h1>Взлёт: Звёздный маршрут</h1>' +
    '<p class="sub" id="hint">Соедини звёзды по порядку: 1 → 2 → 3 → 4 (клик или перетаскивание).</p>' +
    '<svg id="map" class="map" viewBox="0 0 400 300"><g id="ln"></g>' + pointsHtml + '</svg>' +
    '<div id="ctl"></div></section>';

  var map = $('#map');

  // Обработка нажатия на точку с номером i
  function tapPoint(i) {
    if (next >= 4 || i < next) return; // уже всё готово или точка уже соединена
    if (i === next) {
      // правильная точка
      map.querySelector('[data-i="' + i + '"]').classList.add('ok');
      if (next > 0) {
        $('#ln').insertAdjacentHTML('beforeend',
          '<line x1="' + points[next - 1][0] + '" y1="' + points[next - 1][1] +
          '" x2="' + points[next][0] + '" y2="' + points[next][1] + '"/>');
      }
      next++;
      beep(400 + next * 100, 0.1);
      if (next === 4) {
        $('#hint').textContent = 'Маршрут построен! Курс на Планету Знаний';
        toast('Маршрут построен!');
        app.firstChild.insertAdjacentHTML('beforeend', '<div class="flyship">' + shipSvg() + '</div>');
        showNext();
      }
    } else {
      // неправильная точка: красная подсветка и подсказка
      map.classList.add('bad');
      setTimeout(function () {
        map.classList.remove('bad');
      }, 400);
      $('#hint').textContent = 'Неверно! Сейчас нужна точка ' + (next + 1) + '.';
      toast('Не та звезда', false);
    }
  }

  // Какая точка находится под указателем
  function pointAt(e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return null;
    return el.closest('.pt');
  }

  var pressedPoint = null;
  map.addEventListener('pointerdown', function (e) {
    pressedPoint = pointAt(e);
    if (pressedPoint) tapPoint(Number(pressedPoint.dataset.i));
  });
  // Если отпустили над другой точкой - это перетаскивание
  map.addEventListener('pointerup', function (e) {
    var p = pointAt(e);
    if (p && p !== pressedPoint) tapPoint(Number(p.dataset.i));
  });
  // Управление с клавиатуры
  map.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var p = e.target.closest('.pt');
      if (p) {
        e.preventDefault();
        tapPoint(Number(p.dataset.i));
      }
    }
  });
}

// ===== СТРАНИЦА 4: Планета Знаний =====
function initKnowledge() {
  var tasks = [['7 + 8', 15], ['15 − 6', 9], ['4 × 3', 12], ['24 ÷ 4', 6]];
  var solved = [false, false, false, false];
  var selected = -1;  // выбранная задача
  var input = '';     // введённый ответ

  var cardsHtml = '';
  for (var i = 0; i < tasks.length; i++) {
    cardsHtml += '<button class="card" data-i="' + i + '"><span class="gem"></span>' + tasks[i][0] + ' = ?</button>';
  }
  var keysHtml = '';
  var digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  for (var d = 0; d < digits.length; d++) {
    keysHtml += '<button class="k" data-d="' + digits[d] + '">' + digits[d] + '</button>';
  }

  app.innerHTML = '<section class="panel center"><h1>Планета Знаний</h1>' +
    '<p class="sub">Активируй 4 кристалла: выбери задачу, введи ответ и нажми «Проверить».</p>' +
    '<svg class="planet" viewBox="0 0 200 100" aria-hidden="true"><defs><radialGradient id="pg">' +
    '<stop offset="0" stop-color="#c084fc"/><stop offset="1" stop-color="#4c1d95"/></radialGradient></defs>' +
    '<circle cx="100" cy="150" r="130" fill="url(#pg)"/></svg>' +
    '<p id="cnt" class="cnt"></p><div class="cards">' + cardsHtml + '</div>' +
    '<div class="calc"><output id="scr"></output>' + keysHtml +
    '<button class="k" id="clr">C</button><button class="k ok" id="chk">Проверить</button></div>' +
    '<div id="ctl"></div></section>';

  var cards = document.querySelectorAll('.card');

  // Обновить счётчик, экран калькулятора и карточки
  function updateScreen() {
    var count = 0;
    for (var j = 0; j < solved.length; j++) {
      if (solved[j]) count++;
    }
    $('#cnt').textContent = 'Решено: ' + count + ' из 4';
    if (input !== '') {
      $('#scr').textContent = input;
    } else if (selected < 0) {
      $('#scr').textContent = 'Выбери задачу';
    } else {
      $('#scr').textContent = 'Введи ответ';
    }
    for (var c = 0; c < cards.length; c++) {
      cards[c].classList.toggle('sel', c === selected);
      cards[c].classList.toggle('done', solved[c]);
    }
  }

  function pressDigit(digit) {
    if (selected >= 0 && input.length < 3) {
      input += digit;
      updateScreen();
    }
  }

  function checkAnswer() {
    if (selected < 0) {
      toast('Сначала выбери задачу', false);
      return;
    }
    if (input === '') {
      toast('Введи ответ', false);
      return;
    }
    if (Number(input) === tasks[selected][1]) {
      solved[selected] = true;
      selected = -1;
      input = '';
      toast('Кристалл активирован!');
      updateScreen();
      var allDone = true;
      for (var j = 0; j < solved.length; j++) {
        if (!solved[j]) allDone = false;
      }
      if (allDone) {
        toast('Испытание пройдено!');
        showNext();
      }
    } else {
      input = '';
      updateScreen();
      toast('Попробуй ещё раз', false);
    }
  }

  for (var c = 0; c < cards.length; c++) {
    cards[c].onclick = function () {
      var n = Number(this.dataset.i);
      if (!solved[n]) {
        selected = n;
        input = '';
        updateScreen();
      }
    };
  }

  var keyButtons = document.querySelectorAll('.k[data-d]');
  for (var k = 0; k < keyButtons.length; k++) {
    keyButtons[k].onclick = function () {
      pressDigit(this.dataset.d);
    };
  }

  $('#clr').onclick = function () {
    input = '';
    updateScreen();
  };
  $('#chk').onclick = checkAnswer;

  // Ввод с клавиатуры
  document.addEventListener('keydown', function (e) {
    if (e.key >= '0' && e.key <= '9' && e.key.length === 1) {
      pressDigit(e.key);
    } else if (e.key === 'Backspace') {
      input = input.slice(0, -1);
      updateScreen();
    } else if (e.key === 'Enter') {
      checkAnswer();
    }
  });

  updateScreen();
}

// ===== СТРАНИЦА 5: ремонт двигателя (перетаскивание) =====
function initRepair() {
  // Три фигуры: круг, треугольник, квадрат (без закрывающего "/>")
  var shapes = [
    '<circle cx="50" cy="50" r="40"',
    '<polygon points="50,10 92,88 8,88"',
    '<rect x="12" y="12" width="76" height="76" rx="4"'
  ];
  var shapeNames = ['круга', 'треугольника', 'квадрата'];
  var fillColors = ['#38bdf8', '#f472b6', '#facc15'];
  // Две маски: левая и правая половина фигуры
  var defs = '<defs><clipPath id="hL"><rect width="50" height="100"/></clipPath>' +
    '<clipPath id="hR"><rect x="50" width="50" height="100"/></clipPath></defs>';

  // Половина фигуры f: h = 0 (левая) или 1 (правая)
  function makeHalf(f, h) {
    return '<g data-h="' + h + '" clip-path="url(#h' + (h === 1 ? 'R' : 'L') + ')">' +
      shapes[f] + ' fill="' + fillColors[f] + '" stroke="#fff" stroke-width="2"/></g>';
  }

  // Список всех 6 фрагментов и перемешивание
  var fragments = [];
  for (var f = 0; f < 3; f++) {
    for (var h = 0; h < 2; h++) {
      fragments.push([f, h]);
    }
  }
  fragments.sort(function () {
    return Math.random() - 0.5;
  });

  var slotsHtml = '';
  for (var s = 0; s < 3; s++) {
    slotsHtml += '<svg class="slot" data-f="' + s + '" viewBox="0 0 100 100" aria-label="Контур ' + shapeNames[s] + '">' +
      defs + shapes[s] + ' fill="none" stroke="#7dd3fc" stroke-width="3" stroke-dasharray="6"/><g class="fill"></g></svg>';
  }
  var fragsHtml = '';
  for (var n = 0; n < fragments.length; n++) {
    fragsHtml += '<svg class="frag" data-f="' + fragments[n][0] + '" data-h="' + fragments[n][1] + '" viewBox="0 0 100 100">' +
      defs + makeHalf(fragments[n][0], fragments[n][1]) + '</svg>';
  }

  app.innerHTML = '<section class="panel center"><h1>Поломка двигателя</h1>' +
    '<p class="sub">Перетащи части в контуры фигур (круг, треугольник, квадрат). Собрано: <b id="cnt">0 из 6</b></p>' +
    '<svg id="eng" class="eng" viewBox="0 0 160 60" aria-hidden="true"><rect x="10" y="10" width="110" height="40" rx="10" fill="#7f1d1d"/>' +
    '<path d="M120 15L155 5V55L120 45Z" fill="#556"/></svg>' +
    '<div class="slots">' + slotsHtml + '</div><div class="tray" id="tray">' + fragsHtml + '</div>' +
    '<p id="msg" class="cnt"></p><div id="ctl"></div></section>';

  var dragged = null;  // фрагмент, который сейчас тащим
  var placed = 0;      // сколько фрагментов уже на месте

  function moveDragged(e) {
    if (dragged) {
      dragged.style.left = (e.clientX - 40) + 'px';
      dragged.style.top = (e.clientY - 40) + 'px';
    }
  }

  $('#tray').addEventListener('pointerdown', function (e) {
    var frag = e.target.closest('.frag');
    if (!frag) return;
    e.preventDefault();
    dragged = frag;
    frag.classList.add('drag');
    moveDragged(e);
  });
  window.addEventListener('pointermove', moveDragged);

  window.addEventListener('pointerup', function (e) {
    if (!dragged) return;
    var frag = dragged;
    dragged = null;

    // Ищем контур под указателем (пока фрагмент ещё "прозрачен" для мыши)
    var under = document.elementFromPoint(e.clientX, e.clientY);
    var slot = null;
    if (under) slot = under.closest('.slot');

    // Возвращаем фрагмент в исходное место (убираем inline-позицию)
    frag.classList.remove('drag');
    frag.style.left = '';
    frag.style.top = '';

    var half = frag.dataset.h;
    var correct = slot !== null && slot.dataset.f === frag.dataset.f &&
      slot.querySelector('.fill [data-h="' + half + '"]') === null;

    if (correct) {
      slot.querySelector('.fill').insertAdjacentHTML('beforeend', makeHalf(Number(frag.dataset.f), Number(half)));
      frag.remove();
      placed++;
      beep(700, 0.1);
      $('#cnt').textContent = placed + ' из 6';
      if (slot.querySelectorAll('.fill g').length === 2) {
        slot.classList.add('ok'); // фигура собрана - подсветка зелёным
      }
      if (placed === 6) {
        $('#eng').classList.add('fixed');
        $('#msg').textContent = 'Двигатель восстановлен! Можно продолжать путешествие';
        toast('Двигатель восстановлен!');
        showNext();
      }
    } else {
      toast('Не подходит — фрагмент вернулся', false);
    }
  });
}

// ===== СТРАНИЦА 6: инопланетный контакт =====
function initAlien() {
  var answers = [
    'Я исследователь и хочу познакомиться с тобой.',
    'Отойди! Мне нужно пройти.',
    'Я пришёл забрать ресурсы твоей планеты.'
  ];
  var reactions = [
    'Как здорово! Ты первый, кто спросил, а не потребовал. Я помогу тебе в бою!',
    'Грубиян! Я ничем не стану тебе помогать.',
    'Грабитель! Убирайся с моей планеты!'
  ];
  var question = 'Кто ты и зачем прилетел на нашу планету?';

  var optionsHtml = '';
  for (var i = 0; i < answers.length; i++) {
    optionsHtml += '<button class="btn opt" data-i="' + i + '">' + (i + 1) + '. ' + answers[i] + '</button>';
  }

  app.innerHTML = '<section class="panel"><h1>Инопланетный контакт</h1>' +
    '<svg class="alien" viewBox="0 0 120 130" aria-hidden="true">' +
    '<path d="M40 20L30 3M80 20L90 3" stroke="#86efac" stroke-width="4"/>' +
    '<circle cx="30" cy="3" r="5" fill="#f472b6"/><circle cx="90" cy="3" r="5" fill="#f472b6"/>' +
    '<ellipse cx="60" cy="60" rx="45" ry="48" fill="#4ade80"/>' +
    '<ellipse cx="42" cy="55" rx="13" ry="18" fill="#111"/><ellipse cx="78" cy="55" rx="13" ry="18" fill="#111"/>' +
    '<circle cx="45" cy="50" r="4" fill="#fff"/><circle cx="81" cy="50" r="4" fill="#fff"/>' +
    '<path d="M45 92Q60 102 75 92" stroke="#14532d" stroke-width="4" fill="none"/></svg>' +
    '<div class="dlg"><b>Пришелец:</b> <span id="tx">' + question + '</span></div>' +
    '<div id="opts">' + optionsHtml + '</div><div id="ctl"></div></section>';

  var optionButtons = document.querySelectorAll('.opt');
  for (var k = 0; k < optionButtons.length; k++) {
    optionButtons[k].onclick = function () {
      var choice = Number(this.dataset.i);
      var friend = (choice === 0); // дружба только при первом ответе

      // Результат влияет на финальную битву
      game.alien = friend;
      game.hp = friend ? 5 : 3;
      saveGame();

      $('#tx').textContent = reactions[choice];
      $('#opts').hidden = true;
      if (friend) {
        toast('Новый союзник! Дополнительное здоровье получено', true);
      } else {
        toast('Контакт не установлен. Придётся справляться самостоятельно', false);
        // при провале можно повторить диалог
        var retry = document.createElement('button');
        retry.className = 'btn';
        retry.id = 'retry';
        retry.textContent = 'Повторить диалог';
        retry.onclick = function () {
          retry.remove();
          var nextBtn = $('#next');
          if (nextBtn) nextBtn.remove();
          $('#tx').textContent = question;
          $('#opts').hidden = false;
        };
        $('#ctl').appendChild(retry);
      }
      showNext();
    };
  }
}

// ===== СТРАНИЦА 7: лабиринт =====
function initMaze() {
  var w = 8, h = 6;            // размер в "комнатах"
  var W = 2 * w + 1;           // размер сетки с учётом стен
  var H = 2 * h + 1;
  var grid = [];               // 1 = стена, 0 = проход
  for (var y0 = 0; y0 < H; y0++) {
    var row = [];
    for (var x0 = 0; x0 < W; x0++) {
      row.push(1);
    }
    grid.push(row);
  }

  // Генерация лабиринта обходом в глубину: всегда есть путь к выходу
  function carve(cx, cy) {
    grid[2 * cy + 1][2 * cx + 1] = 0;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    dirs.sort(function () {
      return Math.random() - 0.5;
    });
    for (var i = 0; i < dirs.length; i++) {
      var dx = dirs[i][0], dy = dirs[i][1];
      var nx = cx + dx, ny = cy + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && grid[2 * ny + 1][2 * nx + 1] === 1) {
        grid[2 * cy + 1 + dy][2 * cx + 1 + dx] = 0; // убираем стену между комнатами
        carve(nx, ny);
      }
    }
  }
  carve(0, 0);

  var px = 1, py = 1;     // позиция игрока
  var finished = false;

  // Клетки лабиринта
  var cells = '';
  for (var j = 0; j < H; j++) {
    for (var i = 0; i < W; i++) {
      var cls = '';
      if (i === W - 2 && j === H - 2) {
        cls = 'e'; // выход
      } else if (grid[j][i] === 1) {
        cls = (Math.random() < 0.15) ? 'w w2' : 'w'; // стена (иногда с декором)
      }
      cells += '<div class="' + cls + '"></div>';
    }
  }

  app.innerHTML = '<section class="panel center"><h1>Космическая станция</h1>' +
    '<p class="sub">Найди выход, чтобы вернуться к кораблю. Стрелки или WASD.</p>' +
    '<div class="maze" id="mz" style="grid-template-columns:repeat(' + W + ',1fr);aspect-ratio:' + W + '/' + H + '">' + cells +
    '<div class="pl" id="pl" style="width:' + (100 / W) + '%;height:' + (100 / H) + '%">' + astroSvg(game.color) + '</div></div>' +
    '<div class="dpad"><button class="k" data-d="-1,0" aria-label="Влево">◀</button>' +
    '<button class="k" data-d="0,-1" aria-label="Вверх">▲</button>' +
    '<button class="k" data-d="0,1" aria-label="Вниз">▼</button>' +
    '<button class="k" data-d="1,0" aria-label="Вправо">▶</button></div><div id="ctl"></div></section>';

  var player = $('#pl');

  function placePlayer() {
    player.style.left = (px / W * 100) + '%';
    player.style.top = (py / H * 100) + '%';
  }
  placePlayer();

  // Шаг на (dx, dy). Если там стена - остаёмся на месте
  function move(dx, dy) {
    if (finished) return;
    if (grid[py + dy][px + dx] === 1) return;
    px += dx;
    py += dy;
    placePlayer();
    beep(300, 0.04);
    if (px === W - 2 && py === H - 2) {
      finished = true;
      $('#mz .e').classList.add('open'); // шлюз открывается
      toast('Шлюз открыт!');
      showNext();
    }
  }

  var keyMap = {
    ArrowLeft: [-1, 0], a: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0],
    ArrowUp: [0, -1], w: [0, -1],
    ArrowDown: [0, 1], s: [0, 1]
  };

  document.addEventListener('keydown', function (e) {
    var k = e.key.length > 1 ? e.key : e.key.toLowerCase();
    var dir = keyMap[k];
    if (dir) {
      e.preventDefault();
      move(dir[0], dir[1]);
    }
  });

  var padButtons = document.querySelectorAll('.dpad .k');
  for (var b = 0; b < padButtons.length; b++) {
    padButtons[b].onclick = function () {
      var parts = this.dataset.d.split(',');
      move(Number(parts[0]), Number(parts[1]));
    };
  }
}

// ===== СТРАНИЦА 8: тёмная комната =====
function initDarkroom() {
  // название, позиция слева (%), сверху (%), цвет
  var items = [
    ['Ключ', 15, 22, '#facc15'],
    ['Батарея', 68, 18, '#4ade80'],
    ['Звёздный кристалл', 38, 58, '#c084fc'],
    ['Инструмент', 74, 66, '#fb923c'],
    ['Карта', 12, 76, '#38bdf8']
  ];
  var found = 0;

  var itemsHtml = '';
  for (var i = 0; i < items.length; i++) {
    itemsHtml += '<button class="item" style="left:' + items[i][1] + '%;top:' + items[i][2] + '%;--c:' + items[i][3] + '">' +
      items[i][0] + '</button>';
  }

  app.innerHTML = '<section class="panel"><h1>Тёмная комната</h1>' +
    '<p class="sub">Води фонариком и найди 5 предметов. Нажимай на предмет, пока он освещён.</p>' +
    '<p id="cnt" class="cnt">Найдено: 0 из 5</p>' +
    '<div id="room" class="room">' + itemsHtml + '<div class="dark" id="dk"></div></div><div id="ctl"></div></section>';

  var room = $('#room');
  var darkness = $('#dk');
  var lightX = room.clientWidth / 2;  // центр фонарика
  var lightY = room.clientHeight / 2;

  function setLight() {
    darkness.style.setProperty('--x', lightX + 'px');
    darkness.style.setProperty('--y', lightY + 'px');
  }
  setLight();

  // Фонарик следует за мышью или касанием
  function moveLight(e) {
    var rect = room.getBoundingClientRect();
    lightX = e.clientX - rect.left;
    lightY = e.clientY - rect.top;
    setLight();
  }
  room.addEventListener('pointermove', moveLight);
  room.addEventListener('pointerdown', moveLight);

  var itemButtons = document.querySelectorAll('.item');
  for (var k = 0; k < itemButtons.length; k++) {
    itemButtons[k].onclick = function () {
      // Центр предмета и расстояние до центра света
      var cx = this.offsetLeft + this.offsetWidth / 2;
      var cy = this.offsetTop + this.offsetHeight / 2;
      var distance = Math.sqrt((cx - lightX) * (cx - lightX) + (cy - lightY) * (cy - lightY));
      if (distance > 110) {
        toast('Слишком темно — подсвети предмет', false);
        return;
      }
      this.remove();
      found++;
      beep(800, 0.1);
      $('#cnt').textContent = 'Найдено: ' + found + ' из 5';
      if (found === 5) {
        darkness.style.opacity = '.25'; // комната светлеет
        toast('Выход разблокирован!');
        showNext();
      }
    };
  }
}

// ===== СТРАНИЦА 9: финальная битва =====
function initBoss() {
  // Здоровье зависит от контакта с пришельцем (страница 6)
  var maxHp = (game.alien === true) ? 5 : 3;
  var hp = maxHp;
  var progress = 0;       // прогресс победы над боссом, 0..100
  var armPos = [0, 0.4];  // насколько вытянута каждая рука, 0..1
  var timer = null;

  var allyText = (game.alien === true) ? ' Союзник даёт +2 здоровья.' : '';

  app.innerHTML = '<section class="panel"><h1>Финальная битва</h1>' +
    '<p class="sub">Нажимай на руки пришельца, когда они тянутся к кораблю!' + allyText + '</p>' +
    '<div class="hudb"><div>Здоровье: <b id="hp"></b></div><div class="bar big"><i id="bp"></i></div></div>' +
    '<div id="arena" class="arena">' +
    '<svg class="boss" id="bs" viewBox="0 0 300 200" aria-hidden="true">' +
    '<ellipse cx="150" cy="90" rx="130" ry="100" fill="#6d28d9"/>' +
    '<circle cx="100" cy="80" r="22" fill="#fde047"/><circle cx="150" cy="65" r="26" fill="#fde047"/><circle cx="200" cy="80" r="22" fill="#fde047"/>' +
    '<circle cx="100" cy="82" r="9" fill="#111"/><circle cx="150" cy="67" r="11" fill="#111"/><circle cx="200" cy="82" r="9" fill="#111"/>' +
    '<path d="M90 140Q150 180 210 140" stroke="#111" stroke-width="8" fill="none"/></svg>' +
    '<div class="arm" data-i="0" style="left:20%"></div><div class="arm" data-i="1" style="left:68%"></div>' +
    '<div class="shipb">' + shipSvg() + '</div></div><div id="ctl"></div></section>';

  var arena = $('#arena');
  var arms = document.querySelectorAll('.arm');
  var boss = $('#bs');

  // Перерисовка здоровья, шкалы и длины рук
  function updateBossUi() {
    var left = hp > 0 ? hp : 0;
    var hearts = '';
    for (var i = 0; i < maxHp; i++) {
      hearts += (i < left) ? '♥' : '♡';
    }
    $('#hp').textContent = hearts;
    $('#bp').style.width = progress + '%';
    for (var a = 0; a < arms.length; a++) {
      arms[a].style.height = (40 + armPos[a] * 260) + 'px';
    }
  }

  function startBattle() {
    clearInterval(timer);
    hp = maxHp;          // здоровье восстанавливается, контакт с пришельцем остаётся
    progress = 0;
    armPos = [0, 0.4];
    game.boss = 0;
    $('#ctl').innerHTML = '';
    updateBossUi();
    // Каждые 50 мс руки тянутся к кораблю, чем дальше бой, тем быстрее
    timer = setInterval(function () {
      var speed = 0.2 + progress / 100 * 0.25;
      for (var i = 0; i < armPos.length; i++) {
        armPos[i] += speed * 0.05;
        if (armPos[i] >= 1) {
          // рука достала корабль
          armPos[i] = 0;
          hp--;
          arena.classList.add('hurt');
          setTimeout(function () {
            arena.classList.remove('hurt');
          }, 400);
          toast('Корабль повреждён!', false);
        }
      }
      updateBossUi();
      if (hp <= 0) loseBattle();
    }, 50);
  }

  function loseBattle() {
    clearInterval(timer);
    $('#ctl').innerHTML = '<p class="err">Корабль захвачен! Попробуй ещё раз.</p>' + makeButton('Повторить битву', 'again', 'glow');
    $('#again').onclick = startBattle;
  }

  function winBattle() {
    clearInterval(timer);
    boss.style.opacity = '.3';
    $('#ctl').innerHTML = '<p class="cnt">Босс отступает!</p>';
    showNext();
  }

  // Выстрел по руке
  function shootArm(arm, e) {
    e.preventDefault();
    var i = Number(arm.dataset.i);
    if (hp <= 0 || progress >= 100) return;

    // Вспышка выстрела в точке нажатия
    var rect = arena.getBoundingClientRect();
    arena.insertAdjacentHTML('beforeend', '<span class="shot" style="left:' + (e.clientX - rect.left) +
      'px;top:' + (e.clientY - rect.top) + 'px"></span>');
    setTimeout(function () {
      var shot = arena.querySelector('.shot');
      if (shot) shot.remove();
    }, 320);

    if (armPos[i] < 0.12) {
      toast('Рано! Дождись, пока рука приблизится', false);
      return;
    }
    armPos[i] = 0; // рука отброшена назад
    progress = Math.min(100, progress + 9);
    game.boss = progress;
    saveGame();
    beep(900, 0.08);
    boss.classList.add('flash');
    setTimeout(function () {
      boss.classList.remove('flash');
    }, 120);
    updateBossUi();
    if (progress >= 100) winBattle();
  }

  for (var a = 0; a < arms.length; a++) {
    arms[a].addEventListener('pointerdown', function (e) {
      shootArm(this, e);
    });
  }

  startBattle();
}

// ===== СТРАНИЦА 10: победа =====
function initVictory() {
  game.over = true;
  saveGame();

  app.innerHTML = '<section class="panel center"><h1 class="title">Миссия выполнена!</h1>' +
    '<div class="fly2">' + shipSvg() + '</div><p id="th" class="sub"></p>' +
    '<div id="ctl">' + makeButton('Начать заново', 'again', 'glow big') + '</div></section>';

  var playerName = game.name ? game.name : 'исследователь';
  // textContent безопасно подставляет имя
  $('#th').textContent = 'Поздравляем, ' + playerName + '! Спасибо, что помог спасти космическую миссию. ' +
    'Благодаря твоей смелости и сообразительности галактика снова в безопасности!';

  // Конфетти
  for (var i = 0; i < 50; i++) {
    var piece = document.createElement('span');
    piece.className = 'conf';
    piece.style.left = (Math.random() * 100) + '%';
    piece.style.background = 'hsl(' + (Math.random() * 360) + ',90%,60%)';
    piece.style.animationDuration = (3 + Math.random() * 4) + 's';
    piece.style.animationDelay = (-Math.random() * 6) + 's';
    document.body.appendChild(piece);
  }
  beep(880, 0.3);

  // Полный сброс игры
  $('#again').onclick = function () {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      // ничего
    }
    game = defaultState();
    goTo(0);
  };
}

// ===== ЗАПУСК: панель сверху, защита от пропуска этапов, нужная страница =====
function startGame() {
  var header = document.createElement('header');
  header.className = 'hud';
  header.innerHTML = '<span>Этап ' + (pageIndex + 1) + ' из 10</span>' +
    '<div class="bar"><i style="width:' + ((pageIndex + 1) * 10) + '%"></i></div>' +
    '<button id="snd" class="mini" aria-label="Звук">' + (isMuted() ? 'Звук выкл' : 'Звук вкл') + '</button>';
  document.body.insertBefore(header, document.body.firstChild);

  $('#snd').onclick = function () {
    localStorage.setItem('sm_mute', isMuted() ? '0' : '1');
    this.textContent = isMuted() ? 'Звук выкл' : 'Звук вкл';
  };

  // Нельзя открыть этап, пока не пройден предыдущий
  if (pageIndex > game.step) {
    app.innerHTML = '<section class="panel center"><h1>Этап закрыт</h1><p>Сначала пройди предыдущие испытания.</p>' +
      '<a class="btn glow" href="' + pages[game.step] + '.html">К последнему этапу</a></section>';
    return;
  }

  // Запускаем функцию текущей страницы
  var starters = {
    index: initIndex,
    customization: initCustomization,
    flight: initFlight,
    knowledge: initKnowledge,
    repair: initRepair,
    alien: initAlien,
    maze: initMaze,
    darkroom: initDarkroom,
    boss: initBoss,
    victory: initVictory
  };
  starters[currentPage]();
}

startGame();
