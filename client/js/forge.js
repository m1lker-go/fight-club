// forge.js
let forgeItems = [];
let currentForgeTab = 'forge';

// Функция getItemIconPath и showToast ожидаются глобально из helpers.js и screens.js
// Порядок подключения скриптов в index.html гарантирует их доступность.

async function renderForge() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="forge-container">
            <div class="forge-banner">
                <img src="/assets/banner_forge.png" alt="Кузница">
            </div>
            <div class="forge-tabs">
                <button class="btn forge-tab ${currentForgeTab === 'forge' ? 'active' : ''}" data-forge-tab="forge">Ковать</button>
                <button class="btn forge-tab ${currentForgeTab === 'smelt' ? 'active' : ''}" data-forge-tab="smelt">Расплавить</button>
                <i class="fas fa-circle-question" id="forgeHelpBtn"></i>
            </div>
            <div id="forgeSlots" class="forge-slots-grid"></div>
            <button class="btn" id="forgeActionBtn" disabled>${currentForgeTab === 'forge' ? 'Ковать' : 'Расплавить'}</button>
            <div class="forge-inventory-header">Доступные предметы</div>
            <div id="forgeInventory" class="inventory-grid"></div>
        </div>
    `;

    await loadCurrentForgeItems(currentForgeTab);

    document.querySelectorAll('.forge-tab').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const newTab = e.target.dataset.forgeTab;
            if (newTab === currentForgeTab) return;
            currentForgeTab = newTab;
            forgeItems = [];
            await loadCurrentForgeItems(currentForgeTab);
            renderForgeSlots();
            loadForgeInventory();
            document.querySelectorAll('.forge-tab').forEach(b => {
                b.classList.toggle('active', b.dataset.forgeTab === currentForgeTab);
            });
            const actionBtn = document.getElementById('forgeActionBtn');
            actionBtn.innerText = currentForgeTab === 'forge' ? 'Ковать' : 'Расплавить';
        });
    });

    document.getElementById('forgeHelpBtn').addEventListener('click', showForgeHelp);

    renderForgeSlots();
    loadForgeInventory();
}

async function loadCurrentForgeItems(tab) {
    try {
        const res = await fetch(`https://fight-club-api-4och.onrender.com/forge/current?tg_id=${userData.tg_id}&tab=${tab}`);
        if (res.ok) forgeItems = await res.json();
        else forgeItems = [];
    } catch (e) {
        forgeItems = [];
    }
}

