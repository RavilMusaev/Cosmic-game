// ===== Арсенал миссии: List и Detail =====
// Данные лежат в data/gear.json, а в gear-data.js те же данные в переменной gearData
var gearList = document.getElementById('gearList');
var detailSection = document.getElementById('detailSection');
var detailCard = document.getElementById('detailCard');
var closeButton = document.getElementById('closeDetail');

// ----- LIST: список карточек -----
function showGearList(items) {
  var html = '';
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    html += '<article class="gear-card" data-id="' + item.id + '" tabindex="0">' +
      '<img src="' + item.image + '" alt="' + item.name + '" class="gear-img">' +
      '<span class="gear-cat">' + item.category + '</span>' +
      '<h3>' + item.name + '</h3>' +
      '<p class="product-price">' + item.price.toLocaleString('ru-RU') + ' кредитов</p>' +
      '</article>';
  }
  gearList.innerHTML = html;

  // Клик (или Enter) по карточке открывает Detail
  var cards = document.querySelectorAll('.gear-card');
  for (var k = 0; k < cards.length; k++) {
    cards[k].onclick = function () {
      showGearDetail(Number(this.dataset.id));
    };
    cards[k].onkeydown = function (e) {
      if (e.key === 'Enter') showGearDetail(Number(this.dataset.id));
    };
  }
}

// ----- DETAIL: подробная карточка в модальном окне -----
function showGearDetail(gear_id) {
  var gear = gearData.find(function (g) {
    return g.id === gear_id;
  });
  if (!gear) return;

  // Характеристики: из объекта specs делаем список <li>
  var specsList = Object.entries(gear.specs)
    .map(function (pair) {
      return '<li><strong>' + pair[0] + ': </strong>' + pair[1] + '</li>';
    })
    .join('');

  detailCard.innerHTML =
    '<div class="detail-layout">' +
    '<h2>' + gear.name + '</h2>' +
    '<img src="' + gear.image + '" alt="' + gear.name + '" class="detail-img">' +
    '<p class="detail-desc">' + gear.description + '</p>' +
    '<div class="detail-specs">' +
    '<strong>Технические характеристики</strong>' +
    '<ul style="margin-top: 10px">' + specsList + '</ul>' +
    '</div>' +
    '<p class="product-price" style="font-size: 1.5rem;">' + gear.price.toLocaleString('ru-RU') + ' кредитов</p>' +
    '</div>';

  detailSection.classList.remove('hidden'); // показать модалку
}

function closeDetail() {
  detailSection.classList.add('hidden');
}

// Закрытие: кнопка, клик по тёмному фону, клавиша Escape
closeButton.onclick = closeDetail;
detailSection.onclick = function (e) {
  if (e.target === detailSection) closeDetail();
};
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeDetail();
});

// Запуск: если файл с данными не подключился, показываем понятное сообщение
if (typeof gearData === 'undefined') {
  gearList.innerHTML = '<p class="err">Не найден файл data/gear-data.js. ' +
    'Проверь, что папка data лежит рядом с catalog.html.</p>';
} else {
  showGearList(gearData);
}
