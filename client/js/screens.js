// screens.js – все функции рендеринга экранов
// ==================== ГЛОБАЛЬНЫЕ НАСТРОЙКИ ====================

let tradeSubtab = 'chests'; // 'chests', 'coins', 'gems'
let profileTab = 'bonuses';
let ratingTab = 'rating';

// Экранирование HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Проверка roleDescriptions
if (typeof roleDescriptions === 'undefined') {
    console.error('roleDescriptions is not defined! Make sure constants.js is loaded.');
}

function getRoleNameRu(role) {
    const roles = {
        guardian: 'Страж', berserker: 'Берсерк', knight: 'Рыцарь',
        assassin: 'Убийца', venom_blade: 'Ядовитый клинок', blood_hunter: 'Кровавый охотник',
        pyromancer: 'Поджигатель', cryomancer: 'Ледяной маг', illusionist: 'Иллюзионист'
    };
    return roles[role] || role;
}

// ==================== ГЛАВНЫЙ ЭКРАН ====================

function renderMain() {
    const content = document.getElementById('content');
    if (!content) return;

    const classData = getCurrentClassData();
    const currentClass = userData.current_class;
    const level = classData.level;
    const exp = classData.exp;
    const nextExp = Math.floor(80 * Math.pow(level, 1.5));
    const expPercent = nextExp > 0 ? Math.min(100, (exp / nextExp) * 100) : 0;

    const stats = calculateClassStats(currentClass, classData, inventory, userData.subclass);
    currentPower = calculatePower(currentClass, stats.final, classData.level);
    updateTopBar();

    content.innerHTML = `
        <div class="main-top-container">
            <div class="main-top-inner">
                <div class="main-buttons-col left">
                    <div class="btn-grid">
                        <button class="main-icon-btn" id="mailBtn"><i class="fas fa-envelope"></i><span>Почта</span></button>
                        <button class="main-icon-btn empty-btn"></button>
                        <button class="main-icon-btn empty-btn"></button>
                        <button class="main-icon-btn empty-btn"></button>
                        <button class="main-icon-btn" data-screen="settings"><i class="fas fa-cog"></i><span>Настройки</span></button>
                        <button class="main-icon-btn empty-btn"></button>
                    </div>
                </div>
                <div class="main-avatar-col">
                    <div class="hero-avatar" id="avatarClick" style="position: relative; width: 100%; height: 100%; cursor: pointer;">
                        <img src="/assets/${escapeHtml(userData.avatar || 'cat_heroweb.png')}" alt="hero" style="width:100%; height:100%; object-fit: cover;">
                        <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; text-align: center; font-weight: bold; padding: 4px 0; font-size: 14px; pointer-events: none;">ПРОФИЛЬ</div>
                    </div>
                </div>
                <div class="main-buttons-col right">
                    <div class="btn-grid">
                        <button class="main-icon-btn" data-screen="trade"><i class="fas fa-store"></i><span>Торговля</span></button>
                        <button class="main-icon-btn" data-screen="market"><i class="fas fa-exchange-alt"></i><span>Маркет</span></button>
                        <button class="main-icon-btn" data-screen="fortune"><i class="fas fa-dice"></i><span>Фортуна</span></button>
                        <button class="main-icon-btn" data-screen="equip"><i class="fas fa-tshirt"></i><span>Рюкзак</span></button>
                        <button class="main-icon-btn" data-screen="alchemy"><i class="fas fa-flask"></i><span>Алхимик</span></button>
                        <button class="main-icon-btn" data-screen="forge"><i class="fas fa-hammer"></i><span>Кузница</span></button>
                    </div>
                </div>
            </div>
        </div>
        <div class="main-username-header">${escapeHtml(userData.username || 'Игрок')}</div>
        <div class="main-content-container">
            <div style="margin: 20px 20px 0 20px;">
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span>Уровень <span class="level-display">${level}</span></span>
                    <span class="exp-display">${escapeHtml(exp)}/${escapeHtml(nextExp)} опыта</span>
                </div>
                <div style="background-color: #2f3542; height: 10px; border-radius: 5px; margin-top: 5px;">
                    <div class="exp-bar-fill" style="background-color: #00aaff; width: ${expPercent}%; height: 100%; border-radius: 5px;"></div>
                </div>
            </div>
            <div style="margin: 20px;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="width: 70px; text-align: left; font-weight: bold;">Класс</div>
                    <div class="class-selector" style="flex: 1; margin-left: 10px;">
                        <button class="class-btn ${currentClass === 'warrior' ? 'active' : ''}" data-class="warrior">Воин</button>
                        <button class="class-btn ${currentClass === 'assassin' ? 'active' : ''}" data-class="assassin">Ассасин</button>
                        <button class="class-btn ${currentClass === 'mage' ? 'active' : ''}" data-class="mage">Маг</button>
                    </div>
                </div>
                <div style="display: flex; align-items: center;">
                    <div style="width: 70px; text-align: left; font-weight: bold;">Роль</div>
                    <select id="subclassSelect" style="flex: 1; margin-left: 10px; background-color: #2f3542; color: white; border: 1px solid #00aaff; border-radius: 20px; padding: 8px 12px;"></select>
                    <i class="fas fa-circle-question" id="roleInfoBtn" style="color: #00aaff; font-size: 24px; margin-left: 10px; cursor: pointer;"></i>
                </div>
            </div>
            <button id="fightBtn" style="margin: 0 20px 20px 20px; width: calc(100% - 40px); background: none; border: none; padding: 0; cursor: pointer;">
                <img src="/assets/icons/pic-startbattle.png" alt="Начать бой" style="width:100%; height:auto; display:block;">
            </button>
        </div>
    `;

    updateSubclasses(currentClass);
      // Обработчики
    const classSelector = document.querySelector('.class-selector');
    if (classSelector) {
        classSelector.addEventListener('click', async (e) => {
            const btn = e.target.closest('.class-btn');
            if (!btn) return;
            const newClass = btn.dataset.class;
            if (newClass === userData.current_class) return;
            const res = await window.apiRequest('/player/class', { method: 'POST', body: JSON.stringify({ class: newClass }) });
            if (!res.ok) return;
            const firstSubclass = { warrior: 'guardian', assassin: 'assassin', mage: 'pyromancer' }[newClass];
            await window.apiRequest('/player/subclass', { method: 'POST', body: JSON.stringify({ subclass: firstSubclass }) });
            userData.current_class = newClass;
            userData.subclass = firstSubclass;
            updateMainScreen();
        });
    }
    const subclassSelect = document.getElementById('subclassSelect');
    if (subclassSelect) {
        subclassSelect.addEventListener('change', async (e) => {
            const newSubclass = e.target.value;
            const res = await window.apiRequest('/player/subclass', { method: 'POST', body: JSON.stringify({ subclass: newSubclass }) });
            if (res.ok) {
                userData.subclass = newSubclass;
                await refreshData();
            }
        });
    }
    document.getElementById('fightBtn')?.addEventListener('click', () => {
        // Включаем боевую музыку перед стартом боя
        if (window.AudioManager) {
            if (typeof AudioManager.startFightMusic === 'function') {
                AudioManager.startFightMusic();
            } else if (typeof AudioManager.onScreenChange === 'function') {
                AudioManager.onScreenChange(); // fallback
            }
        }
        startBattle();
    });
    document.getElementById('roleInfoBtn')?.addEventListener('click', () => showRoleInfoModal(userData.current_class));
    document.getElementById('avatarClick')?.addEventListener('click', () => showScreen('profile'));
    document.querySelectorAll('.main-icon-btn[data-screen]').forEach(btn => {
        btn.addEventListener('click', () => {
            const screen = btn.dataset.screen;
            if (screen) showScreen(screen);
        });
    });
    const mailBtn = document.getElementById('mailBtn');
    if (mailBtn) mailBtn.addEventListener('click', () => showScreen('messages'));
    updateTradeButtonIcon();
    updateProfileAvatarIcon();
    if (typeof updateMessagesBadge === 'function') updateMessagesBadge();
    if (typeof loadMessagesSilent === 'function') loadMessagesSilent();

    // Синхронизация музыки при показе главного экрана (включаем музыку меню)
    if (window.AudioManager && typeof AudioManager.onScreenChange === 'function') {
        AudioManager.onScreenChange();
    }
}

function updateMainScreen() {
    const classData = getCurrentClassData();
    const currentClass = userData.current_class;
    const stats = calculateClassStats(currentClass, classData, inventory, userData.subclass);
    currentPower = calculatePower(currentClass, stats.final, classData.level);
    updateTopBar();
    const level = classData.level;
    const exp = classData.exp;
    const nextExp = Math.floor(80 * Math.pow(level, 1.5));
    const expPercent = nextExp > 0 ? Math.min(100, (exp / nextExp) * 100) : 0;
    const levelSpan = document.querySelector('.level-display');
    const expSpan = document.querySelector('.exp-display');
    const expBarFill = document.querySelector('.exp-bar-fill');
    if (levelSpan) levelSpan.innerText = level;
    if (expSpan) expSpan.innerText = `${exp}/${nextExp} опыта`;
    if (expBarFill) expBarFill.style.width = expPercent + '%';
    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.class === currentClass);
    });
    updateSubclasses(currentClass);
}

function updateSubclasses(className) {
    const subclassSelect = document.getElementById('subclassSelect');
    if (!subclassSelect) return;
    const subclasses = {
        warrior: ['guardian', 'berserker', 'knight'],
        assassin: ['assassin', 'venom_blade', 'blood_hunter'],
        mage: ['pyromancer', 'cryomancer', 'illusionist']
    };
    const options = subclasses[className] || [];
    subclassSelect.innerHTML = options.map(sc => {
        const selected = (userData.subclass === sc) ? 'selected' : '';
        const displayName = (typeof roleDescriptions !== 'undefined' && roleDescriptions[sc]?.name) || sc;
        return `<option value="${sc}" ${selected}>${escapeHtml(displayName)}</option>`;
    }).join('');
}

// ==================== ЭКИПИРОВКА ====================

