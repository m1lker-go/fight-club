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

    final.def = Math.min(100, final.def);
    final.agi = Math.min(100, final.agi);
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
    return 'Маг';
}

function showRoleInfoModal(className) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    const classNameRu = className === 'warrior' ? 'Воин' : (className === 'assassin' ? 'Ассасин' : 'Маг');
    modalTitle.innerText = `Класс ${classNameRu}`;

    let classFeatureHtml = '';
    if (className === 'warrior') {
        classFeatureHtml = `
            <div class="role-card" style="border-left-color: #f39c12;">
                <h3>Особенность класса</h3>
                <p><strong>Стойкость:</strong> за каждые 5 единиц защиты получает +5 к максимальному здоровью. Увеличивает максимальное здоровье на 10%.</p>
            </div>
        `;
    } else if (className === 'assassin') {
        classFeatureHtml = `
            <div class="role-card" style="border-left-color: #f39c12;">
                <h3>Особенность класса</h3>
                <p><strong>Стремительность:</strong> за каждые 5 единиц ловкости получает +1 к скорости.</p>
            </div>
        `;
    } else if (className === 'mage') {
        classFeatureHtml = `
            <div class="role-card" style="border-left-color: #f39c12;">
                <h3>Особенность класса</h3>
                <p><strong>Магическая мощь:</strong> за каждые 5 единиц интеллекта получает +1 к ловкости и +2 к регенерации маны за ход.</p>
            </div>
        `;
    }

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
                    <p><span class="passive">Пассивный:</span> ${desc.passive}</p>
                    <p><span class="active">Активный:</span> ${desc.active}</p>
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
    const iconHtml = iconPath ? `<img src="${iconPath}" alt="item" style="width:80px; height:80px; object-fit: contain;">` : `<div style="font-size: 64px;">📦</div>`;

    let classDisplay = '';
    if (item.owner_class) {
        classDisplay = item.owner_class === 'warrior' ? 'Воин' : (item.owner_class === 'assassin' ? 'Ассасин' : 'Маг');
    } else {
        classDisplay = 'Неизвестный класс';
    }

    body.innerHTML = `
        <div style="text-align: center;">
            <div style="margin-bottom: 10px;">${iconHtml}</div>
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px;">${translateSkinName(item.name)}</div>
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
    body.innerHTML = `<p style="text-align:center;">Ваш ${classNameRu} достиг нового уровня!<br>Вам доступны 3 очка навыков!</p>`;

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
                <div style="width: 80px; height: 80px; margin: 0 auto; background-color: #2f3542; border-radius: 8px;"></div>
                <div style="margin: 10px 0;">— пусто —</div>
                <button class="btn equip-compare-btn" style="margin-top: 10px;" data-action="${isEquipped ? 'old' : 'new'}">⬆️ Надеть</button>
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

    return `
        <div style="text-align: center;">
            <div style="width: 80px; height: 80px; margin: 0 auto;">
                <img src="${iconPath}" style="width:100%; height:100%; object-fit: contain;">
            </div>
            <div style="font-weight: bold; margin-top: 5px;">${translateSkinName(item.name)}</div>
            <div class="${rarityClass}" style="margin: 5px 0;">${rarityTranslations[item.rarity] || item.rarity}</div>
            <div style="font-size: 12px; color: #aaa;">${stats.join(' • ')}</div>
            <button class="btn equip-compare-btn" style="margin-top: 10px;" data-action="${isEquipped ? 'old' : 'new'}">⬆️ Надеть</button>
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
                alert('Ошибка: ' + err.error);
            }
            modal.style.display = 'none';
        });
    }

    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };
}
