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
        // Полная очистка
        if (this.interval) clearTimeout(this.interval);
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

        window.playerFrozen = state.playerFrozen || 0;
        window.enemyFrozen = state.enemyFrozen || 0;
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

        const heroCard = document.querySelector('.hero-card');
        const enemyCard = document.querySelector('.enemy-card');
        if (heroCard) heroCard.classList.toggle('defeated', state.playerHp <= 0);
        if (enemyCard) enemyCard.classList.toggle('defeated', state.enemyHp <= 0);

        if (typeof updateAllEffects === 'function') updateAllEffects();
    },

    playNext() {
        if (this.currentMsgIndex >= this.messages.length) {
            this.finish();
            return;
        }

        const entry = this.messages[this.currentMsgIndex];
        // Ожидаем, что entry – объект { text, type, target }
        const msgText = entry.text || entry;
        const msgType = entry.type || 'unknown';
        const target = entry.target || 'defender'; // 'attacker' или 'defender' или 'hero'/'enemy'

        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = msgText;
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // Определяем анимацию по типу и цели
        let animTarget = null;
        let animFile = null;

        if (msgType === 'attack' || msgType === 'crit' || msgType === 'damage') {
            // Обычная атака – на цель
            animTarget = (target === 'defender') ? 'enemy' : 'hero';
            animFile = 'shot.gif';
        } else if (msgType === 'dodge') {
            // Уклонение – на того, кто уклоняется (target = defender)
            animTarget = (target === 'defender') ? 'hero' : 'enemy'; // defender – это защитник, на него анимация уворота
            animFile = 'missx.gif';
        } else if (msgType === 'ult' || msgType === 'damage_self' || msgType === 'fire_ult' || msgType === 'ice_ult' || msgType === 'poison_ult') {
            // Ультимейты, наносящие урон – на противника
            animTarget = (target === 'defender') ? 'enemy' : 'hero';
            // Определяем файл по подтипу
            if (msgType === 'fire_ult') animFile = 'fire.gif';
            else if (msgType === 'ice_ult') animFile = 'ice.gif';
            else if (msgType === 'poison_ult') animFile = 'poison.gif';
            else animFile = 'ultimate.gif';
        } else if (msgType === 'heal' || msgType === 'buff') {
            // Лечение/бафф – на себя
            animTarget = (target === 'attacker') ? 'hero' : 'enemy';
            animFile = (msgType === 'heal') ? 'hill.gif' : 'shield.gif';
        } else if (msgType === 'frozen_enter' || msgType === 'frozen_end') {
            // Заморозка/разморозка – на цель
            animTarget = (target === 'defender') ? 'enemy' : 'hero';
            animFile = 'frozenx.gif';
        } else if (msgType === 'poison_dot' || msgType === 'burn_dot') {
            // Урон от яда/огня – на цель
            animTarget = (target === 'defender') ? 'enemy' : 'hero';
            animFile = (msgType === 'poison_dot') ? 'poison.gif' : 'fire.gif';
        } else if (msgType === 'poison_stack' || msgType === 'burn_stack' || msgType === 'freeze_stack') {
            // Накопление стаков – без анимации
            animTarget = null;
        }

        if (animTarget && animFile) {
            this.showAnimation(animTarget, animFile);
        }

        this.currentMsgIndex++;

        if (this.currentStateIndex < this.states.length) {
            this.applyState(this.states[this.currentStateIndex]);
            this.currentStateIndex++;
        }

        // Длительность показа – 2 секунды на сообщение (как и просили)
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
        }, 1000); // анимация длится 1 секунду, потом гаснет
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
