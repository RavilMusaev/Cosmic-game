
// ========================================
// CRUD-система для каталога Cosmic-game
// Create, Read, Update, Delete
// ========================================

// Получаем элементы страницы
var gearList = document.getElementById('gearList');
var detailSection = document.getElementById('detailSection');
var detailCard = document.getElementById('detailCard');
var closeButton = document.getElementById('closeDetail');

var gearForm = document.getElementById('gearForm');
var gearId = document.getElementById('gearId');
var gearName = document.getElementById('gearName');
var gearCategory = document.getElementById('gearCategory');
var gearImage = document.getElementById('gearImage');
var gearDescription = document.getElementById('gearDescription');
var gearSpecs = document.getElementById('gearSpecs');
var gearPrice = document.getElementById('gearPrice');

var saveButton = document.getElementById('saveGear');
var cancelButton = document.getElementById('cancelEdit');
var formMessage = document.getElementById('formMessage');

// Ключ, под которым каталог будет храниться в LocalStorage
var STORAGE_KEY = 'cosmicGameGear';

// Массив предметов
var gearItems = [];

// ========================================
// 1. READ — загрузка данных
// ========================================

function loadGear() {
  var savedData = localStorage.getItem(STORAGE_KEY);

  if (savedData !== null) {
    try {
      gearItems = JSON.parse(savedData);

      if (!Array.isArray(gearItems)) {
        throw new Error('Некорректный формат данных');
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      gearItems = Array.isArray(window.gearData) ? window.gearData.slice() : [];
      saveGearToStorage();
    }
  } else {
    // При первом запуске берём исходные данные из gear-data.js
    gearItems = Array.isArray(window.gearData)
      ? window.gearData.map(function(item) {
          return JSON.parse(JSON.stringify(item));
        })
      : [];

    saveGearToStorage();
  }

  showGearList();
}

// Сохранение массива в LocalStorage
function saveGearToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gearItems));
    return true;
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    showMessage('Не удалось сохранить данные в браузере.', true);
    return false;
  }
}

// ========================================
// 2. READ — отображение каталога
// ========================================

function showGearList() {
  gearList.innerHTML = '';

  if (gearItems.length === 0) {
    var emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'Каталог пока пуст. Добавь первый предмет!';
    gearList.appendChild(emptyMessage);
    return;
  }

  gearItems.forEach(function(item) {
    var card = document.createElement('article');
    card.className = 'gear-card';
    card.tabIndex = 0;

    var image = document.createElement('img');
    image.src = item.image;
    image.alt = item.name;
    image.className = 'gear-img';

    var category = document.createElement('span');
    category.className = 'gear-cat';
    category.textContent = item.category;

    var name = document.createElement('h3');
    name.textContent = item.name;

    var price = document.createElement('p');
    price.className = 'product-price';
    price.textContent =
      Number(item.price).toLocaleString('ru-RU') + ' кредитов';

    var actions = document.createElement('div');
    actions.className = 'gear-actions';

    var editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'mini';
    editButton.textContent = 'Изменить';

    var deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'mini delete-btn';
    deleteButton.textContent = 'Удалить';

    // Открываем подробности при нажатии на карточку
    card.addEventListener('click', function() {
      showGearDetail(item.id);
    });

    card.addEventListener('keydown', function(event) {
      if (event.target !== card) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        showGearDetail(item.id);
      }
    });

    // UPDATE — открываем форму редактирования
    editButton.addEventListener('click', function(event) {
      event.stopPropagation();
      editGear(item.id);
    });

    // DELETE — удаляем предмет
    deleteButton.addEventListener('click', function(event) {
      event.stopPropagation();
      deleteGear(item.id);
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    card.appendChild(image);
    card.appendChild(category);
    card.appendChild(name);
    card.appendChild(price);
    card.appendChild(actions);

    gearList.appendChild(card);
  });
}

// ========================================
// 3. READ — подробная информация о предмете
// ========================================

function showGearDetail(id) {
  var item = gearItems.find(function(gear) {
    return gear.id === id;
  });

  if (!item) return;

  detailCard.innerHTML = '';

  var layout = document.createElement('div');
  layout.className = 'detail-layout';

  var title = document.createElement('h2');
  title.textContent = item.name;

  var image = document.createElement('img');
  image.src = item.image;
  image.alt = item.name;
  image.className = 'detail-img';

  var description = document.createElement('p');
  description.className = 'detail-desc';
  description.textContent = item.description;

  var specsContainer = document.createElement('div');
  specsContainer.className = 'detail-specs';

  var specsTitle = document.createElement('strong');
  specsTitle.textContent = 'Технические характеристики';

  var specsList = document.createElement('ul');

  Object.entries(item.specs || {}).forEach(function(pair) {
    var li = document.createElement('li');
    var strong = document.createElement('strong');

    strong.textContent = pair[0] + ': ';
    li.appendChild(strong);
    li.appendChild(document.createTextNode(String(pair[1])));

    specsList.appendChild(li);
  });

  var price = document.createElement('p');
  price.className = 'product-price';
  price.style.fontSize = '1.5rem';
  price.textContent =
    Number(item.price).toLocaleString('ru-RU') + ' кредитов';

  specsContainer.appendChild(specsTitle);
  specsContainer.appendChild(specsList);

  layout.appendChild(title);
  layout.appendChild(image);
  layout.appendChild(description);
  layout.appendChild(specsContainer);
  layout.appendChild(price);

  detailCard.appendChild(layout);

  detailSection.classList.remove('hidden');
}

// Закрытие подробностей
function closeDetail() {
  detailSection.classList.add('hidden');
}

closeButton.addEventListener('click', closeDetail);

detailSection.addEventListener('click', function(event) {
  if (event.target === detailSection) {
    closeDetail();
  }
});

document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeDetail();
  }
});

