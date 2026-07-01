// screens.js – все функции рендеринга экранов с поддержкой i18n
// ==================== ГЛОБАЛЬНЫЕ НАСТРОЙКИ ====================

let tradeSubtab = 'chests'; // 'chests', 'coins', 'gems'
let profileTab = 'bonuses';
let ratingTab = 'rating';

// ======== НЕТ ЛОКАЛЬНОЙ $t – используем глобальную window.$t ========
// const $t = window.$t || (key => key); // ЭТО УДАЛЕНО!

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
        guardian: window.$t('subclasses:guardian.name'),
        berserker: window.$t('subclasses:berserker.name'),
        knight: window.$t('subclasses:knight.name'),
        assassin: window.$t('subclasses:assassin.name'),
        venom_blade: window.$t('subclasses:venom_blade.name'),
        blood_hunter: window.$t('subclasses:blood_hunter.name'),
        pyromancer: window.$t('subclasses:pyromancer.name'),
        cryomancer: window.$t('subclasses:cryomancer.name'),
        illusionist: window.$t('subclasses:illusionist.name')
    };
    return roles[role] || role;
}

// ==================== ГЛАВНЫЙ ЭКРАН ====================

function renderMain() {
    if (!userData) {
        console.warn('renderMain: userData not ready, skipping');
        return;
    }
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
                        <button class="main-icon-btn" id="mailBtn"><i class="fas fa-envelope"></i><span>${window.$t('main:Почта')}</span></button>
                        <button class="main-icon-btn" data-screen="clans"><i class="fas fa-users"></i><span>${window.$t('main:Кланы')}</span></button>
                        <button class="main-icon-btn" data-screen="tournament"><i class="fas fa-trophy"></i><span>${window.$t('main:Турнир')}</span></button>
                        <button class="main-icon-btn empty-btn"></button>
                        <button class="main-icon-btn" data-screen="settings"><i class="fas fa-cog"></i><span>${window.$t('main:Настройки')}</span></button>
                        <button class="main-icon-btn empty-btn"></button>
                    </div>
                </div>
               <div class="main-avatar-col">
                    <div class="hero-avatar" id="avatarClick" style="position: relative; width: 100%; height: 100%; cursor: pointer;">
                        <img src="/assets/${escapeHtml(userData.avatar || 'cat_heroweb.png')}" alt="hero" style="width:100%; height:100%; object-fit: cover;">
                        <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; text-align: center; font-weight: bold; padding: 4px 0; font-size: 14px; pointer-events: none;">${window.$t('main:Профиль')}</div>
                        ${userData.subscription_expiry && new Date(userData.subscription_expiry) > new Date() ? '<i class="fas fa-crown" style="position: absolute; top: 5px; left: 5px; color: #c0c0c0; font-size: 14px; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5)); pointer-events: none; z-index: 5;"></i>' : ''}
                    </div>
                </div>
                <div class="main-buttons-col right">
                    <div class="btn-grid">
                        <button class="main-icon-btn" data-screen="trade"><i class="fas fa-store"></i><span>${window.$t('main:Торговля')}</span></button>
                        <button class="main-icon-btn" data-screen="market"><i class="fas fa-exchange-alt"></i><span>${window.$t('main:Маркет')}</span></button>
                        <button class="main-icon-btn" data-screen="fortune"><i class="fas fa-dice"></i><span>${window.$t('main:Фортуна')}</span></button>
                        <button class="main-icon-btn" data-screen="equip"><i class="fas fa-tshirt"></i><span>${window.$t('main:Рюкзак')}</span></button>
                        <button class="main-icon-btn" data-screen="alchemy"><i class="fas fa-flask"></i><span>${window.$t('main:Алхимик')}</span></button>
                        <button class="main-icon-btn" data-screen="forge"><i class="fas fa-hammer"></i><span>${window.$t('main:Кузница')}</span></button>
                    </div>
                </div>
            </div>
        </div>
        <div class="main-username-header">${escapeHtml(userData.username || window.$t('common:Игрок'))}</div>
        <div class="main-content-container">
            <div style="margin: 20px 20px 0 20px;">
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span>${window.$t('main:Уровень')} <span class="level-display">${level}</span></span>
                    <span class="exp-display">${escapeHtml(exp)}/${escapeHtml(nextExp)} ${window.$t('main:опыта')}</span>
                </div>
                <div style="background-color: #2f3542; height: 10px; border-radius: 5px; margin-top: 5px;">
                    <div class="exp-bar-fill" style="background-color: #00aaff; width: ${expPercent}%; height: 100%; border-radius: 5px;"></div>
                </div>
            </div>
            <div style="margin: 20px;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="width: 70px; text-align: left; font-weight: bold;">${window.$t('main:Класс')}</div>
                    <div class="class-selector" style="flex: 1; margin-left: 10px;">
                        <button class="class-btn ${currentClass === 'warrior' ? 'active' : ''}" data-class="warrior">${window.$t('common:Воин')}</button>
                        <button class="class-btn ${currentClass === 'assassin' ? 'active' : ''}" data-class="assassin">${window.$t('common:Ассасин')}</button>
                        <button class="class-btn ${currentClass === 'mage' ? 'active' : ''}" data-class="mage">${window.$t('common:Маг')}</button>
                    </div>
                </div>
                <div style="display: flex; align-items: center;">
                    <div style="width: 70px; text-align: left; font-weight: bold;">${window.$t('main:Роль')}</div>
                    <select id="subclassSelect" style="flex: 1; margin-left: 10px; background-color: #2f3542; color: white; border: 1px solid #00aaff; border-radius: 20px; padding: 8px 12px;"></select>
                    <i class="fas fa-circle-question" id="roleInfoBtn" style="color: #00aaff; font-size: 24px; margin-left: 10px; cursor: pointer;"></i>
                </div>
            </div>
            <button id="fightBtn" style="margin: 0 20px 20px 20px; width: calc(100% - 40px); background: none; border: none; padding: 0; cursor: pointer;">
                <img src="/assets/icons/pic-startbattle.png" alt="${window.$t('main:Начать бой')}" style="width:100%; height:auto; display:block;">
            </button>
        </div>
    `;

    // Обработчики (без изменений)
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
    if (window.AudioManager) {
        if (typeof AudioManager.startFightMusic === 'function') {
            AudioManager.startFightMusic();
        } else if (typeof AudioManager.onScreenChange === 'function') {
            AudioManager.onScreenChange();
        }
    }
    if (typeof window.startBattle === 'function') {
        window.startBattle();
    } else {
        console.error('startBattle is not defined');
        showToast('Боевой модуль не загружен. Попробуйте перезагрузить страницу.', 2000);
    }
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
    updateTradeBadges();
    updateProfileAvatarIcon();
    if (typeof updateMessagesBadge === 'function') updateMessagesBadge();
    if (typeof loadMessagesSilent === 'function') loadMessagesSilent();

    if (window.AudioManager && typeof AudioManager.onScreenChange === 'function') {
        AudioManager.onScreenChange();
    }
}

function updateMainScreen() {
    if (!userData) {
        console.warn('updateMainScreen: userData not ready, skipping');
        return;
    }
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
    if (expSpan) expSpan.innerText = `${exp}/${nextExp} ${window.$t('main:опыта')}`;
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
    if (!userData) {
        console.warn('renderEquip: userData not ready, skipping');
        return;
    }
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
        const unequipped = classItems.filter(item => !item.equipped && !item.in_forge && item.type !== 'scroll');
        let itemsHtml = '';
        unequipped.forEach(item => {
            const rarityClass = `rarity-${item.rarity}`;
            const stats = [];
            if (item.atk_bonus) stats.push(window.$t('common:АТК') + `+${item.atk_bonus}`);
            if (item.def_bonus) stats.push(window.$t('common:ЗАЩ') + `+${item.def_bonus}`);
            if (item.hp_bonus) stats.push(window.$t('common:ЗДОР') + `+${item.hp_bonus}`);
            if (item.spd_bonus) stats.push(window.$t('common:СКОР') + `+${item.spd_bonus}`);
            if (item.crit_bonus) stats.push(window.$t('common:КРИТ') + `+${item.crit_bonus}%`);
            if (item.crit_dmg_bonus) stats.push(window.$t('common:КР.УРОН') + `+${item.crit_dmg_bonus}%`);
            if (item.agi_bonus) stats.push(window.$t('common:ЛОВ') + `+${item.agi_bonus}%`);
            if (item.int_bonus) stats.push(window.$t('common:ИНТ') + `+${item.int_bonus}%`);
            if (item.vamp_bonus) stats.push(window.$t('common:ВАМП') + `+${item.vamp_bonus}%`);
            if (item.reflect_bonus) stats.push(window.$t('common:ОТР') + `+${item.reflect_bonus}%`);

            const itemIcon = getItemIconPath(item) || '';
            const classNameRu = item.owner_class === 'warrior' ? window.$t('common:Воин') : (item.owner_class === 'assassin' ? window.$t('common:Ассасин') : window.$t('common:Маг'));

            const isForSale = item.for_sale === true;
            let actionButtonsHtml = '';
            if (isForSale) {
                actionButtonsHtml = `
                    <button class="inv-action-btn unsell-btn" data-item-id="${item.id}" data-action="unsell">${window.$t('equip:Снять с продажи')}</button>
                    <button class="inv-action-btn edit-price-btn" data-item-id="${item.id}" data-action="editPrice">${window.$t('equip:change_price')}</button>
                `;
            } else {
                actionButtonsHtml = `
                    <button class="inv-action-btn equip-btn" data-item-id="${item.id}" data-action="equip">${window.$t('equip:Снять')}</button>
                    <button class="inv-action-btn sell-btn" data-item-id="${item.id}" data-action="sell">${window.$t('common:Продать')}</button>
                `;
            }

            let iconHtml = `<div class="inv-icon-img" style="background-image: url('${itemIcon}');"></div>`;
            if (isForSale) {
                iconHtml += `<div class="sale-overlay">${window.$t('equip:on_sale')}</div>`;
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
                <button class="class-btn ${selectedClass === 'warrior' ? 'active' : ''}" data-class="warrior">${window.$t('common:Воин')}</button>
                <button class="class-btn ${selectedClass === 'assassin' ? 'active' : ''}" data-class="assassin">${window.$t('common:Ассасин')}</button>
                <button class="class-btn ${selectedClass === 'mage' ? 'active' : ''}" data-class="mage">${window.$t('common:Маг')}</button>
            </div>
            <div class="equip-top">
                ${renderTopBar(selectedClass)}
            </div>
            <div class="inventory-section">
                <div class="inventory-header">${window.$t('equip:Рюкзак')}</div>
                <div class="inventory-list">
                    ${renderInventoryList(selectedClass)}
                </div>
            </div>
        </div>
    `;

    // Обработчики (без изменений)
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
                        showToast(window.$t('equip:unequip_error'), 1500);
                    }
                } catch (e) {
                    showToast(window.$t('common:Сеть недоступна'), 1500);
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
                        showToast(window.$t('equip:equip_error') + err.error, 1500);
                    }
                }
            } else if (action === 'sell') {
                const currentClass = document.querySelector('.class-btn.active').dataset.class;
                const item = inventory.find(i => i.id == Number(itemId));
                if (!item) return;
                if (item.owner_class !== currentClass) {
                    showToast(window.$t('equip:not_current_class'), 1500);
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
                        showToast(window.$t('equip:item_listed'), 1500);
                        await refreshData();
                        renderEquip();
                    } else {
                        showToast(window.$t('equip:sell_error') + data.error, 1500);
                    }
                });
            } else if (action === 'unsell') {
                showConfirmModal(window.$t('equip:unsell_confirm'), async () => {
                    const res = await window.apiRequest('/inventory/unsell', {
                        method: 'POST',
                        body: JSON.stringify({ item_id: itemId })
                    });
                    if (res.ok) {
                        showToast(window.$t('equip:item_unlisted'), 1500);
                        await refreshData();
                        renderEquip();
                    } else {
                        showToast(window.$t('equip:unsell_error'), 1500);
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
                        showToast(window.$t('equip:price_changed'), 1500);
                        await refreshData();
                        renderEquip();
                    } else {
                        const err = await res.json();
                        showToast(window.$t('equip:price_change_error') + err.error, 1500);
                    }
                });
            }
        });
    });
}