function renderEquip() {
    const content = document.getElementById('content');
    if (!content) return;
    if (!Array.isArray(inventory)) return;

    let selectedClass = localStorage.getItem('equipSelectedClass');
    if (!selectedClass || !['warrior', 'assassin', 'mage'].includes(selectedClass)) {
        selectedClass = userData.current_class;
    }

    const classFolderMap = {
        warrior: 'tank',
        assassin: 'assassin',
        mage: 'mage'
    };
    const typeFileMap = {
        armor: 'armor',
        boots: 'boots',
        helmet: 'helmet',
        weapon: 'weapon',
        accessory: 'ring',
        gloves: 'bracer'
    };

    function getItemIconPath(item) {
        if (!item) return '';
        const folder = classFolderMap[item.owner_class];
        const fileType = typeFileMap[item.type];
        if (!folder || !fileType) return '';
        return `/assets/equip/${folder}/${folder}-${fileType}-001.png`;
    }

    function renderTopBar(className) {
        const classItems = inventory.filter(item => 
            item.owner_class === className && 
            (!item.class_restriction || item.class_restriction === 'any' || item.class_restriction === className)
        );
        const equipped = classItems.filter(item => item.equipped);

        const slotConfig = {
            left: [
                { type: 'helmet', icon: '/assets/helmet.png' },
                { type: 'armor', icon: '/assets/armor.png' },
                { type: 'gloves', icon: '/assets/arm.png' }
            ],
            right: [
                { type: 'weapon', icon: '/assets/weapon.png' },
                { type: 'boots', icon: '/assets/leg.png' },
                { type: 'accessory', icon: '/assets/ring.png' }
            ]
        };

        let html = `
            <div class="equip-top-bar">
                <div class="equip-column">
        `;
        slotConfig.left.forEach(slot => {
            const item = equipped.find(i => i.type === slot.type);
            const icon = item ? getItemIconPath(item) : slot.icon;
            const slotBg = item ? `/assets/slot_${item.rarity}.png` : '/assets/slot.png';
            html += `
                <div class="equip-slot" data-slot="${slot.type}" data-item-id="${item ? item.id : ''}" style="background-image: url('${slotBg}'); background-size: cover;">
                    <div class="slot-icon" style="background-image: url('${icon}');"></div>
                </div>
            `;
        });
        html += `</div><div class="hero-center"><img src="/assets/${escapeHtml(userData.avatar || 'cat_heroweb.png')}" alt="hero"></div><div class="equip-column">`;
        slotConfig.right.forEach(slot => {
            const item = equipped.find(i => i.type === slot.type);
            const icon = item ? getItemIconPath(item) : slot.icon;
            const slotBg = item ? `/assets/slot_${item.rarity}.png` : '/assets/slot.png';
            html += `
                <div class="equip-slot" data-slot="${slot.type}" data-item-id="${item ? item.id : ''}" style="background-image: url('${slotBg}'); background-size: cover;">
                    <div class="slot-icon" style="background-image: url('${icon}');"></div>
                </div>
            `;
        });
        html += `</div></div>`;
        return html;
    }

    function renderInventoryList(className) {
        const classItems = inventory.filter(item => 
            item.owner_class === className && 
            (!item.class_restriction || item.class_restriction === 'any' || item.class_restriction === className)
        );
        const unequipped = classItems.filter(item => !item.equipped && !item.in_forge);

        let itemsHtml = '';
        unequipped.forEach(item => {
            const rarityClass = `rarity-${item.rarity}`;
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

            const itemIcon = getItemIconPath(item) || '';
            const classNameRu = item.owner_class === 'warrior' ? 'Воин' : (item.owner_class === 'assassin' ? 'Ассасин' : 'Маг');

            const isForSale = item.for_sale === true;
            let actionButtonsHtml = '';
            if (isForSale) {
                actionButtonsHtml = `
                    <button class="inv-action-btn unsell-btn" data-item-id="${item.id}" data-action="unsell">Снять с<br>продажи</button>
                    <button class="inv-action-btn edit-price-btn" data-item-id="${item.id}" data-action="editPrice">Изменить<br>цену</button>
                `;
            } else {
                actionButtonsHtml = `
                    <button class="inv-action-btn equip-btn" data-item-id="${item.id}" data-action="equip">Надеть</button>
                    <button class="inv-action-btn sell-btn" data-item-id="${item.id}" data-action="sell">Продать</button>
                `;
            }

            let iconHtml = `<div class="inv-icon-img" style="background-image: url('${itemIcon}');"></div>`;
            if (isForSale) {
                iconHtml += `<div class="sale-overlay">На продаже</div>`;
            }

            itemsHtml += `
                <div class="inventory-row ${rarityClass}" data-item-id="${item.id}" data-for-sale="${item.for_sale}" data-in-forge="${item.in_forge}">
                    <div class="inv-icon">
                        ${iconHtml}
                    </div>
                    <div class="inv-info">
                        <div class="inv-name">
                            <span class="inv-name-text" style="color: ${getRarityColor(item.rarity)};">${escapeHtml(itemNameTranslations[item.name] || item.name)}</span>
                            <span class="inv-class">(${escapeHtml(classNameRu)})</span>
                        </div>
                        <div class="inv-stats">${stats.map(s => escapeHtml(s)).join(' • ')}</div>
                    </div>
                    <div class="inv-actions">
                        ${actionButtonsHtml}
                    </div>
                </div>
            `;
        });

        const emptyRowsCount = Math.max(0, 4 - unequipped.length);
        for (let i = 0; i < emptyRowsCount; i++) {
            itemsHtml += `
                <div class="inventory-row empty-row">
                    <div class="inv-icon empty-icon"></div>
                    <div class="inv-info"></div>
                    <div class="inv-actions"></div>
                </div>
            `;
        }
        return itemsHtml;
    }

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

    content.innerHTML = `
        <div class="equip-container">
            <div class="class-selector">
                <button class="class-btn ${selectedClass === 'warrior' ? 'active' : ''}" data-class="warrior">Воин</button>
                <button class="class-btn ${selectedClass === 'assassin' ? 'active' : ''}" data-class="assassin">Ассасин</button>
                <button class="class-btn ${selectedClass === 'mage' ? 'active' : ''}" data-class="mage">Маг</button>
            </div>
            <div class="equip-top">
                ${renderTopBar(selectedClass)}
            </div>
            <div class="inventory-section">
                <div class="inventory-header">РЮКЗАК</div>
                <div class="inventory-list">
                    ${renderInventoryList(selectedClass)}
                </div>
            </div>
        </div>
    `;

    // Обработчики
    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newClass = e.currentTarget.dataset.class;
            localStorage.setItem('equipSelectedClass', newClass);
            renderEquip();
        });
    });

    document.querySelectorAll('.equip-slot').forEach(slot => {
        slot.addEventListener('click', async (e) => {
            const itemId = slot.dataset.itemId;
            if (itemId == null) return;
            const item = inventory.find(i => i.id == Number(itemId));
            if (!item) return;
            showUnequipConfirmModal(item, async () => {
                try {
                    const res = await window.apiRequest('/inventory/unequip', {
                        method: 'POST',
                        body: JSON.stringify({ item_id: itemId })
                    });
                    if (res.ok) {
                        await refreshData();
                        renderEquip();
                    } else {
                        showToast('Ошибка при снятии', 1500);
                    }
                } catch (e) {
                    showToast('Сеть недоступна', 1500);
                }
            });
        });
    });

    document.querySelectorAll('.inv-action-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const btnEl = e.currentTarget;
            const itemId = btnEl.dataset.itemId;
            if (itemId == null) return;
            const action = btnEl.dataset.action;

            if (action === 'equip') {
                const currentClass = document.querySelector('.class-btn.active').dataset.class;
                const item = inventory.find(i => i.id == Number(itemId));
                if (!item) return;
                const equippedInSlot = inventory.find(i => i.equipped && i.type === item.type && i.owner_class === currentClass);
                if (equippedInSlot) {
                    showEquipCompareModal(equippedInSlot, item);
                } else {
                    const res = await window.apiRequest('/inventory/equip', {
                        method: 'POST',
                        body: JSON.stringify({ 
                            item_id: itemId,
                            target_class: currentClass
                        })
                    });
                    if (res.ok) {
                        await refreshData();
                        renderEquip();
                    } else {
                        const err = await res.json();
                        showToast('Ошибка: ' + err.error, 1500);
                    }
                }
            } else if (action === 'sell') {
                const currentClass = document.querySelector('.class-btn.active').dataset.class;
                const item = inventory.find(i => i.id == Number(itemId));
                if (!item) return;
                if (item.owner_class !== currentClass) {
                    showToast('Этот предмет не принадлежит текущему классу!', 1500);
                    return;
                }
                showPriceInputModal(null, async (price) => {
                    const res = await window.apiRequest('/inventory/sell', {
                        method: 'POST',
                        body: JSON.stringify({ 
                            item_id: itemId, 
                            price: price
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showToast('Предмет выставлен на маркет', 1500);
                        await refreshData();
                        renderEquip();
                    } else {
                        showToast('Ошибка: ' + data.error, 1500);
                    }
                });
            } else if (action === 'unsell') {
                showConfirmModal('Снять предмет с продажи?', async () => {
                    const res = await window.apiRequest('/inventory/unsell', {
                        method: 'POST',
                        body: JSON.stringify({ item_id: itemId })
                    });
                    if (res.ok) {
                        showToast('Предмет снят с продажи', 1500);
                        await refreshData();
                        renderEquip();
                    } else {
                        showToast('Ошибка при снятии с продажи', 1500);
                    }
                });
            } else if (action === 'editPrice') {
                const item = inventory.find(i => i.id == Number(itemId));
                if (!item) return;
                showPriceInputModal(item.price, async (newPrice) => {
                    const res = await window.apiRequest('/market/update-price', {
                        method: 'POST',
                        body: JSON.stringify({ item_id: itemId, new_price: newPrice })
                    });
                    if (res.ok) {
                        showToast('Цена изменена', 1500);
                        await refreshData();
                        renderEquip();
                    } else {
                        const err = await res.json();
                        showToast('Ошибка: ' + err.error, 1500);
                    }
                });
            }
        });
    });
}

// ==================== ТОРГОВЛЯ (три вкладки) ====================

