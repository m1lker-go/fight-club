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

        // Глобальные переменные для иконок статусов (нужны для функций в helpers)
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

        // Класс смерти
        const heroCard = document.querySelector('.hero-card');
        const enemyCard = document.querySelector('.enemy-card');
        if (heroCard) heroCard.classList.toggle('defeated', state.playerHp <= 0);
        if (enemyCard) enemyCard.classList.toggle('defeated', state.enemyHp <= 0);

        if (typeof updateAllEffects === 'function') updateAllEffects();
    },

    setBarWidth(barId, percent) {
        const bar = document.getElementById(barId);
        if (bar) bar.style.width = percent + '%';
    },

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

        // Простая анимация: если в сообщении есть имя игрока – атака игрока, анимация на врага
        const isPlayerAction = userData && msg.includes(userData.username);
        const target = isPlayerAction ? 'enemy' : 'hero';
        const anim = 'shot.gif';
        this.showAnimation(target, anim);

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
        this.hideAnimations();
        if (this.onFinish) this.onFinish(this.battleData);
    },

    stop() {
        clearTimeout(this.interval);
        this.hideAnimations();
    }
};
