// battleUI.js – экран боя с поддержкой i18n
console.log('🔄 battleUI.js loaded');

// Заранее резервируем глобальную функцию (на случай, если скрипт прервётся)
window.startBattle = function() {
    console.warn('⚠️ startBattle called from fallback – full definition will override this.');
};

// Переопределяем getRoleNameRu (без const, т.к. она уже объявлена глобально)
getRoleNameRu = (role) => {
    const key = `subclasses:${role}.name`;
    return window.$t(key, role);
};

// Определяем getClassNameRu через i18n, если она ещё не определена
if (typeof getClassNameRu === 'undefined') {
    window.getClassNameRu = function(classKey) {
        const map = {
            warrior: window.$t('common:Воин', 'Воин'),
            assassin: window.$t('common:Ассасин', 'Ассасин'),
            mage: window.$t('common:Маг', 'Маг')
        };
        return map[classKey] || classKey;
    };
}

async function startBattle() {
    console.log('⚔️ startBattle called');
    // Включаем боевую музыку
    if (window.AudioManager && typeof AudioManager.startFightMusic === 'function') {
        AudioManager.startFightMusic();
    } else if (window.AudioManager && typeof AudioManager.onScreenChange === 'function') {
        AudioManager.onScreenChange();
    }
    if (!userData || !userData.id) {
        console.error('user_id не определён!');
        showToast(window.$t('battle:user_id_error', 'Ошибка: не удалось идентифицировать пользователя'), 2000);
        unlockMenu();
        return;
    }

    if (window.battleTimer) {
        clearInterval(window.battleTimer);
        window.battleTimer = null;
    }

    try {
        const response = await window.apiRequest('/battle/start', {
            method: 'POST',
            body: JSON.stringify({ 
                playerName: window.playerName || userData.username || 'Player'
            })
        });
        console.log('[startBattle] response status:', response.status);
        const data = await response.json();
        console.log('[startBattle] response data:', data);

        if (!response.ok) {
            console.error('Ошибка сервера:', data);
            if (data.error === 'Недостаточно энергии') {
                showToast(window.$t('battle:Недостаточно энергии!', 'Недостаточно энергии!'), 1500);
            } else {
                showToast(window.$t('battle:Ошибка сервера: ', 'Ошибка сервера: ') + (data.error || window.$t('common:Неизвестная ошибка', 'Неизвестная ошибка')), 2000);
            }
            unlockMenu();
            return;
        }

        BattleLog.stop();
        showBattleScreen(data);
    } catch (error) {
        console.error('Ошибка запроса:', error);
        showToast(window.$t('battle:Ошибка соединения с сервером', 'Ошибка соединения с сервером'), 2000);
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
    if (!userData) {
        console.warn('showBattleScreen: userData not ready, skipping');
        return;
    }
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.pointerEvents = 'none';
        item.style.opacity = '0.5';
    });

    battleData.playerClass = userData.current_class;
    battleData.enemyClass = battleData.opponent.class;
    battleData.playerSubclass = userData.subclass;
    battleData.enemySubclass = battleData.opponent.subclass;

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
                <!-- === HERO CARD === -->
                <div class="hero-card">
                    <div style="position: relative; margin: 0 auto;">
                        <img src="/assets/${userData.avatar || 'cat_heroweb.png'}" alt="hero" class="hero-avatar-img">
                        ${userData.subscription_expiry && new Date(userData.subscription_expiry) > new Date() ? '<i class="fas fa-crown" style="position: absolute; top: 5px; left: 5px; color: #c0c0c0; font-size: 14px; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5)); pointer-events: none; z-index: 25;"></i>' : ''}
                        <div class="frozen-overlay"><img src="/assets/fight/frozenx.gif" alt="frozen"></div>
                        <div class="defeat-overlay">${window.$t('battle:Проиграл', 'Проиграл')}</div>
                        <div class="floating-numbers-container" id="hero-floating"></div>
                    </div>
                    <div id="hero-animation" class="animation-container"></div>
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
                        <div class="speed-label">${window.$t('battle:Скорость:', 'Скорость:')}</div>
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

                <!-- === ENEMY CARD === -->
                <div class="enemy-card">
                    <div style="position: relative; margin: 0 auto;">
                        <img src="/assets/${battleData.opponent.is_cybercat ? 'cybercat-skin.png' : (battleData.opponent.avatar_id ? getAvatarFilenameById(battleData.opponent.avatar_id) : 'cat_heroweb.png')}" alt="enemy" class="enemy-avatar-img">
                        <div class="frozen-overlay"><img src="/assets/fight/frozenx.gif" alt="frozen"></div>
                        <div class="defeat-overlay">${window.$t('battle:Проиграл', 'Проиграл')}</div>
                        <div class="floating-numbers-container" id="enemy-floating"></div>
                    </div>
                    <div id="enemy-animation" class="animation-container"></div>
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
                <div class="log-header">${window.$t('battle:Лог боя', 'Лог боя')}</div>
                <div id="battleLog" class="battle-log"></div>
            </div>
        </div>
    `;

    // Инициализация лога боя
    battleData.playerAvatarId = userData.avatar_id;
    battleData.enemyAvatarId = battleData.opponent.avatar_id;
    battleData.enemyIsCybercat = battleData.opponent.is_cybercat || false;

    document.querySelectorAll('.defeat-overlay').forEach(el => el.textContent = '');

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

    if (window.AudioManager && typeof AudioManager.startFightMusic === 'function') {
        AudioManager.startFightMusic();
    }
}


async function showBattleResult(battleData, timeOut = false) {
    if (!userData) {
        console.warn('showBattleResult: userData not ready, skipping');
        return;
    }
    console.log('=== showBattleResult START ===');
    console.log('battleData:', battleData);
    console.log('userData:', userData);
    console.log('typeof refreshTasksData:', typeof refreshTasksData);
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
    const resultText = isVictory ? window.$t('battle:ПОБЕДА', 'ПОБЕДА') : (winner === 'draw' ? window.$t('battle:НИЧЬЯ', 'НИЧЬЯ') : window.$t('battle:ПОРАЖЕНИЕ', 'ПОРАЖЕНИЕ'));
    const resultColor = isVictory ? '#2ecc71' : (winner === 'draw' ? '#ffffff' : '#e74c3c');

    if (typeof AudioManager !== 'undefined' && AudioManager.playSound) {
        if (isVictory) {
            AudioManager.playSound('victory');
        } else if (winner === 'draw') {
            // ничего
        } else {
            AudioManager.playSound('defeat');
        }
    }

    const expGain = battleData.reward?.exp || 0;
    const coinGain = battleData.reward?.coins || 0;
    const ratingChange = battleData.ratingChange || 0;
    const newStreak = battleData.reward?.newStreak || 0;

    console.log('battleUI: отправляю update/battle...');
    try {
        await window.apiRequest('/tasks/daily/update/battle', {
            method: 'POST',
            body: JSON.stringify({ 
                class_played: userData.current_class, 
                is_victory: isVictory,
                user_id: userData.id,
                tg_id: userData.tg_id || 0
            })
        });
        console.log('battleUI: update/battle успех');
    } catch (err) { console.error('update/battle ошибка:', err); }

    console.log('battleUI: отправляю update/exp...');
    try {
        await window.apiRequest('/tasks/daily/update/exp', {
            method: 'POST',
            body: JSON.stringify({ 
                exp_gained: expGain,
                user_id: userData.id,
                tg_id: userData.tg_id || 0
            })
        });
        console.log('battleUI: update/exp успех');
    } catch (err) { console.error('update/exp ошибка:', err); }
     
    if (typeof refreshTasksData === 'function') {
        await refreshTasksData();
        if (typeof loadDailyTasks === 'function') {
            loadDailyTasks();
        }
        console.log('battleUI: refreshTasksData выполнен');
    }

    if (battleData.reward?.leveledUp) {
        try {
            await refreshData();
            if (currentScreen === 'profile' && profileTab === 'upgrade') {
                renderSkills(document.getElementById('profileContent'));
            }
            if (currentScreen === 'main') {
                const levelSpan = document.querySelector('.level-display');
                const expSpan = document.querySelector('.exp-display');
                if (levelSpan && expSpan && userData) {
                    const classData = getCurrentClassData();
                    const nextExp = Math.floor(80 * Math.pow(classData.level, 1.5));
                    levelSpan.innerText = classData.level;
                    expSpan.innerText = `${classData.exp}/${nextExp}`;
                    const expBarFill = document.querySelector('.exp-bar-fill');
                    if (expBarFill) expBarFill.style.width = ((classData.exp / nextExp) * 100) + '%';
                }
            }
        } catch(e) { console.error('refreshData ошибка:', e); }
        showLevelUpModal(userData.current_class);
    }

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
        const textSpan = document.createElement('span');
        textSpan.innerHTML = `${label}: ${value}`;
        item.appendChild(icon);
        item.appendChild(textSpan);
        return item;
    };

    const baseItems = [
        addRewardItem(window.$t('battle:Опыт', 'Опыт'), `+${expGain}`, 'fas fa-star'),
        addRewardItem(window.$t('battle:Монеты', 'Монеты'), `+${coinGain}`, 'fas fa-coins'),
        addRewardItem(window.$t('battle:Рейтинг', 'Рейтинг'), `${ratingChange > 0 ? '+' : ''}${ratingChange}`, 'fas fa-chart-line'),
        addRewardItem(window.$t('battle:Серия', 'Серия'), `${newStreak}`, 'fas fa-shield-alt')
    ];
    baseItems.forEach(item => rewardsGrid.appendChild(item));

    if (battleData.coalGain && battleData.coalGain > 0) {
        const coalItem = addRewardItem(window.$t('battle:Уголь', 'Уголь'), `+${battleData.coalGain}`, 'fas fa-cube');
        coalItem.querySelector('i').style.color = '#00aaff';
        rewardsGrid.appendChild(coalItem);
    }
    if (battleData.scrollGain) {
        const scrollItem = addRewardItem(window.$t('battle:Свиток', 'Свиток'), window.$t('common:Редкое', 'Редкое'), 'fas fa-scroll');
        scrollItem.querySelector('i').style.color = '#00aaff';
        rewardsGrid.appendChild(scrollItem);
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

    const rematchBtn = createButton(window.$t('battle:В бой', 'В бой'), async () => {
        if (window.battleTimer) clearInterval(window.battleTimer);
        BattleLog.stop();
        await refreshData();
        startBattle();
    });

    const backBtn = createButton(window.$t('common:Назад', 'Назад'), async () => {
        if (window.battleTimer) clearInterval(window.battleTimer);
        BattleLog.stop();
        document.querySelectorAll('.menu-item').forEach(item => {
            item.style.pointerEvents = 'auto';
            item.style.opacity = '1';
        });
        await refreshData();
        if (window.AudioManager && typeof AudioManager.startMenuMusic === 'function') {
            AudioManager.startMenuMusic();
        } else if (window.AudioManager && typeof AudioManager.onScreenChange === 'function') {
            AudioManager.onScreenChange();
        }
        showScreen('main');
    });

    let tabLogBtn, tabStatsBtn;

    tabLogBtn = createButton(window.$t('battle:Лог боя', 'Лог боя'), () => {
        tabLogBtn.classList.add('active');
        tabStatsBtn.classList.remove('active');
        resultContent.innerHTML = logArray;
    }, true);

    tabStatsBtn = createButton(window.$t('battle:Статистика', 'Статистика'), () => {
        tabStatsBtn.classList.add('active');
        tabLogBtn.classList.remove('active');
        
        const table = document.createElement('table');
        table.className = 'stats-battle';
        
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const th1 = document.createElement('th');
        th1.innerText = window.$t('battle:Игрок', 'Игрок');
        const th2 = document.createElement('th');
        th2.innerText = window.$t('battle:Параметр', 'Параметр');
        const th3 = document.createElement('th');
        th3.innerText = window.$t('battle:Соперник', 'Соперник');
        headerRow.appendChild(th1);
        headerRow.appendChild(th2);
        headerRow.appendChild(th3);
        
        const tbody = table.createTBody();
        const rowsData = [
            [playerStats.hits, window.$t('battle:Ударов', 'Ударов'), enemyStats.hits],
            [playerStats.crits, window.$t('battle:Критов', 'Критов'), enemyStats.crits],
            [playerStats.dodges, window.$t('battle:Уклонений', 'Уклонений'), enemyStats.dodges],
            [playerStats.totalDamage, window.$t('battle:Урона', 'Урона'), enemyStats.totalDamage],
            [playerStats.heal, window.$t('battle:Исцелено', 'Исцелено'), enemyStats.heal],
            [playerStats.reflect, window.$t('battle:Отражено', 'Отражено'), enemyStats.reflect]
        ];
        
        for (const [playerVal, param, enemyVal] of rowsData) {
            const row = tbody.insertRow();
            const cellPlayer = row.insertCell();
            cellPlayer.className = 'player-col';
            cellPlayer.innerText = playerVal;
            const cellParam = row.insertCell();
            cellParam.innerText = param;
            const cellEnemy = row.insertCell();
            cellEnemy.className = 'enemy-col';
            cellEnemy.innerText = enemyVal;
        }
        
        resultContent.innerHTML = '';
        resultContent.appendChild(table);
    }, false);

    tabLogBtn.classList.add('active');
    tabStatsBtn.classList.remove('active');

    buttonsGrid.appendChild(rematchBtn);
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

// Явно экспортируем в глобальную область
window.startBattle = startBattle;
window.showBattleScreen = showBattleScreen;
window.showBattleResult = showBattleResult;
console.log('✅ battleUI.js полностью загружен, startBattle определена');
