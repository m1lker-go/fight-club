// battleLog.js – упрощённая версия с анимациями и базовым выводом

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

        const msg = this.messages[this.currentMsgIndex];
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = msg;
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        const lower = msg.toLowerCase();
        let target = null;
        let anim = null;

        if (lower.includes('уклоняется') || lower.includes('уворачивается') || lower.includes('использует неуловимый манёвр')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'hero' : 'enemy';
            anim = 'missx.gif';
        } else if (lower.includes('сокрушает') || lower.includes('обрушивает') || lower.includes('пробивает') ||
                   lower.includes('яростно') || lower.includes('бьёт') || lower.includes('вонзает') ||
                   lower.includes('бесшумно') || lower.includes('отравляет') || lower.includes('делает выпад') ||
                   lower.includes('исчезает') || lower.includes('выпускает') || lower.includes('читает') ||
                   lower.includes('призывает') || lower.includes('создаёт') || lower.includes('проклинает')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'enemy' : 'hero';
            anim = 'shot.gif';
        } else if (lower.includes('огненный шторм') || lower.includes('вечная зима') || lower.includes('смертельный удар') ||
                   lower.includes('ядовитая волна') || lower.includes('кровавая жатва') || lower.includes('несокрушимость') ||
                   lower.includes('кровопускание') || lower.includes('щит правосудия') || lower.includes('зазеркалье')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'enemy' : 'hero';
            if (lower.includes('огненный шторм')) anim = 'fire.gif';
            else if (lower.includes('вечная зима')) anim = 'ice.gif';
            else if (lower.includes('несокрушимость')) anim = 'hill.gif';
            else if (lower.includes('кровопускание') || lower.includes('кровавая жатва')) anim = 'crit.gif';
            else if (lower.includes('щит правосудия')) anim = 'shield.gif';
            else if (lower.includes('смертельный удар')) anim = 'ultimate.gif';
            else if (lower.includes('ядовитая волна')) anim = 'poison.gif';
            else if (lower.includes('зазеркалье')) anim = 'chara.gif';
        } else if (lower.includes('яд разъедает') || lower.includes('получает урона от яда')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'hero' : 'enemy';
            anim = 'poison.gif';
        } else if (lower.includes('огонь пожирает') || lower.includes('получает урона от огня')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'hero' : 'enemy';
            anim = 'fire.gif';
        }

        if (anim) this.showAnimation(target, anim);

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
