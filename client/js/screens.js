// screens.js – все функции рендеринга экранов

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ РЕНДЕРОВ ====================

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
    const classData = getCurrentClassData();
    const currentClass = userData.current_class;
    const level = classData.level;
    const exp = classData.exp;
    const nextExp = Math.floor(80 * Math.pow(level, 1.5));
    const expPercent = nextExp > 0 ? (exp / nextExp) * 100 : 0;

    const stats = calculateClassStats(currentClass, classData, inventory, userData.subclass);
    currentPower = calculatePower(currentClass, stats.final, classData.level);
    updateTopBar();

    const content = document.getElementById('content');
    content.innerHTML = `
        <!-- Верхний блок с аватаром и кнопками -->
        <div class="main-top-container">
            <div class="main-top-inner">
                <!-- Левая колонка (2×3) -->
                <div class="main-buttons-col left">
                    <div class="btn-grid">
                        <button class="main-icon-btn" id="mailBtn"><i class="fas fa-envelope"></i><span>Письмо</span></button>
                        <button class="main-icon-btn empty-btn"></button>
                        <button class="main-icon-btn empty-btn"></button>
                        <button class="main-icon-btn empty-btn"></button>
                        <button class="main-icon-btn empty-btn"></button>
                        <button class="main-icon-btn empty-btn"></button>
                    </div>
                </div>
                <!-- Центр: аватар -->
                <div class="main-avatar-col">
                    <div class="hero-avatar" id="avatarClick" style="position: relative; width: 100%; height: 100%; cursor: pointer;">
                        <img src="/assets/${userData.avatar || 'cat_heroweb.png'}" alt="hero" style="width:100%; height:100%; object-fit: cover;">
                        <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; text-align: center; font-weight: bold; padding: 4px 0; font-size: 14px; pointer-events: none;">ПРОФИЛЬ</div>
                    </div>
                </div>
              <!-- Правая колонка (2×3) -->
<div class="main-buttons-col right">
    <div class="btn-grid">
        <button class="main-icon-btn" data-screen="trade"><i class="fas fa-store"></i><span>Торговля</span></button>
        <button class="main-icon-btn empty-btn"></button>
        <button class="main-icon-btn" data-screen="equip"><i class="fas fa-tshirt"></i><span>Рюкзак</span></button>
        <button class="main-icon-btn empty-btn"></button>
        <button class="main-icon-btn" data-screen="forge"><i class="fas fa-hammer"></i><span>Кузница</span></button>
        <button class="main-icon-btn empty-btn"></button>
    </div>
</div>
            </div>
        </div>

        <!-- Блок с именем пользователя (заголовок) -->
        <div class="main-username-header">
            ${userData.username || 'Игрок'}
        </div>

        <!-- Основной контент (опыт, класс, роль, кнопка боя) -->
        <div class="main-content-container">
            <div style="margin: 20px 20px 0 20px;">
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span>Уровень <span class="level-display">${level}</span></span>
                    <span class="exp-display">${exp}/${nextExp} опыта</span>
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

    // Обработчики для классов и ролей (без изменений)
    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const newClass = e.target.dataset.class;
            if (newClass === userData.current_class) return;

            const res = await fetch('https://fight-club-api-4och.onrender.com/player/class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, class: newClass })
            });
            if (!res.ok) return;

            const firstSubclass = {
                warrior: 'guardian',
                assassin: 'assassin',
                mage: 'pyromancer'
            }[newClass];
            await fetch('https://fight-club-api-4och.onrender.com/player/subclass', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, subclass: firstSubclass })
            });

            userData.current_class = newClass;
            userData.subclass = firstSubclass;

            updateMainScreen();
        });
    });

    document.getElementById('subclassSelect').addEventListener('change', async (e) => {
        const newSubclass = e.target.value;
        const res = await fetch('https://fight-club-api-4och.onrender.com/player/subclass', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id, subclass: newSubclass })
        });
        if (res.ok) {
            userData.subclass = newSubclass;
            await refreshData();
        }
    });

    document.getElementById('fightBtn').addEventListener('click', () => startBattle());
    document.getElementById('roleInfoBtn').addEventListener('click', () => showRoleInfoModal(userData.current_class));
    document.getElementById('avatarClick').addEventListener('click', () => showScreen('profile'));

    // Обработчики для рабочих кнопок
    document.querySelectorAll('.main-icon-btn[data-screen]').forEach(btn => {
        btn.addEventListener('click', () => {
            const screen = btn.dataset.screen;
            if (screen) showScreen(screen);
        });
    });

    // Кнопка "Письмо" (пока заглушка)
    const mailBtn = document.getElementById('mailBtn');
    if (mailBtn) {
        mailBtn.addEventListener('click', () => {
            console.log('Письмо: функционал в разработке');
        });
    }

    updateTradeButtonIcon();
    updateProfileAvatarIcon();
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
    const expPercent = nextExp > 0 ? (exp / nextExp) * 100 : 0;

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
        const displayName = roleDescriptions[sc]?.name || sc;
        return `<option value="${sc}" ${selected}>${displayName}</option>`;
    }).join('');
}

// ==================== ЭКИПИРОВКА ====================
function renderEquip() {
    let selectedClass = localStorage.getItem('equipSelectedClass');
    if (!selectedClass || !['warrior', 'assassin', 'mage'].includes(selectedClass)) {
        selectedClass = userData.current_class;
    }

    // Карта папок для иконок
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

    // Рендеринг фиксированной верхней части (слоты и аватар)
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
        html += `</div><div class="hero-center"><img src="/assets/${userData.avatar || 'cat_heroweb.png'}" alt="hero"></div><div class="equip-column">`;
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

    // Рендеринг списка предметов (рюкзак)
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

            // Определяем, на продаже ли предмет
            const isForSale = item.for_sale === true;

            // Создаём кнопки в зависимости от состояния
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

            // Иконка с затемнением и текстом, если на продаже
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
                            <span class="inv-name-text" style="color: ${getRarityColor(item.rarity)};">${itemNameTranslations[item.name] || item.name}</span>
                            <span class="inv-class">(${classNameRu})</span>
                        </div>
                        <div class="inv-stats">${stats.join(' • ')}</div>
                    </div>
                    <div class="inv-actions">
                        ${actionButtonsHtml}
                    </div>
                </div>
            `;
        });

        // Добавляем пустые строки, чтобы всего было 4 строки
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

    // Вспомогательная функция для цвета редкости
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

    // Отрисовка всего экрана
    const content = document.getElementById('content');
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
            const newClass = e.target.dataset.class;
            localStorage.setItem('equipSelectedClass', newClass);
            renderEquip();
        });
    });

    document.querySelectorAll('.equip-slot').forEach(slot => {
        slot.addEventListener('click', async (e) => {
            const itemId = slot.dataset.itemId;
            if (!itemId) return;
            if (confirm('Снять этот предмет?')) {
                try {
                    const res = await fetch('https://fight-club-api-4och.onrender.com/inventory/unequip', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId })
                    });
                    if (res.ok) {
                        await refreshData();
                        renderEquip();
                    } else {
                        alert('Ошибка при снятии');
                    }
                } catch (e) {
                    alert('Сеть недоступна');
                }
            }
        });
    });

    document.querySelectorAll('.inv-action-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemId = btn.dataset.itemId;
            const action = btn.dataset.action;
            if (action === 'equip') {
                const currentClass = document.querySelector('.class-btn.active').dataset.class;
                const item = inventory.find(i => i.id == itemId);
                if (!item) return;
                const equippedInSlot = inventory.find(i => i.equipped && i.type === item.type && i.owner_class === currentClass);
                if (equippedInSlot) {
                    showEquipCompareModal(equippedInSlot, item);
                } else {
                    const res = await fetch('https://fight-club-api-4och.onrender.com/inventory/equip', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            tg_id: userData.tg_id, 
                            item_id: itemId,
                            target_class: currentClass
                        })
                    });
                    if (res.ok) {
                        await refreshData();
                        renderEquip();
                    } else {
                        const err = await res.json();
                        alert('Ошибка: ' + err.error);
                    }
                }
            } else if (action === 'sell') {
                const currentClass = document.querySelector('.class-btn.active').dataset.class;
                const item = inventory.find(i => i.id == itemId);
                if (!item) return;
                if (item.owner_class !== currentClass) {
                    alert('Этот предмет не принадлежит текущему классу!');
                    return;
                }
                const price = prompt('Введите цену продажи в монетах:');
                if (price && !isNaN(price) && parseInt(price) > 0) {
                    const res = await fetch('https://fight-club-api-4och.onrender.com/inventory/sell', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            tg_id: userData.tg_id, 
                            item_id: itemId, 
                            price: parseInt(price) 
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('Предмет выставлен на маркет');
                        await refreshData();
                        renderEquip();
                    } else {
                        alert('Ошибка: ' + data.error);
                    }
                }
            } else if (action === 'unsell') {
                const res = await fetch('https://fight-club-api-4och.onrender.com/inventory/unsell', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId })
                });
                if (res.ok) {
                    await refreshData();
                    renderEquip();
                } else {
                    alert('Ошибка при снятии с продажи');
                }
            } else if (action === 'editPrice') {
                const item = inventory.find(i => i.id == itemId);
                if (!item) return;
                const newPrice = prompt('Введите новую цену в монетах:', item.price);
                if (newPrice && !isNaN(newPrice) && parseInt(newPrice) > 0) {
                    const res = await fetch('https://fight-club-api-4och.onrender.com/market/update-price', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId, new_price: parseInt(newPrice) })
                    });
                    if (res.ok) {
                        await refreshData();
                        renderEquip();
                    } else {
                        alert('Ошибка изменения цены');
                    }
                }
            }
        });
    });
}
// ==================== ТОРГОВЛЯ ====================
function renderTrade() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div style="margin-top: 10px;"></div>
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button class="btn ${tradeTab === 'shop' ? 'active' : ''}" id="tradeShopBtn" style="flex:1;">МАГАЗИН</button>
            <button class="btn ${tradeTab === 'market' ? 'active' : ''}" id="tradeMarketBtn" style="flex:1;">МАРКЕТ</button>
        </div>
        <div id="tradeContent"></div>
    `;

    const tradeContent = document.getElementById('tradeContent');

    document.getElementById('tradeShopBtn').addEventListener('click', () => {
        tradeTab = 'shop';
        renderTrade();
    });

    document.getElementById('tradeMarketBtn').addEventListener('click', () => {
        tradeTab = 'market';
        renderTrade();
    });

    if (tradeTab === 'shop') {
        renderShop(tradeContent);
    } else {
        renderMarket(tradeContent);
    }
}

function renderShop(target = null) {
    const container = target || document.getElementById('tradeContent');
    container.innerHTML = `
        <div class="chest-table">
            <div class="chest-row" data-chest="common">
                <div class="chest-icon-col">
                    <img src="/assets/common-chess.png" alt="Обычный сундук">
                </div>
                <div class="chest-info-col">
                    <div class="chest-name">Обычный сундук</div>
                    <div class="chest-desc">
                        <div>Обычное 85%</div>
                        <div>Необычное 15%</div>
                    </div>
                </div>
                <div class="chest-price-col">
                    <button class="chest-buy-btn" data-chest="common">
                        <span class="chest-price" id="commonChestPrice">?</span>
                        <i class="fas fa-coins"></i>
                    </button>
                </div>
            </div>
            <div class="chest-row" data-chest="uncommon">
                <div class="chest-icon-col">
                    <img src="/assets/uncommon-chess.png" alt="Необычный сундук">
                </div>
                <div class="chest-info-col">
                    <div class="chest-name">Необычный сундук</div>
                    <div class="chest-desc">
                        <div>Обычное 25%</div>
                        <div>Необычное 65%</div>
                        <div>Редкое 10%</div>
                    </div>
                </div>
                <div class="chest-price-col">
                    <button class="chest-buy-btn" data-chest="uncommon">
                        <span class="chest-price">250</span>
                        <i class="fas fa-coins"></i>
                    </button>
                </div>
            </div>
            <div class="chest-row" data-chest="rare">
                <div class="chest-icon-col">
                    <img src="/assets/rare-chess.png" alt="Редкий сундук">
                </div>
                <div class="chest-info-col">
                    <div class="chest-name">Редкий сундук</div>
                    <div class="chest-desc">
                        <div>Редкое 65%</div>
                        <div>Необычное 25%</div>
                        <div>Эпическое 10%</div>
                    </div>
                </div>
                <div class="chest-price-col">
                    <button class="chest-buy-btn" data-chest="rare">
                        <span class="chest-price">800</span>
                        <i class="fas fa-coins"></i>
                    </button>
                </div>
            </div>
            <div class="chest-row" data-chest="epic">
                <div class="chest-icon-col">
                    <img src="/assets/epic-chess.png" alt="Эпический сундук">
                </div>
                <div class="chest-info-col">
                    <div class="chest-name">Эпический сундук</div>
                    <div class="chest-desc">
                        <div>Эпическое 65%</div>
                        <div>Редкое 25%</div>
                        <div>Легендарное 10%</div>
                    </div>
                </div>
                <div class="chest-price-col">
                    <button class="chest-buy-btn" data-chest="epic">
                        <span class="chest-price">1800</span>
                        <i class="fas fa-coins"></i>
                    </button>
                </div>
            </div>
            <div class="chest-row" data-chest="legendary">
                <div class="chest-icon-col">
                    <img src="/assets/leg-chess.png" alt="Легендарный сундук">
                </div>
                <div class="chest-info-col">
                    <div class="chest-name">Легендарный сундук</div>
                    <div class="chest-desc">
                        <div>Легендарное 70%</div>
                        <div>Эпическое 30%</div>
                    </div>
                </div>
                <div class="chest-price-col">
                    <button class="chest-buy-btn" data-chest="legendary">
                        <span class="chest-price">3500</span>
                        <i class="fas fa-coins"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

   async function updateCommonChestPrice() {
        try {
            const tgId = Number(userData.tg_id);
            const res = await fetch(`https://fight-club-api-4och.onrender.com/player/freechest?tg_id=${tgId}`);
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

    // Обработчики на кнопках, а не на всей строке
    container.querySelectorAll('.chest-buy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const chest = btn.dataset.chest;
            const res = await fetch('https://fight-club-api-4och.onrender.com/shop/buychest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, chestType: chest })
            });
            const data = await res.json();
            if (data.item) {
                showChestResult(data.item);
                await refreshData();
                if (window.updateTradeButtonIcon) window.updateTradeButtonIcon();
                if (chest === 'common') updateCommonChestPrice();

                fetch('https://fight-club-api-4och.onrender.com/tasks/daily/update/chest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tg_id: userData.tg_id, item_rarity: data.item.rarity })
                }).catch(err => console.error('Failed to update chest task', err));
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });
}

