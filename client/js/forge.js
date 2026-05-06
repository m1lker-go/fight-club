// forge.js (полная обновлённая версия: ресурсная панель, свитки 3 в ряд, кнопка с ценой)

let currentForgeTab = 'forge';
let selectedScrollId = null;
let selectedScrollBonus = 0;
let scrollsInventory = [];

window.forgeItems = [];

// Базовые шансы ковки
const BASE_CRAFT_CHANCES = {
    uncommon: 0.95,
    rare: 0.85,
    epic: 0.75,
    legendary: 0.65
};

// Стоимость ковки для отображения на кнопке (дублирует серверную CRAFT_COST)
const CRAFT_COST_CLIENT = {
    uncommon: { coins: 50, coal: 20 },
    rare: { coins: 350, coal: 50 },
    epic: { coins: 1000, coal: 200 },
    legendary: { coins: 2500, coal: 500 }
};

// ========== ОСНОВНОЙ РЕНДЕР ==========
async function renderForge() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="forge-container">
            <div class="forge-banner-wrapper">
                <img src="/assets/banner_forge.png" alt="Кузница">
                <div id="forgeResources" class="forge-resources-overlay"></div>
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

    await refreshForgeUI();

    document.querySelectorAll('.forge-tab').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const newTab = e.target.dataset.forgeTab;
            if (newTab === currentForgeTab) return;
            currentForgeTab = newTab;
            selectedScrollId = null;
            selectedScrollBonus = 0;
            await refreshForgeUI();
            document.querySelectorAll('.forge-tab').forEach(b => {
                b.classList.toggle('active', b.dataset.forgeTab === currentForgeTab);
            });
            document.getElementById('forgeActionBtn').innerText = currentForgeTab === 'forge' ? 'Ковать' : 'Расплавить';
        });
    });

    document.getElementById('forgeHelpBtn').addEventListener('click', showForgeHelp);
}

async function refreshForgeUI() {
    await loadCurrentForgeItems();
    await loadScrolls();
    renderResourcePanel();            // <-- обновлённая ресурсная панель
    renderForgeSlots();
    loadForgeInventory();
    updateForgeActionButton();
}

// ========== РЕСУРСНАЯ ПАНЕЛЬ (4 строки) ==========
function renderResourcePanel() {
    const panel = document.getElementById('forgeResources');
    if (!panel) return;
    const coal = userData?.coal || 0;
    const rare = scrollsInventory.filter(s => s.rarity === 'rare').length;
    const epic = scrollsInventory.filter(s => s.rarity === 'epic').length;
    const legend = scrollsInventory.filter(s => s.rarity === 'legendary').length;

    panel.innerHTML = `
        <div class="resource-row">
            <i class="fas fa-cube" style="color: #888;"></i>
            <span class="resource-value">${coal}</span>
        </div>
        <div class="resource-row">
            <i class="fas fa-scroll" style="color: #2e86de;"></i>
            <span class="resource-value">${rare}</span>
        </div>
        <div class="resource-row">
            <i class="fas fa-scroll" style="color: #9b59b6;"></i>
            <span class="resource-value">${epic}</span>
        </div>
        <div class="resource-row">
            <i class="fas fa-scroll" style="color: #f1c40f;"></i>
            <span class="resource-value">${legend}</span>
        </div>
    `;
}

// Загрузка свитков с сервера
async function loadScrolls() {
    if (!userData || !userData.id) {
        scrollsInventory = [];
        return;
    }
    try {
        const res = await window.apiRequest('/forge/scrolls', { method: 'GET' });
        if (res.ok) {
            scrollsInventory = await res.json();
        } else {
            scrollsInventory = [];
        }
    } catch (e) {
        console.error('[loadScrolls] error:', e);
        scrollsInventory = [];
    }
}

