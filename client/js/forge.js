// forge.js
let forgeItems = []; // массив ID предметов в слотах текущей вкладки
let currentForgeTab = 'forge'; // 'forge' или 'smelt'

// Рендер главной страницы кузницы
async function renderForge() {
    console.log('[Forge] renderForgeSlots started');
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="forge-container">
            <div class="forge-banner" style="width:100%; overflow:hidden; border-radius:10px; margin-bottom:15px;">
                <img src="/assets/banner_forge.png" alt="Кузница" style="width:100%; height:auto; display:block;">
            </div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                <button class="btn forge-tab ${currentForgeTab === 'forge' ? 'active' : ''}" data-forge-tab="forge" style="flex: 1;">Ковать</button>
                <button class="btn forge-tab ${currentForgeTab === 'smelt' ? 'active' : ''}" data-forge-tab="smelt" style="flex: 1;">Расплавить</button>
                <i class="fas fa-circle-question" id="forgeHelpBtn" style="color: #00aaff; font-size: 28px; cursor: pointer;"></i>
            </div>
            <div id="forgeSlots" class="forge-slots-grid"></div>
            <button class="btn" id="forgeActionBtn" style="width:100%; margin:15px 0;" disabled>${currentForgeTab === 'forge' ? 'Ковать' : 'Расплавить'}</button>
            <h3 style="margin:15px 0 10px;">Доступные предметы</h3>
            <div id="forgeInventory" class="inventory-grid"></div>
        </div>
    `;

    // Загружаем текущие предметы в кузнице для выбранной вкладки
    await loadCurrentForgeItems(currentForgeTab);

    // Обработчики переключения вкладок
    document.querySelectorAll('.forge-tab').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const newTab = e.target.dataset.forgeTab;
            if (newTab === currentForgeTab) return;
            currentForgeTab = newTab;
            forgeItems = []; // очищаем локальный массив, потом загрузим с сервера
            await loadCurrentForgeItems(currentForgeTab); // загружаем ID для новой вкладки
            renderForgeSlots(); // перерисовываем слоты
            loadForgeInventory(); // обновляем список доступных предметов
            // Обновляем активный класс кнопок
            document.querySelectorAll('.forge-tab').forEach(b => {
                b.classList.toggle('active', b.dataset.forgeTab === currentForgeTab);
            });
            // Обновляем текст кнопки действия
            const actionBtn = document.getElementById('forgeActionBtn');
            actionBtn.innerText = currentForgeTab === 'forge' ? 'Ковать' : 'Расплавить';
        });
    });

    document.getElementById('forgeHelpBtn').addEventListener('click', showForgeHelp);

    renderForgeSlots();
    loadForgeInventory();
}

// Загрузка с сервера списка предметов в указанной вкладке
async function loadCurrentForgeItems(tab) {
    console.log('[Forge] loadCurrentForgeItems called with tab =', tab);
    try {
        const res = await fetch(`https://fight-club-api-4och.onrender.com/forge/current?tg_id=${userData.tg_id}&tab=${tab}`);
        console.log('[Forge] fetch response status:', res.status);
        if (res.ok) {
            forgeItems = await res.json();
            console.log('[Forge] received items:', forgeItems);
        } else {
            console.error('[Forge] failed to load, status', res.status);
            forgeItems = [];
        }
    } catch (e) {
        console.error('[Forge] error loading items:', e);
        forgeItems = [];
    }
}

// Рендер слотов
function renderForgeSlots() {
    const slotsContainer = document.getElementById('forgeSlots');
    const slotCount = currentForgeTab === 'forge' ? 3 : 5;
    const slotSize = 63; // одинаковый размер для всех слотов

    slotsContainer.style.display = 'grid';
    slotsContainer.style.gridTemplateColumns = `repeat(${slotCount}, ${slotSize}px)`;
    slotsContainer.style.gap = '10px';
    slotsContainer.style.justifyContent = 'center';
    slotsContainer.style.margin = '0 auto';

    let html = '';
    for (let i = 0; i < slotCount; i++) {
        const itemId = forgeItems[i];
        const item = inventory.find(it => it.id === itemId);
        html += `
            <div class="forge-slot" data-slot-index="${i}" style="width:${slotSize}px; height:${slotSize}px; background-color:#2f3542; border-radius:8px; display:flex; align-items:center; justify-content:center; border:2px solid #00aaff; cursor:pointer; overflow:hidden;">
                ${item ? `<img src="${getItemIconPath(item)}" style="max-width:100%; max-height:100%;" title="${item.name}">` : '<span style="color:#aaa; font-size:11px;">Пусто</span>'}
            </div>
        `;
    }
    slotsContainer.innerHTML = html;

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

    const actionBtn = document.getElementById('forgeActionBtn');
    if (currentForgeTab === 'forge') {
        actionBtn.disabled = forgeItems.length !== 3;
    } else {
        actionBtn.disabled = forgeItems.length === 0;
    }
    actionBtn.onclick = performForgeAction;
}
// Загрузка инвентаря для кузницы (предметы, которые можно добавить)
async function loadForgeInventory() {
    const availableItems = inventory.filter(item => !item.equipped && !item.for_sale && !item.in_forge);
    renderForgeInventory(availableItems);
}