// ==================== ТОРГОВЛЯ (три вкладки) ====================

function renderTrade() {
    if (!userData) {
        console.warn('renderTrade: userData not ready, skipping');
        return;
    }
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = `
        <div class="trade-tabs-container">
            <button class="trade-tab ${tradeSubtab === 'chests' ? 'active' : ''}" data-subtab="chests">${window.$t('trade:Сундуки')}</button>
            <button class="trade-tab ${tradeSubtab === 'coins' ? 'active' : ''}" data-subtab="coins">${window.$t('trade:Монетный двор')}</button>
            <button class="trade-tab ${tradeSubtab === 'gems' ? 'active' : ''}" data-subtab="gems">${window.$t('trade:Алмазная лавка')}</button>
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

    if (typeof updateTradeBadges === 'function') {
        updateTradeBadges();
    }
}

// Вкладка "Сундуки"
async function renderChestsTab(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="chest-table">
            <div class="chest-row" data-chest="common">
                <div class="chest-icon-col"><img src="/assets/common-chess.png" alt="${window.$t('trade:Обычный сундук')}"></div>
                <div class="chest-info-col"><div class="chest-name">${window.$t('trade:Обычный сундук')}</div><div class="chest-desc">${window.$t('trade:common_chest_desc')}</div></div>
                <div class="chest-price-col"><button class="chest-buy-btn" data-chest="common"><span class="chest-price" id="commonChestPrice">?</span><i class="fas fa-coins"></i></button></div>
            </div>
            <div class="chest-row" data-chest="uncommon">
                <div class="chest-icon-col"><img src="/assets/uncommon-chess.png" alt="${window.$t('trade:Необычный сундук')}"></div>
                <div class="chest-info-col"><div class="chest-name">${window.$t('trade:Необычный сундук')}</div><div class="chest-desc">${window.$t('trade:uncommon_chest_desc')}</div></div>
                <div class="chest-price-col"><button class="chest-buy-btn" data-chest="uncommon"><span class="chest-price">500</span><i class="fas fa-coins"></i></button></div>
            </div>
            <div class="chest-row" data-chest="rare">
                <div class="chest-icon-col"><img src="/assets/rare-chess.png" alt="${window.$t('trade:Редкий сундук')}"></div>
                <div class="chest-info-col"><div class="chest-name">${window.$t('trade:Редкий сундук')}</div><div class="chest-desc">${window.$t('trade:rare_chest_desc')}</div></div>
                <div class="chest-price-col"><button class="chest-buy-btn" data-chest="rare"><span class="chest-price">1500</span><i class="fas fa-coins"></i></button></div>
            </div>
            <div class="chest-row" data-chest="epic">
                <div class="chest-icon-col"><img src="/assets/epic-chess.png" alt="${window.$t('trade:Эпический сундук')}"></div>
                <div class="chest-info-col"><div class="chest-name">${window.$t('trade:Эпический сундук')}</div><div class="chest-desc">${window.$t('trade:epic_chest_desc')}</div></div>
                <div class="chest-price-col"><button class="chest-buy-btn" data-chest="epic"><span class="chest-price">300</span><i class="fas fa-gem"></i></button></div>
            </div>
            <div class="chest-row" data-chest="legendary">
                <div class="chest-icon-col"><img src="/assets/leg-chess.png" alt="${window.$t('trade:Легендарный сундук')}"></div>
                <div class="chest-info-col"><div class="chest-name">${window.$t('trade:Легендарный сундук')}</div><div class="chest-desc">${window.$t('trade:legendary_chest_desc')}</div></div>
                <div class="chest-price-col"><button class="chest-buy-btn" data-chest="legendary"><span class="chest-price">1000</span><i class="fas fa-gem"></i></button></div>
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
                priceSpan.innerText = window.$t('common:Бесплатно');
                coinIcon.style.display = 'none';
            } else {
                priceSpan.innerText = '100';
                coinIcon.style.display = 'inline-block';
            }
            if (window.updateShopTabIcon) window.updateShopTabIcon();
            if (window.updateTradeBadges) window.updateTradeBadges();
        } catch (e) {
            console.error('Failed to fetch free chest status', e);
        }
    }

    updateCommonChestPrice();

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
                showToast(window.$t('common:Ошибка ответа сервера'), 1500);
                return;
            }
            if (data.item) {
                showChestResult(data.item);
                await refreshData();
                if (typeof refreshTasksData === 'function') await refreshTasksData();
                if (window.updateTradeBadges) window.updateTradeBadges();
                if (chest === 'common') updateCommonChestPrice();
                try {
                    await window.apiRequest('/tasks/daily/update/chest', {
                        method: 'POST',
                        body: JSON.stringify({ item_rarity: data.item.rarity })
                    });
                } catch (err) {
                    console.error('Failed to update chest task', err);
                }
            } else {
                if (data.error === 'Not enough coins') showToast(window.$t('common:Недостаточно средств!'), 1500);
                else showToast(window.$t('common:Ошибка: ') + data.error, 1500);
            }
        });
    }
}

// Вкладка "Монетный двор"
function renderCoinMint(container) {
    if (typeof renderMint === 'undefined') {
        const script = document.createElement('script');
        script.src = '/js/mint.js';
        script.onload = () => {
            if (typeof renderMint === 'function') {
                renderMint(container);
            } else {
                console.error('renderMint not found after loading mint.js');
                container.innerHTML = `<p style="color:#aaa;">${window.$t('trade:Ошибка загрузки Монетного двора')}</p>`;
            }
        };
        script.onerror = () => {
            console.error('Failed to load mint.js');
            container.innerHTML = `<p style="color:#aaa;">${window.$t('trade:Ошибка загрузки Монетного двора')}</p>`;
        };
        document.head.appendChild(script);
    } else {
        renderMint(container);
    }
}

// Вкладка "Алмазная лавка"
function renderGemsShop(container) {
    if (typeof renderGems === 'undefined') {
        const script = document.createElement('script');
        script.src = '/js/gems.js';
        script.onload = () => {
            if (typeof renderGems === 'function') {
                renderGems(container);
            } else {
                container.innerHTML = `<p style="color:#aaa;">${window.$t('trade:Ошибка загрузки Алмазной лавки')}</p>`;
            }
        };
        script.onerror = () => {
            container.innerHTML = `<p style="color:#aaa;">${window.$t('trade:Ошибка загрузки Алмазной лавки')}</p>`;
        };
        document.head.appendChild(script);
    } else {
        renderGems(container);
    }
}

// ==================== МАРКЕТ ====================

async function renderMarket(target = null) {
    if (!userData) {
        console.warn('renderMarket: userData not ready, skipping');
        return;
    }
    const container = target || document.getElementById('content');
    if (!container) return;
    container.innerHTML = `
        <div class="market-page">
            <div class="market-filters-panel">
                <div class="filters-row">
                    <div class="filter-group" id="filter-class-group"><button class="filter-button" id="classFilterBtn"><span id="classFilterText">${window.$t('market:class')}</span><i class="fas fa-chevron-down"></i></button><div class="filter-panel" id="classPanel" style="display: none;"><div class="filter-option" data-value="any">${window.$t('market:Любой класс')}</div><div class="filter-option" data-value="warrior">${window.$t('common:Воин')}</div><div class="filter-option" data-value="assassin">${window.$t('common:Ассасин')}</div><div class="filter-option" data-value="mage">${window.$t('common:Маг')}</div></div></div>
                    <div class="filter-group" id="filter-rarity-group"><button class="filter-button" id="rarityFilterBtn"><span id="rarityFilterText">${window.$t('market:Редкость')}</span><i class="fas fa-chevron-down"></i></button><div class="filter-panel" id="rarityPanel" style="display: none;"><div class="filter-option" data-value="any">${window.$t('market:Любая редкость')}</div><div class="filter-option" data-value="common">${window.$t('common:Обычное')}</div><div class="filter-option" data-value="uncommon">${window.$t('common:Необычное')}</div><div class="filter-option" data-value="rare">${window.$t('common:Редкое')}</div><div class="filter-option" data-value="epic">${window.$t('common:Эпическое')}</div><div class="filter-option" data-value="legendary">${window.$t('common:Легендарное')}</div></div></div>
                    <div class="filter-group" id="filter-stat-group"><button class="filter-button" id="statFilterBtn"><span id="statFilterText">${window.$t('market:Характеристика')}</span><i class="fas fa-chevron-down"></i></button><div class="filter-panel" id="statPanel" style="display: none;"><div class="filter-option" data-value="any">${window.$t('market:Любая характеристика')}</div><div class="filter-option" data-value="atk_bonus">${window.$t('common:АТК')}</div><div class="filter-option" data-value="def_bonus">${window.$t('common:ЗАЩ')}</div><div class="filter-option" data-value="hp_bonus">${window.$t('common:ЗДОР')}</div><div class="filter-option" data-value="spd_bonus">${window.$t('common:СКОР')}</div><div class="filter-option" data-value="crit_bonus">${window.$t('common:КРИТ')}</div><div class="filter-option" data-value="crit_dmg_bonus">${window.$t('common:КР.УРОН')}</div><div class="filter-option" data-value="agi_bonus">${window.$t('common:ЛОВ')}</div><div class="filter-option" data-value="int_bonus">${window.$t('common:ИНТ')}</div><div class="filter-option" data-value="vamp_bonus">${window.$t('common:ВАМП')}</div><div class="filter-option" data-value="reflect_bonus">${window.$t('common:ОТР')}</div></div></div>
                </div>
                <div class="apply-button-container"><button class="apply-filters-btn" id="applyFiltersBtn">${window.$t('common:Применить')}</button></div>
            </div>
            <div class="market-items-header">${window.$t('market:Список снаряжения')}</div>
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
            if (panelId === 'classPanel') { currentClass = value; document.getElementById('classFilterText').innerText = value === 'any' ? window.$t('market:class') : optionText; }
            else if (panelId === 'rarityPanel') { currentRarity = value; document.getElementById('rarityFilterText').innerText = value === 'any' ? window.$t('market:Редкость') : optionText; }
            else if (panelId === 'statPanel') { currentStat = value; document.getElementById('statFilterText').innerText = value === 'any' ? window.$t('market:Характеристика') : optionText; }
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
    try { items = await res.json(); } catch { showToast(window.$t('market:Ошибка загрузки маркета'), 1500); return; }
    const marketList = document.getElementById('marketItemsList');
    if (!marketList) return;
    marketList.innerHTML = '';
    if (!Array.isArray(items)) { marketList.innerHTML = `<p style="color:#aaa; text-align:center;">${window.$t('market:Ошибка загрузки маркета')}</p>`; return; }
    const classFolderMap = { warrior: 'tank', assassin: 'assassin', mage: 'mage' };
    const typeFileMap = { armor: 'armor', boots: 'boots', helmet: 'helmet', weapon: 'weapon', accessory: 'ring', gloves: 'bracer' };
    function getItemIconPath(item) { if (!item) return ''; const folder = classFolderMap[item.owner_class]; const fileType = typeFileMap[item.type]; if (!folder || !fileType) return ''; return `/assets/equip/${folder}/${folder}-${fileType}-001.png`; }
    for (const item of items) {
        const stats = [];
        if (item.atk_bonus) stats.push(window.$t('common:АТК') + `+${item.atk_bonus}`);
        if (item.def_bonus) stats.push(window.$t('common:ЗАЩ') + `+${item.def_bonus}`);
        if (item.hp_bonus) stats.push(window.$t('common:ЗДОР') + `+${item.hp_bonus}`);
        if (item.spd_bonus) stats.push(window.$t('common:СКОР') + `+${item.spd_bonus}`);
        if (item.crit_bonus) stats.push(window.$t('common:КРИТ') + `+${item.crit_bonus}%`);
        if (item.crit_dmg_bonus) stats.push(window.$t('common:КР.УРОН') + `+${item.crit_dmg_bonus}%`);
        if (item.agi_bonus) stats.push(window.$t('common:ЛОВ') + `+${item.agi_bonus}%`);
        if (item.int_bonus) stats.push(window.$t('common:ИНТ') + `+${item.int_bonus}%`);
        if (item.vamp_bonus) stats.push(window.$t('common:ВАМП') + `+${item.vamp_bonus}%`);
        if (item.reflect_bonus) stats.push(window.$t('common:ОТР') + `+${item.reflect_bonus}%`);
        const rarityClass = `rarity-${item.rarity}`;
        const iconPath = getItemIconPath(item);
        const isOwn = item.seller_id === userData.id;
        const row = document.createElement('div');
        row.className = `market-item-row ${rarityClass}`;
        row.dataset.itemId = item.id;
        const iconDiv = document.createElement('div'); iconDiv.className = 'market-item-icon'; const iconImg = document.createElement('div'); iconImg.className = 'item-icon-img'; iconImg.style.backgroundImage = `url('${iconPath}')`; iconDiv.appendChild(iconImg);
        const infoDiv = document.createElement('div'); infoDiv.className = 'market-item-info';
        const nameSpan = document.createElement('div'); nameSpan.className = 'market-item-name';
        const classNameRu = item.owner_class === 'warrior' ? window.$t('common:Воин') : (item.owner_class === 'assassin' ? window.$t('common:Ассасин') : window.$t('common:Маг'));
        nameSpan.innerHTML = `${escapeHtml(itemNameTranslations[item.name] || item.name)} <span class="item-class">(${escapeHtml(classNameRu)})</span>`;
        const statsDiv = document.createElement('div'); statsDiv.className = 'market-item-stats'; statsDiv.innerText = stats.join(' • ');
        infoDiv.appendChild(nameSpan); infoDiv.appendChild(statsDiv);
        const priceDiv = document.createElement('div'); priceDiv.className = 'market-item-price'; priceDiv.innerHTML = `${item.price} <i class="fas fa-coins"></i>`;
        const actionsDiv = document.createElement('div'); actionsDiv.className = 'market-item-actions';
        if (isOwn) {
            const editBtn = document.createElement('button'); editBtn.className = 'market-action-btn edit-price-btn'; editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>'; editBtn.title = window.$t('market:change_price'); editBtn.addEventListener('click', (e) => { e.stopPropagation(); showEditPriceModal(item); });
            const removeBtn = document.createElement('button'); removeBtn.className = 'market-action-btn remove-from-market-btn'; removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; removeBtn.title = window.$t('market:remove_from_sale'); removeBtn.addEventListener('click', async (e) => { e.stopPropagation(); showConfirmModal(window.$t('market:remove_confirm'), async () => { const res = await window.apiRequest('/market/remove', { method: 'POST', body: JSON.stringify({ item_id: item.id }) }); const data = await res.json(); if (data.success) { showToast(window.$t('market:Предмет снят с продажи'), 1500); await refreshData(); loadMarketItems(statFilter, classFilter, rarityFilter); } else { showToast(window.$t('market:Ошибка при снятии') + data.error, 1500); } }); });
            actionsDiv.appendChild(editBtn); actionsDiv.appendChild(removeBtn);
        } else {
            const viewBtn = document.createElement('button'); viewBtn.className = 'market-action-btn view-btn'; viewBtn.innerHTML = '<i class="fas fa-eye"></i>'; viewBtn.title = window.$t('market:view'); viewBtn.addEventListener('click', (e) => { e.stopPropagation(); showItemDetailsModal(item); });
            actionsDiv.appendChild(viewBtn);
        }
        row.appendChild(iconDiv); row.appendChild(infoDiv); row.appendChild(priceDiv); row.appendChild(actionsDiv);
        marketList.appendChild(row);
    }
}

