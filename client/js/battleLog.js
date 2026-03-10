// battleLog.js

// ==================== МОДУЛЬ ОТОБРАЖЕНИЯ ЛОГОВ ====================
const BattleLog = {
    messages: [],
    states: [],
    currentMsgIndex: 0,
    currentStateIndex: 0,
    logContainer: null,
    speed: 1,
    interval: null,
    timer: null,
    finishTimeout: null,
    battleData: null,
    onFinish: null, // callback при завершении боя

    // Инициализация
    init(battleData, logContainer, onFinish) {
        this.messages = battleData.result.messages || [];
        this.states = battleData.result.states || [];
        this.currentMsgIndex = 0;
        this.currentStateIndex = 0;
        this.logContainer = logContainer;
        this.battleData = battleData;
        this.onFinish = onFinish;
        this.speed = 1;

        // Очищаем контейнер лога
        this.logContainer.innerHTML = '';

        // Применяем начальное состояние (если есть)
        if (this.states.length > 0) {
            this.applyState(this.states[0]);
            this.currentStateIndex = 1;
        }

        // Запускаем проигрывание с задержкой
        setTimeout(() => {
            this.playNext();
        }, 500);
    },

    // Применить состояние (обновить HP, ману, иконки)
    applyState(state) {
        // Обновляем HP
        const heroHpText = document.getElementById('heroHpText');
        const enemyHpText = document.getElementById('enemyHpText');
        const heroHpBar = document.getElementById('heroHp');
        const enemyHpBar = document.getElementById('enemyHp');

        if (heroHpText) heroHpText.innerText = `${state.playerHp}/${this.battleData.result.playerMaxHp}`;
        if (enemyHpText) enemyHpText.innerText = `${state.enemyHp}/${this.battleData.result.enemyMaxHp}`;
        if (heroHpBar) this.setBarWidth('heroHp', (state.playerHp / this.battleData.result.playerMaxHp) * 100);
        if (enemyHpBar) this.setBarWidth('enemyHp', (state.enemyHp / this.battleData.result.enemyMaxHp) * 100);

        // Обновляем ману
        if (state.playerMana !== undefined) {
            document.getElementById('heroMana').style.width = (state.playerMana / 100) * 100 + '%';
            document.getElementById('heroManaText').innerText = state.playerMana;
        }
        if (state.enemyMana !== undefined) {
            document.getElementById('enemyMana').style.width = (state.enemyMana / 100) * 100 + '%';
            document.getElementById('enemyManaText').innerText = state.enemyMana;
        }

        // Обновляем статусные переменные (они нужны для иконок)
        window.playerFrozen = state.playerFrozen || 0;
        window.enemyFrozen = state.enemyFrozen || 0;
        window.playerShield = state.playerShield || 0;
        window.enemyShield = state.enemyShield || 0;
        window.playerFreezeStacks = state.playerFreezeStacks || 0;
        window.enemyFreezeStacks = state.enemyFreezeStacks || 0;
        window.playerPoisonStacks = state.playerPoisonStacks || 0;
        window.enemyPoisonStacks = state.enemyPoisonStacks || 0;
        window.playerBurnStacks = state.playerBurnStacks || 0;
        window.enemyBurnStacks = state.enemyBurnStacks || 0;

        // Обновляем оверлей заморозки
        const heroFrozenOverlay = document.querySelector('.hero-card .frozen-overlay');
        const enemyFrozenOverlay = document.querySelector('.enemy-card .frozen-overlay');
        if (heroFrozenOverlay) heroFrozenOverlay.classList.toggle('active', window.playerFrozen > 0);
        if (enemyFrozenOverlay) enemyFrozenOverlay.classList.toggle('active', window.enemyFrozen > 0);

        // Обновляем иконки статусов
        if (typeof updateAllEffects === 'function') updateAllEffects();
    },

    setBarWidth(barId, percent) {
        const bar = document.getElementById(barId);
        if (bar) bar.style.width = percent + '%';
    },

    // Показать следующее сообщение
    playNext() {
        if (this.currentMsgIndex >= this.messages.length) {
            // Все сообщения показаны – завершаем бой
            this.finish();
            return;
        }

        const msg = this.messages[this.currentMsgIndex];
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = msg;
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // Анимация (если есть)
        const isPlayerTurn = msg.includes(userData.username); // упрощённо
        const { target, anim } = this.getAnimationForAction(msg, isPlayerTurn);
        if (anim) this.showAnimation(target, anim);

        this.currentMsgIndex++;

        // Применяем следующее состояние (если есть)
        if (this.currentStateIndex < this.states.length) {
            this.applyState(this.states[this.currentStateIndex]);
            this.currentStateIndex++;
        }

        // Планируем следующее сообщение
        this.interval = setTimeout(() => {
            this.playNext();
        }, 1500 / this.speed);
    },

    // Анимация действий (копия из старого battleUI)
    getAnimationForAction(action, isPlayerTurn) {
        action = action.toLowerCase();
        let target = isPlayerTurn ? 'enemy' : 'hero';
        let anim = 'shot.gif';

        if (action.includes('уклоняется') || action.includes('уворачивается') || action.includes('использует неуловимый манёвр')) {
            anim = 'missx.gif';
        } else if (action.includes('несокрушимость')) {
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
        } else if (action.includes('превращается в ледяную глыбу') || action.includes('заморожен')) {
            anim = 'frozenx.gif';
            target = isPlayerTurn ? 'enemy' : 'hero';
        } else if (action.includes('остаётся в ледяном плену')) {
            anim = 'frozenx.gif';
            target = isPlayerTurn ? 'enemy' : 'hero';
        } else if (action.includes('лёд тает') || action.includes('освобождается')) {
            anim = 'frozenx.gif';
            target = isPlayerTurn ? 'hero' : 'enemy';
        }
        return { target, anim };
    },

    showAnimation(target, animationFile) {
        const container = document.getElementById(target + '-animation');
        if (!container) return;
        const img = document.createElement('img');
        img.src = `/assets/fight/${animationFile}`;
        container.innerHTML = ''; // очищаем
        container.appendChild(img);
        container.style.display = 'flex';
        setTimeout(() => {
            container.style.display = 'none';
            container.innerHTML = '';
        }, 1000);
    },

    // Изменение скорости
    setSpeed(newSpeed) {
        this.speed = newSpeed;
        // Перезапускаем интервал
        clearTimeout(this.interval);
        this.playNext();
    },

    // Завершение боя
    finish() {
        clearTimeout(this.interval);
        if (this.timer) clearInterval(this.timer);
        if (this.finishTimeout) clearTimeout(this.finishTimeout);
        if (this.onFinish) this.onFinish(this.battleData);
    },

    // Остановка (например, при таймауте)
    stop() {
        clearTimeout(this.interval);
        clearInterval(this.timer);
    }
};