// ========== СЛОТЫ ==========
async function renderForgeSlots() {
    const slotsContainer = document.getElementById('forgeSlots');
    if (!slotsContainer) return;

    if (currentForgeTab === 'forge') {
        slotsContainer.innerHTML = '';
        slotsContainer.style.display = 'flex';
        slotsContainer.style.alignItems = 'center';
        slotsContainer.style.gap = '8px';

       // Слот свитка
const scrollSlot = document.createElement('div');
scrollSlot.className = 'forge-slot scroll-slot';
scrollSlot.style.width = '60px';
scrollSlot.style.height = '60px';
scrollSlot.style.border = '2px solid #aaa';
scrollSlot.style.borderRadius = '8px';
scrollSlot.style.display = 'flex';
scrollSlot.style.flexDirection = 'column';
scrollSlot.style.alignItems = 'center';
scrollSlot.style.justifyContent = 'center';
scrollSlot.style.cursor = 'pointer';
scrollSlot.style.background = '#2f3542';
scrollSlot.style.color = '#aaa';
scrollSlot.style.fontSize = '11px';
scrollSlot.style.lineHeight = '1.2';

// Определяем, какую картинку показывать
let scrollImg = '/assets/equip/scrolls/scroll_empty.png';
if (selectedScrollId) {
    const selectedScroll = scrollsInventory.find(s => s.inv_id === selectedScrollId);
    if (selectedScroll) {
        if (selectedScroll.rarity === 'rare') scrollImg = '/assets/equip/scrolls/scroll_rare.png';
        else if (selectedScroll.rarity === 'epic') scrollImg = '/assets/equip/scrolls/scroll_epic.png';
        else if (selectedScroll.rarity === 'legendary') scrollImg = '/assets/equip/scrolls/scroll_legendary.png';
    }
}

const resultRarity = getResultRarity();
const baseChance = resultRarity ? (BASE_CRAFT_CHANCES[resultRarity] || 0) : 0;
const totalChance = Math.min(1, baseChance + selectedScrollBonus);

scrollSlot.innerHTML = `
    <img src="${scrollImg}" style="width: 28px; height: 28px; margin-bottom: 2px;">
    <span style="font-size:9px; text-align:center; line-height:1.2; display:flex; align-items:center; justify-content:center; width:100%;">ШАНС:<br>${Math.round(totalChance * 100)}%</span>
`;

scrollSlot.addEventListener('click', openScrollModal);
slotsContainer.appendChild(scrollSlot);

        // Три слота предметов
        for (let i = 0; i < 3; i++) {
            const itemId = window.forgeItems[i];
            const item = inventory.find(it => it.id === itemId);
            const slotDiv = document.createElement('div');
            slotDiv.className = 'forge-slot';
            slotDiv.dataset.slotIndex = i;
            slotDiv.dataset.rarity = item ? item.rarity : '';
            slotDiv.style.width = '60px';
            slotDiv.style.height = '60px';
            slotDiv.innerHTML = item
                ? `<img src="${getItemIconPath(item)}" title="${item.name}" style="max-width:100%;max-height:100%;">`
                : '<span>Пусто</span>';
            slotDiv.addEventListener('click', () => {
                const index = parseInt(slotDiv.dataset.slotIndex);
                const id = window.forgeItems[index];
                if (id) {
                    const it = inventory.find(i => i.id === id);
                    if (it) showForgeItemDetails(it, 'slot', index);
                }
            });
            slotsContainer.appendChild(slotDiv);
        }
    } else {
        // smelt: 5 слотов
        let html = '';
        for (let i = 0; i < 5; i++) {
            const itemId = window.forgeItems[i];
            const item = inventory.find(it => it.id === itemId);
            html += `
                <div class="forge-slot" data-slot-index="${i}" data-rarity="${item ? item.rarity : ''}">
                    ${item ? `<img src="${getItemIconPath(item)}" title="${item.name}">` : '<span>Пусто</span>'}
                </div>`;
        }
        slotsContainer.innerHTML = html;
    }
}

function getResultRarity() {
    if (window.forgeItems.length < 3) return null;
    const items = window.forgeItems.map(id => inventory.find(it => it.id === id));
    const rarities = items.map(i => i?.rarity).filter(Boolean);
    if (rarities.length !== 3) return null;
    const first = rarities[0];
    if (!rarities.every(r => r === first)) return null;
    const order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const idx = order.indexOf(first);
    if (idx === -1 || idx === 4) return null;
    return order[idx + 1];
}

