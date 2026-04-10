// js/tower.js (исправленный)

let towerStatus = null;
let selectedClass = null;
let selectedSubclass = null;

async function loadTowerStatus() {
    if (!userData || !userData.id) {
        console.error('loadTowerStatus: userData or id missing');
        return;
    }
    try {
        const res = await window.apiRequest('/tower/status', { method: 'GET' });
        if (!res.ok) throw new Error('Failed to load tower status');
        towerStatus = await res.json();

        // Проверяем, что необходимые функции определены
        if (typeof getClassNameRu !== 'function') {
            console.warn('getClassNameRu not defined, using fallback');
            window.getClassNameRu = (cls) => cls === 'warrior' ? 'Воин' : (cls === 'assassin' ? 'Ассасин' : 'Маг');
        }
        if (typeof getRoleNameRu !== 'function') {
            console.warn('getRoleNameRu not defined, using fallback');
            window.getRoleNameRu = (role) => role;
        }

        renderTower();

        if (!towerStatus.chosenClass) {
            showTutorialOverlay();
        }
    } catch (e) {
        console.error('Ошибка загрузки башни:', e);
        showToast('Ошибка загрузки башни', 2000);
    }
}

function getFloorRewardInfo(floor) {
    if (floor % 20 === 0) {
        return { type: 'skin', icon: 'fas fa-square', label: 'скин' };
    }
    let amount;
    if (floor <= 5) amount = 30;
    else if (floor <= 10) amount = 40;
    else if (floor <= 40) amount = 50;
    else if (floor <= 60) amount = 100;
    else if (floor <= 80) amount = 250;
    else if (floor <= 99) amount = 500;
    else amount = 2000;
    return { type: 'coins', amount: amount, icon: 'fas fa-coins', label: 'монет' };
}

