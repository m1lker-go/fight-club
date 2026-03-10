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
    onFinish: null,
    playerEffects: [],
    enemyEffects: [],

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

        this.logContainer.innerHTML = '';

        if (this.states.length > 0) {
            this.applyState(this.states[0]);
            this.currentStateIndex = 1;
        }

        setTimeout(() => {
            this.playNext();
        }, 500);
    },

    // Применить состояние (обновить HP, ману, иконки)
    applyState(state) {
        const heroHpText = document.getElementById('heroHpText');
        const enemyHpText = document.getElementById('enemyHpText');
        const heroHpBar = document.getElementById('heroHp');
        const enemyHpBar = document.getElementById('enemyHp');

        if (heroHpText) heroHpText.innerText = `${state.playerHp}/${this.battleData.result.playerMaxHp}`;
        if (enemyHpText) enemyHpText.innerText = `${state.enemyHp}/${this.battleData.result.enemyMaxHp}`;
        if (heroHpBar) this.setBarWidth('heroHp', (state.playerHp / this.battleData.result.playerMaxHp) * 100);
        if (enemyHpBar) this.setBarWidth('enemyHp', (state.enemyHp / this.battleData.result.enemyMaxHp) * 100);

        if (state.playerMana !== undefined) {
            document.getElementById('heroMana').style.width = (state.playerMana / 100) * 100 + '%';
            document.getElementById('heroManaText').innerText = state.playerMana;
        }
        if (state.enemyMana !== undefined) {
            document.getElementById('enemyMana').style.width = (state.enemyMana / 100) * 100 + '%';
            document.getElementById('enemyManaText').innerText = state.enemyMana;
        }

        // Обновляем глобальные переменные (для иконок)
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

        // Оверлей заморозки
        const heroFrozenOverlay = document.querySelector('.hero-card .frozen-overlay');
        const enemyFrozenOverlay = document.querySelector('.enemy-card .frozen-overlay');
        if (heroFrozenOverlay) heroFrozenOverlay.classList.toggle('active', window.playerFrozen > 0);
        if (enemyFrozenOverlay) enemyFrozenOverlay.classList.toggle('active', window.enemyFrozen > 0);

        // Обновляем иконки статусов
        this.updateAllEffects();
    },

    setBarWidth(barId, percent) {
        const bar = document.getElementById(barId);
        if (bar) bar.style.width = percent + '%';
    },

    // Построение списка эффектов для одной стороны
    buildEffectsList(side) {
        const effects = [];
        if (side === 'player') {
            if (window.playerFrozen > 0) {
                effects.push({ type: 'frozen', icon: '/assets/icons/icon_frozen.png' });
            } else {
                for (let i = 0; i < (window.playerFreezeStacks || 0); i++) {
                    effects.push({ type: 'ice', icon: '/assets/icons/icon_ice.png' });
                }
            }
            if (window.playerPoisonStacks > 0) {
                effects.push({ type: 'poison', icon: '/assets/icons/icon_poison.png' });
            }
            for (let i = 0; i < (window.playerBurnStacks || 0); i++) {
                effects.push({ type: 'burn', icon: '/assets/icons/icon_fire.png' });
            }
            if (window.playerShield) {
                effects.push({ type: 'shield', icon: '/assets/icons/icon_shield.png' });
            }
        } else {
            if (window.enemyFrozen > 0) {
                effects.push({ type: 'frozen', icon: '/assets/icons/icon_frozen.png' });
            } else {
                for (let i = 0; i < (window.enemyFreezeStacks || 0); i++) {
                    effects.push({ type: 'ice', icon: '/assets/icons/icon_ice.png' });
                }
            }
            if (window.enemyPoisonStacks > 0) {
                effects.push({ type: 'poison', icon: '/assets/icons/icon_poison.png' });
            }
            for (let i = 0; i < (window.enemyBurnStacks || 0); i++) {
                effects.push({ type: 'burn', icon: '/assets/icons/icon_fire.png' });
            }
            if (window.enemyShield) {
                effects.push({ type: 'shield', icon: '/assets/icons/icon_shield.png' });
            }
        }
        return effects;
    },

    // Отрисовка эффектов в слоты
    renderEffects(side) {
        const slots = document.querySelectorAll(`.debuff-slot[data-side="${side}"]`);
        const effects = side === 'player' ? this.playerEffects : this.enemyEffects;
        slots.forEach(slot => slot.innerHTML = '');
        for (let i = 0; i < Math.min(effects.length, 5); i++) {
            const effect = effects[i];
            const slot = slots[i];
            if (!slot) continue;
            const img = document.createElement('img');
            img.src = effect.icon;
            img.alt = effect.type;
            slot.appendChild(img);
        }
    },

    // Обновление всех иконок
    updateAllEffects() {
        this.playerEffects = this.buildEffectsList('player');
        this.enemyEffects = this.buildEffectsList('enemy');
        this.renderEffects('player');
        this.renderEffects('enemy');
    },

    // Показать следующее сообщение
    playNext() {
        if (this.currentMsgIndex >= this.messages.length) {
            this.finish();
            return;
        }

        const msg = this.messages[this.currentMsgIndex];
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = msg;
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        const isPlayerTurn = msg.includes(userData.username);
        const { target, anim } = this.getAnimationForAction(msg, isPlayerTurn);
        if (anim) this.showAnimation(target, anim);

        this.currentMsgIndex++;

        if (this.currentStateIndex < this.states.length) {
            this.applyState(this.states[this.currentStateIndex]);
            this.currentStateIndex++;
        }

        this.interval = setTimeout(() => {
            this.playNext();
        }, 1500 / this.speed);
    },

    // Анимация действий
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
        container.innerHTML = '';
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