// ========== МОДАЛЬНОЕ ОКНО СВИТКОВ (3 в ряд) ==========
function openScrollModal() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = 'Выберите свиток';
    let html = `<div class="packs-grid-new scroll-packs">`;

   const scrollDefs = [
    { item_id: 1037, rarity: 'rare', name: 'Редкий<br>свиток', bonus: 0.10, price: '500 монет', priceType: 'coins' },
    { item_id: 1038, rarity: 'epic', name: 'Эпический<br>свиток', bonus: 0.20, price: '50 алмазов', priceType: 'diamonds' },
    { item_id: 1039, rarity: 'legendary', name: 'Легендарный<br>свиток', bonus: 0.30, price: '150 алмазов', priceType: 'diamonds' }
];

 scrollDefs.forEach(def => {
    const owned = scrollsInventory.filter(s => s.item_id === def.item_id);
    const count = owned.length;
    const isActive = selectedScrollId && owned.some(s => s.inv_id === selectedScrollId);

    html += `
        <div style="display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; border: 1px solid #7f8c8d; background: #232833;">
            <div class="scroll-card-body" style="padding: 12px 8px; text-align: center; display: flex; flex-direction: column; align-items: center;">
                <div style="font-weight: bold; color: white; margin-bottom: 4px; font-size: 11px; line-height: 1.3;">${def.name}</div>
                <div style="font-size: 11px; color: #aaa; margin-bottom: 8px;">Шанс +${def.bonus * 100}%</div>
                <i class="fas fa-scroll" style="font-size: 32px; color: ${def.rarity === 'rare' ? '#2e86de' : def.rarity === 'epic' ? '#9b59b6' : '#f1c40f'}; margin-bottom: 8px;"></i>
                <div style="font-size: 12px; color: #aaa; margin-bottom: 8px;">Количество: ${count}</div>
            </div>
            <div class="scroll-card-buttons" style="display: flex; flex-direction: column; width: 100%;">
                <button class="mint-buy-btn buy-scroll-btn" data-price-type="${def.priceType}">Купить</button>
                <button class="mint-buy-btn add-scroll-btn ${isActive ? 'active' : ''}" data-item-id="${def.item_id}" data-count="${count}">${isActive ? 'АКТИВНО' : 'Добавить'}</button>
            </div>
        </div>
    `;
});

    html += `</div>
        <button id="scrollModalOkBtn" class="btn" style="width: 100%; margin-top: 12px;">ОКЕЙ</button>
    `;
    modalBody.innerHTML = html;
    modal.style.display = 'flex';

    // Обработчики кнопок
    modalBody.querySelectorAll('.add-scroll-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const itemId = parseInt(btn.dataset.itemId);
            const count = parseInt(btn.dataset.count);
            if (count <= 0) return;

            const ownedList = scrollsInventory.filter(s => s.item_id === itemId);
            if (ownedList.length === 0) return;

            const currentInvId = ownedList[0].inv_id;

            if (selectedScrollId === currentInvId) {
                selectedScrollId = null;
                selectedScrollBonus = 0;
            } else {
                selectedScrollId = currentInvId;
                const scroll = scrollsInventory.find(s => s.inv_id === currentInvId);
                selectedScrollBonus = scroll ? scroll.bonus : 0;
            }
            // обновить кнопки
            modalBody.querySelectorAll('.add-scroll-btn').forEach(b => {
                const bid = parseInt(b.dataset.itemId);
                const bcount = parseInt(b.dataset.count);
                const ownList = scrollsInventory.filter(s => s.item_id === bid);
                if (ownList.length > 0 && selectedScrollId === ownList[0].inv_id) {
                    b.classList.add('active');
                    b.textContent = 'АКТИВНО';
                } else {
                    b.classList.remove('active');
                    b.textContent = 'Добавить';
                }
            });
        });
    });

    modalBody.querySelectorAll('.buy-scroll-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.style.display = 'none';
            if (typeof showScreen === 'function') {
                showScreen('trade');
                setTimeout(() => {
                    const coinTab = document.querySelector('.trade-tab[data-tab="coins"]');
                    if (coinTab) coinTab.click();
                }, 100);
            }
        });
    });

    document.getElementById('scrollModalOkBtn').addEventListener('click', () => {
        modal.style.display = 'none';
        renderForgeSlots();
        updateForgeActionButton();
    });

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}