function renderTower() {
    const className = towerStatus.chosenClass
        ? (typeof getClassNameRu === 'function' ? getClassNameRu(towerStatus.chosenClass) : towerStatus.chosenClass)
        : '—';
    const subclassName = towerStatus.chosenSubclass
        ? (typeof getRoleNameRu === 'function' ? getRoleNameRu(towerStatus.chosenSubclass) : towerStatus.chosenSubclass)
        : '—';

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="tower-container">
            <div class="tower-header">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="header-grid" style="flex: 1;">
                        <div class="grid-left">
                            <div class="grid-item">
                                <span class="header-label">Этаж:</span>
                                <span class="header-value">${towerStatus.currentFloor}</span>
                            </div>
                            <div class="grid-item">
                                <span class="header-label">Билеты:</span>
                                <span class="header-value">${towerStatus.attemptsLeft}</span>
                                <img src="/assets/icons/icon-ticket.png" alt="билет" style="width: 24px; height: auto; margin-left: 5px; vertical-align: middle; display: inline-block;">
                            </div>
                        </div>
                        <div class="grid-right">
                            <div class="grid-item">
                                <span class="header-label">Класс:</span>
                                <span class="header-value">${escapeHtml(className)}</span>
                            </div>
                            <div class="grid-item">
                                <span class="header-label">Роль:</span>
                                <span class="header-value">${escapeHtml(subclassName)}</span>
                            </div>
                        </div>
                    </div>
                    <i class="fas fa-circle-question" id="towerHelpBtn" style="color: #00aaff; font-size: 28px; cursor: pointer; margin-left: 10px;"></i>
                </div>
            </div>
            <div class="tower-floors" id="towerFloors"></div>
        </div>
    `;

    document.getElementById('towerHelpBtn').addEventListener('click', showTowerHelp);

    const floorsContainer = document.getElementById('towerFloors');
    floorsContainer.innerHTML = '';

    for (let i = 1; i <= 100; i++) {
        const floorDiv = document.createElement('div');
        floorDiv.className = 'tower-floor';
        if (i === 1) floorDiv.classList.add('first-floor');
        if (i === towerStatus.currentFloor) floorDiv.classList.add('active');
        if (i < towerStatus.currentFloor) floorDiv.classList.add('passed');

        const floorNumberClass = i === 100 ? 'floor-number small' : 'floor-number';

        let iconSrc;
        if (i === 1) {
            iconSrc = '/assets/tower/floor1.png';
        } else if (i % 2 === 0) {
            iconSrc = '/assets/tower/floor_even.png';
        } else {
            iconSrc = '/assets/tower/floor_odd.png';
        }

        const rewardInfo = getFloorRewardInfo(i);
        let rightHtml;

        if (rewardInfo.type === 'coins') {
            rightHtml = `
                <div class="floor-reward coins-reward">
                    <i class="${rewardInfo.icon}" style="color: white;"></i>
                    <span class="reward-amount">${rewardInfo.amount}</span>
                </div>
            `;
        } else {
            rightHtml = `
                <div class="floor-reward skin-reward">
                    <i class="${rewardInfo.icon}" style="color: white;"></i>
                    <span class="reward-label">${rewardInfo.label}</span>
                </div>
            `;
        }

        const centerContent = i === towerStatus.currentFloor
            ? `
                <div class="floor-center start-floor">
                    <img src="${iconSrc}" alt="floor ${i}" onerror="this.style.display='none'; this.parentElement.style.backgroundColor='#2f3542';">
                    <span class="start-label">СТАРТ</span>
                </div>
            `
            : `
                <div class="floor-center">
                    <img src="${iconSrc}" alt="floor ${i}" onerror="this.style.display='none'; this.parentElement.style.backgroundColor='#2f3542';">
                </div>
            `;

        floorDiv.innerHTML = `
            <div class="floor-left">
                <span class="${floorNumberClass}">${i}</span>
                <span class="floor-text">этаж</span>
            </div>
            ${centerContent}
            <div class="floor-right">
                ${rightHtml}
            </div>
        `;
        floorsContainer.appendChild(floorDiv);
    }

    setTimeout(() => {
        const active = document.querySelector('.tower-floor.active');
        if (active) {
            active.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }, 100);

    document.querySelectorAll('.tower-floor').forEach(floorDiv => {
        floorDiv.addEventListener('click', () => {
            const floor = parseInt(floorDiv.querySelector('.floor-number').innerText);
            if (floor === towerStatus.currentFloor) {
                startTowerBattle();
            }
        });
    });
}

async function startTowerBattle() {
    if (towerStatus.attemptsLeft <= 0) {
        showToast('У вас не осталось билетов на сегодня', 1500);
        return;
    }

    try {
        const res = await window.apiRequest('/tower/battle', {
            method: 'POST',
            body: JSON.stringify({})  // user_id добавится автоматически
        });
        const data = await res.json();
        if (!res.ok) {
            if (data.error === 'No tickets left today') {
                showToast('Билеты закончились', 1500);
            } else {
                showToast('Ошибка: ' + data.error, 2000);
            }
            return;
        }
        if (!data.result) {
            console.error('Ответ сервера не содержит result:', data);
            showToast('Ошибка данных боя', 2000);
            return;
        }
        showTowerBattleScreen(data);
    } catch (e) {
        console.error('Ошибка при старте боя:', e);
        showToast('Ошибка соединения', 2000);
    }
}

async function showTowerBattleScreen(battleData) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.pointerEvents = 'none';
        item.style.opacity = '0.5';
    });

    const playerClassForBattle = towerStatus.chosenClass || userData.current_class;
    const playerSubclassForBattle = towerStatus.chosenSubclass || userData.subclass;

    battleData.playerClass = playerClassForBattle;
    battleData.enemyClass = battleData.opponent.class;
    battleData.playerSubclass = playerSubclassForBattle;
    battleData.enemySubclass = battleData.opponent.subclass;

    const playerDisplayClass = towerStatus.chosenClass
        ? (typeof getClassNameRu === 'function' ? getClassNameRu(towerStatus.chosenClass) : towerStatus.chosenClass)
        : getClassNameRu(userData.current_class);
    const playerDisplaySubclass = towerStatus.chosenSubclass
        ? (typeof getRoleNameRu === 'function' ? getRoleNameRu(towerStatus.chosenSubclass) : towerStatus.chosenSubclass)
        : getRoleNameRu(userData.subclass);

    let enemyAvatarSrc = '';
    if (battleData.opponent.is_mouse && battleData.opponent.avatar_filename) {
        enemyAvatarSrc = `/assets/skin-mouse/${battleData.opponent.avatar_filename}`;
    } else if (battleData.opponent.is_cybercat) {
        enemyAvatarSrc = '/assets/cybercat-skin.png';
    } else if (battleData.opponent.avatar_id) {
        enemyAvatarSrc = `/assets/${getAvatarFilenameById(battleData.opponent.avatar_id)}`;
    } else {
        enemyAvatarSrc = '/assets/cat_heroweb.png';
    }

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-screen">
            <div class="battle-header">
                <div>
                    <div>${userData.username}</div>
                    <div class="role-text">${playerDisplayClass} (${playerDisplaySubclass})</div>
                </div>
                <div>
                    <div>${battleData.opponent.username}</div>
                    <div class="role-text">${getClassNameRu(battleData.opponent.class)} (${getRoleNameRu(battleData.opponent.subclass)})</div>
                </div>
            </div>

            <div class="battle-arena">
                <div class="hero-card">
                    <div style="position: relative; width: 110px; height: 165px; margin: 0 auto;">
                        <img src="/assets/${userData.avatar || 'cat_heroweb.png'}" alt="hero" class="hero-avatar-img">
                        <div class="frozen-overlay"><img src="/assets/fight/frozenx.gif" alt="frozen"></div>
                        <div class="defeat-overlay">ПРОИГРАЛ</div>
                        <div id="hero-animation" class="animation-container"></div>
                        <div class="floating-numbers-container" id="hero-floating"></div>
                    </div>
                    <div class="stat-bar hp-bar" style="width: 100px; margin: 3px auto;">
                        <div class="stat-fill hp-fill" id="heroHp" style="width:${(battleData.result.playerHpRemain / battleData.result.playerMaxHp) * 100}%"></div>
                        <div class="stat-text" id="heroHpText">${battleData.result.playerHpRemain ?? 0}/${battleData.result.playerMaxHp ?? 0}</div>
                    </div>
                    <div class="stat-bar mana-bar" style="width: 100px; margin: 1px auto;">
                        <div class="stat-fill mana-fill" id="heroMana" style="width:0%"></div>
                        <div class="stat-text" id="heroManaText">0</div>
                    </div>
                </div>

                <div class="player-debuffs">
                    <div class="debuff-slot" data-side="player" data-slot="0"></div>
                    <div class="debuff-slot" data-side="player" data-slot="1"></div>
                    <div class="debuff-slot" data-side="player" data-slot="2"></div>
                    <div class="debuff-slot" data-side="player" data-slot="3"></div>
                    <div class="debuff-slot" data-side="player" data-slot="4"></div>
                </div>

                <div class="battle-center">
                    <div class="battle-timer" id="battleTimer">∞</div>
                    <div class="speed-wrapper">
                        <div class="speed-label">Скорость:</div>
                        <button id="singleSpeedBtn" class="speed-btn">x1</button>
                    </div>
                </div>

                <div class="enemy-debuffs">
                    <div class="debuff-slot" data-side="enemy" data-slot="0"></div>
                    <div class="debuff-slot" data-side="enemy" data-slot="1"></div>
                    <div class="debuff-slot" data-side="enemy" data-slot="2"></div>
                    <div class="debuff-slot" data-side="enemy" data-slot="3"></div>
                    <div class="debuff-slot" data-side="enemy" data-slot="4"></div>
                </div>

                <div class="enemy-card">
                    <div style="position: relative; width: 110px; height: 165px; margin: 0 auto;">
                        <img src="${enemyAvatarSrc}" alt="enemy" class="enemy-avatar-img">
                        <div class="frozen-overlay"><img src="/assets/fight/frozenx.gif" alt="frozen"></div>
                        <div class="defeat-overlay">ПРОИГРАЛ</div>
                        <div id="enemy-animation" class="animation-container"></div>
                        <div class="floating-numbers-container" id="enemy-floating"></div>
                    </div>
                    <div class="stat-bar hp-bar" style="width: 100px; margin: 3px auto;">
                        <div class="stat-fill hp-fill" id="enemyHp" style="width:${(battleData.result.enemyHpRemain / battleData.result.enemyMaxHp) * 100}%"></div>
                        <div class="stat-text" id="enemyHpText">${battleData.result.enemyHpRemain ?? 0}/${battleData.result.enemyMaxHp ?? 0}</div>
                    </div>
                    <div class="stat-bar mana-bar" style="width: 100px; margin: 1px auto;">
                        <div class="stat-fill mana-fill" id="enemyMana" style="width:0%"></div>
                        <div class="stat-text" id="enemyManaText">0</div>
                    </div>
                </div>
            </div>

            <div class="battle-log-container">
                <div class="log-header">Лог боя</div>
                <div id="battleLog" class="battle-log"></div>
            </div>
        </div>
    `;

    BattleLog.init(battleData, document.getElementById('battleLog'), () => {
        handleTowerBattleEnd(battleData);
    });

    const speedBtn = document.getElementById('singleSpeedBtn');
    if (speedBtn) {
        speedBtn.addEventListener('click', () => {
            const newSpeed = BattleLog.speed === 1 ? 2 : 1;
            speedBtn.textContent = newSpeed === 1 ? 'x1' : 'x2';
            BattleLog.setSpeed(newSpeed);
        });
    }
}

