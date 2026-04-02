// helpers.js

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function getCurrentClassData() {
    if (!userData || !userData.current_class) {
        return { level: 1, skill_points: 0, hp_points:0, atk_points:0, def_points:0, res_points:0, spd_points:0, crit_points:0, crit_dmg_points:0, dodge_points:0, acc_points:0, mana_points:0 };
    }
    return userClasses.find(c => c.class === userData.current_class) || { 
        level: 1, skill_points: 0, 
        hp_points: 0, atk_points: 0, def_points: 0, res_points: 0, 
        spd_points: 0, crit_points: 0, crit_dmg_points: 0, 
        dodge_points: 0, acc_points: 0, mana_points: 0 
    };
}

function calculateClassStats(className, classData, inventory, subclass) {
    const base = baseStats[className] || baseStats.warrior;

    // Базовые статы с учётом очков навыков (ИЗМЕНЕНО: *5 вместо *2)
    let baseStatsWithSkills = {
        hp: base.hp + (classData.hp_points || 0) * 5,
        atk: base.atk + (classData.atk_points || 0),
        def: base.def + (classData.def_points || 0),
        agi: base.agi + (classData.dodge_points || 0),
        int: base.int + (classData.int_points || 0),
        spd: base.spd + (classData.spd_points || 0),
        crit: base.crit + (classData.crit_points || 0),
        critDmg: 1.5 + ((classData.crit_dmg_points || 0) / 100),
        vamp: base.vamp + (classData.vamp_points || 0),
        reflect: base.reflect + (classData.reflect_points || 0)
    };

    let gearBonuses = {
        hp: 0, atk: 0, def: 0, agi: 0, int: 0, spd: 0, crit: 0, critDmg: 0, vamp: 0, reflect: 0
    };

    const equippedItems = inventory.filter(item => item.equipped && item.owner_class === className);
    equippedItems.forEach(item => {
        gearBonuses.hp += item.hp_bonus || 0;
        gearBonuses.atk += item.atk_bonus || 0;
        gearBonuses.def += item.def_bonus || 0;
        gearBonuses.agi += item.agi_bonus || 0;
        gearBonuses.int += item.int_bonus || 0;
        gearBonuses.spd += item.spd_bonus || 0;
        gearBonuses.crit += item.crit_bonus || 0;
        gearBonuses.critDmg += (item.crit_dmg_bonus || 0) / 100;
        gearBonuses.vamp += item.vamp_bonus || 0;
        gearBonuses.reflect += item.reflect_bonus || 0;
    });

    let final = {
        hp: baseStatsWithSkills.hp + gearBonuses.hp,
        atk: baseStatsWithSkills.atk + gearBonuses.atk,
        def: baseStatsWithSkills.def + gearBonuses.def,
        agi: baseStatsWithSkills.agi + gearBonuses.agi,
        int: baseStatsWithSkills.int + gearBonuses.int,
        spd: baseStatsWithSkills.spd + gearBonuses.spd,
        crit: baseStatsWithSkills.crit + gearBonuses.crit,
        critDmg: baseStatsWithSkills.critDmg + gearBonuses.critDmg,
        vamp: baseStatsWithSkills.vamp + gearBonuses.vamp,
        reflect: baseStatsWithSkills.reflect + gearBonuses.reflect
    };

    // Классовые особенности (добавляются к final)
    let classBonus = { hp: 0, atk: 0, def: 0, agi: 0, int: 0, spd: 0, crit: 0, critDmg: 0, vamp: 0, reflect: 0 };

    if (className === 'warrior') {
        // ИЗМЕНЕНО: +5 HP за каждые 5 защиты (было +3)
        const bonusHp = Math.floor(final.def / 5) * 5;
        classBonus.hp = bonusHp;
        final.hp += bonusHp;
    }

    if (className === 'assassin') {
        const bonusSpd = Math.floor(final.agi / 5);
        classBonus.spd = bonusSpd;
        final.spd += bonusSpd;
    }

    if (className === 'mage') {
        const bonusAgi = Math.floor(final.int / 5);
        classBonus.agi = bonusAgi;
        final.agi += bonusAgi;
    }

    // ДОБАВЛЕНО: пассивная особенность воина +10% к итоговому HP
    if (className === 'warrior') {
        final.hp = Math.floor(final.hp * 1.1);
    }

    final.def = Math.min(70, final.def);
    final.agi = Math.min(70, final.agi);
    final.crit = Math.min(100, final.crit);

    final.hp = Math.round(final.hp);
    final.atk = Math.round(final.atk);
    final.spd = Math.round(final.spd);
    final.def = Math.round(final.def * 10) / 10;
    final.agi = Math.round(final.agi * 10) / 10;
    final.int = Math.round(final.int * 10) / 10;
    final.crit = Math.round(final.crit * 10) / 10;
    final.critDmg = Math.round(final.critDmg * 100) / 100;
    final.vamp = Math.round(final.vamp * 10) / 10;
    final.reflect = Math.round(final.reflect * 10) / 10;

    return { base: baseStatsWithSkills, gear: gearBonuses, classBonus, final };
}