// ========== КНОПКА КОВКИ С ЦЕНОЙ ==========
function getCraftCost() {
    const rarity = getResultRarity();
    if (!rarity) return null;
    return CRAFT_COST_CLIENT[rarity] || null;
}

function updateForgeActionButton() {
    const actionBtn = document.getElementById('forgeActionBtn');
    if (!actionBtn) return;
    if (currentForgeTab === 'forge') {
        if (window.forgeItems && window.forgeItems.length === 3 && getResultRarity()) {
            const cost = getCraftCost();
            actionBtn.innerHTML = `Ковать ${cost.coins} <i class="fas fa-coins"></i> ${cost.coal} <i class="fas fa-cube"></i>`;
            actionBtn.disabled = false;
        } else {
            actionBtn.innerText = 'Ковать';
            actionBtn.disabled = true;
        }
    } else {
        actionBtn.disabled = !window.forgeItems || window.forgeItems.length === 0;
        actionBtn.innerText = 'Расплавить';
    }
    actionBtn.onclick = performForgeAction;
}

// ========== ЗАГРУЗКА ИНВЕНТАРЯ ==========
async function loadCurrentForgeItems() {
    if (!userData || !userData.id) {
        window.forgeItems = [];
        return;
    }
    try {
        const res = await window.apiRequest('/forge/current', {
            method: 'GET',
            body: { tab: currentForgeTab }
        });
        const text = await res.text();
        console.log('[loadCurrentForgeItems] raw response:', text);
        if (res.ok) {
            try {
                const data = JSON.parse(text);
                window.forgeItems = Array.isArray(data) ? data : [];
            } catch(e) {
                console.error('Invalid JSON:', text);
                window.forgeItems = [];
            }
        } else {
            console.error('Server error status:', res.status, text);
            window.forgeItems = [];
        }
    } catch (e) {
        console.error('[loadCurrentForgeItems] error:', e);
        window.forgeItems = [];
    }
}

function loadForgeInventory() {
    const availableItems = inventory.filter(item => !item.equipped && !item.for_sale && !item.in_forge && item.type !== 'scroll');
    renderForgeInventory(availableItems);
}