function renderForgeSlots() {
    const slotsContainer = document.getElementById('forgeSlots');
    const slotCount = currentForgeTab === 'forge' ? 3 : 5;
    slotsContainer.style.gridTemplateColumns = `repeat(${slotCount}, 70px)`;

    let html = '';
    for (let i = 0; i < slotCount; i++) {
        const itemId = forgeItems[i];
        const item = inventory.find(it => it.id === itemId);
        html += `
            <div class="forge-slot" data-slot-index="${i}" data-rarity="${item ? item.rarity : ''}">
                ${item ? `<img src="${getItemIconPath(item)}" title="${item.name}">` : '<span>Пусто</span>'}
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

async function loadForgeInventory() {
    const availableItems = inventory.filter(item => !item.equipped && !item.for_sale && !item.in_forge);
    renderForgeInventory(availableItems);
}

function renderForgeInventory(items) {
    const container = document.getElementById('forgeInventory');
    container.innerHTML = '';
    // Показываем все доступные предметы
    items.forEach(item => {
        const statsArray = buildStatsArray(item);
        const statsString = statsArray.join(' • ');
        const rarityName = rarityTranslations[item.rarity] || item.rarity;
        const rarityClass = `rarity-${item.rarity}`;
        const iconPath = getItemIconPath(item);

        const itemDiv = document.createElement('div');
        itemDiv.className = `inventory-item ${rarityClass}`;
        itemDiv.dataset.itemId = item.id;
        itemDiv.innerHTML = `
            <div class="item-icon" style="background-image: url('${iconPath}'); background-size: cover; background-position: center;"></div>
            <div class="item-content">
                <div class="item-name" style="color: ${getRarityColor(item.rarity)}">
                    ${itemNameTranslations[item.name] || item.name}
                    <span class="rarity-badge">(${rarityName})</span>
                </div>
                <div class="item-stats">${statsString}</div>
            </div>
            <button class="inv-action-btn add-to-forge-btn" data-item-id="${item.id}">Добавить</button>
        `;
        itemDiv.querySelector('.add-to-forge-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            addToForge(item);
        });
        container.appendChild(itemDiv);
    });

    // Если предметов меньше 4, добавляем пустые строки до 4
    const emptyRowsNeeded = Math.max(0, 4 - items.length);
    for (let i = 0; i < emptyRowsNeeded; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'inventory-item empty-row';
        container.appendChild(emptyDiv);
    }
}

// Вспомогательная функция для цвета текста редкости
function getRarityColor(rarity) {
    const colors = {
        common: '#aaa',
        uncommon: '#2ecc71',
        rare: '#2e86de',
        epic: '#9b59b6',
        legendary: '#f1c40f'
    };
    return colors[rarity] || '#aaa';
}

function addToForge(item) {
    const slotCount = currentForgeTab === 'forge' ? 3 : 5;
    if (forgeItems.length >= slotCount) {
        showToast('Все слоты заняты', 1500);
        return;
    }
    forgeItems.push(item.id);
    fetch('https://fight-club-api-4och.onrender.com/forge/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            tg_id: userData.tg_id, 
            item_id: item.id,
            tab: currentForgeTab
        })
    })
    .then(async res => {
        if (res.ok) {
            await refreshData();
            renderForgeSlots();
            loadForgeInventory();
        } else {
            const err = await res.json();
            showToast('Ошибка: ' + err.error, 1500);
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Ошибка соединения', 1500);
    });
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
        actionButton = `<button class="btn" id="forgeAddBtn">Добавить в слот</button>`;
    } else if (source === 'slot') {
        actionButton = `<button class="btn" id="forgeRemoveBtn">Убрать из слота</button>`;
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
        document.getElementById('forgeAddBtn').addEventListener('click', () => addToForge(item));
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
showToast('Ошибка: ' + err.error, 1500);
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

    modalTitle.innerHTML = `<i class="fas fa-hammer"></i> Кузница`;

    modalBody.innerHTML = `
        <div style="text-align: left;">
            <div class="role-card">
                <h3><i class="fas fa-anvil"></i> Ковка</h3>
                <div class="skill-desc">Поместите <strong>три предмета одинаковой редкости</strong> в слоты и нажмите «Ковать». Вы получите один предмет следующей редкости (например, три обычных → один необычный).</div>
                <div class="skill-desc" style="margin-top: 5px;">После нажатия появится окно выбора класса для нового предмета. Характеристики и тип предмета определяются случайно.</div>
            </div>
            <div class="role-card">
                <h3><i class="fas fa-fire"></i> Расплавка</h3>
                <div class="skill-desc">Поместите от <strong>1 до 5 предметов</strong> в слоты и нажмите «Расплавить». Предметы исчезнут, а вы получите монеты и, возможно, алмазы в зависимости от редкости:</div>
                <div class="rewards-list" style="margin-top: 8px;">
                    <div class="reward-row"><span class="rarity-common">Обычный</span><span class="reward-value">65–85 монет</span></div>
                    <div class="reward-row"><span class="rarity-uncommon">Необычный</span><span class="reward-value">120–160 монет</span></div>
                    <div class="reward-row"><span class="rarity-rare">Редкий</span><span class="reward-value">400–600 монет</span></div>
                    <div class="reward-row"><span class="rarity-epic">Эпический</span><span class="reward-value">1000–1500 монет + <i class="fas fa-gem" style="color:#9b59b6;"></i> шанс 50% на 1 алмаз</span></div>
                    <div class="reward-row"><span class="rarity-legendary">Легендарный</span><span class="reward-value">2000–3000 монет + <i class="fas fa-gem" style="color:#9b59b6;"></i> 2–5 алмазов</span></div>
                </div>
            </div>
            <div class="role-card">
                <h3><i class="fas fa-boxes"></i> Инвентарь кузницы</h3>
                <div class="skill-desc">Внизу отображаются все доступные предметы, которые можно добавить в слоты. Предметы, уже находящиеся в кузнице, здесь не показываются.</div>
                <div class="skill-desc" style="margin-top: 5px;">Чтобы вернуть предмет из слота обратно в инвентарь, кликните на слот и нажмите «Убрать из слота».</div>
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
        await loadCurrentForgeItems(currentForgeTab);
        renderForgeSlots();
        loadForgeInventory();
    } else {
        showToast('Ошибка: ' + data.error, 1500);
    }
    actionBtn.disabled = false;
}

async function performForgeAction() {
    const actionBtn = document.getElementById('forgeActionBtn');
    actionBtn.disabled = true;

    if (currentForgeTab === 'forge') {
        if (forgeItems.length !== 3) {
            showToast('Нужно ровно 3 предмета', 1500);
            return;
        }
        const items = forgeItems.map(id => inventory.find(it => it.id === id));
        const rarities = items.map(it => it.rarity);
        if (!rarities.every(r => r === rarities[0])) {
            showToast('Предметы должны быть одной редкости', 1500);
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
           showToast(`Вы получили ${data.coins} монет и ${data.diamonds} алмазов!`, 2000);
            forgeItems = [];
            await refreshData();
            await loadCurrentForgeItems(currentForgeTab);
            renderForgeSlots();
            loadForgeInventory();
        } else {
            showToast('Ошибка: ' + data.error, 1500);
        }
    }
    actionBtn.disabled = false;
}

window.renderForge = renderForge;