// ==================== РЕЙТИНГ ====================

function renderRating() {
    if (!userData) {
        console.warn('renderRating: userData not ready, skipping');
        return;
    }
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = `
        <div class="rating-page">
            <div class="rating-tabs-container">
                <button class="rating-tab ${ratingTab === 'rating' ? 'active' : ''}" id="ratingTabBtn">${window.$t('rating:РЕЙТИНГ')}</button>
                <button class="rating-tab ${ratingTab === 'power' ? 'active' : ''}" id="powerTabBtn">${window.$t('rating:СИЛА')}</button>
                <button class="rating-tab ${ratingTab === 'tower' ? 'active' : ''}" id="towerTabBtn">${window.$t('rating:БАШНЯ')}</button>
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
    container.innerHTML = `<p style="text-align:center;">${window.$t('common:Загрузка')}</p>`;
    try {
        const res = await window.apiRequest(`/rank/${type}`, { method: 'GET' });
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid data');
        let html = `<table class="stats-table"><thead><tr><th>${window.$t('rating:Место')}</th><th>${window.$t('rating:Имя')}</th>`;
        if (type === 'rating' || type === 'power') html += `<th>${window.$t('rating:class')}</th><th>${window.$t('rating:Очки')}</th>`;
        else if (type === 'tower') html += `<th>${window.$t('rating:class')}</th><th>${window.$t('rating:role')}</th><th>${window.$t('rating:Этаж')}</th>`;
        html += '</tr></thead><tbody>';
        data.forEach((item, index) => {
            html += `<tr><td style="text-align:center;">${index + 1} </td><td>${escapeHtml(item.username)}</td>`;
            if (type === 'rating') {
                const className = item.class === 'warrior' ? window.$t('common:Воин') : (item.class === 'assassin' ? window.$t('common:Ассасин') : window.$t('common:Маг'));
                html += `<td>${className}</td><td style="text-align:center;">${item.rating}</td>`;
            } else if (type === 'power') {
                const className = item.class === 'warrior' ? window.$t('common:Воин') : (item.class === 'assassin' ? window.$t('common:Ассасин') : window.$t('common:Маг'));
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
    } catch (e) { console.error('Error loading rating:', e); container.innerHTML = `<p style="color:#aaa; text-align:center;">${window.$t('rating:load_error')}</p>`; }
}

// ==================== ПРОФИЛЬ ====================

function renderProfile() {
    if (!userData) {
        console.warn('renderProfile: userData not ready, skipping');
        return;
    }
    const content = document.getElementById('content');
    if (!content) return;
    window.apiRequest('/tasks/daily/update/profile', { method: 'POST' }).then(() => { if (window.refreshTasksData) window.refreshTasksData(); if (window.updateMainMenuNewIcons) window.updateMainMenuNewIcons(); }).catch(err => console.error('Failed to update profile task', err));
    const hasSkillPoints = hasAnyUnspentSkillPoints();
    content.innerHTML = `
        <div class="profile-tabs-container">
            <button class="btn profile-tab ${profileTab === 'skins' ? 'active' : ''}" data-tab="skins">${window.$t('profile:Скины')}</button>
            <button class="btn profile-tab ${profileTab === 'bonuses' ? 'active' : ''}" data-tab="bonuses">${window.$t('profile:Бонусы')}</button>
            <button class="btn profile-tab ${profileTab === 'upgrade' ? 'active' : ''}" data-tab="upgrade" style="position: relative;">${window.$t('profile:Улучшить')}${hasSkillPoints ? '<img src="/assets/icons/icon-new.png" class="upgrade-tab-icon" alt="">' : ''}</button>
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
    if (!userData) {
        console.warn('renderProfileBonuses: userData not ready, skipping');
        return;
    }
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
                ${window.$t('common:Воин')}
                ${hasPointsForClass('warrior') ? '<img src="/assets/icons/icon-new.png" class="class-icon" alt="">' : ''}
            </button>
            <button class="class-btn ${currentClass === 'assassin' ? 'active' : ''}" data-class="assassin" style="position: relative;">
                ${window.$t('common:Ассасин')}
                ${hasPointsForClass('assassin') ? '<img src="/assets/icons/icon-new.png" class="class-icon" alt="">' : ''}
            </button>
            <button class="class-btn ${currentClass === 'mage' ? 'active' : ''}" data-class="mage" style="position: relative;">
                ${window.$t('common:Маг')}
                ${hasPointsForClass('mage') ? '<img src="/assets/icons/icon-new.png" class="class-icon" alt="">' : ''}
            </button>
        </div>

        <div class="stats-block">
            <div class="stat-row">
                <span class="stat-label">${window.$t('profile:level')}</span>
                <div class="stat-bar-container">
                    <div class="stat-bar-fill" style="width: ${levelProgress}%;"></div>
                    <span class="stat-value">${classData.level}/${maxLevel}</span>
                </div>
            </div>
            <div class="stat-row">
                <span class="stat-label">${window.$t('profile:exp')}</span>
                <div class="stat-bar-container">
                    <div class="stat-bar-fill" style="width: ${expProgress}%;"></div>
                    <span class="stat-value">${classData.exp}/${expNeeded}</span>
                </div>
            </div>
            <div class="stat-row">
                <span class="stat-label">${window.$t('profile:Очки навыков')}</span>
                <div class="stat-bar-container">
                    <div class="stat-bar-fill" style="width: ${skillPointsProgress}%;"></div>
                    <span class="stat-value">${skillPoints}</span>
                </div>
            </div>
        </div>

        <table class="stats-table bonuses-table">
            <thead>
                <tr><th>${window.$t('profile:Параметр')}</th><th>${window.$t('profile:База')}</th><th>${window.$t('profile:+Инв.')}</th><th>${window.$t('profile:+Особ.')}</th><th>${window.$t('profile:Итого')}</th></tr>
            </thead>
            <tbody>
                ${renderStatRow(window.$t('profile:Здоровье (HP)'), stats.base.hp, stats.gear.hp, stats.classBonus?.hp || 0, stats.final.hp)}
                ${renderStatRow(window.$t('profile:Атака (ATK)'), stats.base.atk, stats.gear.atk, stats.classBonus?.atk || 0, stats.final.atk)}
                ${renderStatRow(window.$t('profile:Защита (DEF)'), stats.base.def + '%', stats.gear.def + '%', stats.classBonus?.def ? stats.classBonus.def + '%' : '', stats.final.def + '%')}
                ${renderStatRow(window.$t('profile:Ловкость (AGI)'), stats.base.agi + '%', stats.gear.agi + '%', stats.classBonus?.agi ? stats.classBonus.agi + '%' : '', stats.final.agi + '%')}
                ${renderStatRow(window.$t('profile:Интеллект (INT)'), stats.base.int + '%', stats.gear.int + '%', stats.classBonus?.int ? stats.classBonus.int + '%' : '', stats.final.int + '%')}
                ${renderStatRow(window.$t('profile:Скорость (SPD)'), stats.base.spd, stats.gear.spd, stats.classBonus?.spd || 0, stats.final.spd)}
                ${renderStatRow(window.$t('profile:Шанс крита (CRIT)'), stats.base.crit + '%', stats.gear.crit + '%', stats.classBonus?.crit ? stats.classBonus.crit + '%' : '', stats.final.crit + '%')}
                ${renderStatRow(window.$t('profile:Крит. урон (CRIT DMG)'), (stats.base.critDmg*100).toFixed(1) + '%', (stats.gear.critDmg*100).toFixed(1) + '%', stats.classBonus?.critDmg ? (stats.classBonus.critDmg*100).toFixed(1) + '%' : '', (stats.final.critDmg*100).toFixed(1) + '%')}
                ${renderStatRow(window.$t('profile:Вампиризм (VAMP)'), stats.base.vamp + '%', stats.gear.vamp + '%', stats.classBonus?.vamp ? stats.classBonus.vamp + '%' : '', stats.final.vamp + '%')}
                ${renderStatRow(window.$t('profile:Отражение (REFLECT)'), stats.base.reflect + '%', stats.gear.reflect + '%', stats.classBonus?.reflect ? stats.classBonus.reflect + '%' : '', stats.final.reflect + '%')}
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
    if (!userData) {
        console.warn('renderSkills: userData not ready, skipping');
        return;
    }
    const classData = getCurrentClassData();
    const skillPoints = classData.skill_points;
    const currentClass = userData.current_class;
    const base = baseStats[currentClass] || baseStats.warrior;

    const hasPointsForClass = (cls) => (userClasses.find(c => c.class === cls)?.skill_points || 0) > 0;

    container.innerHTML = `
        <div class="class-selector" style="margin-bottom: 15px;">
            <button class="class-btn ${currentClass === 'warrior' ? 'active' : ''}" data-class="warrior" style="position: relative;">
                ${window.$t('common:Воин')}
                ${hasPointsForClass('warrior') ? '<img src="/assets/icons/icon-new.png" class="class-icon" alt="">' : ''}
            </button>
            <button class="class-btn ${currentClass === 'assassin' ? 'active' : ''}" data-class="assassin" style="position: relative;">
                ${window.$t('common:Ассасин')}
                ${hasPointsForClass('assassin') ? '<img src="/assets/icons/icon-new.png" class="class-icon" alt="">' : ''}
            </button>
            <button class="class-btn ${currentClass === 'mage' ? 'active' : ''}" data-class="mage" style="position: relative;">
                ${window.$t('common:Маг')}
                ${hasPointsForClass('mage') ? '<img src="/assets/icons/icon-new.png" class="class-icon" alt="">' : ''}
            </button>
        </div>

        <div class="skills-header">
            ${window.$t('profile:Доступно очков навыков:')} <strong>${skillPoints}</strong>
        </div>

        <div class="skills-list">
            ${renderSkillItem('hp_points', window.$t('profile:Здоровье (HP)'), window.$t('profile:Здоровье +5 единиц'), base.hp + (classData.hp_points || 0) * 5, classData.hp_points || 0, skillPoints)}
            ${renderSkillItem('atk_points', window.$t('profile:Атака (ATK)'), window.$t('profile:Атака +1 единица'), base.atk + (classData.atk_points || 0), classData.atk_points || 0, skillPoints)}
            ${renderSkillItem('def_points', window.$t('profile:Защита (DEF)'), window.$t('profile:Входящий физ.урон -1% <br>(макс. 70%)'), base.def + (classData.def_points || 0), classData.def_points || 0, skillPoints)}
            ${renderSkillItem('dodge_points', window.$t('profile:Ловкость (AGI)'), window.$t('profile:Шанс уворота +1% <br> (макс. 70%)'), base.agi + (classData.dodge_points || 0), classData.dodge_points || 0, skillPoints)}
            ${renderSkillItem('int_points', window.$t('profile:Интеллект (INT)'), window.$t('profile:Сила магии +1%'), base.int + (classData.int_points || 0), classData.int_points || 0, skillPoints)}
            ${renderSkillItem('spd_points', window.$t('profile:Скорость (SPD)'), window.$t('profile:Влияет на очерёдность хода'), base.spd + (classData.spd_points || 0), classData.spd_points || 0, skillPoints)}
            ${renderSkillItem('crit_points', window.$t('profile:Шанс крита (CRIT)'), window.$t('profile:Шанс критического удара + 1% <br>(макс. 100%)'), base.crit + (classData.crit_points || 0), classData.crit_points || 0, skillPoints)}
            ${renderSkillItem('crit_dmg_points', window.$t('profile:Крит. урон (CRIT DMG)'), window.$t('profile:Критический урон +2% <br>(макс. 450%)'), ((classData.crit_dmg_points || 0)*2) + '%', classData.crit_dmg_points || 0, skillPoints)}
            ${renderSkillItem('vamp_points', window.$t('profile:Вампиризм (VAMP)'), window.$t('profile:Восстанавливает % <br>от нанесённого урона'), base.vamp + (classData.vamp_points || 0), classData.vamp_points || 0, skillPoints)}
            ${renderSkillItem('reflect_points', window.$t('profile:Отражение (REFLECT)'), window.$t('profile:Возвращает % <br>от полученного урона'), base.reflect + (classData.reflect_points || 0), classData.reflect_points || 0, skillPoints)}
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
                showToast(window.$t('profile:upgrade_error') + data.error, 1500);
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

async function renderSkins(container) {
    if (!container) return;
    if (!userData) {
        console.warn('renderSkins: userData not ready, skipping');
        return;
    }
    try {
        const [allAvatarsRes, ownedAvatarsRes] = await Promise.all([
            window.apiRequest('/avatars', { method: 'GET' }),
            window.apiRequest('/avatars/user', { method: 'GET' })
        ]);
        const allAvatars = allAvatarsRes.ok ? await allAvatarsRes.json() : [];
        const ownedIds = ownedAvatarsRes.ok ? await ownedAvatarsRes.json() : [];
        const ownedSet = new Set(ownedIds);
        ownedSet.add(1);
        const activeAvatarId = userData.avatar_id || 1;

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
            const avatarName = translateSkinName(avatar.name) || avatar.name || window.$t('avatar:avatar');

            let priceHtml = '';
            if (!isOwned) {
                let parts = [];
                if (priceGold > 0) parts.push(`${priceGold} <i class="fas fa-coins" style="color:white;"></i>`);
                if (priceDiamonds > 0) parts.push(`${priceDiamonds} <i class="fas fa-gem" style="color:white;"></i>`);
                if (parts.length > 0) {
                    priceHtml = `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; text-align: center; font-weight: bold; padding: 2px 0; font-size: 12px; pointer-events: none; z-index: 1;">${parts.join(' + ')}</div>`;
                } else {
                    priceHtml = `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; text-align: center; font-weight: bold; padding: 2px 0; font-size: 12px; pointer-events: none; z-index: 1;">${window.$t('common:Бесплатно')}</div>`;
                }
            }

            html += `
                <div style="position: relative; cursor: pointer;" 
                     data-avatar-id="${avatar.id}" 
                     data-avatar-filename="${avatar.filename}" 
                     data-owned="${isOwned}"
                     data-name="${escapeHtml(avatarName)}"
                     data-price-gold="${priceGold}"
                     data-price-diamonds="${priceDiamonds}">
                    ${isActive ? `<div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; text-align: center; font-weight: bold; z-index: 1; pointer-events: none;">${window.$t('avatar:active')}</div>` : ''}
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
                const avatarName = div.dataset.name;
                const priceGold = parseInt(div.dataset.priceGold);
                const priceDiamonds = parseInt(div.dataset.priceDiamonds);
                
                if (typeof window.showAvatarAnimationModal === 'function') {
                    window.showAvatarAnimationModal(avatarId, avatarFilename, owned, avatarName, priceGold, priceDiamonds);
                } else {
                    showSkinModal(avatarId, avatarFilename, owned);
                }
            });
        });
    } catch (err) {
        console.error('Error loading avatars:', err);
        container.innerHTML = `<p style="color:#aaa;">${window.$t('avatar:Ошибка загрузки аватаров')}</p>`;
    }
}