function renderForgeInventory(items) {
    const container = document.getElementById('forgeInventory');
    if (!container) return;
    container.innerHTML = '';
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

    const emptyRowsNeeded = Math.max(0, 4 - items.length);
    for (let i = 0; i < emptyRowsNeeded; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'inventory-item empty-row';
        container.appendChild(emptyDiv);
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
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

// ========== ДОБАВЛЕНИЕ / УДАЛЕНИЕ ИЗ СЛОТОВ ==========
async function addToForge(item) {
    const slotCount = currentForgeTab === 'forge' ? 3 : 5;
    if (window.forgeItems.length >= slotCount) {
        showToast('Все слоты заняты', 1500);
        return;
    }
    if (window.forgeItems.includes(item.id)) {
        showToast('Предмет уже в кузнице', 1500);
        return;
    }
    try {
        const res = await window.apiRequest('/forge/add', {
            method: 'POST',
            body: JSON.stringify({ 
                item_id: item.id,
                tab: currentForgeTab
            })
        });
        const data = await res.json();
        if (res.ok) {
            await refreshData();
            if (currentScreen === 'forge') {
                await refreshForgeUI();
            }
        } else {
            showToast('Ошибка: ' + (data.error || 'неизвестная'), 1500);
        }
    } catch (err) {
        console.error('[addToForge] error:', err);
        showToast('Ошибка соединения', 1500);
    }
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
            const res = await window.apiRequest('/forge/remove', {
                method: 'POST',
                body: JSON.stringify({ item_id: item.id })
            });
            if (res.ok) {
                await refreshData();
                if (currentScreen === 'forge') {
                    await refreshForgeUI();
                }
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

// ========== ДЕЙСТВИЯ КОВКИ И ПЛАВКИ ==========

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
    try {
        const body = {
            item_ids: itemIds,
            chosen_class: chosenClass
        };
        if (selectedScrollId) body.scroll_id = selectedScrollId;

        const res = await window.apiRequest('/forge/craft', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) {
            if (typeof AudioManager !== 'undefined') AudioManager.playSound('forge');
            showToast(data.message || 'Предмет создан!', 2000);
            selectedScrollId = null;
            selectedScrollBonus = 0;
            await refreshData();
            if (currentScreen === 'forge') {
                await refreshForgeUI();
            }
            if (data.item) showChestResult(data.item);
        } else {
            showToast(data.message || 'Неудача', 2000);
            selectedScrollId = null;
            selectedScrollBonus = 0;
            await refreshData();
            if (currentScreen === 'forge') {
                await refreshForgeUI();
            }
        }
    } catch (err) {
        console.error('[performCraft] error:', err);
        showToast('Ошибка соединения', 1500);
    } finally {
        actionBtn.disabled = false;
    }
}

async function performForgeAction() {
    const actionBtn = document.getElementById('forgeActionBtn');
    actionBtn.disabled = true;
    if (currentForgeTab === 'forge') {
        if (!window.forgeItems || window.forgeItems.length !== 3) {
            showToast('Нужно ровно 3 предмета', 1500);
            actionBtn.disabled = false;
            return;
        }
        const items = window.forgeItems.map(id => inventory.find(it => it.id === id));
        const rarities = items.map(it => it.rarity);
        if (!rarities.every(r => r === rarities[0])) {
            showToast('Предметы должны быть одной редкости', 1500);
            actionBtn.disabled = false;
            return;
        }
        showClassChoiceForCraft(window.forgeItems);
        actionBtn.disabled = false;
    } else {
        if (!window.forgeItems || window.forgeItems.length === 0) {
            actionBtn.disabled = false;
            return;
        }
        try {
            const res = await window.apiRequest('/forge/smelt', {
                method: 'POST',
                body: JSON.stringify({
                    item_ids: window.forgeItems
                })
            });
            const data = await res.json();
            if (data.success) {
                if (typeof AudioManager !== 'undefined') AudioManager.playSound('forge');
                let msg = `Вы получили ${data.coins} монет`;
                if (data.diamonds > 0) msg += `, ${data.diamonds} алмазов`;
                if (data.coal > 0) msg += ` и ${data.coal} угля`;
                showToast(msg, 2000);
                await refreshData();
                if (currentScreen === 'forge') {
                    await refreshForgeUI();
                }
            } else {
                showToast('Ошибка: ' + data.error, 1500);
            }
        } catch (err) {
            console.error('[performForgeAction] error:', err);
            showToast('Ошибка соединения', 1500);
        } finally {
            actionBtn.disabled = false;
        }
    }
}

// ========== СПРАВКА ==========
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
                <div class="skill-desc" style="margin-top: 5px;">Стоимость ковки зависит от редкости результата и списывается монетами и углём.</div>
                <div class="skill-desc" style="margin-top: 5px;">Вы можете добавить свиток, чтобы увеличить шанс успеха (редкий +10%, эпический +20%, легендарный +30%). Шанс успеха без свитка: необычный 95%, редкий 85%, эпический 75%, легендарный 65%.</div>
                <div class="skill-desc" style="margin-top: 5px;">При неудаче все предметы и свиток теряются.</div>
            </div>
            <div class="role-card">
                <h3><i class="fas fa-fire"></i> Плавка</h3>
                <div class="skill-desc">Поместите от <strong>1 до 5 предметов</strong> в слоты и нажмите «Расплавить». Вы получите монеты, возможно алмазы, а также уголь в зависимости от редкости.</div>
                <div class="skill-desc" style="margin-top: 5px;">Диапазоны угля: Обычное 1-5, Необычное 10-15, Редкое 25-45, Эпическое 75-150, Легендарное 350-550.</div>
            </div>
            <div class="role-card">
                <h3><i class="fas fa-boxes"></i> Инвентарь</h3>
                <div class="skill-desc">Внизу отображаются доступные предметы. Нажмите «Добавить», чтобы поместить их в слоты.</div>
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

window.renderForge = renderForge;
