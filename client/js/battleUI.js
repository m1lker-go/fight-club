// battleUI.js

async function startBattle() {
    if (!userData || !userData.tg_id) {
        console.error('tg_id не определён!');
        alert('Ошибка: не удалось идентифицировать пользователя');
        unlockMenu();
        return;
    }

    if (window.battleTimer) {
        clearInterval(window.battleTimer);
        window.battleTimer = null;
    }

    try {
        const response = await fetch('https://fight-club-api-4och.onrender.com/battle/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                tg_id: userData.tg_id,
                playerName: window.playerName || userData.username || 'Player'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Ошибка сервера:', data);
            alert('Ошибка сервера: ' + (data.error || 'Неизвестная ошибка'));
            unlockMenu();
            return;
        }

        BattleLog.stop();
        showBattleScreen(data);
    } catch (error) {
        console.error('Ошибка запроса:', error);
        alert('Ошибка соединения с сервером');
        unlockMenu();
    }
}

function unlockMenu() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.pointerEvents = 'auto';
        item.style.opacity = '1';
    });
}

function showBattleScreen(battleData) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.pointerEvents = 'none';
        item.style.opacity = '0.5';
    });

    battleData.playerClass = userData.current_class;
    battleData.enemyClass = battleData.opponent.class;
    battleData.playerSubclass = userData.subclass;
    battleData.enemySubclass = battleData.opponent.subclass;

    const getRoleNameRu = (role) => {
        const roles = {
            guardian: 'Страж', berserker: 'Берсерк', knight: 'Рыцарь',
            assassin: 'Убийца', venom_blade: 'Ядовитый клинок', blood_hunter: 'Кровавый охотник',
            pyromancer: 'Поджигатель', cryomancer: 'Ледяной маг', illusionist: 'Иллюзионист'
        };
        return roles[role] || role;
    };

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-screen">
            <div class="battle-header">
                <div>
                    <div>${userData.username}</div>
                    <div class="role-text">${getClassNameRu(userData.current_class)} (${getRoleNameRu(userData.subclass)})</div>
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
                    <div class="battle-timer" id="battleTimer">45</div>
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
                        <img src="/assets/${battleData.opponent.is_cybercat ? 'cybercat-skin.png' : (battleData.opponent.avatar_id ? getAvatarFilenameById(battleData.opponent.avatar_id) : 'cat_heroweb.png')}" alt="enemy" class="enemy-avatar-img">
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

    BattleLog.init(battleData, document.getElementById('battleLog'), (finishedData) => showBattleResult(finishedData));

    const speedBtn = document.getElementById('singleSpeedBtn');
    speedBtn.addEventListener('click', () => {
        const newSpeed = BattleLog.speed === 1 ? 2 : 1;
        speedBtn.textContent = newSpeed === 1 ? 'x1' : 'x2';
        BattleLog.setSpeed(newSpeed);
    });

    let timeLeft = 45;
    const timerEl = document.getElementById('battleTimer');
    window.battleTimer = setInterval(() => {
        timeLeft--;
        timerEl.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(window.battleTimer);
            window.battleTimer = null;
            BattleLog.stop();
            const playerPercent = battleData.result.playerHpRemain / battleData.result.playerMaxHp;
            const enemyPercent = battleData.result.enemyHpRemain / battleData.result.enemyMaxHp;
            let winner = playerPercent > enemyPercent ? 'player' : (enemyPercent > playerPercent ? 'enemy' : 'draw');
            showBattleResult({ ...battleData, result: { ...battleData.result, winner } }, true);
        }
    }, 1000);
}