function renderTrade() {
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = `
        <div class="trade-tabs-container">
            <button class="trade-tab ${tradeSubtab === 'chests' ? 'active' : ''}" data-subtab="chests">🎁 Сундуки</button>
            <button class="trade-tab ${tradeSubtab === 'coins' ? 'active' : ''}" data-subtab="coins">💰 Монетный двор</button>
            <button class="trade-tab ${tradeSubtab === 'gems' ? 'active' : ''}" data-subtab="gems">💎 Алмазная лавка</button>
        </div>
        <div id="tradeSubContent" class="trade-content"></div>
    `;
    document.querySelectorAll('.trade-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            tradeSubtab = btn.dataset.subtab;
            renderTrade();
        });
    });
    const subContent = document.getElementById('tradeSubContent');
    if (tradeSubtab === 'chests') renderChestsTab(subContent);
    else if (tradeSubtab === 'coins') renderCoinMint(subContent);
    else if (tradeSubtab === 'gems') renderGemsShop(subContent);
}

// Вкладка "Сундуки"

async function renderChestsTab(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="chest-table">
            <div class="chest-row" data-chest="common">
                <div class="chest-icon-col"><img src="/assets/common-chess.png" alt="Обычный сундук"></div>
                <div class="chest-info-col"><div class="chest-name">Обычный сундук</div><div class="chest-desc">Обычное 85%<br>Необычное 15%</div></div>
                <div class="chest-price-col"><button class="chest-buy-btn" data-chest="common"><span class="chest-price" id="commonChestPrice">?</span><i class="fas fa-coins"></i></button></div>
            </div>
            <div class="chest-row" data-chest="uncommon">
                <div class="chest-icon-col"><img src="/assets/uncommon-chess.png" alt="Необычный сундук"></div>
                <div class="chest-info-col"><div class="chest-name">Необычный сундук</div><div class="chest-desc">Обычное 25%<br>Необычное 65%<br>Редкое 10%</div></div>
                <div class="chest-price-col"><button class="chest-buy-btn" data-chest="uncommon"><span class="chest-price">250</span><i class="fas fa-coins"></i></button></div>
            </div>
            <div class="chest-row" data-chest="rare">
                <div class="chest-icon-col"><img src="/assets/rare-chess.png" alt="Редкий сундук"></div>
                <div class="chest-info-col"><div class="chest-name">Редкий сундук</div><div class="chest-desc">Редкое 65%<br>Необычное 25%<br>Эпическое 10%</div></div>
                <div class="chest-price-col"><button class="chest-buy-btn" data-chest="rare"><span class="chest-price">800</span><i class="fas fa-coins"></i></button></div>
            </div>
            <div class="chest-row" data-chest="epic">
                <div class="chest-icon-col"><img src="/assets/epic-chess.png" alt="Эпический сундук"></div>
                <div class="chest-info-col"><div class="chest-name">Эпический сундук</div><div class="chest-desc">Эпическое 65%<br>Редкое 25%<br>Легендарное 10%</div></div>
                <div class="chest-price-col"><button class="chest-buy-btn" data-chest="epic"><span class="chest-price">1800</span><i class="fas fa-coins"></i></button></div>
            </div>
            <div class="chest-row" data-chest="legendary">
                <div class="chest-icon-col"><img src="/assets/leg-chess.png" alt="Легендарный сундук"></div>
                <div class="chest-info-col"><div class="chest-name">Легендарный сундук</div><div class="chest-desc">Легендарное 70%<br>Эпическое 30%</div></div>
                <div class="chest-price-col"><button class="chest-buy-btn" data-chest="legendary"><span class="chest-price">3500</span><i class="fas fa-coins"></i></button></div>
            </div>
        </div>
    `;

    async function updateCommonChestPrice() {
        try {
            const res = await window.apiRequest('/player/freechest');
            const data = await res.json();
            const priceSpan = container.querySelector('[data-chest="common"] .chest-price');
            const coinIcon = container.querySelector('[data-chest="common"] i');
            if (data.freeAvailable) {
                priceSpan.innerText = 'FREE';
                coinIcon.style.display = 'none';
            } else {
                priceSpan.innerText = '100';
                coinIcon.style.display = 'inline-block';
            }
            if (window.updateShopTabIcon) window.updateShopTabIcon();
            if (window.updateTradeButtonIcon) window.updateTradeButtonIcon();
        } catch (e) {
            console.error('Failed to fetch free chest status', e);
        }
    }

    updateCommonChestPrice();

    // Привязываем обработчики к кнопкам внутри container
    const buyButtons = container.querySelectorAll('.chest-buy-btn');
    for (const btn of buyButtons) {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const chest = btn.dataset.chest;
            const res = await window.apiRequest('/shop/buychest', { method: 'POST', body: JSON.stringify({ chestType: chest }) });
            let data;
            try {
                data = await res.json();
            } catch {
                showToast('Ошибка ответа сервера', 1500);
                return;
            }
            if (data.item) {
                showChestResult(data.item);
                await refreshData();
                if (typeof refreshTasksData === 'function') await refreshTasksData();
                if (window.updateTradeButtonIcon) window.updateTradeButtonIcon();
                if (chest === 'common') updateCommonChestPrice();
                // Обновляем задание "Счастливчик"
                try {
                    await window.apiRequest('/tasks/daily/update/chest', {
                        method: 'POST',
                        body: JSON.stringify({ item_rarity: data.item.rarity })
                    });
                } catch (err) {
                    console.error('Failed to update chest task', err);
                }
            } else {
                if (data.error === 'Not enough coins') showToast('Недостаточно средств!', 1500);
                else showToast('Ошибка: ' + data.error, 1500);
            }
        });
    }
}

// Вкладка "Монетный двор"
function renderCoinMint(container) {
    container.innerHTML = `
        <div class="mint-list">
            <div class="mint-item"><div class="mint-info">1000 монет</div><div class="mint-price">10 <i class="fas fa-gem"></i></div><button class="buy-mint-btn" data-coins="1000" data-price="10">Купить</button></div>
            <div class="mint-item"><div class="mint-info">5000 монет</div><div class="mint-price">45 <i class="fas fa-gem"></i></div><button class="buy-mint-btn" data-coins="5000" data-price="45">Купить</button></div>
            <div class="mint-item"><div class="mint-info">10000 монет</div><div class="mint-price">80 <i class="fas fa-gem"></i></div><button class="buy-mint-btn" data-coins="10000" data-price="80">Купить</button></div>
        </div>
    `;
    container.querySelectorAll('.buy-mint-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const coins = parseInt(btn.dataset.coins);
            const price = parseInt(btn.dataset.price);
            if (userData.diamonds < price) { showToast('Недостаточно алмазов!', 1500); return; }
            const res = await window.apiRequest('/shop/buy-coins', { method: 'POST', body: JSON.stringify({ coins, price }) });
            const data = await res.json();
            if (data.success) {
                userData.diamonds -= price;
                userData.coins += coins;
                updateTopBar();
                showToast(`+${coins} монет!`, 1500);
                renderCoinMint(container);
            } else {
                showToast(data.error || 'Ошибка', 1500);
            }
        });
    });
}

// Вкладка "Алмазная лавка"
function renderGemsShop(container) {
    // Соответствие картинок пакетам (порядок как в массиве)
    const packs = [
        { diamonds: 20, price: 149, image: 'buy_diamond_1.png' },
        { diamonds: 50, price: 229, image: 'buy_diamond_2.png' },
        { diamonds: 100, price: 399, image: 'buy_diamond_3.png' },
        { diamonds: 500, price: 1199, image: 'buy_diamond_4.png' },
        { diamonds: 2000, price: 2999, image: 'buy_diamond_5.png' },
        { diamonds: 5000, price: 4999, image: 'buy_diamond_6.png' }
    ];

    let html = `
        <div class="gems-shop">
            <div class="section-title">
                <i class="fas fa-gem"></i> Алмазы
            </div>
            <div class="packs-grid">
    `;
    packs.forEach(pack => {
        html += `
            <div class="pack-card" data-pack="${pack.diamonds}" data-price="${pack.price}">
                <div class="pack-image">
                    <img src="/assets/diamond/${pack.image}" alt="${pack.diamonds} алмазов">
                </div>
                <div class="pack-diamonds">${pack.diamonds} алмазов</div>
                <div class="pack-price">${pack.price} ₽</div>
                <div class="first-bonus">+50% при первой покупке</div>
            </div>
        `;
    });
    html += `
            </div>
            <div class="shop-note">
                <i class="fas fa-info-circle"></i> Бонус +50% алмазов начисляется только <strong>один раз за каждый пакет</strong> при первой покупке на аккаунт.
            </div>
        </div>
    `;
    container.innerHTML = html;

    container.querySelectorAll('.pack-card').forEach(card => {
        card.addEventListener('click', () => {
            const diamonds = card.dataset.pack;
            const price = card.dataset.price;
            showToast(`Покупка ${diamonds} алмазов за ${price} ₽ — скоро появится!`, 2000);
        });
    });
}

// ==================== МАРКЕТ ====================

async function renderMarket(target = null) {
    const container = target || document.getElementById('content');
    if (!container) return;
    container.innerHTML = `
        <div class="market-page">
            <div class="market-filters-panel">
                <div class="filters-row">
                    <div class="filter-group" id="filter-class-group"><button class="filter-button" id="classFilterBtn"><span id="classFilterText">Класс</span><i class="fas fa-chevron-down"></i></button><div class="filter-panel" id="classPanel" style="display: none;"><div class="filter-option" data-value="any">Любой класс</div><div class="filter-option" data-value="warrior">Воин</div><div class="filter-option" data-value="assassin">Ассасин</div><div class="filter-option" data-value="mage">Маг</div></div></div>
                    <div class="filter-group" id="filter-rarity-group"><button class="filter-button" id="rarityFilterBtn"><span id="rarityFilterText">Редкость</span><i class="fas fa-chevron-down"></i></button><div class="filter-panel" id="rarityPanel" style="display: none;"><div class="filter-option" data-value="any">Любая редкость</div><div class="filter-option" data-value="common">Обычное</div><div class="filter-option" data-value="uncommon">Необычное</div><div class="filter-option" data-value="rare">Редкое</div><div class="filter-option" data-value="epic">Эпическое</div><div class="filter-option" data-value="legendary">Легендарное</div></div></div>
                    <div class="filter-group" id="filter-stat-group"><button class="filter-button" id="statFilterBtn"><span id="statFilterText">Характеристика</span><i class="fas fa-chevron-down"></i></button><div class="filter-panel" id="statPanel" style="display: none;"><div class="filter-option" data-value="any">Любая характеристика</div><div class="filter-option" data-value="atk_bonus">АТК</div><div class="filter-option" data-value="def_bonus">ЗАЩ</div><div class="filter-option" data-value="hp_bonus">ЗДОР</div><div class="filter-option" data-value="spd_bonus">СКОР</div><div class="filter-option" data-value="crit_bonus">КРИТ</div><div class="filter-option" data-value="crit_dmg_bonus">КР.УРОН</div><div class="filter-option" data-value="agi_bonus">ЛОВ</div><div class="filter-option" data-value="int_bonus">ИНТ</div><div class="filter-option" data-value="vamp_bonus">ВАМП</div><div class="filter-option" data-value="reflect_bonus">ОТР</div></div></div>
                </div>
                <div class="apply-button-container"><button class="apply-filters-btn" id="applyFiltersBtn">Применить</button></div>
            </div>
            <div class="market-items-header">Список снаряжения</div>
            <div class="market-items-container" id="marketItemsContainer"><div id="marketItemsList" class="market-items-list"></div></div>
        </div>
    `;
    let currentClass = 'any', currentRarity = 'any', currentStat = 'any', openPanel = null;
    function closeAllPanels() { if (openPanel) { const panel = document.getElementById(openPanel); if (panel) panel.style.display = 'none'; openPanel = null; } }
    function togglePanel(panelId) { if (openPanel === panelId) closeAllPanels(); else { closeAllPanels(); const panel = document.getElementById(panelId); if (panel) { panel.style.display = 'block'; openPanel = panelId; } } }
    function handleClickOutside(e) { if (!e.target.closest('.filter-group')) closeAllPanels(); }
    document.getElementById('classFilterBtn')?.addEventListener('click', (e) => { e.stopPropagation(); togglePanel('classPanel'); });
    document.getElementById('rarityFilterBtn')?.addEventListener('click', (e) => { e.stopPropagation(); togglePanel('rarityPanel'); });
    document.getElementById('statFilterBtn')?.addEventListener('click', (e) => { e.stopPropagation(); togglePanel('statPanel'); });
    document.querySelectorAll('.filter-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            const value = e.currentTarget.dataset.value;
            const panelId = e.currentTarget.closest('.filter-panel').id;
            const optionText = e.currentTarget.innerText;
            if (panelId === 'classPanel') { currentClass = value; document.getElementById('classFilterText').innerText = value === 'any' ? 'Класс' : optionText; }
            else if (panelId === 'rarityPanel') { currentRarity = value; document.getElementById('rarityFilterText').innerText = value === 'any' ? 'Редкость' : optionText; }
            else if (panelId === 'statPanel') { currentStat = value; document.getElementById('statFilterText').innerText = value === 'any' ? 'Характеристика' : optionText; }
            closeAllPanels();
        });
    });
    document.addEventListener('click', handleClickOutside);
    document.getElementById('applyFiltersBtn')?.addEventListener('click', () => { loadMarketItems(currentStat, currentClass, currentRarity); });
    await loadMarketItems(currentStat, currentClass, currentRarity);
}

async function loadMarketItems(statFilter = 'any', classFilter = 'any', rarityFilter = 'any') {
    const params = { class: classFilter, rarity: rarityFilter };
    if (statFilter !== 'any') params.stat = statFilter;
    const res = await window.apiRequest('/market', { method: 'GET', body: params });
    let items;
    try { items = await res.json(); } catch { showToast('Ошибка загрузки маркета', 1500); return; }
    const marketList = document.getElementById('marketItemsList');
    if (!marketList) return;
    marketList.innerHTML = '';
    if (!Array.isArray(items)) { marketList.innerHTML = '<p style="color:#aaa; text-align:center;">Ошибка загрузки маркета</p>'; return; }
    const classFolderMap = { warrior: 'tank', assassin: 'assassin', mage: 'mage' };
    const typeFileMap = { armor: 'armor', boots: 'boots', helmet: 'helmet', weapon: 'weapon', accessory: 'ring', gloves: 'bracer' };
    function getItemIconPath(item) { if (!item) return ''; const folder = classFolderMap[item.owner_class]; const fileType = typeFileMap[item.type]; if (!folder || !fileType) return ''; return `/assets/equip/${folder}/${folder}-${fileType}-001.png`; }
    for (const item of items) {
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
        const rarityClass = `rarity-${item.rarity}`;
        const iconPath = getItemIconPath(item);
        const isOwn = item.seller_id === userData.id;
        const row = document.createElement('div');
        row.className = `market-item-row ${rarityClass}`;
        row.dataset.itemId = item.id;
        const iconDiv = document.createElement('div'); iconDiv.className = 'market-item-icon'; const iconImg = document.createElement('div'); iconImg.className = 'item-icon-img'; iconImg.style.backgroundImage = `url('${iconPath}')`; iconDiv.appendChild(iconImg);
        const infoDiv = document.createElement('div'); infoDiv.className = 'market-item-info';
        const nameSpan = document.createElement('div'); nameSpan.className = 'market-item-name';
        const classNameRu = item.owner_class === 'warrior' ? 'Воин' : (item.owner_class === 'assassin' ? 'Ассасин' : 'Маг');
        nameSpan.innerHTML = `${escapeHtml(itemNameTranslations[item.name] || item.name)} <span class="item-class">(${escapeHtml(classNameRu)})</span>`;
        const statsDiv = document.createElement('div'); statsDiv.className = 'market-item-stats'; statsDiv.innerText = stats.join(' • ');
        infoDiv.appendChild(nameSpan); infoDiv.appendChild(statsDiv);
        const priceDiv = document.createElement('div'); priceDiv.className = 'market-item-price'; priceDiv.innerHTML = `${item.price} <i class="fas fa-coins"></i>`;
        const actionsDiv = document.createElement('div'); actionsDiv.className = 'market-item-actions';
        if (isOwn) {
            const editBtn = document.createElement('button'); editBtn.className = 'market-action-btn edit-price-btn'; editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>'; editBtn.title = 'Изменить цену'; editBtn.addEventListener('click', (e) => { e.stopPropagation(); showEditPriceModal(item); });
            const removeBtn = document.createElement('button'); removeBtn.className = 'market-action-btn remove-from-market-btn'; removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; removeBtn.title = 'Снять с продажи'; removeBtn.addEventListener('click', async (e) => { e.stopPropagation(); showConfirmModal('Снять этот предмет с продажи?', async () => { const res = await window.apiRequest('/market/remove', { method: 'POST', body: JSON.stringify({ item_id: item.id }) }); const data = await res.json(); if (data.success) { showToast('Предмет снят с продажи', 1500); await refreshData(); loadMarketItems(statFilter, classFilter, rarityFilter); } else { showToast('Ошибка: ' + data.error, 1500); } }); });
            actionsDiv.appendChild(editBtn); actionsDiv.appendChild(removeBtn);
        } else {
            const viewBtn = document.createElement('button'); viewBtn.className = 'market-action-btn view-btn'; viewBtn.innerHTML = '<i class="fas fa-eye"></i>'; viewBtn.title = 'Просмотр'; viewBtn.addEventListener('click', (e) => { e.stopPropagation(); showItemDetailsModal(item); });
            actionsDiv.appendChild(viewBtn);
        }
        row.appendChild(iconDiv); row.appendChild(infoDiv); row.appendChild(priceDiv); row.appendChild(actionsDiv);
        marketList.appendChild(row);
    }
}

// ==================== РЕЙТИНГ ====================

function renderRating() {
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = `
        <div class="rating-page">
            <div class="rating-tabs-container">
                <button class="rating-tab ${ratingTab === 'rating' ? 'active' : ''}" id="ratingTabBtn">РЕЙТИНГ</button>
                <button class="rating-tab ${ratingTab === 'power' ? 'active' : ''}" id="powerTabBtn">СИЛА</button>
                <button class="rating-tab ${ratingTab === 'tower' ? 'active' : ''}" id="towerTabBtn">БАШНЯ</button>
            </div>
            <div class="rating-content-container" id="ratingContentContainer"><div id="ratingContent"></div></div>
        </div>
    `;
    document.getElementById('ratingTabBtn')?.addEventListener('click', () => { ratingTab = 'rating'; renderRating(); loadRatingData('rating'); });
    document.getElementById('powerTabBtn')?.addEventListener('click', () => { ratingTab = 'power'; renderRating(); loadRatingData('power'); });
    document.getElementById('towerTabBtn')?.addEventListener('click', () => { ratingTab = 'tower'; renderRating(); loadRatingData('tower'); });
    loadRatingData(ratingTab);
}

async function loadRatingData(type) {
    const container = document.getElementById('ratingContent');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;">Загрузка...</p>';
    try {
        const res = await window.apiRequest(`/rank/${type}`, { method: 'GET' });
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid data');
        let html = '<table class="stats-table"><thead><tr><th>Место</th><th>Имя</th>';
        if (type === 'rating' || type === 'power') html += '<th>Класс</th><th>Очки</th>';
        else if (type === 'tower') html += '<th>Класс</th><th>Роль</th><th>Этаж</th>';
        html += '</tr></thead><tbody>';
        data.forEach((item, index) => {
            html += `<tr><td style="text-align:center;">${index + 1} </td><td>${escapeHtml(item.username)}</td>`;
            if (type === 'rating') {
                const className = item.class === 'warrior' ? 'Воин' : (item.class === 'assassin' ? 'Ассасин' : 'Маг');
                html += `<td>${className}</td><td style="text-align:center;">${item.rating}</td>`;
            } else if (type === 'power') {
                const className = item.class === 'warrior' ? 'Воин' : (item.class === 'assassin' ? 'Ассасин' : 'Маг');
                html += `<td>${className}</td><td style="text-align:center;">${item.power}</td>`;
            } else if (type === 'tower') {
                const className = window.getClassNameRu ? getClassNameRu(item.chosen_class) : item.chosen_class;
                const roleName = getRoleNameRu(item.chosen_subclass);
                html += `<td>${escapeHtml(className)}</td><td>${escapeHtml(roleName)}</td><td style="text-align:center;">${item.floor}</td>`;
            }
            html += '</tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (e) { console.error('Error loading rating:', e); container.innerHTML = '<p style="color:#aaa; text-align:center;">Ошибка загрузки</p>'; }
}

// ==================== ПРОФИЛЬ ====================

function renderProfile() {
    const content = document.getElementById('content');
    if (!content) return;
    window.apiRequest('/tasks/daily/update/profile', { method: 'POST' }).then(() => { if (window.refreshTasksData) window.refreshTasksData(); if (window.updateMainMenuNewIcons) window.updateMainMenuNewIcons(); }).catch(err => console.error('Failed to update profile task', err));
    const hasSkillPoints = hasAnyUnspentSkillPoints();
    content.innerHTML = `
        <div class="profile-tabs-container">
            <button class="btn profile-tab ${profileTab === 'skins' ? 'active' : ''}" data-tab="skins">Скины</button>
            <button class="btn profile-tab ${profileTab === 'bonuses' ? 'active' : ''}" data-tab="bonuses">Бонусы</button>
            <button class="btn profile-tab ${profileTab === 'upgrade' ? 'active' : ''}" data-tab="upgrade" style="position: relative;">Улучшить${hasSkillPoints ? '<img src="/assets/icons/icon-new.png" class="upgrade-tab-icon" alt="">' : ''}</button>
        </div>
        <div id="profileContent"></div>
    `;
    document.querySelectorAll('.profile-tab').forEach(btn => { btn.addEventListener('click', (e) => { profileTab = e.currentTarget.dataset.tab; renderProfile(); }); });
    renderProfileTab(profileTab);
}

function renderProfileTab(tab) {
    const profileContent = document.getElementById('profileContent');
    if (!profileContent) return;
    if (tab === 'bonuses') renderProfileBonuses(profileContent);
    else if (tab === 'upgrade') renderSkills(profileContent);
    else if (tab === 'skins') renderSkins(profileContent);
}

function renderProfileBonuses(container) {
    if (!container) return;
    const currentClass = userData.current_class;
    const classData = getCurrentClassData();
    const stats = calculateClassStats(currentClass, classData, inventory, userData.subclass);

    const hasPointsForClass = (cls) => (userClasses.find(c => c.class === cls)?.skill_points || 0) > 0;

    const maxLevel = 60;
    const levelProgress = (classData.level / maxLevel) * 100;
    const expNeeded = Math.floor(80 * Math.pow(classData.level, 1.5));
    const expProgress = (classData.exp / expNeeded) * 100;
    const skillPoints = classData.skill_points || 0;
    const skillPointsProgress = skillPoints > 0 ? 100 : 0;

    container.innerHTML = `
        <div class="class-selector" style="margin-bottom: 15px;">
            <button class="class-btn ${currentClass === 'warrior' ? 'active' : ''}" data-class="warrior" style="position: relative;">
                Воин
                ${hasPointsForClass('warrior') ? '<img src="/assets/icons/icon-new.png" class="class-icon" alt="">' : ''}
            </button>
            <button class="class-btn ${currentClass === 'assassin' ? 'active' : ''}" data-class="assassin" style="position: relative;">
                Ассасин
                ${hasPointsForClass('assassin') ? '<img src="/assets/icons/icon-new.png" class="class-icon" alt="">' : ''}
            </button>
            <button class="class-btn ${currentClass === 'mage' ? 'active' : ''}" data-class="mage" style="position: relative;">
                Маг
                ${hasPointsForClass('mage') ? '<img src="/assets/icons/icon-new.png" class="class-icon" alt="">' : ''}
            </button>
        </div>

        <div class="stats-block">
            <div class="stat-row">
                <span class="stat-label">Уровень</span>
                <div class="stat-bar-container">
                    <div class="stat-bar-fill" style="width: ${levelProgress}%;"></div>
                    <span class="stat-value">${classData.level}/${maxLevel}</span>
                </div>
            </div>
            <div class="stat-row">
                <span class="stat-label">Опыт</span>
                <div class="stat-bar-container">
                    <div class="stat-bar-fill" style="width: ${expProgress}%;"></div>
                    <span class="stat-value">${classData.exp}/${expNeeded}</span>
                </div>
            </div>
            <div class="stat-row">
                <span class="stat-label">Очки навыков</span>
                <div class="stat-bar-container">
                    <div class="stat-bar-fill" style="width: ${skillPointsProgress}%;"></div>
                    <span class="stat-value">${skillPoints}</span>
                </div>
            </div>
        </div>

        <table class="stats-table bonuses-table">
            <thead>
                <tr><th>Параметр</th><th>База</th><th>+Инв.</th><th>+Особ.</th><th>Итого</th>  </tr>
            </thead>
            <tbody>
                ${renderStatRow('Здоровье (HP)', stats.base.hp, stats.gear.hp, stats.classBonus?.hp || 0, stats.final.hp)}
                ${renderStatRow('Атака (ATK)', stats.base.atk, stats.gear.atk, stats.classBonus?.atk || 0, stats.final.atk)}
                ${renderStatRow('Защита (DEF)', stats.base.def + '%', stats.gear.def + '%', stats.classBonus?.def ? stats.classBonus.def + '%' : '', stats.final.def + '%')}
                ${renderStatRow('Ловкость (AGI)', stats.base.agi + '%', stats.gear.agi + '%', stats.classBonus?.agi ? stats.classBonus.agi + '%' : '', stats.final.agi + '%')}
                ${renderStatRow('Интеллект (INT)', stats.base.int + '%', stats.gear.int + '%', stats.classBonus?.int ? stats.classBonus.int + '%' : '', stats.final.int + '%')}
                ${renderStatRow('Скорость (SPD)', stats.base.spd, stats.gear.spd, stats.classBonus?.spd || 0, stats.final.spd)}
                ${renderStatRow('Шанс крита (CRIT)', stats.base.crit + '%', stats.gear.crit + '%', stats.classBonus?.crit ? stats.classBonus.crit + '%' : '', stats.final.crit + '%')}
               ${renderStatRow('Крит. урон (CRIT DMG)', (stats.base.critDmg*100).toFixed(1) + '%', (stats.gear.critDmg*100).toFixed(1) + '%', stats.classBonus?.critDmg ? (stats.classBonus.critDmg*100).toFixed(1) + '%' : '', (stats.final.critDmg*100).toFixed(1) + '%')}
                ${renderStatRow('Вампиризм (VAMP)', stats.base.vamp + '%', stats.gear.vamp + '%', stats.classBonus?.vamp ? stats.classBonus.vamp + '%' : '', stats.final.vamp + '%')}
                ${renderStatRow('Отражение (REFLECT)', stats.base.reflect + '%', stats.gear.reflect + '%', stats.classBonus?.reflect ? stats.classBonus.reflect + '%' : '', stats.final.reflect + '%')}
            </tbody>
        </table>
    `;

    container.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const newClass = e.currentTarget.dataset.class;
            if (newClass === currentClass) return;
            const res = await window.apiRequest('/player/class', {
                method: 'POST',
                body: JSON.stringify({ class: newClass })
            });
            if (res.ok) {
                userData.current_class = newClass;
                await refreshData();
                renderProfileTab(profileTab);
            }
        });
    });
}

function renderSkills(container) {
    if (!container) return;
    const classData = getCurrentClassData();
    const skillPoints = classData.skill_points;
    const currentClass = userData.current_class;
    const base = baseStats[currentClass] || baseStats.warrior;

    const hasPointsForClass = (cls) => (userClasses.find(c => c.class === cls)?.skill_points || 0) > 0;

    container.innerHTML = `
        <div class="class-selector" style="margin-bottom: 15px;">
            <button class="class-btn ${currentClass === 'warrior' ? 'active' : ''}" data-class="warrior" style="position: relative;">
                Воин
                ${hasPointsForClass('warrior') ? '<img src="/assets/icons/icon-new.png" class="class-icon" alt="">' : ''}
            </button>
            <button class="class-btn ${currentClass === 'assassin' ? 'active' : ''}" data-class="assassin" style="position: relative;">
                Ассасин
                ${hasPointsForClass('assassin') ? '<img src="/assets/icons/icon-new.png" class="class-icon" alt="">' : ''}
            </button>
            <button class="class-btn ${currentClass === 'mage' ? 'active' : ''}" data-class="mage" style="position: relative;">
                Маг
                ${hasPointsForClass('mage') ? '<img src="/assets/icons/icon-new.png" class="class-icon" alt="">' : ''}
            </button>
        </div>

        <div class="skills-header">
            Доступно очков навыков: <strong>${skillPoints}</strong>
        </div>

        <div class="skills-list">
            ${renderSkillItem('hp_points', 'Здоровье', 'Здоровье +5 единиц', base.hp + (classData.hp_points || 0) * 5, classData.hp_points || 0, skillPoints)}
            ${renderSkillItem('atk_points', 'Атака', 'Атака +1 единица', base.atk + (classData.atk_points || 0), classData.atk_points || 0, skillPoints)}
            ${renderSkillItem('def_points', 'Защита', 'Входящий физ.урон -1% <br>(макс. 70%)', base.def + (classData.def_points || 0), classData.def_points || 0, skillPoints)}
            ${renderSkillItem('dodge_points', 'Ловкость', 'Шанс уворота +1% <br> (макс. 70%)', base.agi + (classData.dodge_points || 0), classData.dodge_points || 0, skillPoints)}
            ${renderSkillItem('int_points', 'Интеллект', 'Сила магии +1%', base.int + (classData.int_points || 0), classData.int_points || 0, skillPoints)}
            ${renderSkillItem('spd_points', 'Скорость', 'Влияет на очерёдность хода', base.spd + (classData.spd_points || 0), classData.spd_points || 0, skillPoints)}
            ${renderSkillItem('crit_points', 'Шанс крита', 'Шанс критического удара + 1% <br>(макс. 100%)', base.crit + (classData.crit_points || 0), classData.crit_points || 0, skillPoints)}
            ${renderSkillItem('crit_dmg_points', 'Крит. урон', 'Критический урон +2% <br>(макс. 450%)', ((classData.crit_dmg_points || 0)*2) + '%', classData.crit_dmg_points || 0, skillPoints)}
            ${renderSkillItem('vamp_points', 'Вампиризм', 'Восстанавливает % <br>от нанесённого урона', base.vamp + (classData.vamp_points || 0), classData.vamp_points || 0, skillPoints)}
            ${renderSkillItem('reflect_points', 'Отражение', 'Возвращает % <br>от полученного урона', base.reflect + (classData.reflect_points || 0), classData.reflect_points || 0, skillPoints)}
        </div>
    `;

    container.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const newClass = e.currentTarget.dataset.class;
            if (newClass === currentClass) return;
            await window.apiRequest('/player/class', {
                method: 'POST',
                body: JSON.stringify({ class: newClass })
            });
            userData.current_class = newClass;
            renderSkills(container);
        });
    });

    container.querySelectorAll('.skill-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const stat = e.currentTarget.dataset.stat;
            const res = await window.apiRequest('/player/upgrade', {
                method: 'POST',
                body: JSON.stringify({
                    class: currentClass,
                    stat: stat,
                    points: 1
                })
            });
            const data = await res.json();
            if (data.success) {
                await refreshData();
                renderSkills(container);
            } else {
                showToast('Ошибка: ' + data.error, 1500);
            }
        });
    });
}

function renderSkillItem(statName, displayName, description, currentValue, level, skillPoints) {
    return `<div class="skill-item"><div class="skill-info"><div class="skill-name">${escapeHtml(displayName)}</div><div class="skill-desc">${description}</div></div><div class="skill-value">${currentValue}</div><button class="skill-btn" data-stat="${statName}" ${skillPoints < 1 ? 'disabled' : ''}><i class="fas fa-plus"></i></button></div>`;
}

function renderStatRow(label, baseValue, gearValue, classBonusValue, finalValue) {
    const gearNum = parseFloat(gearValue) || 0;
    const classBonusNum = parseFloat(classBonusValue) || 0;
    const gearDisplay = gearNum !== 0 ? `<span style="color:#2ecc71;">+${escapeHtml(gearValue)}</span>` : '';
    const classBonusDisplay = classBonusNum !== 0 ? `<span style="color:#00aaff;">+${escapeHtml(classBonusValue)}</span>` : '';
    return `<tr><td style="padding: 5px 0;">${escapeHtml(label)}</td><td style="text-align:center;">${baseValue}</td><td style="text-align:center;">${gearDisplay}</td><td style="text-align:center;">${classBonusDisplay}</td><td style="text-align:center; font-weight:bold;">${finalValue}</td></tr>`;
}

// ==================== СКИНЫ ====================

function renderSkins(container) {
    if (!container) return;
    Promise.all([
        fetch(`${window.API_BASE}/avatars`).then(res => res.json()),
        window.apiRequest(`/avatars/user/${userData.tg_id}`, { method: 'GET' }).then(res => res.json())
    ])
    .then(([allAvatars, ownedIds]) => {
        const activeAvatarId = userData.avatar_id || 1;
        const ownedSet = new Set(ownedIds);
        ownedSet.add(1);

        const sortedAvatars = [...allAvatars].sort((a, b) => {
            if (a.id === activeAvatarId) return -1;
            if (b.id === activeAvatarId) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        let html = '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px;">';
        sortedAvatars.forEach(avatar => {
            const isActive = avatar.id === activeAvatarId;
            const isOwned = ownedSet.has(avatar.id);
            const priceGold = parseInt(avatar.price_gold, 10) || 0;
            const priceDiamonds = parseInt(avatar.price_diamonds, 10) || 0;

            let priceHtml = '';
            if (!isOwned) {
                let parts = [];
                if (priceGold > 0) parts.push(`${priceGold} <i class="fas fa-coins" style="color:white;"></i>`);
                if (priceDiamonds > 0) parts.push(`${priceDiamonds} <i class="fas fa-gem" style="color:white;"></i>`);
                if (parts.length > 0) {
                    priceHtml = `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; text-align: center; font-weight: bold; padding: 2px 0; font-size: 12px; pointer-events: none; z-index: 1;">${parts.join(' + ')}</div>`;
                } else {
                    priceHtml = `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; text-align: center; font-weight: bold; padding: 2px 0; font-size: 12px; pointer-events: none; z-index: 1;">Бесплатно</div>`;
                }
            }

            html += `
                <div style="position: relative; cursor: pointer;" data-avatar-id="${avatar.id}" data-avatar-filename="${avatar.filename}" data-owned="${isOwned}">
                    ${isActive ? '<div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; text-align: center; font-weight: bold; z-index: 1; pointer-events: none;">АКТИВНЫЙ</div>' : ''}
                    <img src="/assets/${avatar.filename}" style="width: 100%; height: auto; border: ${isActive ? '3px solid #00aaff' : '1px solid #2f3542'}; border-radius: 8px; box-sizing: border-box;">
                    ${priceHtml}
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;

        container.querySelectorAll('[data-avatar-id]').forEach(div => {
            div.addEventListener('click', () => {
                const avatarId = parseInt(div.dataset.avatarId);
                const avatarFilename = div.dataset.avatarFilename;
                const owned = div.dataset.owned === 'true';
                showSkinModal(avatarId, avatarFilename, owned);
            });
        });
    })
    .catch(err => {
        console.error('Error loading avatars:', err);
        container.innerHTML = '<p style="color:#aaa;">Ошибка загрузки аватаров. Проверьте консоль.</p>';
    });
}

function showSkinModal(avatarId, avatarFilename, owned) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalTitle || !modalBody) return;

    fetch(`${window.API_BASE}/avatars`)
        .then(res => res.json())
        .then(avatarsList => {
            const avatar = avatarsList.find(a => a.id === avatarId);
            if (!avatar) {
                showToast('Аватар не найден', 1500);
                return;
            }

            const isActive = avatarId === userData.avatar_id;
            modalTitle.innerText = isActive ? 'Текущий аватар' : (owned ? 'Выберите аватар' : 'Купить аватар');

            const priceGold = parseInt(avatar.price_gold, 10) || 0;
            const priceDiamonds = parseInt(avatar.price_diamonds, 10) || 0;

            let priceHtml = '';
            if (!owned && !isActive) {
                let parts = [];
                if (priceGold > 0) parts.push(`${priceGold} <i class="fas fa-coins" style="color:white;"></i>`);
                if (priceDiamonds > 0) parts.push(`${priceDiamonds} <i class="fas fa-gem" style="color:white;"></i>`);
                if (parts.length > 0) {
                    priceHtml = `<p style="color:white;">Цена: ${parts.join(' + ')}</p>`;
                } else {
                    priceHtml = `<p style="color:white;">Бесплатно</p>`;
                }
            }

            modalBody.innerHTML = `
                <div style="text-align: center;">
                    <img src="/assets/${escapeHtml(avatarFilename)}" style="max-width: 100%; max-height: 300px; border-radius: 10px;">
                    <div style="font-size: 24px; font-weight: bold; color: white; margin: 15px 0 5px;">${escapeHtml(translateSkinName(avatar.name))}</div>
                    ${priceHtml}
                    <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                        ${!owned && !isActive ? '<button class="btn" id="buySkin">Купить</button>' : ''}
                        ${owned && !isActive ? '<button class="btn" id="activateSkin">Активировать</button>' : ''}
                        <button class="btn" id="closeSkinModal">Назад</button>
                    </div>
                </div>
            `;

            modal.style.display = 'block';

            if (!owned && !isActive) {
                document.getElementById('buySkin')?.addEventListener('click', async () => {
                    const res = await window.apiRequest('/avatars/buy', {
                        method: 'POST',
                        body: JSON.stringify({ avatar_id: avatarId })
                    });
                    const data = await res.json();
                    if (data.success) {
                        await refreshData();
                        modal.style.display = 'none';
                        renderProfileTab('skins');
                    } else {
                        showToast('Ошибка: ' + data.error, 1500);
                    }
                });
            }

            if (owned && !isActive) {
                document.getElementById('activateSkin')?.addEventListener('click', async () => {
                    const res = await window.apiRequest('/player/avatar', {
                        method: 'POST',
                        body: JSON.stringify({ avatar_id: avatarId })
                    });
                    const data = await res.json();
                    if (data.success) {
                        userData.avatar_id = avatarId;
                        userData.avatar = avatarFilename;
                        modal.style.display = 'none';
                        renderProfileTab('skins');
                        if (currentScreen === 'main') renderMain();
                        if (currentScreen === 'equip') renderEquip();
                    } else {
                        showToast('Ошибка при смене аватара', 1500);
                    }
                });
            }

            document.getElementById('closeSkinModal')?.addEventListener('click', () => {
                modal.style.display = 'none';
            });

            const closeBtn = modal.querySelector('.close');
            if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
        })
        .catch(err => {
            console.error('Error loading avatar details:', err);
            showToast('Ошибка загрузки данных аватара', 1500);
        });
}

// ==================== СООБЩЕНИЯ ====================

async function loadMessagesSilent() {
    console.log('loadMessagesSilent: начало загрузки');
    try {
        const token = localStorage.getItem('sessionToken');
        const res = await window.apiRequest('/auth/messages', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        window.messagesList = data.messages || [];
        console.log('loadMessagesSilent: загружено сообщений', window.messagesList.length);
        recalcUnprocessedCount();
    } catch (e) {
        console.error('Ошибка фоновой загрузки сообщений:', e);
    }
}

function recalcUnprocessedCount() {
    if (!window.messagesList) return;
    const unread = window.messagesList.filter(m => !m.is_read).length;
    const unclaimedRewards = window.messagesList.filter(m => !m.is_claimed && m.reward_type && m.reward_amount).length;
    unreadMessagesCount = unread + unclaimedRewards;
    console.log('recalcUnprocessedCount: unread=', unread, 'unclaimed=', unclaimedRewards, 'total=', unreadMessagesCount);
    if (typeof updateMessagesBadge === 'function') updateMessagesBadge();
}

async function loadMessages() {
    try {
        const token = localStorage.getItem('sessionToken');
        const res = await window.apiRequest('/auth/messages', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        window.messagesList = data.messages || [];
        recalcUnprocessedCount();
        return window.messagesList;
    } catch (e) {
        console.error('Ошибка загрузки сообщений:', e);
        return [];
    }
}

async function renderMessages() {
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = `
        <div class="messages-container">
            <div class="messages-header"><i class="fas fa-envelope"></i> Сообщения</div>
            <div class="messages-list" id="messagesList"></div>
        </div>
    `;
    const listContainer = document.getElementById('messagesList');
    const messages = await loadMessages();
    if (!messages.length) {
        listContainer.innerHTML = '<div class="empty-messages">📭 ПУСТО</div>';
        return;
    }
    listContainer.innerHTML = '';
    messages.forEach(msg => {
        const row = document.createElement('div');
        row.className = `message-row ${msg.is_read ? 'read' : 'unread'}`;
        row.dataset.id = msg.id;
        
        const icon = document.createElement('div');
        icon.className = 'message-icon';
        icon.innerHTML = msg.is_read ? '<i class="far fa-envelope"></i>' : '<i class="fas fa-envelope" style="color:#00aaff;"></i>';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.style.backgroundImage = `url('/assets/${msg.sender_avatar || 'cat_heroweb.png'}')`;
        
        const info = document.createElement('div');
        info.className = 'message-info';
        const rewardIcon = (!msg.is_claimed && msg.reward_type && msg.reward_amount) ? 
            `<span class="reward-icon" style="margin-left: 8px;"><i class="fas fa-gift" style="color:#f1c40f;"></i></span>` : '';
        info.innerHTML = `
            <div class="message-sender">${escapeHtml(msg.from)}</div>
            <div class="message-preview">${escapeHtml(msg.subject)} ${rewardIcon}</div>
        `;
        
        const readBtn = document.createElement('button');
        readBtn.className = 'message-read-btn';
        readBtn.textContent = 'Читать';
        readBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            renderMessageDetail(msg.id);
        });
        
        row.appendChild(icon);
        row.appendChild(avatar);
        row.appendChild(info);
        row.appendChild(readBtn);
        listContainer.appendChild(row);
    });
}

async function renderMessageDetail(messageId) {
    const msg = window.messagesList.find(m => m.id == messageId);
    if (!msg) return;
    
    const token = localStorage.getItem('sessionToken');
    if (!token) {
        showToast('Ошибка: сессия не найдена', 1500);
        return;
    }
    
    if (!msg.is_read) {
        msg.is_read = true;
        await window.apiRequest('/auth/messages/read', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message_id: messageId })
        });
        recalcUnprocessedCount();
    }
    
    let rewardDisplay = '';
    if (!msg.is_claimed && msg.reward_type && msg.reward_amount) {
        let rewardText = '';
        if (msg.reward_type === 'coins') rewardText = `${msg.reward_amount} монет`;
        else if (msg.reward_type === 'diamonds') rewardText = `${msg.reward_amount} алмазов`;
        else if (msg.reward_type === 'exp') rewardText = `${msg.reward_amount} опыта`;
        else rewardText = `${msg.reward_amount} ${msg.reward_type}`;
        rewardDisplay = `
            <div class="message-reward-info">
                <i class="fas fa-gift"></i> Награда: ${rewardText}
            </div>
        `;
    }
    
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="message-detail-container">
            <div class="message-detail-header">
                <button class="back-btn" id="backToMessagesBtn"><i class="fas fa-arrow-left"></i> Назад</button>
                <button class="delete-btn" id="deleteMessageBtn"><i class="fas fa-trash-alt"></i> Удалить</button>
            </div>
            <div class="message-detail-sender">
                <div class="sender-avatar" style="background-image: url('/assets/${msg.sender_avatar || 'cat_heroweb.png'}')"></div>
                <div class="sender-name">${escapeHtml(msg.from)}</div>
                <div class="message-date">${new Date(msg.created_at).toLocaleString()}</div>
            </div>
            <div class="message-detail-subject">${escapeHtml(msg.subject)}</div>
            <div class="message-detail-body">${escapeHtml(msg.body)}</div>
            ${rewardDisplay}
            <div class="message-detail-actions">
                <button class="reply-btn" id="replyBtn">Ответить</button>
                ${!msg.is_claimed && msg.reward_type === 'skill_points_choice' ? `
                    <div class="class-choice-buttons">
                        <button class="class-choice-btn" data-class="warrior">Воин</button>
                        <button class="class-choice-btn" data-class="assassin">Ассасин</button>
                        <button class="class-choice-btn" data-class="mage">Маг</button>
                    </div>
                ` : (!msg.is_claimed && msg.reward_type && msg.reward_amount ? `<button class="claim-btn" id="claimRewardBtn">Забрать награду</button>` : '')}
            </div>
        </div>
    `;
    
    document.getElementById('backToMessagesBtn').addEventListener('click', () => renderMessages());
    document.getElementById('deleteMessageBtn').addEventListener('click', async () => {
        if (confirm('Удалить сообщение?')) {
            await window.apiRequest('/auth/messages/delete', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message_id: messageId })
            });
            window.messagesList = window.messagesList.filter(m => m.id != messageId);
            recalcUnprocessedCount();
            renderMessages();
        }
    });
    
    if (document.getElementById('replyBtn')) {
        document.getElementById('replyBtn').addEventListener('click', () => {
            showToast('Функция ответа в разработке', 1500);
        });
    }
    
    const classChoiceBtns = document.querySelectorAll('.class-choice-btn');