function calculatePower(className, finalStats, level) {
    const coeff = importance[className] || importance.warrior;
    let power = 0;
    power += finalStats.hp * coeff.hp;
    power += finalStats.atk * coeff.atk * 2;
    power += finalStats.def * coeff.def * 2;
    power += finalStats.agi * coeff.agi * 2;
    power += finalStats.int * coeff.int * 2;
    power += finalStats.spd * coeff.spd * 2;
    power += finalStats.crit * coeff.crit * 3;
    power += (finalStats.critDmg - 1.5) * 100 * coeff.critDmg;
    power += finalStats.vamp * coeff.vamp * 3;
    power += finalStats.reflect * coeff.reflect * 2;
    power += level * 10;
    return Math.round(power);
}

function recalculatePower() {
    const classData = getCurrentClassData();
    const stats = calculateClassStats(userData.current_class, classData, inventory, userData.subclass);
    currentPower = calculatePower(userData.current_class, stats.final, classData.level);
    updateTopBar();
}

function getClassNameRu(cls) {
    if (cls === 'warrior') return 'Воин';
    if (cls === 'assassin') return 'Ассасин';
    if (cls === 'mage') return 'Маг';
    if (cls === 'mouse') return 'Мышь';
    return cls;
}

function showRoleInfoModal(className) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    const classNameRu = className === 'warrior' ? 'Воин' : (className === 'assassin' ? 'Ассасин' : 'Маг');
    
   // Выбор иконки в зависимости от класса
let iconClass = '';
if (className === 'warrior') iconClass = 'fas fa-shield-alt';
else if (className === 'assassin') iconClass = 'fas fa-khanda';
else if (className === 'mage') iconClass = 'fas fa-bomb';

modalTitle.innerHTML = `<i class="${iconClass}" style="color:#00aaff;"></i> Класс ${classNameRu}`;

    // Особенность класса
    let classFeatureHtml = '';
    if (className === 'warrior') {
        classFeatureHtml = `
            <div class="role-card">
                <h3>Особенность класса</h3>
                <div class="feature-desc">Стойкость: за каждые 5 единиц защиты получает +5 к максимальному здоровью. Увеличивает максимальное здоровье на 10%.</div>
            </div>
        `;
    } else if (className === 'assassin') {
        classFeatureHtml = `
            <div class="role-card">
                <h3>Особенность класса</h3>
                <div class="feature-desc">Стремительность: за каждые 5 единиц ловкости получает +1 к скорости.</div>
            </div>
        `;
    } else if (className === 'mage') {
        classFeatureHtml = `
            <div class="role-card">
                <h3>Особенность класса</h3>
                <div class="feature-desc">Магическая мощь: за каждые 5 единиц интеллекта получает +1 к ловкости и +2 к регенерации маны за ход.</div>
            </div>
        `;
    }

    // Роли (подклассы)
    const subclasses = {
        warrior: ['guardian', 'berserker', 'knight'],
        assassin: ['assassin', 'venom_blade', 'blood_hunter'],
        mage: ['pyromancer', 'cryomancer', 'illusionist']
    }[className] || [];

    let rolesHtml = '';
    subclasses.forEach(sc => {
        const desc = roleDescriptions[sc];
        if (desc) {
            rolesHtml += `
                <div class="role-card">
                    <h3>${desc.name}</h3>
                    <div class="skill">
                        <span class="skill-name passive">${desc.passive.split(' – ')[0]}</span>
                        <span class="skill-type">(пассивный)</span>
                        <div class="skill-desc">${desc.passive.split(' – ')[1] || desc.passive}</div>
                    </div>
                    <div class="skill">
                        <span class="skill-name active">${desc.active.split(' – ')[0]}</span>
                        <span class="skill-type">(активный)</span>
                        <div class="skill-desc">${desc.active.split(' – ')[1] || desc.active}</div>
                    </div>
                </div>
            `;
        }
    });

    modalBody.innerHTML = classFeatureHtml + rolesHtml;
    modal.style.display = 'block';

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = 'none';
    };
}


