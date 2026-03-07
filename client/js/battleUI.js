// battleUI.js

// ==================== БОЙ ====================
async function startBattle() {
    try {
        const res = await fetch('https://fight-club-api-4och.onrender.com/battle/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id })
        });
        const data = await res.json();
        if (data.error) {
            alert(data.error);
            return;
        }
        showBattleScreen(data);
    } catch (error) {
        console.error('Battle start error:', error);
        alert('Ошибка соединения с сервером');
    }
}

function showBattleScreen(battleData) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.pointerEvents = 'none';
        item.style.opacity = '0.5';
    });

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
            <!-- Верхняя панель с именами -->
            <div class="battle-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 20px;">
                <div style="text-align: left;">
                    <div>${userData.username}</div>
                    <div style="font-size: 12px; color: #aaa;">${getClassNameRu(userData.current_class)} (${getRoleNameRu(userData.subclass)})</div>
                </div>
                <div style="text-align: right;">
                    <div>${battleData.opponent.username}</div>
                    <div style="font-size: 12px; color: #aaa;">${getClassNameRu(battleData.opponent.class)} (${getRoleNameRu(battleData.opponent.subclass)})</div>
                </div>
            </div>

            <!-- Основная арена: 5 колонок -->
            <div class="battle-arena" style="display: flex; align-items: stretch; justify-content: center; gap: 10px; padding: 10px;">
                <!-- Колонка 1: аватар игрока -->
                <div class="hero-card" style="flex: 0 0 100px; display: flex; flex-direction: column; justify-content: flex-start; text-align: center;">
                    <div style="position: relative; width: 80px; height: 120px; margin: 0 auto;">
                        <img src="/assets/${userData.avatar || 'cat_heroweb.png'}" alt="hero" style="width:100%; height:100%; object-fit: cover;">
                        <div id="hero-animation" class="animation-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: none; z-index: 10;"></div>
                    </div>
                    <div class="hp-bar" style="width:80px; margin:5px auto;">
                        <div class="hp-fill" id="heroHp" style="width:${(battleData.result.playerHpRemain / battleData.result.playerMaxHp) * 100}%"></div>
                    </div>
                    <div id="heroHpText" style="font-size:12px;">${battleData.result.playerHpRemain ?? 0}/${battleData.result.playerMaxHp ?? 0}</div>
                    <div class="mana-bar" style="width:80px; margin:2px auto;">
                        <div class="mana-fill" id="heroMana" style="width:0%"></div>
                    </div>
                </div>

                <!-- Колонка 2: стаки на игроке -->
                <div class="player-debuffs" style="flex: 0 0 30px; display: flex; flex-direction: column; justify-content: flex-start; gap: 2px;">
                    <div class="debuff-slot" data-side="player" data-slot="0" style="width:22px; height:22px; margin:0 auto; display: flex; align-items: center; justify-content: center; background: none;"></div>
                    <div class="debuff-slot" data-side="player" data-slot="1" style="width:22px; height:22px; margin:0 auto; display: flex; align-items: center; justify-content: center; background: none;"></div>
                    <div class="debuff-slot" data-side="player" data-slot="2" style="width:22px; height:22px; margin:0 auto; display: flex; align-items: center; justify-content: center; background: none;"></div>
                    <div class="debuff-slot" data-side="player" data-slot="3" style="width:22px; height:22px; margin:0 auto; display: flex; align-items: center; justify-content: center; background: none;"></div>
                    <div class="debuff-slot" data-side="player" data-slot="4" style="width:22px; height:22px; margin:0 auto; display: flex; align-items: center; justify-content: center; background: none;"></div>
                </div>

                <!-- Колонка 3: таймер и кнопка скорости -->
                <div class="battle-center" style="flex: 0 0 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;">
                    <div class="battle-timer" id="battleTimer" style="width: 50px; height: 50px; border: 2px solid #00aaff; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: transparent; color: white; font-weight: bold; font-size: 18px;">45</div>
                    <button id="singleSpeedBtn" class="speed-btn" style="background: #2f3542; border: 1px solid #7f8c8d; color: white; padding: 5px 15px; border-radius: 15px; cursor: pointer; font-weight: bold; opacity: 0.8;">x1</button>
                </div>

                <!-- Колонка 4: стаки на враге -->
                <div class="enemy-debuffs" style="flex: 0 0 30px; display: flex; flex-direction: column; justify-content: flex-start; gap: 2px;">
                    <div class="debuff-slot" data-side="enemy" data-slot="0" style="width:22px; height:22px; margin:0 auto; display: flex; align-items: center; justify-content: center; background: none;"></div>
                    <div class="debuff-slot" data-side="enemy" data-slot="1" style="width:22px; height:22px; margin:0 auto; display: flex; align-items: center; justify-content: center; background: none;"></div>
                    <div class="debuff-slot" data-side="enemy" data-slot="2" style="width:22px; height:22px; margin:0 auto; display: flex; align-items: center; justify-content: center; background: none;"></div>
                    <div class="debuff-slot" data-side="enemy" data-slot="3" style="width:22px; height:22px; margin:0 auto; display: flex; align-items: center; justify-content: center; background: none;"></div>
                    <div class="debuff-slot" data-side="enemy" data-slot="4" style="width:22px; height:22px; margin:0 auto; display: flex; align-items: center; justify-content: center; background: none;"></div>
                </div>

                <!-- Колонка 5: аватар противника -->
                <div class="enemy-card" style="flex: 0 0 100px; display: flex; flex-direction: column; justify-content: flex-start; text-align: center;">
                    <div style="position: relative; width: 80px; height: 120px; margin: 0 auto;">
                        <img src="/assets/${battleData.opponent.avatar_id ? getAvatarFilenameById(battleData.opponent.avatar_id) : 'cat_heroweb.png'}" alt="hero" style="width:100%; height:100%; object-fit: cover;">
                        <div id="enemy-animation" class="animation-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: none; z-index: 10;"></div>
                    </div>
                    <div class="hp-bar" style="width:80px; margin:5px auto;">
                        <div class="hp-fill" id="enemyHp" style="width:${(battleData.result.enemyHpRemain / battleData.result.enemyMaxHp) * 100}%"></div>
                    </div>
                    <div id="enemyHpText" style="font-size:12px;">${battleData.result.enemyHpRemain ?? 0}/${battleData.result.enemyMaxHp ?? 0}</div>
                    <div class="mana-bar" style="width:80px; margin:2px auto;">
                        <div class="mana-fill" id="enemyMana" style="width:0%"></div>
                    </div>
                </div>
            </div>

            <!-- Лог боя -->
            <div class="battle-log" id="battleLog" style="height:250px; overflow-y:auto; background-color:#232833; border-radius:10px; padding:10px; margin-top:10px;"></div>
        </div>
    `;

    const style = document.createElement('style');
    style.innerHTML = `
        .animation-container img { width: 100%; height: 100%; object-fit: contain; }
        .debuff-slot img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            opacity: 0;
            animation: fadeIn 0.3s forwards;
        }
        @keyframes fadeIn {
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    let turnIndex = 0;
    const turns = battleData.result.turns || [];
    const logContainer = document.getElementById('battleLog');
    let speed = 1;
    let interval;
    let currentAnimationTimeout = null;
    let timer;
    let finishTimeout = null;

    // Состояние стаков для игрока и врага
    let playerStacks = { poison: 0, burn: 0, freeze: 0 };
    let enemyStacks = { poison: 0, burn: 0, freeze: 0 };

    const passiveDebuffMap = {
        venom_blade: 'poison',
        pyromancer: 'burn',
        cryomancer: 'freeze'
    };

    // Функция для плавного изменения текста HP
    function animateHpText(elementId, start, end, maxHp, duration = 300) {
        const element = document.getElementById(elementId);
        if (!element) return;
        const steps = 20;
        const stepTime = duration / steps;
        const diff = end - start;
        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            const current = Math.round(start + diff * progress);
            element.innerText = `${current}/${maxHp}`;
            if (currentStep >= steps) {
                clearInterval(interval);
                element.innerText = `${end}/${maxHp}`;
            }
        }, stepTime);
    }

    function setHpBarWidth(barId, percent) {
        const bar = document.getElementById(barId);
        if (bar) bar.style.width = percent + '%';
    }

    function updateStacksVisual(side, type) {
        const slots = document.querySelectorAll(`.debuff-slot[data-side="${side}"]`);
        if (slots.length === 0) return;
        const stacks = (side === 'player' ? playerStacks : enemyStacks)[type];
        let iconSrc = '';
        if (type === 'poison') iconSrc = '/assets/icons/icon_poison.png';
        else if (type === 'burn') iconSrc = '/assets/icons/icon_fire.png';
        else if (type === 'freeze') iconSrc = '/assets/icons/icon_ice.png';
        else return;
        for (let i = 0; i < 5; i++) {
            const slot = slots[i];
            if (!slot) continue;
            if (i < stacks) {
                if (!slot.querySelector('img')) {
                    const img = document.createElement('img');
                    img.src = iconSrc;
                    img.alt = type;
                    slot.innerHTML = '';
                    slot.appendChild(img);
                }
            } else {
                slot.innerHTML = '';
            }
        }
    }

    function addStack(side, type, count = 1) {
        const stacks = (side === 'player' ? playerStacks : enemyStacks);
        const max = (type === 'freeze') ? 3 : 5;
        const old = stacks[type];
        const newVal = Math.min(old + count, max);
        stacks[type] = newVal;
        updateStacksVisual(side, type);
    }

    function resetStack(side, type) {
        const stacks = (side === 'player' ? playerStacks : enemyStacks);
        stacks[type] = 0;
        updateStacksVisual(side, type);
    }

    function clearAllDebuffSlots() {
        document.querySelectorAll('.debuff-slot').forEach(slot => {
            slot.innerHTML = '';
        });
        playerStacks = { poison: 0, burn: 0, freeze: 0 };
        enemyStacks = { poison: 0, burn: 0, freeze: 0 };
    }
    clearAllDebuffSlots();

    function parseActionForDebuffs(action, isPlayerTurn, attackerSubclass) {
        const targetSide = isPlayerTurn ? 'enemy' : 'player';
        const lower = action.toLowerCase();
        const isUltimate = lower.includes('ядовитая волна') || lower.includes('огненный шторм') || lower.includes('вечная зима');

        if (!isUltimate) {
            if (attackerSubclass && passiveDebuffMap[attackerSubclass]) {
                const type = passiveDebuffMap[attackerSubclass];
                addStack(targetSide, type, 1);
            }
        } else {
            if (attackerSubclass === 'venom_blade' && lower.includes('ядовитая волна')) {
                resetStack(targetSide, 'poison');
            }
            if (attackerSubclass === 'pyromancer' && lower.includes('огненный шторм')) {
                resetStack(targetSide, 'burn');
            }
            if (attackerSubclass === 'cryomancer' && lower.includes('вечная зима')) {
                resetStack(targetSide, 'freeze');
            }
        }
    }

    function hideAnimations() {
        if (currentAnimationTimeout) {
            clearTimeout(currentAnimationTimeout);
            currentAnimationTimeout = null;
        }
        const heroAnim = document.getElementById('hero-animation');
        const enemyAnim = document.getElementById('enemy-animation');
        if (heroAnim) {
            heroAnim.style.display = 'none';
            heroAnim.innerHTML = '';
        }
        if (enemyAnim) {
            enemyAnim.style.display = 'none';
            enemyAnim.innerHTML = '';
        }
    }

    function showAnimation(target, animationFile) {
        console.log('showAnimation', target, animationFile);
        hideAnimations();
        const container = document.getElementById(target + '-animation');
        if (!container) return;
        const img = document.createElement('img');
        img.src = `/assets/fight/${animationFile}`;
        container.appendChild(img);
        container.style.display = 'flex';
        currentAnimationTimeout = setTimeout(() => {
            container.style.display = 'none';
            container.innerHTML = '';
            currentAnimationTimeout = null;
        }, 1000);
    }

    function getAnimationForAction(action, isPlayerTurn) {
        action = action.toLowerCase();
        let target = isPlayerTurn ? 'enemy' : 'hero';
        let anim = 'shot.gif';

        // Анимация промаха (уклонение)
        if (action.includes('уклоняется') || action.includes('уворачивается') || action.includes('использует неуловимый манёвр')) {
            anim = 'missx.gif';
            // цель остаётся target (защитник) – это правильно
        }
        else if (action.includes('несокрушимость')) {
            anim = 'hill.gif';
            target = isPlayerTurn ? 'hero' : 'enemy';
        } else if (action.includes('кровопускание')) {
            anim = 'crit.gif';
        } else if (action.includes('щит правосудия')) {
            anim = 'shield.gif';
            target = isPlayerTurn ? 'hero' : 'enemy';
        } else if (action.includes('смертельный удар')) {
            anim = 'ultimate.gif';
        } else if (action.includes('ядовитая волна')) {
            anim = 'poison.gif';
        } else if (action.includes('кровавая жатва')) {
            anim = 'crit.gif';
        } else if (action.includes('огненный шторм')) {
            anim = 'fire.gif';
        } else if (action.includes('вечная зима')) {
            anim = 'ice.gif';
        } else if (action.includes('зазеркалье')) {
            anim = 'chara.gif';
        } else if (action.includes('яд разъедает') || action.includes('отравление')) {
            anim = 'poison.gif';
        } else if (action.includes('пламя пожирает') || action.includes('огонь обжигает') || action.includes('горящие души')) {
            anim = 'fire.gif';
        }

        return { target, anim };
    }