async function showBattleResult(battleData, timeOut = false) {
    if (window.battleTimer) {
        clearInterval(window.battleTimer);
        window.battleTimer = null;
    }

    if (battleData.newEnergy !== undefined) {
        userData.energy = battleData.newEnergy;
        updateTopBar();
    }

    const winner = battleData.result.winner;
    const isVictory = (winner === 'player');
    const resultText = isVictory ? 'ПОБЕДА' : (winner === 'draw' ? 'НИЧЬЯ' : 'ПОРАЖЕНИЕ');
    const resultColor = isVictory ? '#2ecc71' : (winner === 'draw' ? '#ffffff' : '#e74c3c');

    const expGain = battleData.reward?.exp || 0;
    const coinGain = battleData.reward?.coins || 0;
    const ratingChange = battleData.ratingChange || 0;
    const newStreak = battleData.reward?.newStreak || 0;

    const leveledUp = addExpToCurrentClass(expGain);
    if (leveledUp) {
        await refreshData();
        showLevelUpModal(userData.current_class);
    }

    // Обновление заданий (оставляем как есть)
    try {
        await fetch('https://fight-club-api-4och.onrender.com/tasks/daily/update/battle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id, class_played: userData.current_class, is_victory: isVictory })
        });
    } catch (err) { console.error(err); }

    try {
        await fetch('https://fight-club-api-4och.onrender.com/tasks/daily/update/exp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id, exp_gained: expGain })
        });
    } catch (err) { console.error(err); }

    // Подсчёт статистики (оставляем без изменений)
    let playerStats = { hits:0, crits:0, dodges:0, totalDamage:0, heal:0, reflect:0 };
    let enemyStats = { hits:0, crits:0, dodges:0, totalDamage:0, heal:0, reflect:0 };

    battleData.result.messages.forEach(msg => {
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

    // Формируем лог боя
    const logArray = battleData.result.messages.map(m => {
        const text = m.text || JSON.stringify(m);
        const formattedText = typeof BattleLog.formatLogText === 'function' ? BattleLog.formatLogText(text) : text;
        let entryClass = 'log-entry';
        const type = m.type;
        if (type === 'dodge') entryClass += ' dodge-message';
        else if (type && (type.includes('ult') || type === 'fire_ult' || type === 'ice_ult' || type === 'poison_ult')) entryClass += ' ult-message';
        else if (type === 'poison_stack' || type === 'poison_dot') entryClass += ' poison-message';
        else if (type === 'burn_stack' || type === 'burn_dot') entryClass += ' fire-message';
        else if (type === 'freeze_stack' || type === 'frozen_enter' || type === 'frozen_end' || type === 'frozen_continue' || type === 'frozen_already') entryClass += ' ice-message';
        return `<div class="${entryClass}">${formattedText}</div>`;
    }).join('');

    // Создаём контейнер результата
    const content = document.getElementById('content');
    content.innerHTML = '';

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';
    container.style.backgroundColor = '#232833';
    container.style.overflow = 'hidden';

    // Заголовок
    const header = document.createElement('div');
    header.style.backgroundColor = '#1a1f2b';
    header.style.textAlign = 'center';
    header.style.fontSize = '28px';
    header.style.fontWeight = 'bold';
    header.style.padding = '16px';
    header.style.borderRadius = '12px 12px 0 0';
    header.style.color = resultColor;
    header.innerText = resultText;
    container.appendChild(header);

    // Блок наград (сетка)
    const rewardsGrid = document.createElement('div');
    rewardsGrid.style.display = 'grid';
    rewardsGrid.style.gridTemplateColumns = 'auto 1fr';
    rewardsGrid.style.gap = '8px 16px';
    rewardsGrid.style.backgroundColor = '#2a303c';
    rewardsGrid.style.padding = '12px 16px';
    rewardsGrid.style.alignItems = 'center';
    rewardsGrid.style.fontSize = '14px';

    const addRewardRow = (label, value, iconClass) => {
        const labelDiv = document.createElement('div');
        labelDiv.style.display = 'flex';
        labelDiv.style.alignItems = 'center';
        labelDiv.style.gap = '6px';
        labelDiv.style.color = '#ccc';
        const icon = document.createElement('i');
        icon.className = iconClass;
        icon.style.color = '#00aaff';
        icon.style.width = '20px';
        icon.style.textAlign = 'center';
        const span = document.createElement('span');
        span.innerText = label;
        labelDiv.appendChild(icon);
        labelDiv.appendChild(span);

        const valueDiv = document.createElement('div');
        valueDiv.style.fontWeight = 'bold';
        valueDiv.style.color = 'white';
        valueDiv.style.textAlign = 'right';
        valueDiv.innerText = value;

        rewardsGrid.appendChild(labelDiv);
        rewardsGrid.appendChild(valueDiv);
    };

    addRewardRow('Опыт:', `+${expGain}`, 'fas fa-star');
    addRewardRow('Монеты:', `+${coinGain}`, 'fas fa-coins');
    addRewardRow('Рейтинг:', `${ratingChange > 0 ? '+' : ''}${ratingChange}`, 'fas fa-chart-line');
    addRewardRow('Серия:', `${newStreak}`, 'fas fa-fist-raised');

    container.appendChild(rewardsGrid);

    // Кнопки (сетка 2×2)
    const buttonsGrid = document.createElement('div');
    buttonsGrid.style.display = 'grid';
    buttonsGrid.style.gridTemplateColumns = '1fr 1fr';
    buttonsGrid.style.backgroundColor = '#1a1f2b';
    buttonsGrid.style.padding = '5px';
    buttonsGrid.style.gap = '0';

    const createButton = (text, onClick, isActive = false) => {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.style.backgroundColor = isActive ? '#00aaff' : '#1a1f2b';
        btn.style.border = `1px solid ${isActive ? '#00aaff' : '#aaa'}`;
        btn.style.padding = '14px 0';
        btn.style.fontSize = '16px';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.color = isActive ? 'white' : '#aaa';
        btn.style.transition = 'none';
        btn.style.pointerEvents = 'auto';
        btn.style.zIndex = '2';
        btn.addEventListener('click', onClick);
        return btn;
    };

    const rematchBtn = createButton('В бой', async () => {
        if (window.battleTimer) clearInterval(window.battleTimer);
        BattleLog.stop();
        await refreshData();
        startBattle();
    });

    const backBtn = createButton('Назад', async () => {
        if (window.battleTimer) clearInterval(window.battleTimer);
        BattleLog.stop();
        document.querySelectorAll('.menu-item').forEach(item => {
            item.style.pointerEvents = 'auto';
            item.style.opacity = '1';
        });
        await refreshData();
        showScreen('main');
    });

    let tabLogBtn, tabStatsBtn;

    tabLogBtn = createButton('Лог боя', () => {
        tabLogBtn.style.backgroundColor = '#00aaff';
        tabLogBtn.style.color = 'white';
        tabLogBtn.style.borderColor = '#00aaff';
        tabStatsBtn.style.backgroundColor = '#1a1f2b';
        tabStatsBtn.style.color = '#aaa';
        tabStatsBtn.style.borderColor = '#aaa';
        resultContent.innerHTML = logArray;
    }, true);

    tabStatsBtn = createButton('Статистика', () => {
        tabStatsBtn.style.backgroundColor = '#00aaff';
        tabStatsBtn.style.color = 'white';
        tabStatsBtn.style.borderColor = '#00aaff';
        tabLogBtn.style.backgroundColor = '#1a1f2b';
        tabLogBtn.style.color = '#aaa';
        tabLogBtn.style.borderColor = '#aaa';

        const statsHtml = `
            <table class="stats-table stats-battle" style="width:100%; border-collapse:collapse; font-size:14px;">
                <thead>
                    <th style="padding:12px 8px; text-align:center; background-color:#1a1f2b; color:white;">Игрок</th>
                    <th style="padding:12px 8px; text-align:center; background-color:#1a1f2b; color:white;">Параметр</th>
                    <th style="padding:12px 8px; text-align:center; background-color:#1a1f2b; color:white;">Соперник</th>
                </thead>
                <tbody>
                    <td style="padding:10px 8px; text-align:center; background-color:#232833; color:#00aaff;">${playerStats.hits}</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#232833; color:white;">Ударов</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#232833; color:#e74c3c;">${enemyStats.hits}</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#2a303c; color:#00aaff;">${playerStats.crits}</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#2a303c; color:white;">Критов</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#2a303c; color:#e74c3c;">${enemyStats.crits}</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#232833; color:#00aaff;">${playerStats.dodges}</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#232833; color:white;">Уклонений</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#232833; color:#e74c3c;">${enemyStats.dodges}</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#2a303c; color:#00aaff;">${playerStats.totalDamage}</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#2a303c; color:white;">Урона</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#2a303c; color:#e74c3c;">${enemyStats.totalDamage}</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#232833; color:#00aaff;">${playerStats.heal}</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#232833; color:white;">Исцелено</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#232833; color:#e74c3c;">${enemyStats.heal}</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#2a303c; color:#00aaff;">${playerStats.reflect}</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#2a303c; color:white;">Отражено</td>
                    <td style="padding:10px 8px; text-align:center; background-color:#2a303c; color:#e74c3c;">${enemyStats.reflect}</td>
                </tbody>
             </table>
        `;
        resultContent.innerHTML = statsHtml;
    });

    buttonsGrid.appendChild(rematchBtn);
    buttonsGrid.appendChild(backBtn);
    buttonsGrid.appendChild(tabLogBtn);
    buttonsGrid.appendChild(tabStatsBtn);
    container.appendChild(buttonsGrid);

    // Контейнер для контента (лог/статистика)
    const resultContent = document.createElement('div');
    resultContent.id = 'resultContent';
    resultContent.style.flex = '1';
    resultContent.style.overflowY = 'auto';
    resultContent.style.backgroundColor = '#232833';
    resultContent.style.padding = '0';
    resultContent.style.margin = '0';
    resultContent.innerHTML = logArray;
    container.appendChild(resultContent);

    content.appendChild(container);

    if (leveledUp) {
        await refreshData();
        showLevelUpModal(userData.current_class);
    }
}