function showChestResult(item) {
    const modal = document.getElementById('chestResultModal');
    const body = document.getElementById('chestResultBody');

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

    let iconPath = '';
    if (item.owner_class && item.type) {
        const folder = classFolderMap[item.owner_class];
        const fileType = typeFileMap[item.type];
        if (folder && fileType) {
            iconPath = `/assets/equip/${folder}/${folder}-${fileType}-001.png`;
        }
    }

    const rarityColors = {
        common: '#aaa',
        uncommon: '#2ecc71',
        rare: '#2e86de',
        epic: '#9b59b6',
        legendary: '#f1c40f'
    };
    const borderColor = rarityColors[item.rarity] || '#aaa';

    const iconHtml = `
        <div style="width: 80px; height: 80px; margin: 0 auto; background-color: #1a1f2b; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 2px solid ${borderColor};">
            ${iconPath ? `<img src="${iconPath}" style="width: 70px; height: 70px; object-fit: contain;">` : '<div style="font-size: 64px;">📦</div>'}
        </div>
    `;

    let classDisplay = '';
    if (item.owner_class) {
        classDisplay = item.owner_class === 'warrior' ? 'Воин' : (item.owner_class === 'assassin' ? 'Ассасин' : 'Маг');
    } else {
        classDisplay = 'Неизвестный класс';
    }

    body.innerHTML = `
        <div style="text-align: center;">
            <div style="margin-bottom: 10px;">${iconHtml}</div>
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px; color: ${borderColor};">${translateSkinName(item.name)}</div>
            <div class="item-rarity rarity-${item.rarity}" style="margin-bottom: 5px;">${rarityTranslations[item.rarity] || item.rarity}</div>
            <div style="color: #aaa; font-size: 14px; margin-bottom: 5px;">Класс: ${classDisplay}</div>
            <div style="color: #aaa; font-size: 14px;">${stats.join(' • ')}</div>
        </div>
    `;

    modal.style.display = 'block';
}

function showLevelUpModal(className) {
    const modal = document.getElementById('levelUpModal');
    const body = document.getElementById('levelUpBody');
    const classNameRu = getClassNameRu(className);
    // Убрали конкретное число очков, оставили общую фразу
    body.innerHTML = `<p style="text-align:center;">Ваш ${classNameRu} достиг нового уровня!<br>Вам доступны новые очки распределения характеристик.</p>`;

    modal.style.display = 'block';

    const upgradeBtn = document.getElementById('levelUpUpgradeBtn');
    const laterBtn = document.getElementById('levelUpLaterBtn');

    const newUpgrade = upgradeBtn.cloneNode(true);
    const newLater = laterBtn.cloneNode(true);
    upgradeBtn.parentNode.replaceChild(newUpgrade, upgradeBtn);
    laterBtn.parentNode.replaceChild(newLater, laterBtn);

    newUpgrade.addEventListener('click', () => {
        modal.style.display = 'none';
        document.querySelectorAll('.menu-item').forEach(item => {
            item.style.pointerEvents = 'auto';
            item.style.opacity = '1';
        });
        profileTab = 'upgrade';
        showScreen('profile');
    });

    newLater.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}