// ========================================
// 4. CREATE — добавление нового предмета
// ========================================

gearForm.addEventListener('submit', function(event) {
  event.preventDefault();

  var name = gearName.value.trim();
  var category = gearCategory.value.trim();
  var image = gearImage.value.trim();
  var description = gearDescription.value.trim();
  var price = Number(gearPrice.value);

  // Проверяем правильность JSON с характеристиками
  var specs;

  try {
    specs = JSON.parse(gearSpecs.value);

    if (
      specs === null ||
      Array.isArray(specs) ||
      typeof specs !== 'object'
    ) {
      throw new Error('Характеристики должны быть JSON-объектом');
    }
  } catch (error) {
    showMessage('Ошибка в характеристиках. Проверь формат JSON.', true);
    return;
  }

  // Проверка заполнения полей
  if (!name || !category || !image || !description) {
    showMessage('Заполни все поля формы.', true);
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    showMessage('Цена должна быть числом не меньше нуля.', true);
    return;
  }

  // UPDATE — если ID уже существует, изменяем предмет
  if (gearId.value !== '') {
    var id = Number(gearId.value);

    var index = gearItems.findIndex(function(item) {
      return item.id === id;
    });

    if (index === -1) {
      showMessage('Предмет для редактирования не найден.', true);
      return;
    }

    var oldItem = gearItems[index];

    gearItems[index] = {
      id: oldItem.id,
      name: name,
      category: category,
      image: image,
      description: description,
      specs: specs,
      price: price
    };

    if (!saveGearToStorage()) return;

    showMessage('Предмет успешно изменён!');
  } else {
    // CREATE — создаём новый предмет с уникальным ID
    var newId = gearItems.length > 0
      ? Math.max.apply(null, gearItems.map(function(item) {
          return Number(item.id);
        })) + 1
      : 1;

    var newItem = {
      id: newId,
      name: name,
      category: category,
      image: image,
      description: description,
      specs: specs,
      price: price
    };

    gearItems.push(newItem);

    if (!saveGearToStorage()) {
      gearItems.pop();
      return;
    }

    showMessage('Новый предмет успешно добавлен!');
  }

  resetForm();
  showGearList();
});

// ========================================
// 5. UPDATE — редактирование предмета
// ========================================

function editGear(id) {
  var item = gearItems.find(function(gear) {
    return gear.id === id;
  });

  if (!item) return;

  gearId.value = item.id;
  gearName.value = item.name;
  gearCategory.value = item.category;
  gearImage.value = item.image;
  gearDescription.value = item.description;
  gearSpecs.value = JSON.stringify(item.specs, null, 2);
  gearPrice.value = item.price;

  saveButton.textContent = 'Сохранить изменения';
  cancelButton.classList.remove('hidden');

  formMessage.textContent = 'Режим редактирования: ' + item.name;

  gearForm.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
}

// ========================================
// 6. DELETE — удаление предмета
// ========================================

function deleteGear(id) {
  var item = gearItems.find(function(gear) {
    return gear.id === id;
  });

  if (!item) return;

  var confirmed = confirm(
    'Ты действительно хочешь удалить предмет "' + item.name + '"?'
  );

  if (!confirmed) return;

  var oldItems = gearItems.slice();

  gearItems = gearItems.filter(function(gear) {
    return gear.id !== id;
  });

  if (!saveGearToStorage()) {
    gearItems = oldItems;
    return;
  }

  // Если удаляемый предмет открыт в подробностях, закрываем окно
  closeDetail();

  // Если удаляемый предмет редактировался, очищаем форму
  if (Number(gearId.value) === id) {
    resetForm();
  }

  showGearList();
  showMessage('Предмет успешно удалён!');
}

// ========================================
// Сброс формы
// ========================================

function resetForm() {
  gearForm.reset();
  gearId.value = '';

  saveButton.textContent = 'Добавить предмет';
  cancelButton.classList.add('hidden');
}

// Отмена редактирования
cancelButton.addEventListener('click', function() {
  resetForm();
  showMessage('Редактирование отменено.');
});

// ========================================
// Сообщения пользователю
// ========================================

function showMessage(message, isError) {
  formMessage.textContent = message;
  formMessage.style.color = isError ? '#ff6b81' : '#4ade80';
}

// ========================================
// Запуск приложения
// ========================================

if (!Array.isArray(window.gearData)) {
  showMessage('Не удалось загрузить исходные данные gear-data.js.', true);
  gearItems = [];
  showGearList();
} else {
  loadGear();
}
