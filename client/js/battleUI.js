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

    // Обновление заданий
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

    // Подсчёт статистики
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

    // Лог боя
    const logArray = battleData.result.messages.map((m, index) => {
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

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-result">
            <div class="battle-result-header" style="color: ${resultColor};">${resultText}</div>
            <div class="battle-result-stats-grid">
                <div class="stat-item"><i class="fas fa-star"></i> Опыт:</div>
                <div class="stat-value">+${expGain}</div>
                <div class="stat-item"><i class="fas fa-coins"></i> Монеты:</div>
                <div class="stat-value">+${coinGain}</div>
                <div class="stat-item"><i class="fas fa-chart-line"></i> Рейтинг:</div>
                <div class="stat-value">${ratingChange > 0 ? '+' : ''}${ratingChange}</div>
                <div class="stat-item"><i class="fas fa-fist-raised"></i> Серия:</div>
                <div class="stat-value">${newStreak}</div>
            </div>
            <div class="battle-result-buttons">
                <button class="result-btn" id="rematchBtn">В бой</button>
                <button class="result-btn" id="backBtn">Назад</button>
                <button class="result-btn result-tab active" id="tabLog">Лог боя</button>
                <button class="result-btn result-tab" id="tabStats">Статистика</button>
            </div>
            <div class="battle-result-content" id="resultContent">
                ${logArray}
            </div>
        </div>
    `;

    const resultDiv = document.getElementById('resultContent');
    const tabLog = document.getElementById('tabLog');
    const tabStats = document.getElementById('tabStats');

    tabLog.addEventListener('click', () => {
        tabLog.classList.add('active');
        tabStats.classList.remove('active');
        resultDiv.innerHTML = logArray;
    });

  tabStats.addEventListener('click', () => {
    tabLog.classList.remove('active');
    tabStats.classList.add('active');
    resultDiv.innerHTML = `
        <table class="stats-table stats-battle">
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
});

    document.getElementById('rematchBtn').addEventListener('click', async () => {
        if (window.battleTimer) clearInterval(window.battleTimer);
        BattleLog.stop();
        await refreshData();
        startBattle();
    });

    document.getElementById('backBtn').addEventListener('click', async () => {
        if (window.battleTimer) clearInterval(window.battleTimer);
        BattleLog.stop();
        document.querySelectorAll('.menu-item').forEach(item => {
            item.style.pointerEvents = 'auto';
            item.style.opacity = '1';
        });
        await refreshData();
        showScreen('main');
    });

    if (leveledUp) {
        await refreshData();
        showLevelUpModal(userData.current_class);
    }
}
