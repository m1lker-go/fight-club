// forge.js
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
            <!-- Кнопки переключения вкладок -->
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="btn forge-tab ${currentForgeTab === 'forge' ? 'active' : ''}" data-forge-tab="forge">Ковать</button>
                <button class="btn forge-tab ${currentForgeTab === 'smelt' ? 'active' : ''}" data-forge-tab="smelt">Расплавить</button>
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

    // Обработчики переключения вкладок
    document.querySelectorAll('.forge-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentForgeTab = e.target.dataset.forgeTab;
            forgeItems = []; // очищаем слоты
            renderForge(); // перерисовываем
        });
    });

    // Отрисовываем слоты и инвентарь
    renderForgeSlots();
    loadForgeInventory();
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
            <div class="forge-slot" data-slot-index="${i}" style="width:90px; height:90px; background-color:#2f3542; border-radius:8px; display:flex; align-items:center; justify-content:center; border:2px solid #00aaff; cursor:pointer; overflow:hidden;">
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
    if (forgeItems.length === slotCount) {
        actionBtn.disabled = false;
    } else {
        actionBtn.disabled = true;
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
                await refreshData();
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

// Выполнение действия (ковка или плавка)
async function performForgeAction() {
    const actionBtn = document.getElementById('forgeActionBtn');
    actionBtn.disabled = true;

    if (currentForgeTab === 'forge') {
        // Ковка
        if (forgeItems.length !== 3) {
            alert('Нужно ровно 3 предмета');
            return;
        }
        // Проверяем одинаковую редкость (на клиенте для удобства)
        const items = forgeItems.map(id => inventory.find(it => it.id === id));
        const rarities = items.map(it => it.rarity);
        if (!rarities.every(r => r === rarities[0])) {
            alert('Предметы должны быть одной редкости');
            return;
        }
        // Можно запросить выбор класса (сделаем просто случайный пока)
        const chosenClass = null; // null = случайный
        const res = await fetch('/forge/craft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tg_id: userData.tg_id,
                item_ids: forgeItems,
                chosen_class: chosenClass
            })
        });
        const data = await res.json();
        if (data.success) {
            // Показываем модальное окно с новым предметом
            showChestResult(data.item); // используем существующую функцию
            forgeItems = [];
            await refreshData();
            renderForgeSlots();
            loadForgeInventory();
        } else {
            alert('Ошибка: ' + data.error);
        }
    } else {
        // Плавка
        if (forgeItems.length === 0) return;
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
