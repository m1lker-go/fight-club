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