function showSkinModal(avatarId, avatarFilename, owned) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalTitle || !modalBody) return;

   window.apiRequest('/avatars', { method: 'GET' })
    .then(res => res.ok ? res.json() : [])
        .then(avatarsList => {
            const avatar = avatarsList.find(a => a.id === avatarId);
            if (!avatar) {
                showToast(window.$t('avatar:not_found'), 1500);
                return;
            }

            const isActive = avatarId === userData.avatar_id;
            modalTitle.innerText = isActive ? window.$t('avatar:current') : (owned ? window.$t('avatar:select') : window.$t('avatar:buy'));

            const priceGold = parseInt(avatar.price_gold, 10) || 0;
            const priceDiamonds = parseInt(avatar.price_diamonds, 10) || 0;

            let priceHtml = '';
            if (!owned && !isActive) {
                let parts = [];
                if (priceGold > 0) parts.push(`${priceGold} <i class="fas fa-coins" style="color:white;"></i>`);
                if (priceDiamonds > 0) parts.push(`${priceDiamonds} <i class="fas fa-gem" style="color:white;"></i>`);
                if (parts.length > 0) {
                    priceHtml = `<p style="color:white;">${window.$t('avatar:Цена: ')} ${parts.join(' + ')}</p>`;
                } else {
                    priceHtml = `<p style="color:white;">${window.$t('common:Бесплатно')}</p>`;
                }
            }

            modalBody.innerHTML = `
                <div style="text-align: center;">
                    <img src="/assets/${escapeHtml(avatarFilename)}" style="max-width: 100%; max-height: 300px; border-radius: 10px;">
                    <div style="font-size: 24px; font-weight: bold; color: white; margin: 15px 0 5px;">${escapeHtml(translateSkinName(avatar.name))}</div>
                    ${priceHtml}
                    <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                        ${!owned && !isActive ? `<button class="btn" id="buySkin">${window.$t('common:Купить')}</button>` : ''}
                        ${owned && !isActive ? `<button class="btn" id="activateSkin">${window.$t('avatar:Активировать')}</button>` : ''}
                        <button class="btn" id="closeSkinModal">${window.$t('common:Назад')}</button>
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
                        showToast(window.$t('common:Ошибка: ') + data.error, 1500);
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
                        showToast(window.$t('avatar:Ошибка при смене аватара'), 1500);
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
            showToast(window.$t('avatar:Ошибка загрузки аватаров'), 1500);
        });
}


// ==================== АЛХИМИЯ (заглушка) ====================
function renderAlchemy() {
    if (!userData) {
        console.warn('renderAlchemy: userData not ready, skipping');
        return;
    }
    const content = document.getElementById('content');
    content.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <i class="fas fa-flask" style="font-size:48px; color:#00aaff;"></i>
            <h2 style="color:white;">${window.$t('alchemy:title')}</h2>
            <p style="color:#aaa;">${window.$t('alchemy:subtitle')}</p>
        </div>
    `;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ МОДАЛЬНЫЕ ФУНКЦИИ ====================

async function showItemDetailsModal(item) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.innerText = window.$t('modals:Осмотр снаряжения');

    const stats = [];
    if (item.atk_bonus) stats.push(window.$t('common:АТК') + `+${item.atk_bonus}`);
    if (item.def_bonus) stats.push(window.$t('common:ЗАЩ') + `+${item.def_bonus}`);
    if (item.hp_bonus) stats.push(window.$t('common:ЗДОР') + `+${item.hp_bonus}`);
    if (item.spd_bonus) stats.push(window.$t('common:СКОР') + `+${item.spd_bonus}`);
    if (item.crit_bonus) stats.push(window.$t('common:КРИТ') + `+${item.crit_bonus}%`);
    if (item.crit_dmg_bonus) stats.push(window.$t('common:КР.УРОН') + `+${item.crit_dmg_bonus}%`);
    if (item.agi_bonus) stats.push(window.$t('common:ЛОВ') + `+${item.agi_bonus}%`);
    if (item.int_bonus) stats.push(window.$t('common:ИНТ') + `+${item.int_bonus}%`);
    if (item.vamp_bonus) stats.push(window.$t('common:ВАМП') + `+${item.vamp_bonus}%`);
    if (item.reflect_bonus) stats.push(window.$t('common:ОТР') + `+${item.reflect_bonus}%`);

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
            <div class="item-modal-class">${item.owner_class === 'warrior' ? window.$t('common:Воин') : (item.owner_class === 'assassin' ? window.$t('common:Ассасин') : window.$t('common:Маг'))}</div>
            <div class="item-modal-stats">${stats.map(s => escapeHtml(s)).join(' • ')}</div>
            <div class="item-modal-price">${item.price} <i class="fas fa-coins"></i></div>
            <div class="item-modal-buttons">
                <button class="item-modal-btn buy-item-btn">${window.$t('common:Купить')}</button>
                <button class="item-modal-btn close-modal-btn">${window.$t('common:Отмена')}</button>
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
        try { data = await res.json(); } catch { showToast(window.$t('common:Ошибка ответа сервера'), 1500); return; }
        if (data.success) {
            modal.style.display = 'none';
            showToast(window.$t('modals:bought_item', { name: itemNameTranslations[item.name] || item.name, price: item.price }), 1500);
            await refreshData();
            const classFilter = document.getElementById('classFilterText')?.innerText === window.$t('market:class') ? 'any' : 
                (document.getElementById('classFilterText')?.innerText === window.$t('common:Воин') ? 'warrior' : 
                (document.getElementById('classFilterText')?.innerText === window.$t('common:Ассасин') ? 'assassin' : 
                (document.getElementById('classFilterText')?.innerText === window.$t('common:Маг') ? 'mage' : 'any')));
            const rarityFilter = document.getElementById('rarityFilterText')?.innerText === window.$t('market:Редкость') ? 'any' : 
                (document.getElementById('rarityFilterText')?.innerText === window.$t('common:Обычное') ? 'common' : 
                (document.getElementById('rarityFilterText')?.innerText === window.$t('common:Необычное') ? 'uncommon' : 
                (document.getElementById('rarityFilterText')?.innerText === window.$t('common:Редкое') ? 'rare' : 
                (document.getElementById('rarityFilterText')?.innerText === window.$t('common:Эпическое') ? 'epic' : 
                (document.getElementById('rarityFilterText')?.innerText === window.$t('common:Легендарное') ? 'legendary' : 'any')))));
            const statFilter = document.getElementById('statFilterText')?.innerText === window.$t('market:Характеристика') ? 'any' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:АТК') ? 'atk_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:ЗАЩ') ? 'def_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:ЗДОР') ? 'hp_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:СКОР') ? 'spd_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:КРИТ') ? 'crit_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:КР.УРОН') ? 'crit_dmg_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:ЛОВ') ? 'agi_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:ИНТ') ? 'int_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:ВАМП') ? 'vamp_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:ОТР') ? 'reflect_bonus' : 'any'))))))))));
            loadMarketItems(statFilter, classFilter, rarityFilter);
        } else {
            modal.style.display = 'none';
            if (data.error === 'Not enough coins') showToast(window.$t('common:Недостаточно средств!'), 1500);
            else showToast(window.$t('common:Ошибка: ') + data.error, 1500);
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

    modalTitle.innerText = window.$t('modals:Введите цену');

    modalBody.innerHTML = `
        <div class="edit-price-modal">
            <div class="item-name">${window.$t('modals:Цена продажи')}</div>
            <input type="number" id="priceInput" class="price-input" placeholder="${window.$t('modals:Цена в монетах')}" value="${currentPrice || ''}">
            <div class="modal-buttons">
                <button class="modal-btn save-price-btn">${window.$t('modals:Продать')}</button>
                <button class="modal-btn cancel-price-btn">${window.$t('common:Отмена')}</button>
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
            showToast(window.$t('modals:enter_valid_price'), 1500);
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

    modalTitle.innerText = window.$t('common:confirmation');

    modalBody.innerHTML = `
        <div style="text-align: center; padding: 10px;">
            <div style="margin-bottom: 20px; font-size: 16px;">${escapeHtml(message)}</div>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="modal-btn confirm-yes" style="background-color: #00aaff; color: white;">${window.$t('common:yes')}</button>
                <button class="modal-btn confirm-no" style="background-color: #2f3542;">${window.$t('common:no')}</button>
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

    modalTitle.innerText = window.$t('equip:unequip_confirm_title');

    const stats = [];
    if (item.atk_bonus) stats.push(window.$t('common:АТК') + `+${item.atk_bonus}`);
    if (item.def_bonus) stats.push(window.$t('common:ЗАЩ') + `+${item.def_bonus}`);
    if (item.hp_bonus) stats.push(window.$t('common:ЗДОР') + `+${item.hp_bonus}`);
    if (item.spd_bonus) stats.push(window.$t('common:СКОР') + `+${item.spd_bonus}`);
    if (item.crit_bonus) stats.push(window.$t('common:КРИТ') + `+${item.crit_bonus}%`);
    if (item.crit_dmg_bonus) stats.push(window.$t('common:КР.УРОН') + `+${item.crit_dmg_bonus}%`);
    if (item.agi_bonus) stats.push(window.$t('common:ЛОВ') + `+${item.agi_bonus}%`);
    if (item.int_bonus) stats.push(window.$t('common:ИНТ') + `+${item.int_bonus}%`);
    if (item.vamp_bonus) stats.push(window.$t('common:ВАМП') + `+${item.vamp_bonus}%`);
    if (item.reflect_bonus) stats.push(window.$t('common:ОТР') + `+${item.reflect_bonus}%`);

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
            <div style="color: white; font-size: 14px; margin-bottom: 5px;">${window.$t('equip:class')} ${item.owner_class === 'warrior' ? window.$t('common:Воин') : (item.owner_class === 'assassin' ? window.$t('common:Ассасин') : window.$t('common:Маг'))}</div>
            <div style="color: white; font-size: 14px; margin-bottom: 15px;">${stats.map(s => escapeHtml(s)).join(' • ')}</div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="modal-btn confirm-yes" style="background-color: #2f3542; border: 2px solid #aaa; color: #aaa; border-radius: 30px; padding: 8px 24px;">${window.$t('equip:Снять')}</button>
                <button class="modal-btn confirm-no" style="background-color: #2f3542; border: 2px solid #aaa; color: #aaa; border-radius: 30px; padding: 8px 24px;">${window.$t('common:Отмена')}</button>
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

    modalTitle.innerText = window.$t('market:change_price');

    modalBody.innerHTML = `
        <div class="edit-price-modal">
            <div class="item-name">${escapeHtml(itemNameTranslations[item.name] || item.name)}</div>
            <div class="current-price">${window.$t('market:current_price')} ${item.price} <i class="fas fa-coins"></i></div>
            <input type="number" id="newPriceInput" class="price-input" placeholder="${window.$t('market:new_price')}" value="${item.price}">
            <div class="modal-buttons">
                <button class="modal-btn save-price-btn">${window.$t('common:Сохранить')}</button>
                <button class="modal-btn cancel-price-btn">${window.$t('common:Отмена')}</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    const saveBtn = modalBody.querySelector('.save-price-btn');
    const cancelBtn = modalBody.querySelector('.cancel-price-btn');
    const closeX = modal.querySelector('.close');

    saveBtn.addEventListener('click', async () => {
        const newPrice = parseInt(document.getElementById('newPriceInput').value);
        if (isNaN(newPrice) || newPrice <= 0) { showToast(window.$t('modals:enter_valid_price'), 1500); return; }
        const res = await window.apiRequest('/market/update-price', { method: 'POST', body: JSON.stringify({ item_id: item.id, new_price: newPrice }) });
        let data;
        try { data = await res.json(); } catch { showToast(window.$t('common:Ошибка ответа сервера'), 1500); return; }
        if (data.success) {
            modal.style.display = 'none';
            showToast(window.$t('market:Цена изменена'), 1000);
            await refreshData();
            const classFilter = document.getElementById('classFilterText')?.innerText === window.$t('market:class') ? 'any' : 
                (document.getElementById('classFilterText')?.innerText === window.$t('common:Воин') ? 'warrior' : 
                (document.getElementById('classFilterText')?.innerText === window.$t('common:Ассасин') ? 'assassin' : 
                (document.getElementById('classFilterText')?.innerText === window.$t('common:Маг') ? 'mage' : 'any')));
            const rarityFilter = document.getElementById('rarityFilterText')?.innerText === window.$t('market:Редкость') ? 'any' : 
                (document.getElementById('rarityFilterText')?.innerText === window.$t('common:Обычное') ? 'common' : 
                (document.getElementById('rarityFilterText')?.innerText === window.$t('common:Необычное') ? 'uncommon' : 
                (document.getElementById('rarityFilterText')?.innerText === window.$t('common:Редкое') ? 'rare' : 
                (document.getElementById('rarityFilterText')?.innerText === window.$t('common:Эпическое') ? 'epic' : 
                (document.getElementById('rarityFilterText')?.innerText === window.$t('common:Легендарное') ? 'legendary' : 'any')))));
            const statFilter = document.getElementById('statFilterText')?.innerText === window.$t('market:Характеристика') ? 'any' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:АТК') ? 'atk_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:ЗАЩ') ? 'def_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:ЗДОР') ? 'hp_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:СКОР') ? 'spd_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:КРИТ') ? 'crit_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:КР.УРОН') ? 'crit_dmg_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:ЛОВ') ? 'agi_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:ИНТ') ? 'int_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:ВАМП') ? 'vamp_bonus' : 
                (document.getElementById('statFilterText')?.innerText === window.$t('common:ОТР') ? 'reflect_bonus' : 'any'))))))))));
            loadMarketItems(statFilter, classFilter, rarityFilter);
        } else {
            showToast(window.$t('market:update_price_error') + data.error, 1500);
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


// ==================== УНИВЕРСАЛЬНОЕ ОБНОВЛЕНИЕ БЕЙДЖЕЙ ТОРГОВЛИ ====================
async function updateTradeBadges() {
    if (!userData || !userData.id) {
        console.log('updateTradeBadges: userData not ready, skipping');
        return;
    }
    try {
        const [freeChestRes, freeCoalRes, freeCoinRes] = await Promise.all([
            window.apiRequest('/player/freechest', { method: 'GET' }),
            window.apiRequest('/player/freecoal', { method: 'GET' }),
            window.apiRequest('/subscription/status', { method: 'GET' }).catch(() => ({ ok: false }))
        ]);
        
        const freeChest = freeChestRes.ok ? (await freeChestRes.json()).freeAvailable : false;
        const freeCoal = freeCoalRes.ok ? (await freeCoalRes.json()).freeAvailable : false;
        const freeCoin20 = freeCoinRes.ok ? (await freeCoinRes.json()).freeCoinAvailable : false;
        
        const hasAnyFree = freeChest || freeCoal || freeCoin20;
        
        const tradeBtn = document.querySelector('.main-icon-btn[data-screen="trade"]');
        if (tradeBtn) {
            let badge = tradeBtn.querySelector('.trade-badge');
            if (hasAnyFree && !badge) {
                badge = document.createElement('img');
                badge.src = '/assets/icons/icon-new.png';
                badge.className = 'trade-badge';
                badge.style.cssText = 'position: absolute; top: 3px; right: 3px; width: 16px; height: 16px; pointer-events: none;';
                tradeBtn.style.position = 'relative';
                tradeBtn.appendChild(badge);
            } else if (!hasAnyFree && badge) {
                badge.remove();
            }
        }
        
        const chestsTab = document.querySelector('.trade-tab[data-subtab="chests"]');
        const coinsTab = document.querySelector('.trade-tab[data-subtab="coins"]');
        const gemsTab = document.querySelector('.trade-tab[data-subtab="gems"]');
        
        updateTabBadge(chestsTab, freeChest);
        updateTabBadge(coinsTab, freeCoal);
        updateTabBadge(gemsTab, freeCoin20);
        
        window.freeChestAvailable = freeChest;
        window.freeCoalAvailable = freeCoal;
        window.freeCoin20Available = freeCoin20;
        
    } catch (e) {
        console.error('Error updating trade badges:', e);
    }
}

function updateTabBadge(tab, hasFree) {
    if (!tab) return;
    let badge = tab.querySelector('.tab-badge');
    if (hasFree && !badge) {
        badge = document.createElement('img');
        badge.src = '/assets/icons/icon-new.png';
        badge.className = 'tab-badge';
        badge.style.cssText = 'position: absolute; top: -4px; right: -4px; width: 14px; height: 14px; pointer-events: none;';
        tab.style.position = 'relative';
        tab.appendChild(badge);
    } else if (!hasFree && badge) {
        badge.remove();
    }
}

window.updateTradeBadges = updateTradeBadges;