async function handleTowerBattleEnd(battleData) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.pointerEvents = 'auto';
        item.style.opacity = '1';
    });

    if (battleData.victory && battleData.reward && battleData.reward.type === 'coins') {
        userData.coins += battleData.reward.amount;
        updateTopBar();
    }

    towerStatus.currentFloor = battleData.newFloor;
    towerStatus.attemptsLeft = battleData.attemptsLeft;

    // Проверяем, повысился ли уровень
    if (battleData.leveledUp) {
        await refreshData();
        showLevelUpModal(towerStatus.chosenClass || userData.current_class);
    }

    showTowerResultScreen(battleData);
}

function showTowerResultScreen(battleData) {
    const { result, victory, reward, newFloor, floor } = battleData;
    const resultText = victory ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ';
    const resultColor = victory ? '#2ecc71' : '#e74c3c';
    const passedFloor = floor;
    const expGain = battleData.expGain || 0;

    const { playerStats, enemyStats } = computeTowerStats(result.messages);

    const logArray = result.messages.map(m => {
        let entryClass = 'log-entry';
        const type = m.type;
        if (type === 'dodge') entryClass += ' dodge-message';
        else if (type && (type.includes('ult') || type === 'fire_ult' || type === 'ice_ult' || type === 'poison_ult')) entryClass += ' ult-message';
        else if (type === 'poison_stack' || type === 'poison_dot') entryClass += ' poison-message';
        else if (type === 'burn_stack' || type === 'burn_dot') entryClass += ' fire-message';
        else if (type === 'freeze_stack' || type === 'frozen_enter' || type === 'frozen_end' || type === 'frozen_continue' || type === 'frozen_already') entryClass += ' ice-message';
        return `<div class="${entryClass}">${BattleLog.formatLogText(m.text)}</div>`;
    }).join('');

    const content = document.getElementById('content');
    content.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'battle-result';

    const header = document.createElement('div');
    header.className = 'battle-result-header';
    header.style.color = resultColor;
    header.innerText = resultText;
    container.appendChild(header);

    const rewardsGrid = document.createElement('div');
    rewardsGrid.className = 'battle-result-stats-grid';

    const addRewardItem = (label, value, iconClass) => {
        const item = document.createElement('div');
        item.className = 'reward-item';
        const icon = document.createElement('i');
        icon.className = iconClass;
        const span = document.createElement('span');
        span.innerHTML = `${label}: ${value}`;
        item.appendChild(icon);
        item.appendChild(span);
        return item;
    };

    rewardsGrid.appendChild(addRewardItem('Этаж', `${passedFloor}`, 'fas fa-chess-rook'));
    if (reward) {
        if (reward.type === 'coins') {
            rewardsGrid.appendChild(addRewardItem('Награда', `${reward.amount}`, 'fas fa-coins'));
       } else if (reward.type === 'avatar') {
    const avatarItem = document.createElement('div');
    avatarItem.className = 'reward-item';
    const icon = document.createElement('i');
    icon.className = 'fas fa-tshirt';
    const span = document.createElement('span');
    // Вместо "Награда: skin11" пишем "Новый скин"
    span.innerHTML = 'Новый скин ';
    const eyeBtn = document.createElement('i');
    eyeBtn.className = 'fas fa-eye';
    eyeBtn.style.cssText = 'margin-left: 8px; cursor: pointer; color: #00aaff;';
    eyeBtn.addEventListener('click', async () => {
        try {
            const res = await window.apiRequest(`/avatars/${reward.avatarId}`, { method: 'GET' });
            const avatar = await res.json();
            // Передаём имя аватара в модалку с переводом
            showAvatarModal(avatar);
        } catch (err) { console.error(err); }
    });
    span.appendChild(eyeBtn);
    avatarItem.appendChild(icon);
    avatarItem.appendChild(span);
    rewardsGrid.appendChild(avatarItem);
}

            window.apiRequest(`/avatars/${reward.avatarId}`, { method: 'GET' })
                .then(res => res.json())
                .then(avatar => {
                    const nameSpan = document.querySelector('#avatarName');
                    if (nameSpan) nameSpan.innerText = avatar.name;
                })
                .catch(err => console.error(err));
        }
    }
    if (victory) {
        rewardsGrid.appendChild(addRewardItem('Опыт', `+${expGain}`, 'fas fa-star'));
    }

    container.appendChild(rewardsGrid);

    const buttonsGrid = document.createElement('div');
    buttonsGrid.className = 'battle-result-buttons';

    const createButton = (text, onClick, isActive = false) => {
        const btn = document.createElement('button');
        btn.className = 'result-btn' + (isActive ? ' active' : '');
        btn.innerText = text;
        btn.addEventListener('click', onClick);
        return btn;
    };

    let actionBtn;
    if (victory) {
        actionBtn = createButton('Следующий этаж', () => startTowerBattle());
    } else {
        if (towerStatus.attemptsLeft > 0) {
            actionBtn = createButton('Повторить', () => startTowerBattle());
        } else {
            actionBtn = createButton('Нет билетов', null);
            actionBtn.disabled = true;
            actionBtn.style.opacity = '0.5';
            actionBtn.style.cursor = 'not-allowed';
        }
    }

    const backBtn = createButton('Назад', () => renderTower());

    let tabLogBtn, tabStatsBtn;

    tabLogBtn = createButton('Лог боя', () => {
        tabLogBtn.classList.add('active');
        tabStatsBtn.classList.remove('active');
        resultContent.innerHTML = logArray;
    }, true);

    tabStatsBtn = createButton('Статистика', () => {
        tabStatsBtn.classList.add('active');
        tabLogBtn.classList.remove('active');
        const statsHtml = `
            <table class="stats-battle">
                <thead>
                    <th>Игрок</th><th>Параметр</th><th>Соперник</th>
                </thead>
                <tbody>
                    <tr><td class="player-col">${playerStats.hits}</td><td>Ударов</td><td class="enemy-col">${enemyStats.hits}</td></tr>
                    <tr><td class="player-col">${playerStats.crits}</td><td>Критов</td><td class="enemy-col">${enemyStats.crits}</td></tr>
                    <tr><td class="player-col">${playerStats.dodges}</td><td>Уклонений</td><td class="enemy-col">${enemyStats.dodges}</td></tr>
                    <tr><td class="player-col">${playerStats.totalDamage}</td><td>Урона</td><td class="enemy-col">${enemyStats.totalDamage}</td></tr>
                    <tr><td class="player-col">${playerStats.heal}</td><td>Исцелено</td><td class="enemy-col">${enemyStats.heal}</td></tr>
                    <tr><td class="player-col">${playerStats.reflect}</td><td>Отражено</td><td class="enemy-col">${enemyStats.reflect}</td></tr>
                </tbody>
            </table>
        `;
        resultContent.innerHTML = statsHtml;
    });

    buttonsGrid.appendChild(actionBtn);
    buttonsGrid.appendChild(backBtn);
    buttonsGrid.appendChild(tabLogBtn);
    buttonsGrid.appendChild(tabStatsBtn);
    container.appendChild(buttonsGrid);

    const resultContent = document.createElement('div');
    resultContent.id = 'resultContent';
    resultContent.className = 'battle-result-content';
    resultContent.innerHTML = logArray;
    container.appendChild(resultContent);

    content.appendChild(container);
}