if (classChoiceBtns.length) {
    classChoiceBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const chosenClass = btn.dataset.class;
            try {
                const res = await window.apiRequest('/auth/claim-class-reward', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ message_id: messageId, chosen_class: chosenClass })
                });
                const data = await res.json();
                if (data.success) {
                    // +++ Звук получения награды +++
                    if (typeof AudioManager !== 'undefined') {
                        AudioManager.playSound('reward');
                    }
                    const classNameRu = chosenClass === 'warrior' ? 'Воин' : (chosenClass === 'assassin' ? 'Ассасин' : 'Маг');
                    showToast(`Вы выбрали класс ${classNameRu} и получили 5 очков навыков!`, 2000);
                    msg.is_claimed = true;
                    await refreshData();
                    recalcUnprocessedCount();
                    renderMessageDetail(messageId);
                } else {
                    showToast('Ошибка: ' + (data.error || 'Неизвестная ошибка'), 1500);
                }
            } catch (err) {
                console.error(err);
                showToast('Ошибка соединения', 1500);
            }
        });
    });
}
    
   const claimBtn = document.getElementById('claimRewardBtn');
if (claimBtn) {
    claimBtn.addEventListener('click', async () => {
        const res = await window.apiRequest('/auth/messages/claim', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message_id: messageId })
        });
        const data = await res.json();
        if (data.success) {
            // +++ Звук получения награды +++
            if (typeof AudioManager !== 'undefined') {
                AudioManager.playSound('reward');
            }
            let icon = '';
            if (msg.reward_type === 'coins') icon = '<i class="fas fa-coins"></i> ';
            else if (msg.reward_type === 'diamonds') icon = '<i class="fas fa-gem"></i> ';
            else icon = '<i class="fas fa-gift"></i> ';
            showToast(`${icon}Вы получили: ${data.reward_text}`, 2000);
            msg.is_claimed = true;
            await refreshData();
            recalcUnprocessedCount();
            renderMessageDetail(messageId);
        } else {
            showToast('Ошибка: ' + data.error, 1500);
        }
    });
}