// ==================== МАРКЕТ ====================
async function renderMarket(target = null) {
    const container = target || document.getElementById('content');
    let currentClass = 'any';
    let currentRarity = 'any';
    let currentStat = 'any';
    let openPanel = null;

    function closeAllPanels() {
        if (openPanel) {
            const panel = document.getElementById(openPanel);
            if (panel) panel.style.display = 'none';
            openPanel = null;
        }
    }

    function togglePanel(panelId) {
        if (openPanel === panelId) {
            closeAllPanels();
        } else {
            closeAllPanels();
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.style.display = 'block';
                openPanel = panelId;
            }
        }
    }

    function handleClickOutside(e) {
        if (!e.target.closest('.filter-group')) {
            closeAllPanels();
        }
    }

    container.innerHTML = `
        <div class="market-filters-container">
            <div class="filters-row">
                <div class="filter-group" id="filter-class-group">
                    <button class="filter-button" id="classFilterBtn">
                        <span id="classFilterText">Класс</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="filter-panel" id="classPanel" style="display: none;">
                        <div class="filter-option" data-value="any">Любой класс</div>
                        <div class="filter-option" data-value="warrior">Воин</div>
                        <div class="filter-option" data-value="assassin">Ассасин</div>
                        <div class="filter-option" data-value="mage">Маг</div>
                    </div>
                </div>

                <div class="filter-group" id="filter-rarity-group">
                    <button class="filter-button" id="rarityFilterBtn">
                        <span id="rarityFilterText">Редкость</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="filter-panel" id="rarityPanel" style="display: none;">
                        <div class="filter-option" data-value="any">Любая редкость</div>
                        <div class="filter-option" data-value="common">Обычное</div>
                        <div class="filter-option" data-value="uncommon">Необычное</div>
                        <div class="filter-option" data-value="rare">Редкое</div>
                        <div class="filter-option" data-value="epic">Эпическое</div>
                        <div class="filter-option" data-value="legendary">Легендарное</div>
                    </div>
                </div>

                <div class="filter-group" id="filter-stat-group">
                    <button class="filter-button" id="statFilterBtn">
                        <span id="statFilterText">Характеристика</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="filter-panel" id="statPanel" style="display: none;">
                        <div class="filter-option" data-value="any">Любая характеристика</div>
                        <div class="filter-option" data-value="atk_bonus">АТК</div>
                        <div class="filter-option" data-value="def_bonus">ЗАЩ</div>
                        <div class="filter-option" data-value="hp_bonus">ЗДОР</div>
                        <div class="filter-option" data-value="spd_bonus">СКОР</div>
                        <div class="filter-option" data-value="crit_bonus">КРИТ</div>
                        <div class="filter-option" data-value="crit_dmg_bonus">КР.УРОН</div>
                        <div class="filter-option" data-value="agi_bonus">ЛОВ</div>
                        <div class="filter-option" data-value="int_bonus">ИНТ</div>
                        <div class="filter-option" data-value="vamp_bonus">ВАМП</div>
                        <div class="filter-option" data-value="reflect_bonus">ОТР</div>
                    </div>
                </div>
            </div>

            <button class="btn" id="applyFiltersBtn" style="width:100%; margin-bottom:15px;">Применить</button>
        </div>

        <div class="market-container">
            <div id="marketItems" class="market-grid"></div>
        </div>
    `;

    document.getElementById('classFilterBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel('classPanel');
    });

    document.getElementById('rarityFilterBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel('rarityPanel');
    });

    document.getElementById('statFilterBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel('statPanel');
    });

    document.querySelectorAll('.filter-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            const value = e.target.dataset.value;
            const panelId = e.target.closest('.filter-panel').id;
            const optionText = e.target.innerText;

            if (panelId === 'classPanel') {
                currentClass = value;
                document.getElementById('classFilterText').innerText = value === 'any' ? 'Класс' : optionText;
            } else if (panelId === 'rarityPanel') {
                currentRarity = value;
                document.getElementById('rarityFilterText').innerText = value === 'any' ? 'Редкость' : optionText;
            } else if (panelId === 'statPanel') {
                currentStat = value;
                document.getElementById('statFilterText').innerText = value === 'any' ? 'Характеристика' : optionText;
            }
            closeAllPanels();
        });
    });

    document.addEventListener('click', handleClickOutside);

    document.getElementById('applyFiltersBtn').addEventListener('click', () => {
        loadMarketItems(currentStat, container, currentClass, currentRarity);
    });

    await loadMarketItems(currentStat, container, currentClass, currentRarity);
}