function computeTowerStats(messages) {
    let playerStats = { hits:0, crits:0, dodges:0, totalDamage:0, heal:0, reflect:0 };
    let enemyStats = { hits:0, crits:0, dodges:0, totalDamage:0, heal:0, reflect:0 };

    messages.forEach(msg => {
        const text = msg.text;
        const attacker = msg.attacker;
        if (!attacker || attacker === 'none') return;

        const targetStats = attacker === 'player' ? playerStats : enemyStats;
        const opponentStats = attacker === 'player' ? enemyStats : playerStats;

        let match = text.match(/Урон -(\d+)/);
        if (match) {
            const dmg = parseInt(match[1]);
            targetStats.hits++;
            targetStats.totalDamage += dmg;
        }

        match = text.match(/Крит\. урон -(\d+)/);
        if (match) {
            const dmg = parseInt(match[1]);
            targetStats.hits++;
            targetStats.crits++;
            targetStats.totalDamage += dmg;
        }

        match = text.match(/Урон от (?:яда|огня) -(\d+)/);
        if (match) {
            const dmg = parseInt(match[1]);
            targetStats.totalDamage += dmg;
        }

        if (text.toLowerCase().includes('уворот')) {
            opponentStats.dodges++;
        }

        match = text.match(/Вампиризм \+(\d+)/);
        if (match) {
            const heal = parseInt(match[1]);
            targetStats.heal += heal;
        }
        match = text.match(/Здоровье \+(\d+)/);
        if (match) {
            const heal = parseInt(match[1]);
            targetStats.heal += heal;
        }

        match = text.match(/Отражение -(\d+)/);
        if (match) {
            const reflect = parseInt(match[1]);
            opponentStats.reflect += reflect;
        }
    });

    return { playerStats, enemyStats };
}