// ==================== АЛХИМИЯ (заглушка) ====================
function renderAlchemy() {
    const content = document.getElementById('content');
    content.innerHTML = `<div style="text-align:center; padding:20px;"><i class="fas fa-flask" style="font-size:48px; color:#00aaff;"></i><h2 style="color:white;">Алхимик</h2><p style="color:#aaa;">Превращаем ресурсы в ценности! 🧪</p></div>`;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ МОДАЛЬНЫЕ ФУНКЦИИ ====================

async function showItemDetailsModal(item) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.innerText = 'Осмотр снаряжения';

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

    const classFolderMap = { warrior: 'tank', assassin: 'assassin', mage: 'mage' };
    const typeFileMap = { armor: 'armor', boots: 'boots', helmet: 'helmet', weapon: 'weapon', accessory: 'ring', gloves: 'bracer' };
    const folder = classFolderMap[item.owner_class];
    const fileType = typeFileMap[item.type];
    const iconPath = folder && fileType ? `/assets/equip/${folder}/${folder}-${fileType}-001.png` : '';

    modalBody.innerHTML = `
        <div class="item-modal-content">
            <div class="item-modal-icon ${item.rarity}">
                <div class="item-icon" style="background-image: url('${iconPath}');"></div>
            </div>
            <div class="item-modal-name ${item.rarity}">${escapeHtml(itemNameTranslations[item.name] || item.name)}</div>
            <div class="item-modal-class">${item.owner_class === 'warrior' ? 'Воин' : (item.owner_class === 'assassin' ? 'Ассасин' : 'Маг')}</div>
            <div class="item-modal-stats">${stats.map(s => escapeHtml(s)).join(' • ')}</div>
            <div class="item-modal-price">${item.price} <i class="fas fa-coins"></i></div>
            <div class="item-modal-buttons">
                <button class="item-modal-btn buy-item-btn">Купить</button>
                <button class="item-modal-btn close-modal-btn">Отмена</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    const buyBtn = modalBody.querySelector('.buy-item-btn');
    const closeBtn = modalBody.querySelector('.close-modal-btn');
    const closeX = modal.querySelector('.close');

    buyBtn.addEventListener('click', async () => {
        const res = await window.apiRequest('/market/buy', { method: 'POST', body: JSON.stringify({ item_id: item.id }) });
        let data;
        try { data = await res.json(); } catch { showToast('Ошибка ответа сервера', 1500); return; }
        if (data.success) {
            modal.style.display = 'none';
            showToast(`Вы купили "${escapeHtml(itemNameTranslations[item.name] || item.name)}" за ${item.price} монет`, 1500);
            await refreshData();
            const classFilter = document.getElementById('classFilterText')?.innerText === 'Класс' ? 'any' : 
                (document.getElementById('classFilterText')?.innerText === 'Воин' ? 'warrior' : 
                (document.getElementById('classFilterText')?.innerText === 'Ассасин' ? 'assassin' : 
                (document.getElementById('classFilterText')?.innerText === 'Маг' ? 'mage' : 'any')));
            const rarityFilter = document.getElementById('rarityFilterText')?.innerText === 'Редкость' ? 'any' : 
                (document.getElementById('rarityFilterText')?.innerText === 'Обычное' ? 'common' : 
                (document.getElementById('rarityFilterText')?.innerText === 'Необычное' ? 'uncommon' : 
                (document.getElementById('rarityFilterText')?.innerText === 'Редкое' ? 'rare' : 
                (document.getElementById('rarityFilterText')?.innerText === 'Эпическое' ? 'epic' : 
                (document.getElementById('rarityFilterText')?.innerText === 'Легендарное' ? 'legendary' : 'any')))));
            const statFilter = document.getElementById('statFilterText')?.innerText === 'Характеристика' ? 'any' : 
                (document.getElementById('statFilterText')?.innerText === 'АТК' ? 'atk_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'ЗАЩ' ? 'def_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'ЗДОР' ? 'hp_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'СКОР' ? 'spd_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'КРИТ' ? 'crit_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'КР.УРОН' ? 'crit_dmg_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'ЛОВ' ? 'agi_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'ИНТ' ? 'int_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'ВАМП' ? 'vamp_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'ОТР' ? 'reflect_bonus' : 'any'))))))))));
            loadMarketItems(statFilter, classFilter, rarityFilter);
        } else {
            modal.style.display = 'none';
            if (data.error === 'Not enough coins') showToast('Недостаточно средств!', 1500);
            else showToast('Ошибка: ' + data.error, 1500);
        }
    });

    const closeModal = () => modal.style.display = 'none';
    closeBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    window.onclick = (event) => { if (event.target === modal) closeModal(); };
}

function showPriceInputModal(currentPrice, onConfirm) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.innerText = 'Введите цену';

    modalBody.innerHTML = `
        <div class="edit-price-modal">
            <div class="item-name">Цена продажи</div>
            <input type="number" id="priceInput" class="price-input" placeholder="Цена в монетах" value="${currentPrice || ''}">
            <div class="modal-buttons">
                <button class="modal-btn save-price-btn">Продать</button>
                <button class="modal-btn cancel-price-btn">Отмена</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    const saveBtn = modalBody.querySelector('.save-price-btn');
    const cancelBtn = modalBody.querySelector('.cancel-price-btn');
    const closeX = modal.querySelector('.close');

    const closeModal = () => modal.style.display = 'none';

    saveBtn.addEventListener('click', () => {
        const price = parseInt(document.getElementById('priceInput').value);
        if (isNaN(price) || price <= 0) {
            showToast('Введите корректную цену', 1500);
            return;
        }
        closeModal();
        if (onConfirm) onConfirm(price);
    });

    cancelBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    window.onclick = (event) => { if (event.target === modal) closeModal(); };
}