async function loadMarketItems(statFilter = 'any', container, classFilter = 'any', rarityFilter = 'any') {
    const params = new URLSearchParams({ class: classFilter, rarity: rarityFilter });
    if (statFilter !== 'any') {
        params.append('stat', statFilter);
    }
    const res = await fetch('https://fight-club-api-4och.onrender.com/market?' + params);
    const items = await res.json();

    const marketItemsDiv = container.querySelector('#marketItems');
    marketItemsDiv.innerHTML = '';

    if (!Array.isArray(items)) {
        console.error('Market returned non-array:', items);
        marketItemsDiv.innerHTML = '<p style="color:#aaa;">Ошибка загрузки маркета</p>';
        return;
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

    items.forEach(item => {
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

        const itemDiv = document.createElement('div');
        itemDiv.className = `market-item ${rarityClass}`;
        itemDiv.dataset.itemId = item.id;

        let actionButtonHtml = '';
        if (isOwn) {
            actionButtonHtml = `
                <div style="display: flex; gap: 5px; margin-top: 5px;">
                    <button class="btn edit-price-btn" style="flex:1; padding: 5px; font-size: 11px;">✏️ Цена</button>
                    <button class="btn remove-from-market-btn" style="flex:1; padding: 5px; font-size: 11px;">❌ Убрать</button>
                </div>
            `;
        } else {
            actionButtonHtml = `<button class="buy-btn" data-item-id="${item.id}">Купить</button>`;
        }

        itemDiv.innerHTML = `
            <div class="item-icon" style="background-image: url('${iconPath}'); background-size: cover; background-position: center;"></div>
            <div class="item-content">
                <div class="item-name">${itemNameTranslations[item.name] || item.name}</div>
                <div class="item-stats">${stats.join(' • ')}</div>
                <div class="item-rarity">${rarityTranslations[item.rarity] || item.rarity}</div>
                <div class="item-price">${item.price} <i class="fas fa-coins" style="color: gold;"></i></div>
                ${actionButtonHtml}
            </div>
        `;

        marketItemsDiv.appendChild(itemDiv);
    });

    container.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemId = btn.dataset.itemId;
            if (!confirm('Подтвердите покупку')) return;
            const res = await fetch('https://fight-club-api-4och.onrender.com/market/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId })
            });
            const data = await res.json();
            if (data.success) {
                alert('Покупка успешна!');
                await refreshData();
                loadMarketItems(statFilter, container);
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });

    container.querySelectorAll('.edit-price-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemDiv = btn.closest('.market-item');
            const itemId = itemDiv.dataset.itemId;
            const currentPrice = itemDiv.querySelector('.item-price').innerText.split(' ')[0];
            const newPrice = prompt('Введите новую цену в монетах:', currentPrice);
            if (!newPrice || isNaN(newPrice) || parseInt(newPrice) <= 0) return;
            const res = await fetch('https://fight-club-api-4och.onrender.com/market/update-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId, new_price: parseInt(newPrice) })
            });
            const data = await res.json();
            if (data.success) {
                alert('Цена изменена');
                await refreshData();
                loadMarketItems(statFilter, container);
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });

    container.querySelectorAll('.remove-from-market-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemDiv = btn.closest('.market-item');
            const itemId = itemDiv.dataset.itemId;
            if (!confirm('Снять предмет с продажи?')) return;
            const res = await fetch('https://fight-club-api-4och.onrender.com/market/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId })
            });
            const data = await res.json();
            if (data.success) {
                alert('Предмет снят с продажи');
                await refreshData();
                loadMarketItems(statFilter, container);
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });
    if (window.updateShopTabIcon) window.updateShopTabIcon();
}