function playTurn() {
    if (turnIndex >= turns.length) {
        clearInterval(interval);
        if (timer) clearInterval(timer);
        if (finishTimeout) clearTimeout(finishTimeout);
        
        const winner = battleData.result.winner;
        if (winner === 'player') {
            showAnimation('enemy', 'defeat.gif');
        } else if (winner === 'enemy') {
            showAnimation('hero', 'defeat.gif');
        }
        
        finishTimeout = setTimeout(() => showBattleResult(battleData), 2000);
        return;
    }

    const turn = turns[turnIndex];
    console.log('turn:', turn.turn, 'isPlayerTurn:', (turn.turn === 'player'), 'action:', turn.action);
    console.log('heroHp after:', turn.playerHp, 'enemyHp after:', turn.enemyHp);

    // Если это финальное сообщение (не ход), просто добавляем его в лог и переходим к следующему
    if (turn.turn === 'final') {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = turn.action || '';
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
        turnIndex++;
        return;
    }

    // Получаем текущие значения HP из DOM (старые)
    const heroHpText = document.getElementById('heroHpText');
    const enemyHpText = document.getElementById('enemyHpText');
    const heroHpBar = document.getElementById('heroHp');
    const enemyHpBar = document.getElementById('enemyHp');

    // Парсим старые значения (они могут быть вида "текущее/макс")
    const heroOld = heroHpText ? parseInt(heroHpText.innerText.split('/')[0]) : 0;
    const enemyOld = enemyHpText ? parseInt(enemyHpText.innerText.split('/')[0]) : 0;

    // Новые значения могут быть undefined – в этом случае оставляем старые
    const heroNew = turn.playerHp !== undefined ? turn.playerHp : heroOld;
    const enemyNew = turn.enemyHp !== undefined ? turn.enemyHp : enemyOld;
    const heroMax = battleData.result.playerMaxHp;
    const enemyMax = battleData.result.enemyMaxHp;

    // Анимация HP (текст) – только если значения изменились и новые не undefined
    if (heroNew !== heroOld && heroHpText) {
        animateHpText('heroHpText', heroOld, heroNew, heroMax, 300);
    }
    if (enemyNew !== enemyOld && enemyHpText) {
        animateHpText('enemyHpText', enemyOld, enemyNew, enemyMax, 300);
    }

    // Устанавливаем ширину полосы
    if (heroHpBar && heroMax) setHpBarWidth('heroHp', (heroNew / heroMax) * 100);
    if (enemyHpBar && enemyMax) setHpBarWidth('enemyHp', (enemyNew / enemyMax) * 100);

    // Обновление маны
    document.getElementById('heroMana').style.width = (turn.playerMana / 100) * 100 + '%';
    document.getElementById('enemyMana').style.width = (turn.enemyMana / 100) * 100 + '%';

    const isPlayerTurn = turn.turn === 'player';
    const attackerSubclass = isPlayerTurn ? userData.subclass : battleData.opponent.subclass;

    // Проверяем, нужно ли пропустить анимацию (только для пропуска хода)
    const actionLower = turn.action ? turn.action.toLowerCase() : '';
    const skipAnimation = actionLower.includes('пропускает ход');

    if (!skipAnimation && turn.action) {
        const { target, anim } = getAnimationForAction(turn.action, isPlayerTurn);
        showAnimation(target, anim);
    }

    parseActionForDebuffs(turn.action, isPlayerTurn, attackerSubclass);

    if (turn.action) {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = turn.action;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    turnIndex++;
}

    const speedBtn = document.getElementById('singleSpeedBtn');
    speedBtn.addEventListener('click', () => {
        speed = (speed === 1) ? 2 : 1;
        speedBtn.textContent = (speed === 1) ? 'x1' : 'x2';
        clearInterval(interval);
        interval = setInterval(playTurn, 1000 / speed);
    });

    playTurn();
    interval = setInterval(playTurn, 2500 / speed);

    let timeLeft = 45;
    const timerEl = document.getElementById('battleTimer');
    timer = setInterval(() => {
        timeLeft--;
        timerEl.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            clearInterval(interval);
            if (finishTimeout) clearTimeout(finishTimeout);
            hideAnimations();
            const playerPercent = battleData.result.playerHpRemain / battleData.result.playerMaxHp;
            const enemyPercent = battleData.result.enemyHpRemain / battleData.result.enemyMaxHp;
            let winner;
            if (playerPercent > enemyPercent) winner = 'player';
            else if (enemyPercent > playerPercent) winner = 'enemy';
            else winner = 'draw';
            showBattleResult({ ...battleData, result: { ...battleData.result, winner } }, true);
        }
    }, 1000);
}