function renderItemColumn(item, isEquipped) {
    if (!item) {
        return `
            <div style="text-align: center;">
                <div style="width: 80px; height: 80px; margin: 0 auto; background-color: #2f3542; border-radius: 12px;"></div>
                <div style="margin: 10px 0;">— пусто —</div>
                <button class="btn equip-compare-btn" style="margin-top: 10px; background-color: #2f3542; border: 2px solid #aaa; color: #aaa; border-radius: 30px; padding: 8px 16px;" data-action="${isEquipped ? 'old' : 'new'}">⬆️ Надеть</button>
            </div>
        `;
    }

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
    const folder = classFolderMap[item.owner_class];
    const fileType = typeFileMap[item.type];
    const iconPath = folder && fileType ? `/assets/equip/${folder}/${folder}-${fileType}-001.png` : '';

    const rarityColors = {
        common: '#aaa',
        uncommon: '#2ecc71',
        rare: '#2e86de',
        epic: '#9b59b6',
        legendary: '#f1c40f'
    };
    const borderColor = rarityColors[item.rarity] || '#aaa';

    return `
        <div style="text-align: center;">
            <div style="width: 80px; height: 80px; margin: 0 auto; background-color: #1a1f2b; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 2px solid ${borderColor};">
                <img src="${iconPath}" style="width: 70px; height: 70px; object-fit: contain;">
            </div>
            <div style="font-weight: bold; margin-top: 5px; color: ${borderColor};">${translateSkinName(item.name)}</div>
            <div class="${rarityClass}" style="margin: 5px 0;">${rarityTranslations[item.rarity] || item.rarity}</div>
            <div style="font-size: 12px; color: white;">${stats.join(' • ')}</div>
            <button class="btn equip-compare-btn" style="margin-top: 10px; background-color: #2f3542; border: 2px solid #aaa; color: #aaa; border-radius: 30px; padding: 8px 16px;" data-action="${isEquipped ? 'old' : 'new'}">⬆️ Надеть</button>
        </div>
    `;
}

function showEquipCompareModal(oldItem, newItem) {
    const modal = document.getElementById('equipCompareModal');
    const body = document.getElementById('equipCompareBody');
    const closeBtn = modal.querySelector('.close');

    body.innerHTML = `
        <div id="oldItemColumn" style="flex: 1;">${renderItemColumn(oldItem, true)}</div>
        <div id="newItemColumn" style="flex: 1;">${renderItemColumn(newItem, false)}</div>
    `;

    modal.style.display = 'block';

    const oldBtn = body.querySelector('#oldItemColumn .equip-compare-btn');
    const newBtn = body.querySelector('#newItemColumn .equip-compare-btn');

    if (oldBtn) {
        oldBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (newBtn) {
        newBtn.addEventListener('click', async () => {
            const currentClass = document.querySelector('.class-btn.active').dataset.class;
            const res = await fetch('https://fight-club-api-4och.onrender.com/inventory/equip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tg_id: userData.tg_id, 
                    item_id: newItem.id,
                    target_class: currentClass
                })
            });
            if (res.ok) {
                await refreshData();
                if (currentScreen === 'equip') renderEquip();
            } else {
                const err = await res.json();
                showToast('Ошибка: ' + err.error, 1500);
            }
            modal.style.display = 'none';
        });
    }

    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };
}

// ==================== НОВЫЕ ФУНКЦИИ (переносим из app.js) ====================

// Проверка наличия нераспределённых очков навыков у любого класса
function hasAnyUnspentSkillPoints() {
    return userClasses.some(cls => cls.skill_points > 0);
}
window.hasAnyUnspentSkillPoints = hasAnyUnspentSkillPoints;

// Обновление иконки на иконке заданий в нижнем меню
function updateMainMenuNewIcons() {
    const tasksMenuItem = document.querySelector('.menu-item[data-screen="tasks"]');
    if (!tasksMenuItem) return;
    const hasUnclaimed = typeof hasUnclaimedTasks === 'function' ? hasUnclaimedTasks() : false;
    const existingIcon = tasksMenuItem.querySelector('.new-icon');
    if (hasUnclaimed && !existingIcon) {
        const icon = document.createElement('img');
        icon.src = '/assets/icons/icon-new.png';
        icon.className = 'new-icon';
        icon.style.position = 'absolute';
        icon.style.top = '-5px';
        icon.style.right = '-5px';
        icon.style.width = '16px';
        icon.style.height = '16px';
        tasksMenuItem.style.position = 'relative';
        tasksMenuItem.appendChild(icon);
    } else if (!hasUnclaimed && existingIcon) {
        existingIcon.remove();
    }
}
window.updateMainMenuNewIcons = updateMainMenuNewIcons;