// ==================== РЕЙТИНГ ====================
function renderRating() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div style="margin-top: 10px;"></div>
        <div class="rating-tabs">
            <button class="rating-tab ${ratingTab === 'rating' ? 'active' : ''}" id="ratingTabBtn"><i class="fas fa-trophy"></i> РЕЙТИНГ</button>
            <button class="rating-tab ${ratingTab === 'power' ? 'active' : ''}" id="powerTabBtn"><i class="fas fa-fist-raised"></i> СИЛА</button>
            <button class="rating-tab ${ratingTab === 'tower' ? 'active' : ''}" id="towerTabBtn"><i class="fas fa-chess-rook"></i> БАШНЯ</button>
        </div>
        <div id="ratingContent"></div>
    `;

    document.getElementById('ratingTabBtn').addEventListener('click', () => {
        ratingTab = 'rating';
        renderRating();
        loadRatingData('rating');
    });

    document.getElementById('powerTabBtn').addEventListener('click', () => {
        ratingTab = 'power';
        renderRating();
        loadRatingData('power');
    });

    document.getElementById('towerTabBtn').addEventListener('click', () => {
        ratingTab = 'tower';
        renderRating();
        loadRatingData('tower');
    });

    loadRatingData(ratingTab);
}

async function loadRatingData(type) {
    const container = document.getElementById('ratingContent');
    container.innerHTML = '<p style="text-align:center;">Загрузка...</p>';

    try {
        const res = await fetch(`https://fight-club-api-4och.onrender.com/rank/${type}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid data');

        let html = '<table class="stats-table"><thead>';
        html += '<th>Место</th><th>Имя</th>';

        if (type === 'rating' || type === 'power') {
            html += '<th>Класс</th><th>Очки</th>';
        } else if (type === 'tower') {
            html += '<th>Класс</th><th>Роль</th><th>Этаж</th>';
        }
        html += '</thead><tbody>';

        data.forEach((item, index) => {
            html += '<tr>';
            html += `<td style="text-align:center;">${index + 1} `;
            html += `<td>${item.username}</td>`;

            if (type === 'rating') {
                const className = item.class === 'warrior' ? 'Воин' : (item.class === 'assassin' ? 'Ассасин' : 'Маг');
                html += `<td>${className}</td>`;
                html += `<td style="text-align:center;">${item.rating}</td>`;
            } else if (type === 'power') {
                const className = item.class === 'warrior' ? 'Воин' : (item.class === 'assassin' ? 'Ассасин' : 'Маг');
                html += `<td>${className}</td>`;
                html += `<td style="text-align:center;">${item.power}</td>`;
            } else if (type === 'tower') {
                const className = window.getClassNameRu ? getClassNameRu(item.chosen_class) : item.chosen_class;
                const roleName = getRoleNameRu(item.chosen_subclass);
                html += `<td>${className}</td>`;
                html += `<td>${roleName}</td>`;
                html += `<td style="text-align:center;">${item.floor}</td>`;
            }

            html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (e) {
        console.error('Error loading rating:', e);
        container.innerHTML = '<p style="color:#aaa; text-align:center;">Ошибка загрузки</p>';
    }
}

// ==================== ПРОФИЛЬ ====================
function renderProfile() {
    const content = document.getElementById('content');

    fetch('https://fight-club-api-4och.onrender.com/tasks/daily/update/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tg_id: userData.tg_id })
    })
    .then(() => {
        if (window.refreshTasksData) window.refreshTasksData();
        if (window.updateMainMenuNewIcons) window.updateMainMenuNewIcons();
    })
    .catch(err => console.error('Failed to update profile task', err));

    const hasSkillPoints = hasAnyUnspentSkillPoints();

    content.innerHTML = `
        <div class="profile-tabs-container">
            <button class="btn profile-tab ${profileTab === 'skins' ? 'active' : ''}" data-tab="skins">Скины</button>
            <button class="btn profile-tab ${profileTab === 'bonuses' ? 'active' : ''}" data-tab="bonuses">Бонусы</button>
           <button class="btn profile-tab ${profileTab === 'upgrade' ? 'active' : ''}" data-tab="upgrade" style="position: relative;">
    Улучшить
    ${hasSkillPoints ? '<img src="/assets/icons/icon-new.png" class="upgrade-tab-icon" alt="">' : ''}
</button>
        </div>
        <div id="profileContent"></div>
    `;

    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            profileTab = e.target.dataset.tab;
            renderProfile();
        });
    });

    renderProfileTab(profileTab);
}