function showAvatarModal(avatar) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = avatar.name;
    modalBody.innerHTML = `
        <div style="text-align: center;">
            <img src="/assets/${avatar.filename}" style="max-width: 200px; border-radius: 10px; margin-bottom: 15px;">
            <button class="tutorial-btn" id="closeAvatarModal" style="width: 100%;">ОКЕЙ</button>
        </div>
    `;

    modal.style.display = 'block';

    document.getElementById('closeAvatarModal').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };
}

function showTowerHelp() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerHTML = `<i class="fas fa-chess-rook"></i> Башня испытаний`;

    const towerDescription = `
        <div class="role-card">
            <h3><i class="fas fa-info-circle"></i> О башне</h3>
            <div class="skill-desc">Каждый сезон вы выбираете одного героя, за которого проходите башню. Менять класс героя можно только с помощью особого билета смены класса.</div>
            <div class="skill-desc" style="margin-top: 5px;">Каждый день даётся <strong>10 билетов</strong> для сражений. Количество билетов обновляется каждый день.</div>
            <div class="skill-desc" style="margin-top: 5px;">За победу на этаже вы получаете награду. С каждым этажом враги становятся сильнее, а награда выше.</div>
        </div>
    `;

    const mouseDescriptions = [
        {
            name: 'Некромант',
            passive: 'Воскрешение – один раз за бой при смертельном уроне восстанавливает часть здоровья и снимает все негативные эффекты.',
            active: 'Неистовство нежити – наносит три удара подряд магической атакой.'
        },
        {
            name: 'Клинок',
            passive: 'Скорость тьмы – каждый ход наносит два удара подряд. Всегда ходит первым.',
            active: 'Уязвимость – наносит мощный удар, игнорирующий защиту. Атака восстанавливает здоровье за счёт вампиризма.'
        },
        {
            name: 'Антимаг',
            passive: 'Поглощение маны – каждая атака крадёт ману у цели и восстанавливает свою.',
            active: 'Антимагический удар – наносит урон, который тем сильнее, чем меньше маны у цели.'
        },
        {
            name: 'Паладин',
            passive: 'Божественный щит – получает на 50% меньше урона.',
            active: 'Неуязвимость – на 2 хода становится неуязвимым.'
        },
        {
            name: 'Алхимик',
            passive: 'Ядовитая атака – каждый удар накладывает отравление на 1 ход. В конце хода цели наносится дополнительный урон.',
            active: 'Адский коктейль – наносит мощный урон и надолго отравляет цель.'
        },
        {
            name: 'Тень',
            passive: 'Призрачная тень – с высокой вероятностью уклоняется от любой атаки.',
            active: 'Исчезновение – становится невидимой на 1 ход, полностью уклоняясь от атак. Затем наносит сокрушительный удар, игнорирующий защиту.'
        }
    ];

    let miceHtml = '';
    mouseDescriptions.forEach(mouse => {
        const passiveParts = mouse.passive.split(' – ');
        const activeParts = mouse.active.split(' – ');
        miceHtml += `
            <div class="role-card">
                <h3>${mouse.name}</h3>
                <div class="skill">
                    <span class="skill-name passive">${passiveParts[0]}</span>
                    <span class="skill-type">(пассивный)</span>
                    <div class="skill-desc">${passiveParts[1] || mouse.passive}</div>
                </div>
                <div class="skill">
                    <span class="skill-name active">${activeParts[0]}</span>
                    <span class="skill-type">(активный)</span>
                    <div class="skill-desc">${activeParts[1] || mouse.active}</div>
                </div>
            </div>
        `;
    });

    modalBody.innerHTML = towerDescription + miceHtml;
    modal.style.display = 'block';

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };
}

function showTutorialOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'tutorialOverlay';
    overlay.className = 'tutorial-overlay';
    overlay.innerHTML = `
        <div class="tutorial-grid">
            <div class="tutorial-left">
                <img src="/assets/tower/cat.png" alt="Кот" class="tutorial-cat">
            </div>
            <div class="tutorial-right" id="tutorialDialog">
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    showIntroStep();
}

function removeTutorialOverlay() {
    const overlay = document.getElementById('tutorialOverlay');
    if (overlay) overlay.remove();
}

function showIntroStep() {
    const dialog = document.getElementById('tutorialDialog');
    dialog.innerHTML = `
        <div class="dialog-content">
            <div class="dialog-text">
                <p>Мяу! Добро пожаловать в Башню Испытаний!</p>
                <p>Здесь ты встретишь сильнейших врагов, поднимаясь этаж за этажом.</p>
                <p>Каждый сезон ты можешь выбрать одного героя, за которого будешь проходить башню.</p>
                <p>Выбранный класс нельзя будет поменять до конца сезона (кроме особых билетов).</p>
                <p>Готов? Тогда выбери своего чемпиона!</p>
            </div>
            <button class="tutorial-btn next-btn" id="nextToClass">Далее</button>
        </div>
    `;
    document.getElementById('nextToClass').addEventListener('click', showClassSelection);
}

function showClassSelection() {
    const dialog = document.getElementById('tutorialDialog');
    dialog.innerHTML = `
        <div class="dialog-content">
            <div class="dialog-text">
                <p>Какой класс героя ты выберешь?</p>
            </div>
            <div class="class-buttons">
                <button class="tutorial-btn class-option" data-class="warrior">Воин</button>
                <button class="tutorial-btn class-option" data-class="assassin">Ассасин</button>
                <button class="tutorial-btn class-option" data-class="mage">Маг</button>
            </div>
            <button class="tutorial-btn next-btn" id="nextToRole" disabled>Далее</button>
        </div>
    `;
    document.querySelectorAll('.class-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.class-option').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedClass = e.target.dataset.class;
            document.getElementById('nextToRole').disabled = false;
        });
    });
    document.getElementById('nextToRole').addEventListener('click', showRoleSelection);
}

function showRoleSelection() {
    const dialog = document.getElementById('tutorialDialog');
    const roles = {
        warrior: ['guardian', 'berserker', 'knight'],
        assassin: ['assassin', 'venom_blade', 'blood_hunter'],
        mage: ['pyromancer', 'cryomancer', 'illusionist']
    };
    const roleNames = {
        guardian: 'Страж', berserker: 'Берсерк', knight: 'Рыцарь',
        assassin: 'Убийца', venom_blade: 'Ядовитый клинок', blood_hunter: 'Кровавый охотник',
        pyromancer: 'Поджигатель', cryomancer: 'Ледяной маг', illusionist: 'Иллюзионист'
    };
    const roleList = roles[selectedClass];
    dialog.innerHTML = `
        <div class="dialog-content">
            <div class="dialog-text">
                <p>Какую роль ты выберешь?</p>
            </div>
            <div class="role-buttons">
                ${roleList.map(role => `<button class="tutorial-btn role-option" data-role="${role}">${roleNames[role]}</button>`).join('')}
            </div>
            <div class="dialog-nav">
                <button class="tutorial-btn back-btn" id="backToClass">Назад</button>
                <button class="tutorial-btn confirm-btn" id="confirmRole" disabled>Подтвердить</button>
            </div>
        </div>
    `;
    document.querySelectorAll('.role-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.role-option').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedSubclass = e.target.dataset.role;
            document.getElementById('confirmRole').disabled = false;
        });
    });
    document.getElementById('backToClass').addEventListener('click', showClassSelection);
    document.getElementById('confirmRole').addEventListener('click', confirmSelection);
}

async function confirmSelection() {
    if (!selectedClass || !selectedSubclass) return;

    try {
        const res = await window.apiRequest('/tower/select-class', {
            method: 'POST',
            body: JSON.stringify({
                class: selectedClass,
                subclass: selectedSubclass
            })
        });
        const data = await res.json();
        if (data.success) {
            towerStatus.chosenClass = selectedClass;
            towerStatus.chosenSubclass = selectedSubclass;
            removeTutorialOverlay();
            renderTower();
        } else {
            showToast('Ошибка при выборе класса: ' + data.error, 2000);
        }
    } catch (e) {
        console.error(e);
        showToast('Ошибка соединения', 2000);
    }
}