function showConfirmModal(message, onConfirm, onCancel) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.innerText = 'Подтверждение';

    modalBody.innerHTML = `
        <div style="text-align: center; padding: 10px;">
            <div style="margin-bottom: 20px; font-size: 16px;">${escapeHtml(message)}</div>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="modal-btn confirm-yes" style="background-color: #00aaff; color: white;">Да</button>
                <button class="modal-btn confirm-no" style="background-color: #2f3542;">Нет</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    const yesBtn = modalBody.querySelector('.confirm-yes');
    const noBtn = modalBody.querySelector('.confirm-no');
    const closeX = modal.querySelector('.close');

    const closeModal = () => {
        modal.style.display = 'none';
        if (onCancel) onCancel();
    };

    yesBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        if (onConfirm) onConfirm();
    });

    noBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    window.onclick = (event) => { if (event.target === modal) closeModal(); };
}

function showUnequipConfirmModal(item, onConfirm) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = 'Снять предмет?';

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

    const classFolderMap = { warrior: 'tank', assassin: 'assassin', mage: 'mage' };
    const typeFileMap = { armor: 'armor', boots: 'boots', helmet: 'helmet', weapon: 'weapon', accessory: 'ring', gloves: 'bracer' };
    const folder = classFolderMap[item.owner_class];
    const fileType = typeFileMap[item.type];
    const iconPath = folder && fileType ? `/assets/equip/${folder}/${folder}-${fileType}-001.png` : '';

    const rarityColors = { common: '#aaa', uncommon: '#2ecc71', rare: '#2e86de', epic: '#9b59b6', legendary: '#f1c40f' };
    const borderColor = rarityColors[item.rarity] || '#aaa';

    modalBody.innerHTML = `
        <div style="text-align: center;">
            <div style="width: 80px; height: 80px; margin: 0 auto; background-color: #1a1f2b; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 2px solid ${borderColor};">
                <img src="${iconPath}" style="width: 70px; height: 70px; object-fit: contain;">
            </div>
            <div style="font-weight: bold; margin-top: 10px; font-size: 18px; color: ${borderColor};">${escapeHtml(itemNameTranslations[item.name] || item.name)}</div>
            <div class="rarity-${item.rarity}" style="margin: 5px 0;">${rarityTranslations[item.rarity] || item.rarity}</div>
            <div style="color: white; font-size: 14px; margin-bottom: 5px;">Класс: ${item.owner_class === 'warrior' ? 'Воин' : (item.owner_class === 'assassin' ? 'Ассасин' : 'Маг')}</div>
            <div style="color: white; font-size: 14px; margin-bottom: 15px;">${stats.map(s => escapeHtml(s)).join(' • ')}</div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="modal-btn confirm-yes" style="background-color: #2f3542; border: 2px solid #aaa; color: #aaa; border-radius: 30px; padding: 8px 24px;">Снять</button>
                <button class="modal-btn confirm-no" style="background-color: #2f3542; border: 2px solid #aaa; color: #aaa; border-radius: 30px; padding: 8px 24px;">Отмена</button>
            </div>
        </div>
    `;

    modal.style.display = 'block';

    const yesBtn = modalBody.querySelector('.confirm-yes');
    const noBtn = modalBody.querySelector('.confirm-no');
    const closeX = modal.querySelector('.close');

    const closeModal = () => { modal.style.display = 'none'; };

    yesBtn.addEventListener('click', () => {
        closeModal();
        if (onConfirm) onConfirm();
    });

    noBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    window.onclick = (event) => { if (event.target === modal) closeModal(); };
}

function showEditPriceModal(item) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.innerText = 'Изменить цену';

    modalBody.innerHTML = `
        <div class="edit-price-modal">
            <div class="item-name">${escapeHtml(itemNameTranslations[item.name] || item.name)}</div>
            <div class="current-price">Текущая цена: ${item.price} <i class="fas fa-coins"></i></div>
            <input type="number" id="newPriceInput" class="price-input" placeholder="Новая цена" value="${item.price}">
            <div class="modal-buttons">
                <button class="modal-btn save-price-btn">Сохранить</button>
                <button class="modal-btn cancel-price-btn">Отмена</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    const saveBtn = modalBody.querySelector('.save-price-btn');
    const cancelBtn = modalBody.querySelector('.cancel-price-btn');
    const closeX = modal.querySelector('.close');

    saveBtn.addEventListener('click', async () => {
        const newPrice = parseInt(document.getElementById('newPriceInput').value);
        if (isNaN(newPrice) || newPrice <= 0) { showToast('Введите корректную цену', 1500); return; }
        const res = await window.apiRequest('/market/update-price', { method: 'POST', body: JSON.stringify({ item_id: item.id, new_price: newPrice }) });
        let data;
        try { data = await res.json(); } catch { showToast('Ошибка ответа сервера', 1500); return; }
        if (data.success) {
            modal.style.display = 'none';
            showToast('Цена изменена!', 1000);
            await refreshData();
            const classFilter = document.getElementById('classFilterText')?.innerText === 'Класс' ? 'any' : 
                (document.getElementById('classFilterText')?.innerText === 'Воин' ? 'warrior' : 
                (document.getElementById('classFilterText')?.innerText === 'Ассасин' ? 'assassin' : 
                (document.getElementById('classFilterText')?.innerText === 'Маг' ? 'mage' : 'any')));
            const rarityFilter = document.getElementById('rarityFilterText')?.innerText === 'Редкость' ? 'any' : 
                (document.getElementById('rarityFilterText')?.innerText === 'Обычное' ? 'common' : 
                (document.getElementById('rarityFilterText')?.innerText === 'Необычное' ? 'uncommon' : 
                (document.getElementById('rarityFilterText')?.innerText === 'Редкое' ? 'rare' : 
                (document.getElementById('rarityFilterText')?.innerText === 'Эпическое' ? 'epic' : 
                (document.getElementById('rarityFilterText')?.innerText === 'Легендарное' ? 'legendary' : 'any')))));
            const statFilter = document.getElementById('statFilterText')?.innerText === 'Характеристика' ? 'any' : 
                (document.getElementById('statFilterText')?.innerText === 'АТК' ? 'atk_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'ЗАЩ' ? 'def_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'ЗДОР' ? 'hp_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'СКОР' ? 'spd_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'КРИТ' ? 'crit_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'КР.УРОН' ? 'crit_dmg_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'ЛОВ' ? 'agi_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'ИНТ' ? 'int_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'ВАМП' ? 'vamp_bonus' : 
                (document.getElementById('statFilterText')?.innerText === 'ОТР' ? 'reflect_bonus' : 'any'))))))))));
            loadMarketItems(statFilter, classFilter, rarityFilter);
        } else {
            showToast('Ошибка: ' + data.error, 1500);
        }
    });

    const closeModal = () => modal.style.display = 'none';
    cancelBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    window.onclick = (event) => { if (event.target === modal) closeModal(); };
}

function showToast(message, duration = 1500) {
    const existingToast = document.querySelector('.market-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'market-toast';
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ==================== ЭКСПОРТ ГЛОБАЛЬНЫХ ФУНКЦИЙ ====================
window.loadMessagesSilent = loadMessagesSilent;
