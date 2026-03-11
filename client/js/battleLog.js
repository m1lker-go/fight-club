// battleLog.js

const BattleLog = {
    messages: [],
    states: [],
    currentMsgIndex: 0,
    currentStateIndex: 0,
    logContainer: null,
    speed: 1,
    interval: null,
    battleData: null,
    onFinish: null,
    deathTimerHero: null,
    deathTimerEnemy: null,

    init(battleData, logContainer, onFinish) {
        // Полная очистка
        if (this.interval) clearTimeout(this.interval);
        if (this.deathTimerHero) clearTimeout(this.deathTimerHero);
        if (this.deathTimerEnemy) clearTimeout(this.deathTimerEnemy);
        this.messages = [];
        this.states = [];
        this.currentMsgIndex = 0;
        this.currentStateIndex = 0;
        this.logContainer = logContainer;
        this.battleData = battleData;
        this.onFinish = onFinish;
        this.speed = 1;

        this.hideAnimations();
        if (this.logContainer) this.logContainer.innerHTML = '';

        this.messages = battleData.result.messages || [];
        this.states = battleData.result.states || [];

        if (this.states.length > 0) {
            this.applyState(this.states[0]);
            this.currentStateIndex = 1;
        }

        setTimeout(() => this.playNext(), 500);
    },

    hideAnimations() {
        const heroAnim = document.getElementById('hero-animation');
        const enemyAnim = document.getElementById('enemy-animation');
        if (heroAnim) heroAnim.style.display = 'none';
        if (enemyAnim) enemyAnim.style.display = 'none';
    },

    applyState(state) {
        const heroHpText = document.getElementById('heroHpText');
        const enemyHpText = document.getElementById('enemyHpText');
        const heroHpBar = document.getElementById('heroHp');
        const enemyHpBar = document.getElementById('enemyHp');

        if (heroHpText) heroHpText.innerText = `${state.playerHp}/${this.battleData.result.playerMaxHp}`;
        if (enemyHpText) enemyHpText.innerText = `${state.enemyHp}/${this.battleData.result.enemyMaxHp}`;
        if (heroHpBar) heroHpBar.style.width = (state.playerHp / this.battleData.result.playerMaxHp) * 100 + '%';
        if (enemyHpBar) enemyHpBar.style.width = (state.enemyHp / this.battleData.result.enemyMaxHp) * 100 + '%';

        if (state.playerMana !== undefined) {
            document.getElementById('heroMana').style.width = (state.playerMana / 100) * 100 + '%';
            document.getElementById('heroManaText').innerText = state.playerMana;
        }
        if (state.enemyMana !== undefined) {
            document.getElementById('enemyMana').style.width = (state.enemyMana / 100) * 100 + '%';
            document.getElementById('enemyManaText').innerText = state.enemyMana;
        }

        // Обновляем глобальные переменные для статусов
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
        const heroFrozen = document.querySelector('.hero-card .frozen-overlay');
        const enemyFrozen = document.querySelector('.enemy-card .frozen-overlay');
        if (heroFrozen) heroFrozen.classList.toggle('active', window.playerFrozen > 0);
        if (enemyFrozen) enemyFrozen.classList.toggle('active', window.enemyFrozen > 0);

        // Обновляем иконки статусов
        this.updateAllEffects();

        // Обработка смерти с задержкой 2 секунды
        const heroCard = document.querySelector('.hero-card');
        const enemyCard = document.querySelector('.enemy-card');

        if (state.playerHp <= 0 && heroCard && !heroCard.classList.contains('defeated')) {
            if (this.deathTimerHero) clearTimeout(this.deathTimerHero);
            this.deathTimerHero = setTimeout(() => {
                heroCard.classList.add('defeated');
            }, 2000);
        }
        if (state.playerHp > 0 && heroCard && heroCard.classList.contains('defeated')) {
            if (this.deathTimerHero) clearTimeout(this.deathTimerHero);
            heroCard.classList.remove('defeated');
        }

        if (state.enemyHp <= 0 && enemyCard && !enemyCard.classList.contains('defeated')) {
            if (this.deathTimerEnemy) clearTimeout(this.deathTimerEnemy);
            this.deathTimerEnemy = setTimeout(() => {
                enemyCard.classList.add('defeated');
            }, 2000);
        }
        if (state.enemyHp > 0 && enemyCard && enemyCard.classList.contains('defeated')) {
            if (this.deathTimerEnemy) clearTimeout(this.deathTimerEnemy);
            enemyCard.classList.remove('defeated');
        }
    },

    setBarWidth(barId, percent) {
        const bar = document.getElementById(barId);
        if (bar) bar.style.width = percent + '%';
    },

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
        // Отладка: выводим в консоль, если есть эффекты
        if (effects.length > 0) console.log(`[BattleLog] Эффекты для ${side}:`, effects);
        return effects;
    },

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
        if (effects.length > 0) console.log(`[BattleLog] Отрисовано ${effects.length} иконок для ${side}`);
    },

    updateAllEffects() {
        this.playerEffects = this.buildEffectsList('player');
        this.enemyEffects = this.buildEffectsList('enemy');
        this.renderEffects('player');
        this.renderEffects('enemy');
    },

    playNext() {
        if (this.currentMsgIndex >= this.messages.length) {
            this.finish();
            return;
        }

        const entry = this.messages[this.currentMsgIndex];
        const msgText = entry.text || entry;
        const msgType = entry.type || 'unknown';
        const target = entry.target || 'defender';

        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = msgText;
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        let animTarget = null;
        let animFile = null;

        if (msgType === 'attack' || msgType === 'crit' || msgType === 'damage') {
            animTarget = (target === 'defender') ? 'enemy' : 'hero';
            animFile = 'shot.gif';
        } else if (msgType === 'dodge') {
            animTarget = (target === 'defender') ? 'hero' : 'enemy';
            animFile = 'missx.gif';
        } else if (msgType === 'ult' || msgType === 'damage_self' || msgType === 'fire_ult' || msgType === 'ice_ult' || msgType === 'poison_ult') {
            animTarget = (target === 'defender') ? 'enemy' : 'hero';
            if (msgType === 'fire_ult') animFile = 'fire.gif';
            else if (msgType === 'ice_ult') animFile = 'ice.gif';
            else if (msgType === 'poison_ult') animFile = 'poison.gif';
            else animFile = 'ultimate.gif';
        } else if (msgType === 'heal' || msgType === 'buff') {
            animTarget = (target === 'attacker') ? 'hero' : 'enemy';
            animFile = (msgType === 'heal') ? 'hill.gif' : 'shield.gif';
        } else if (msgType === 'frozen_enter' || msgType === 'frozen_end') {
            animTarget = (target === 'defender') ? 'enemy' : 'hero';
            animFile = 'frozenx.gif';
        } else if (msgType === 'poison_dot' || msgType === 'burn_dot') {
            animTarget = (target === 'defender') ? 'enemy' : 'hero';
            animFile = (msgType === 'poison_dot') ? 'poison.gif' : 'fire.gif';
        }

        if (animTarget && animFile) {
            this.showAnimation(animTarget, animFile);
        }

        this.currentMsgIndex++;

        if (this.currentStateIndex < this.states.length) {
            this.applyState(this.states[this.currentStateIndex]);
            this.currentStateIndex++;
        }

        this.interval = setTimeout(() => this.playNext(), 2000 / this.speed);
    },

    showAnimation(target, animationFile) {
        this.hideAnimations();
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

    setSpeed(newSpeed) {
        this.speed = newSpeed;
        clearTimeout(this.interval);
        this.playNext();
    },

    finish() {
        clearTimeout(this.interval);
        if (this.deathTimerHero) clearTimeout(this.deathTimerHero);
        if (this.deathTimerEnemy) clearTimeout(this.deathTimerEnemy);
        this.hideAnimations();
        if (this.onFinish) this.onFinish(this.battleData);
    },

    stop() {
        clearTimeout(this.interval);
        if (this.deathTimerHero) clearTimeout(this.deathTimerHero);
        if (this.deathTimerEnemy) clearTimeout(this.deathTimerEnemy);
        this.hideAnimations();
    }
};