// ==================== ПОКАЗ РЕЗУЛЬТАТА БОЯ ====================
async function showBattleResult(battleData, timeOut = false) {
    if (battleData.newEnergy !== undefined) {
        userData.energy = battleData.newEnergy;
        updateTopBar();
    }

    const winner = battleData.result.winner;
    const isVictory = (winner === 'player');
    const resultText = isVictory ? 'ПОБЕДА' : (winner === 'draw' ? 'НИЧЬЯ' : 'ПОРАЖЕНИЕ');

    const expGain = battleData.reward?.exp || 0;
    const coinGain = battleData.reward?.coins || 0;
    const leveledUp = battleData.reward?.leveledUp || false;
    const newStreak = battleData.reward?.newStreak || 0;
    const ratingChange = battleData.ratingChange || 0;

    try {
        await fetch('https://fight-club-api-4och.onrender.com/tasks/daily/update/battle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tg_id: userData.tg_id,
                class_played: userData.current_class,
                is_victory: isVictory
            })
        });
    } catch (err) {
        console.error('Ошибка /update/battle:', err);
    }

    try {
        await fetch('https://fight-club-api-4och.onrender.com/tasks/daily/update/exp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id, exp_gained: expGain })
        });
    } catch (err) {
        console.error('Ошибка /update/exp:', err);
    }

    let playerStats = { hits:0, crits:0, dodges:0, totalDamage:0, heal:0, reflect:0 };
    let enemyStats = { hits:0, crits:0, dodges:0, totalDamage:0, heal:0, reflect:0 };

    if (battleData.result.turns && Array.isArray(battleData.result.turns)) {
        battleData.result.turns.forEach(turn => {
            if (turn.turn === 'final') return;
            const action = turn.action;
            const isPlayerTurn = turn.turn === 'player';
            const attackerStats = isPlayerTurn ? playerStats : enemyStats;
            const defenderStats = isPlayerTurn ? enemyStats : playerStats;

            const dmgMatch = action.match(/(?:нанос(?:ит|я)|забирая|выбивая|отнимая|—)\s*(?:<span[^>]*>)?(\d+)(?:<\/span>)?\s*(?:урона|жизней|HP|здоровья)?/i);
            if (dmgMatch) {
                const dmg = parseInt(dmgMatch[1]);
                attackerStats.hits++;
                attackerStats.totalDamage += dmg;
                if (action.includes('КРИТИЧЕСКОГО') || action.includes('крита') || action.includes('крит')) {
                    attackerStats.crits++;
                }
            }

            const dodgeMatch = action.match(/([^\s]+)\s+(?:ловко\s+)?(?:уклоняется|уворачивается|использует неуловимый манёвр)/i);
            if (dodgeMatch) {
                const dodgerName = dodgeMatch[1].trim();
                if (dodgerName === userData.username) {
                    playerStats.dodges++;
                } else {
                    enemyStats.dodges++;
                }
            }

            const healMatch = action.match(/восстанавлива(?:ет|я)\s*(?:<span[^>]*>)?(\d+)(?:<\/span>)?\s*очков? здоровья/i);
            if (healMatch) {
                const heal = parseInt(healMatch[1]);
                attackerStats.heal += heal;
            }

            const reflectMatch = action.match(/отражает\s*(?:<span[^>]*>)?(\d+)(?:<\/span>)?\s*урона/i);
            if (reflectMatch) {
                const reflect = parseInt(reflectMatch[1]);
                defenderStats.reflect += reflect;
            }
        });
    }

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-result" style="padding: 10px;">
            <h2 style="text-align:center; margin-bottom:10px;">${resultText}</h2>
            <p style="text-align:center;">Опыт: ${expGain} | Монеты: ${coinGain} | Рейтинг: ${ratingChange > 0 ? '+' : ''}${ratingChange} ${leveledUp ? '🎉' : ''}</p>
            ${isVictory && newStreak > 0 ? `<p style="text-align:center; color:#00aaff;">Серия побед: ${newStreak}</p>` : ''}
            
            <div style="display: flex; gap: 10px; margin-bottom: 15px; justify-content: center;">
                <button class="btn" id="rematchBtn" style="flex: 1;">В бой</button>
                <button class="btn" id="backBtn" style="flex: 1;">Назад</button>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 10px; justify-content: center;">
                <button class="btn result-tab active" id="tabLog" style="flex: 1;">Лог боя</button>
                <button class="btn result-tab" id="tabStats" style="flex: 1;">Статистика</button>
            </div>
            
            <div id="resultContent" style="max-height: 300px; overflow-y: auto; background-color: #232833; padding: 10px; border-radius: 8px;">
                ${battleData.result.log.map(l => `<div class="log-entry">${l}</div>`).join('')}
            </div>
        </div>
    `;

    const resultDiv = document.getElementById('resultContent');
    const tabLog = document.getElementById('tabLog');
    const tabStats = document.getElementById('tabStats');

    tabLog.addEventListener('click', () => {
        tabLog.classList.add('active');
        tabStats.classList.remove('active');
        resultDiv.innerHTML = battleData.result.log.map(l => `<div class="log-entry">${l}</div>`).join('');
    });

    tabStats.addEventListener('click', () => {
        tabLog.classList.remove('active');
        tabStats.classList.add('active');
        resultDiv.innerHTML = `
            <style>
                .stats-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: center;
                    font-size: 14px;
                }
                .stats-table th {
                    color: #00aaff;
                    font-weight: bold;
                    padding-bottom: 8px;
                }
                .stats-table td {
                    padding: 4px 0;
                    border-bottom: 1px solid #2f3542;
                }
                .stats-table .player-col {
                    color: #00aaff;
                    font-weight: bold;
                }
                .stats-table .enemy-col {
                    color: #e74c3c;
                    font-weight: bold;
                }
            </style>
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Игрок</th>
                        <th>Параметр</th>
                        <th>Соперник</th>
                    </tr>
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
        await refreshData();
        startBattle();
    });

    document.getElementById('backBtn').addEventListener('click', async () => {
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