function renderProfileTab(tab) {
    const profileContent = document.getElementById('profileContent');
    if (tab === 'bonuses') {
        renderProfileBonuses(profileContent);
    } else if (tab === 'upgrade') {
        renderSkills(profileContent);
    } else if (tab === 'skins') {
        renderSkins(profileContent);
    }
}

function renderProfileBonuses(container) {
    const currentClass = userData.current_class;
    const classData = getCurrentClassData();
    const stats = calculateClassStats(currentClass, classData, inventory, userData.subclass);

    // Функция для проверки очков навыков у класса
    const hasPointsForClass = (cls) => (userClasses.find(c => c.class === cls)?.skill_points || 0) > 0;

    // Данные для баров
    const maxLevel = 60;
    const levelProgress = (classData.level / maxLevel) * 100;
    const expNeeded = Math.floor(80 * Math.pow(classData.level, 1.5));
    const expProgress = (classData.exp / expNeeded) * 100;
    const skillPoints = classData.skill_points || 0;
    const skillPointsProgress = skillPoints > 0 ? 100 : 0; // всегда полная шкала, если есть очки

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
        <tr><th>Параметр</th><th>База</th><th>+Инв.</th><th>+Особ.</th><th>Итого</th></tr>
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
            const newClass = e.target.dataset.class;
            if (newClass === currentClass) return;
            const res = await fetch('https://fight-club-api-4och.onrender.com/player/class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, class: newClass })
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
            ${renderSkillItem('crit_dmg_points', 'Крит. урон', 'Множитель крит. урона + 1% <br>(По умолчанию ×1.5)', (1.5 + (classData.crit_dmg_points || 0)/100).toFixed(2) + 'x', classData.crit_dmg_points || 0, skillPoints)}
            ${renderSkillItem('vamp_points', 'Вампиризм', 'Восстанавливает % <br>от нанесённого урона', base.vamp + (classData.vamp_points || 0), classData.vamp_points || 0, skillPoints)}
            ${renderSkillItem('reflect_points', 'Отражение', 'Возвращает % <br>от полученного урона', base.reflect + (classData.reflect_points || 0), classData.reflect_points || 0, skillPoints)}
        </div>
    `;

    container.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const newClass = e.target.dataset.class;
            if (newClass === currentClass) return;
            await fetch('https://fight-club-api-4och.onrender.com/player/class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, class: newClass })
            });
            userData.current_class = newClass;
            renderSkills(container);
        });
    });

    container.querySelectorAll('.skill-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const stat = e.target.dataset.stat;
            const res = await fetch('https://fight-club-api-4och.onrender.com/player/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tg_id: userData.tg_id,
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
                alert('Ошибка: ' + data.error);
            }
        });
    });
}

function renderSkillItem(statName, displayName, description, currentValue, level, skillPoints) {
    return `
        <div class="skill-item">
            <div class="skill-info">
                <div class="skill-name">${displayName}</div>
                <div class="skill-desc">${description}</div>
            </div>
            <div class="skill-value">${currentValue}</div>
            <button class="skill-btn" data-stat="${statName}" ${skillPoints < 1 ? 'disabled' : ''}>
                <i class="fas fa-plus"></i>
            </button>
        </div>
    `;
}
function renderStatRow(label, baseValue, gearValue, classBonusValue, finalValue) {
    const gearNum = parseFloat(gearValue) || 0;
    const classBonusNum = parseFloat(classBonusValue) || 0;
    const gearDisplay = gearNum !== 0 ? `<span style="color:#2ecc71;">+${gearValue}</span>` : '';
    const classBonusDisplay = classBonusNum !== 0 ? `<span style="color:#00aaff;">+${classBonusValue}</span>` : '';
    return `
         <tr>
            <td style="padding: 5px 0;">${label}</td>
            <td style="text-align:center;">${baseValue}</td>
            <td style="text-align:center;">${gearDisplay}</td>
            <td style="text-align:center;">${classBonusDisplay}</td>
            <td style="text-align:center; font-weight:bold;">${finalValue}</td>
         </tr>
    `;
}

// ==================== СКИНЫ ====================
function renderSkins(container) {
    Promise.all([
        fetch('https://fight-club-api-4och.onrender.com/avatars').then(res => {
            if (!res.ok) throw new Error('Failed to fetch avatars');
            return res.json();
        }),
        fetch(`https://fight-club-api-4och.onrender.com/avatars/user/${userData.tg_id}`).then(res => {
            if (!res.ok) throw new Error('Failed to fetch owned avatars');
            return res.json();
        })
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

    fetch('https://fight-club-api-4och.onrender.com/avatars')
        .then(res => res.json())
        .then(avatarsList => {
            const avatar = avatarsList.find(a => a.id === avatarId);
            if (!avatar) {
                alert('Аватар не найден');
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
                    <img src="/assets/${avatarFilename}" style="max-width: 100%; max-height: 300px; border-radius: 10px;">
                    <div style="font-size: 24px; font-weight: bold; color: white; margin: 15px 0 5px;">${translateSkinName(avatar.name)}</div>
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
                document.getElementById('buySkin').addEventListener('click', async () => {
                    const res = await fetch('https://fight-club-api-4och.onrender.com/avatars/buy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tg_id: userData.tg_id, avatar_id: avatarId })
                    });
                    const data = await res.json();
                    if (data.success) {
                        await refreshData();
                        modal.style.display = 'none';
                        renderProfileTab('skins');
                    } else {
                        alert('Ошибка: ' + data.error);
                    }
                });
            }

            if (owned && !isActive) {
                document.getElementById('activateSkin').addEventListener('click', async () => {
                    const res = await fetch('https://fight-club-api-4och.onrender.com/player/avatar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tg_id: userData.tg_id, avatar_id: avatarId })
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
                        alert('Ошибка при смене аватара');
                    }
                });
            }

            document.getElementById('closeSkinModal').addEventListener('click', () => {
                modal.style.display = 'none';
            });

            const closeBtn = modal.querySelector('.close');
            closeBtn.onclick = () => modal.style.display = 'none';
        })
        .catch(err => {
            console.error('Error loading avatar details:', err);
            alert('Ошибка загрузки данных аватара');
        });
}
