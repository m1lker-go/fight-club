// client/js/forge.js

let forgeItems = []; // массив ID предметов в слотах текущей вкладки
let currentForgeTab = 'forge'; // 'forge' или 'smelt'

// Рендер главной страницы кузницы
function renderForge() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="forge-container">
            <!-- Баннер -->
            <div class="forge-banner" style="width:100%; overflow:hidden; border-radius:10px; margin-bottom:15px;">
                <img src="/assets/banner_forge.png" alt="Кузница" style="width:100%; height:auto; display:block;">
            </div>
            <!-- Строка с кнопками и справкой -->
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                <div style="flex: 1; display: flex; gap: 10px;">
                    <button class="btn forge-tab ${currentForgeTab === 'forge' ? 'active' : ''}" data-forge-tab="forge" style="flex: 1;">Ковать</button>
                    <button class="btn forge-tab ${currentForgeTab === 'smelt' ? 'active' : ''}" data-forge-tab="smelt" style="flex: 1;">Расплавить</button>
                </div>
                <i class="fas fa-circle-question" id="forgeHelpBtn" style="color: #00aaff; font-size: 28px; cursor: pointer;"></i>
            </div>
            <!-- Слоты -->
            <div id="forgeSlots" class="forge-slots"></div>
            <!-- Кнопка действия -->
            <button class="btn" id="forgeActionBtn" style="width:100%; margin:15px 0;" disabled>${currentForgeTab === 'forge' ? 'Ковать' : 'Расплавить'}</button>
            <!-- Заголовок инвентаря -->
            <h3 style="margin:15px 0 10px;">Доступные предметы</h3>
            <div id="forgeInventory" class="inventory-grid"></div>
        </div>
    `;

    // Обработчик кнопки справки
    document.getElementById('forgeHelpBtn').addEventListener('click', showForgeHelpModal);

    // Обработчики переключения вкладок
    document.querySelectorAll('.forge-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentForgeTab = e.target.dataset.forgeTab;
            forgeItems = []; // очищаем локальные слоты
            renderForge(); // перерисовываем всю страницу
            // После перерисовки загружаем актуальные предметы из кузницы (если они есть)
            loadForgeItems().then(() => {
                renderForgeSlots();
                loadForgeInventory();
            });
        });
    });

    // Загружаем текущие предметы в кузнице с сервера и синхронизируем forgeItems
    loadForgeItems().then(() => {
        renderForgeSlots();
        loadForgeInventory();
    });
}

// Загрузить из БД список ID предметов, которые уже находятся в кузнице (in_forge = true)
async function loadForgeItems() {
    try {
        const res = await fetch(`/forge/current?tg_id=${userData.tg_id}`);
        if (!res.ok) throw new Error('Failed to load forge items');
        const itemIds = await res.json();
        forgeItems = itemIds; // синхронизируем локальный массив с сервером
    } catch (e) {
        console.error('Error loading forge items:', e);
        forgeItems = [];
    }
}

// Рендер слотов (3 для ковки, 5 для плавки)
function renderForgeSlots() {
    const slotsContainer = document.getElementById('forgeSlots');
    const slotCount = currentForgeTab === 'forge' ? 3 : 5;
    let html = '<div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">';
    for (let i = 0; i < slotCount; i++) {
        const itemId = forgeItems[i];
        const item = inventory.find(it => it.id === itemId);
        html += `
            <div class="forge-slot" data-slot-index="${i}" style="width:70px; height:70px; background-color:#2f3542; border-radius:8px; display:flex; align-items:center; justify-content:center; border:2px solid #00aaff; cursor:pointer; overflow:hidden;">
                ${item ? `<img src="${getItemIconPath(item)}" style="max-width:100%; max-height:100%;" title="${item.name}">` : '<span style="color:#aaa;">Пусто</span>'}
            </div>
        `;
    }
    html += '</div>';
    slotsContainer.innerHTML = html;

    // Обработчики кликов на слоты – открыть детали предмета (если есть) для возврата
    document.querySelectorAll('.forge-slot').forEach(slot => {
        slot.addEventListener('click', () => {
            const index = slot.dataset.slotIndex;
            const itemId = forgeItems[index];
            if (itemId) {
                const item = inventory.find(it => it.id === itemId);
                if (item) showForgeItemDetails(item, 'slot', index);
            }
        });
    });

    // Обновляем состояние кнопки действия
    const actionBtn = document.getElementById('forgeActionBtn');
    if (currentForgeTab === 'forge') {
        actionBtn.disabled = forgeItems.length !== 3;
    } else {
        // для плавки разрешаем от 1 до 5
        actionBtn.disabled = forgeItems.length === 0;
    }
    // Обработчик кнопки действия
    actionBtn.onclick = performForgeAction;
}

// Загрузка инвентаря для кузницы (предметы, которые можно добавить)
async function loadForgeInventory() {
    // Фильтруем: не надеты, не на продаже, не в кузнице
    const availableItems = inventory.filter(item => !item.equipped && !item.for_sale && !item.in_forge);
    renderForgeInventory(availableItems);
}

// Рендер сетки доступных предметов
function renderForgeInventory(items) {
    const container = document.getElementById('forgeInventory');
    container.innerHTML = '';
    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `inventory-item rarity-${item.rarity}`;
        itemDiv.dataset.itemId = item.id;
        itemDiv.innerHTML = `
            <div class="item-icon" style="background-image: url('${getItemIconPath(item)}'); background-size: cover; background-position: center;"></div>
            <div class="item-content">
                <div class="item-name" style="font-size:12px;">${itemNameTranslations[item.name] || item.name}</div>
                <div class="item-rarity">${rarityTranslations[item.rarity] || item.rarity}</div>
            </div>
        `;
        itemDiv.addEventListener('click', () => {
            showForgeItemDetails(item, 'inventory');
        });
        container.appendChild(itemDiv);
    });
}

// Модальное окно с деталями предмета
function showForgeItemDetails(item, source, slotIndex = null) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = item.name;
    const stats = buildStatsArray(item);
    const classDisplay = item.owner_class ? (item.owner_class === 'warrior' ? 'Воин' : (item.owner_class === 'assassin' ? 'Ассасин' : 'Маг')) : 'Неизвестный';
    let actionButton = '';

    if (source === 'inventory') {
        actionButton = `<button class="btn" id="forgeAddBtn" style="margin:10px;">Добавить в слот</button>`;
    } else if (source === 'slot') {
        actionButton = `<button class="btn" id="forgeRemoveBtn" style="margin:10px;">Убрать из слота</button>`;
    }

    modalBody.innerHTML = `
        <div style="text-align: center;">
            <img src="${getItemIconPath(item)}" style="max-width: 100px; max-height: 100px; margin-bottom:10px;">
            <div style="font-size:18px; font-weight:bold;">${itemNameTranslations[item.name] || item.name}</div>
            <div class="item-rarity rarity-${item.rarity}" style="margin:5px;">${rarityTranslations[item.rarity] || item.rarity}</div>
            <div style="color:#aaa;">Класс: ${classDisplay}</div>
            <div style="color:#aaa; font-size:12px; margin:5px 0;">${stats.join(' • ')}</div>
            ${actionButton}
            <button class="btn" id="closeModal">Отмена</button>
        </div>
    `;
    modal.style.display = 'block';

    if (source === 'inventory') {
        document.getElementById('forgeAddBtn').addEventListener('click', async () => {
            const slotCount = currentForgeTab === 'forge' ? 3 : 5;
            if (forgeItems.length >= slotCount) {
                alert('Все слоты заняты');
                return;
            }
            // Добавляем предмет в первый свободный слот
            forgeItems.push(item.id);
            // Отправляем запрос на сервер
            const res = await fetch('/forge/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, item_id: item.id })
            });
            if (res.ok) {
                await refreshData(); // обновляем inventory
                // После добавления перезагружаем forgeItems с сервера, чтобы синхронизироваться
                await loadForgeItems();
                renderForgeSlots();
                loadForgeInventory();
                modal.style.display = 'none';
            } else {
                const err = await res.json();
                alert('Ошибка: ' + err.error);
            }
        });
    } else if (source === 'slot') {
        document.getElementById('forgeRemoveBtn').addEventListener('click', async () => {
            const index = forgeItems.indexOf(item.id);
            if (index > -1) forgeItems.splice(index, 1);
            const res = await fetch('/forge/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, item_id: item.id })
            });
            if (res.ok) {
                await refreshData();
                await loadForgeItems();
                renderForgeSlots();
                loadForgeInventory();
                modal.style.display = 'none';
            } else {
                const err = await res.json();
                alert('Ошибка: ' + err.error);
            }
        });
    }

    document.getElementById('closeModal').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}

// Показать модальное окно с описанием кузницы
function showForgeHelpModal() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = 'Кузница';
    modalBody.innerHTML = `
        <div style="text-align: left;">
            <p><strong>Ковка:</strong> объедините 3 предмета одинаковой редкости, чтобы получить один предмет следующей редкости. Класс нового предмета вы выбираете сами.</p>
            <p><strong>Плавка:</strong> переплавляйте ненужные предметы в ресурсы. Можно от 1 до 5 предметов за раз.</p>
            <p>Награда за плавку:</p>
            <ul>
                <li>Обычный: 35–50 монет</li>
                <li>Необычный: 150–200 монет</li>
                <li>Редкий: 600–800 монет</li>
                <li>Эпический: 1500–2000 монет + 0–1 алмаз</li>
                <li>Легендарный: 2500–3800 монет + 2–5 алмазов</li>
            </ul>
            <p>Поместите предметы в слоты, затем нажмите кнопку действия.</p>
        </div>
    `;

    modal.style.display = 'block';
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}

// Вспомогательная функция для получения пути иконки предмета
function getItemIconPath(item) {
    if (!item) return '';
    const classFolderMap = { warrior: 'tank', assassin: 'assassin', mage: 'mage' };
    const typeFileMap = { armor: 'armor', boots: 'boots', helmet: 'helmet', weapon: 'weapon', accessory: 'ring', gloves: 'bracer' };
    const folder = classFolderMap[item.owner_class];
    const fileType = typeFileMap[item.type];
    if (!folder || !fileType) return '';
    return `/assets/equip/${folder}/${folder}-${fileType}-001.png`;
}

// Построение массива характеристик для отображения
function buildStatsArray(item) {
    const stats = [];
    if (item.atk_bonus) stats.push(`АТК+${item.atk_bonus}`);
    if (item.def_bonus) stats.push(`ЗАЩ+${item.def_bonus}`);
    if (item.hp_bonus) stats.push(`ЗДОР+${item.hp_bonus}`);
    if (item.spd_bonus) stats.push(`СКОР+${item.spd_bonus}`);
    if (item.crit_bonus) stats.push(`КРИТ+${item.crit_bonus}%`);
    if (item.crit_dmg_bonus) stats.push(`КР.УРОН+${item.crit_dmg_bonus}%`);
    if (item.agi_bonus) stats.push(`ЛОВ+${item.agi_bonus}%`);
    if (item.int_bonus) stats.push(`ИНТ+${item.int_bonus}%`);
    if (item.vamp_bonus) stats.push(`ВАМП+${item.vamp_bonus}%`);
    if (item.reflect_bonus) stats.push(`ОТР+${item.reflect_bonus}%`);
    return stats;
}

// Модальное окно выбора класса для ковки
function showClassChoiceForForge() {
    return new Promise((resolve) => {
        const modal = document.getElementById('roleModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.innerText = 'Выберите класс';
        modalBody.innerHTML = `
            <p>Для какого класса выковать предмет?</p>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                <button class="btn class-choice" data-class="warrior">Воин</button>
                <button class="btn class-choice" data-class="assassin">Ассасин</button>
                <button class="btn class-choice" data-class="mage">Маг</button>
                <button class="btn class-choice" data-class="random">Случайный</button>
            </div>
            <button class="btn" id="closeChoice" style="margin-top:15px;">Отмена</button>
        `;
        modal.style.display = 'block';

        const handleChoice = (e) => {
            const chosenClass = e.target.dataset.class;
            if (chosenClass === 'random') {
                modal.style.display = 'none';
                resolve(null);
            } else {
                modal.style.display = 'none';
                resolve(chosenClass);
            }
            cleanup();
        };

        const handleCancel = () => {
            modal.style.display = 'none';
            resolve(null); // отмена – не продолжаем
            cleanup();
        };

        const cleanup = () => {
            document.querySelectorAll('.class-choice').forEach(btn => btn.removeEventListener('click', handleChoice));
            document.getElementById('closeChoice')?.removeEventListener('click', handleCancel);
            const closeBtn = modal.querySelector('.close');
            closeBtn.onclick = null;
        };

        document.querySelectorAll('.class-choice').forEach(btn => btn.addEventListener('click', handleChoice));
        document.getElementById('closeChoice').addEventListener('click', handleCancel);
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = handleCancel;
    });
}

// Выполнение действия (ковка или плавка)
async function performForgeAction() {
    const actionBtn = document.getElementById('forgeActionBtn');
    actionBtn.disabled = true;

    if (currentForgeTab === 'forge') {
        // Ковка
        if (forgeItems.length !== 3) {
            alert('Нужно ровно 3 предмета');
            actionBtn.disabled = false;
            return;
        }
        // Проверяем одинаковую редкость
        const items = forgeItems.map(id => inventory.find(it => it.id === id));
        const rarities = items.map(it => it.rarity);
        if (!rarities.every(r => r === rarities[0])) {
            alert('Предметы должны быть одной редкости');
            actionBtn.disabled = false;
            return;
        }

        // Запрашиваем выбор класса
        const chosenClass = await showClassChoiceForForge();
        if (chosenClass === undefined) { // отмена
            actionBtn.disabled = false;
            return;
        }

        const res = await fetch('/forge/craft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tg_id: userData.tg_id,
                item_ids: forgeItems,
                chosen_class: chosenClass // если null, на сервере выберется случайно
            })
        });
        const data = await res.json();
        if (data.success) {
            showChestResult(data.item); // используем существующую функцию
            forgeItems = [];
            await refreshData();
            await loadForgeItems();
            renderForgeSlots();
            loadForgeInventory();
        } else {
            alert('Ошибка: ' + data.error);
        }
    } else {
        // Плавка
        if (forgeItems.length === 0) {
            alert('Нет предметов для плавки');
            actionBtn.disabled = false;
            return;
        }
        const res = await fetch('/forge/smelt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tg_id: userData.tg_id,
                item_ids: forgeItems
            })
        });
        const data = await res.json();
        if (data.success) {
            alert(`Вы получили ${data.coins} монет и ${data.diamonds} алмазов!`);
            forgeItems = [];
            await refreshData();
            await loadForgeItems();
            renderForgeSlots();
            loadForgeInventory();
        } else {
            alert('Ошибка: ' + data.error);
        }
    }
    actionBtn.disabled = false;
}

// Делаем функцию доступной глобально
window.renderForge = renderForge;