function renderForgeInventory(items) {
    const container = document.getElementById('forgeInventory');
    container.innerHTML = '';
    items.forEach(item => {
        const statsArray = buildStatsArray(item);
        const statsString = statsArray.join(' • ');

        const itemDiv = document.createElement('div');
        itemDiv.className = `inventory-item rarity-${item.rarity}`;
        itemDiv.dataset.itemId = item.id;
        itemDiv.innerHTML = `
            <div class="item-icon" style="background-image: url('${getItemIconPath(item)}'); background-size: cover; background-position: center;"></div>
            <div class="item-content">
                <div class="item-name" style="font-size:12px;">${itemNameTranslations[item.name] || item.name}</div>
                <div class="item-stats" style="font-size:10px; color:#aaa;">${statsString}</div>
                <div class="item-rarity">${rarityTranslations[item.rarity] || item.rarity}</div>
            </div>
        `;
        itemDiv.addEventListener('click', () => {
            showForgeItemDetails(item, 'inventory');
        });
        container.appendChild(itemDiv);
    });
}

function getItemIconPath(item) {
    if (!item) return '';
    const classFolderMap = { warrior: 'tank', assassin: 'assassin', mage: 'mage' };
    const typeFileMap = { armor: 'armor', boots: 'boots', helmet: 'helmet', weapon: 'weapon', accessory: 'ring', gloves: 'bracer' };
    const folder = classFolderMap[item.owner_class];
    const fileType = typeFileMap[item.type];
    if (!folder || !fileType) return '';
    return `/assets/equip/${folder}/${folder}-${fileType}-001.png`;
}

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
            forgeItems.push(item.id);
            const res = await fetch('https://fight-club-api-4och.onrender.com/forge/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tg_id: userData.tg_id, 
                    item_id: item.id,
                    tab: currentForgeTab
                })
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
            const res = await fetch('https://fight-club-api-4och.onrender.com/forge/remove', {
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

function showForgeHelp() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = 'Кузница';
    modalBody.innerHTML = `
        <div style="text-align: left;">
            <div class="role-card">
                <h3>⚒️ Ковка</h3>
                <p>Поместите <strong>три предмета одинаковой редкости</strong> в слоты и нажмите «Ковать». Вы получите один предмет следующей редкости (например, три обычных → один необычный).</p>
                <p>После нажатия появится окно выбора класса для нового предмета. Характеристики и тип предмета определяются случайно.</p>
            </div>
            <div class="role-card">
                <h3>🔥 Расплавка</h3>
                <p>Поместите от <strong>1 до 5 предметов</strong> в слоты и нажмите «Расплавить». Предметы исчезнут, а вы получите монеты и, возможно, алмазы в зависимости от редкости:</p>
                <ul style="list-style: none; padding-left: 0;">
                   <li><span class="rarity-common">Обычный</span> – 65–85 монет</li>
<li><span class="rarity-uncommon">Необычный</span> – 120–160 монет</li>
<li><span class="rarity-rare">Редкий</span> – 400–600 монет</li>
<li><span class="rarity-epic">Эпический</span> – 1000–1500 монет + шанс 50% на 1 алмаз</li>
<li><span class="rarity-legendary">Легендарный</span> – 2000–3000 монет + 2–5 алмазов</li>
                </ul>
            </div>
            <div class="role-card">
                <h3>📦 Инвентарь кузницы</h3>
                <p>Внизу отображаются все доступные предметы, которые можно добавить в слоты. Предметы, уже находящиеся в кузнице, здесь не показываются.</p>
                <p>Чтобы вернуть предмет из слота обратно в инвентарь, кликните на слот и нажмите «Убрать из слота».</p>
            </div>
        </div>
    `;

    modal.style.display = 'block';
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };
}

function showClassChoiceForCraft(itemIds) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = 'Выберите класс';
    modalBody.innerHTML = `
        <p style="text-align:center;">Для какого класса создать предмет?</p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
            <button class="btn class-choice" data-class="warrior">Воин</button>
            <button class="btn class-choice" data-class="assassin">Ассасин</button>
            <button class="btn class-choice" data-class="mage">Маг</button>
        </div>
        <p style="text-align:center; margin-top:15px;"><small>Если не выберете, класс будет случайным</small></p>
    `;
    modal.style.display = 'block';

    const classButtons = modalBody.querySelectorAll('.class-choice');
    classButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const chosenClass = e.target.dataset.class;
            modal.style.display = 'none';
            await performCraft(itemIds, chosenClass);
        });
    });

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}

async function performCraft(itemIds, chosenClass) {
    const actionBtn = document.getElementById('forgeActionBtn');
    actionBtn.disabled = true;

    const res = await fetch('https://fight-club-api-4och.onrender.com/forge/craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tg_id: userData.tg_id,
            item_ids: itemIds,
            chosen_class: chosenClass
        })
    });
    const data = await res.json();
    if (data.success) {
        showChestResult(data.item);
        forgeItems = [];
        await refreshData();
        // После обновления данных заново загружаем предметы для текущей вкладки (их больше нет)
        await loadCurrentForgeItems(currentForgeTab);
        renderForgeSlots();
        loadForgeInventory();
    } else {
        alert('Ошибка: ' + data.error);
    }
    actionBtn.disabled = false;
}

async function performForgeAction() {
    const actionBtn = document.getElementById('forgeActionBtn');
    actionBtn.disabled = true;

    if (currentForgeTab === 'forge') {
        if (forgeItems.length !== 3) {
            alert('Нужно ровно 3 предмета');
            return;
        }
        const items = forgeItems.map(id => inventory.find(it => it.id === id));
        const rarities = items.map(it => it.rarity);
        if (!rarities.every(r => r === rarities[0])) {
            alert('Предметы должны быть одной редкости');
            return;
        }
        showClassChoiceForCraft(forgeItems);
    } else {
        if (forgeItems.length === 0) return;
        const res = await fetch('https://fight-club-api-4och.onrender.com/forge/smelt', {
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
            await loadCurrentForgeItems(currentForgeTab);
            renderForgeSlots();
            loadForgeInventory();
        } else {
            alert('Ошибка: ' + data.error);
        }
    }
    actionBtn.disabled = false;
}

window.renderForge = renderForge;
