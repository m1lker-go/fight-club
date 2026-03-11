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
        // Полная остановка и очистка предыдущего боя
        if (this.interval) clearTimeout(this.interval);
        if (this.deathTimerHero) clearTimeout(this.deathTimerHero);
        if (this.deathTimerEnemy) clearTimeout(this.deathTimerEnemy);
        
        // Сброс глобальных статусов
        window.playerFrozen = 0;
        window.enemyFrozen = 0;
        window.playerShield = 0;
        window.enemyShield = 0;
        window.playerFreezeStacks = 0;
        window.enemyFreezeStacks = 0;
        window.playerPoisonStacks = 0;
        window.enemyPoisonStacks = 0;
        window.playerBurnStacks = 0;
        window.enemyBurnStacks = 0;

        // Очистка массивов
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

        // Копируем свежие данные
        this.messages = battleData.result.messages ? [...battleData.result.messages] : [];
        this.states = battleData.result.states ? [...battleData.result.states] : [];

        // Применяем начальное состояние с задержкой, чтобы DOM точно отрисовался
        setTimeout(() => {
            if (this.states.length > 0) {
                this.applyState(this.states[0]);
                this.currentStateIndex = 1;
            }
            this.playNext();
        }, 100);
    },

    hideAnimations() {
        const heroAnim = document.getElementById('hero-animation');
        const enemyAnim = document.getElementById('enemy-animation');
        if (heroAnim) heroAnim.style.display = 'none';
        if (enemyAnim) enemyAnim.style.display = 'none';
    },

    applyState(state) {
        // Проверяем, что все необходимые элементы существуют
        const heroHpText = document.getElementById('heroHpText');
        const enemyHpText = document.getElementById('enemyHpText');
        const heroHpBar = document.getElementById('heroHp');
        const enemyHpBar = document.getElementById('enemyHp');
        const heroMana = document.getElementById('heroMana');
        const enemyMana = document.getElementById('enemyMana');
        const heroManaText = document.getElementById('heroManaText');
        const enemyManaText = document.getElementById('enemyManaText');

        if (heroHpText) heroHpText.innerText = `${state.playerHp}/${this.battleData.result.playerMaxHp}`;
        if (enemyHpText) enemyHpText.innerText = `${state.enemyHp}/${this.battleData.result.enemyMaxHp}`;
        if (heroHpBar) heroHpBar.style.width = (state.playerHp / this.battleData.result.playerMaxHp) * 100 + '%';
        if (enemyHpBar) enemyHpBar.style.width = (state.enemyHp / this.battleData.result.enemyMaxHp) * 100 + '%';

        if (state.playerMana !== undefined) {
            if (heroMana) heroMana.style.width = (state.playerMana / 100) * 100 + '%';
            if (heroManaText) heroManaText.innerText = state.playerMana;
        }
        if (state.enemyMana !== undefined) {
            if (enemyMana) enemyMana.style.width = (state.enemyMana / 100) * 100 + '%';
            if (enemyManaText) enemyManaText.innerText = state.enemyMana;
        }

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

        const heroFrozen = document.querySelector('.hero-card .frozen-overlay');
        const enemyFrozen = document.querySelector('.enemy-card .frozen-overlay');
        if (heroFrozen) heroFrozen.classList.toggle('active', window.playerFrozen > 0);
        if (enemyFrozen) enemyFrozen.classList.toggle('active', window.enemyFrozen > 0);

        this.updateAllEffects();

        const heroCard = document.querySelector('.hero-card');
        const enemyCard = document.querySelector('.enemy-card');

        // Смерть с задержкой 2 секунды
        if (state.playerHp <= 0 && heroCard && !heroCard.classList.contains('defeated')) {
            if (this.deathTimerHero) clearTimeout(this.deathTimerHero);
            this.deathTimerHero = setTimeout(() => {
                if (heroCard) heroCard.classList.add('defeated');
            }, 2000);
        }
        if (state.playerHp > 0 && heroCard && heroCard.classList.contains('defeated')) {
            if (this.deathTimerHero) clearTimeout(this.deathTimerHero);
            heroCard.classList.remove('defeated');
        }

        if (state.enemyHp <= 0 && enemyCard && !enemyCard.classList.contains('defeated')) {
            if (this.deathTimerEnemy) clearTimeout(this.deathTimerEnemy);
            this.deathTimerEnemy = setTimeout(() => {
                if (enemyCard) enemyCard.classList.add('defeated');
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

        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = msgText;
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // Определяем, чьё это действие (игрока или противника)
        const isPlayerAction = userData && msgText.includes(userData.username);

        let animTarget = null;
        let animFile = null;

        // Атаки (обычные и критические) – анимация на цель
        if (msgType === 'attack' || msgType === 'crit' || msgType === 'damage') {
            animTarget = isPlayerAction ? 'enemy' : 'hero';
            animFile = 'shot.gif';
        }
        // Уклонение – анимация на того, кто уклоняется
        else if (msgType === 'dodge') {
            animTarget = isPlayerAction ? 'hero' : 'enemy';
            animFile = 'missx.gif';
        }
        // Ультимейты, наносящие урон – на цель
        else if (msgType === 'ult' || msgType === 'damage_self' || msgType === 'fire_ult' || msgType === 'ice_ult' || msgType === 'poison_ult') {
            animTarget = isPlayerAction ? 'enemy' : 'hero';
            if (msgType === 'fire_ult') animFile = 'fire.gif';
            else if (msgType === 'ice_ult') animFile = 'ice.gif';
            else if (msgType === 'poison_ult') animFile = 'poison.gif';
            else animFile = 'ultimate.gif';
        }
        // Лечение и баффы – на себя
        else if (msgType === 'heal' || msgType === 'buff') {
            animTarget = isPlayerAction ? 'hero' : 'enemy';
            animFile = (msgType === 'heal') ? 'hill.gif' : 'shield.gif';
        }
        // Заморозка/разморозка – на цель
        else if (msgType === 'frozen_enter' || msgType === 'frozen_end') {
            animTarget = isPlayerAction ? 'enemy' : 'hero';
            animFile = 'frozenx.gif';
        }
        // Урон от яда/огня – на цель (получает урон)
        else if (msgType === 'poison_dot' || msgType === 'burn_dot') {
            animTarget = isPlayerAction ? 'hero' : 'enemy';
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