// Обновление иконки на круглой кнопке "Торговля" на главном экране
function updateTradeButtonIcon() {
    const tradeBtn = document.querySelector('[data-screen="trade"]'); // ищем любой элемент с атрибутом data-screen="trade"
    if (!tradeBtn) return;

    fetch(`https://fight-club-api-4och.onrender.com/player/freechest?tg_id=${userData.tg_id}`)
        .then(res => res.json())
        .then(data => {
            const freeAvailable = data.freeAvailable;
            const existingIcon = tradeBtn.querySelector('.new-icon');
            if (freeAvailable && !existingIcon) {
                const icon = document.createElement('img');
                icon.src = '/assets/icons/icon-new.png';
                icon.className = 'new-icon';
                icon.style.position = 'absolute';
                icon.style.top = '3px';
                icon.style.right = '3px';
                icon.style.width = '16px';
                icon.style.height = '16px';
                tradeBtn.style.position = 'relative';
                tradeBtn.appendChild(icon);
            } else if (!freeAvailable && existingIcon) {
                existingIcon.remove();
            }
        })
        .catch(e => console.error('Failed to fetch free chest status for trade button', e));
}
window.updateTradeButtonIcon = updateTradeButtonIcon;

// Обновление иконки на аватаре (профиль) на главном экране
function updateProfileAvatarIcon() {
    const avatarContainer = document.querySelector('.hero-avatar');
    if (!avatarContainer) return;
    const hasPoints = hasAnyUnspentSkillPoints();
    let icon = avatarContainer.querySelector('.profile-new-icon');
    if (hasPoints && !icon) {
        icon = document.createElement('img');
        icon.src = '/assets/icons/icon-new.png';
        icon.className = 'profile-new-icon';
        icon.style.position = 'absolute';
        icon.style.top = '5px';
        icon.style.right = '5px';
        icon.style.width = '16px';
        icon.style.height = '16px';
        icon.style.pointerEvents = 'none';
        icon.style.zIndex = '2';   // ← добавить
        avatarContainer.style.position = 'relative';
        avatarContainer.appendChild(icon);
    } else if (!hasPoints && icon) {
        icon.remove();
    }
}

window.updateProfileAvatarIcon = updateProfileAvatarIcon;

// Обновление иконки на кнопке "МАГАЗИН" внутри торговли
function updateShopTabIcon() {
    const shopBtn = document.getElementById('tradeShopBtn');
    if (!shopBtn) return;

    fetch(`https://fight-club-api-4och.onrender.com/player/freechest?tg_id=${userData.tg_id}`)
        .then(res => res.json())
        .then(data => {
            const freeAvailable = data.freeAvailable;
            const existingIcon = shopBtn.querySelector('.new-icon');
            if (freeAvailable && !existingIcon) {
                const icon = document.createElement('img');
                icon.src = '/assets/icons/icon-new.png';
                icon.className = 'new-icon';
                icon.style.width = '16px';
                icon.style.height = '16px';
                icon.style.marginLeft = '5px';
                shopBtn.appendChild(icon);
            } else if (!freeAvailable && existingIcon) {
                existingIcon.remove();
            }
        })
        .catch(e => console.error('Failed to fetch free chest status for shop tab', e));
}


// ========== ИКОНКИ ПРЕДМЕТОВ ==========
function getItemIconPath(item) {
    if (!item) return '';
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
    const folder = classFolderMap[item.owner_class];
    const fileType = typeFileMap[item.type];
    if (!folder || !fileType) return '';
    return `/assets/equip/${folder}/${folder}-${fileType}-001.png`;
}
window.getItemIconPath = getItemIconPath;
window.updateShopTabIcon = updateShopTabIcon;
