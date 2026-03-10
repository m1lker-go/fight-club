// battleLog.js

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

    init(battleData, logContainer, onFinish) {
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

        this.messages = [];
        this.states = [];
        this.currentMsgIndex = 0;
        this.currentStateIndex = 0;

        if (this.interval) {
            clearTimeout(this.interval);
            this.interval = null;
        }
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.finishTimeout) {
            clearTimeout(this.finishTimeout);
            this.finishTimeout = null;
        }

        this.hideAnimations();

        if (this.logContainer) {
            this.logContainer.innerHTML = '';
        }

        this.messages = battleData.result.messages || [];
        this.states = battleData.result.states || [];
        this.logContainer = logContainer;
        this.battleData = battleData;
        this.onFinish = onFinish;
        this.speed = 1;

        if (this.states.length > 0) {
            this.applyState(this.states[0]);
            this.currentStateIndex = 1;
        }

        setTimeout(() => {
            this.playNext();
        }, 500);
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

        // Управление оверлеем заморозки (активен, если frozen > 0)
        const heroFrozenOverlay = document.querySelector('.hero-card .frozen-overlay');
        const enemyFrozenOverlay = document.querySelector('.enemy-card .frozen-overlay');
        if (heroFrozenOverlay) heroFrozenOverlay.classList.toggle('active', window.playerFrozen > 0);
        if (enemyFrozenOverlay) enemyFrozenOverlay.classList.toggle('active', window.enemyFrozen > 0);

        // Управление надписью "ПРОИГРАЛ" через класс defeated
        const heroCard = document.querySelector('.hero-card');
        const enemyCard = document.querySelector('.enemy-card');
        if (heroCard) heroCard.classList.toggle('defeated', state.playerHp <= 0);
        if (enemyCard) enemyCard.classList.toggle('defeated', state.enemyHp <= 0);

        this.updateAllEffects();
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

        const msg = this.messages[this.currentMsgIndex];
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = msg;
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        const { target, anim } = this.getAnimationForAction(msg);
        if (anim) this.showAnimation(target, anim);

        this.currentMsgIndex++;

        if (this.currentStateIndex < this.states.length) {
            this.applyState(this.states[this.currentStateIndex]);
            this.currentStateIndex++;
        }

        this.interval = setTimeout(() => {
            this.playNext();
        }, 2500 / this.speed);
    },

    getAnimationForAction(action) {
        const lower = action.toLowerCase();
        let target = null;
        let anim = null;

        const isPlayerAction = userData && lower.includes(userData.username.toLowerCase());

        // Атаки
        const attackKeywords = [
            'сокрушает', 'обрушивает топор', 'пробивает броню', 'яростно атакует', 'бьёт щитом',
            'вонзает кинжал', 'бесшумно подкрадывается', 'отравляет клинок', 'делает выпад',
            'исчезает в тени', 'выпускает огненный шар', 'читает заклинание', 'призывает молнию',
            'создаёт магический взрыв', 'проклинает'
        ];
        for (let kw of attackKeywords) {
            if (lower.includes(kw)) {
                target = isPlayerAction ? 'enemy' : 'hero';
                anim = 'shot.gif';
                return { target, anim };
            }
        }

        // Ультимейты
        const ultKeywords = {
            'несокрушимость': 'hill.gif',
            'кровопускание': 'crit.gif',
            'щит правосудия': 'shield.gif',
            'смертельный удар': 'ultimate.gif',
            'ядовитая волна': 'poison.gif',
            'кровавая жатва': 'crit.gif',
            'огненный шторм': 'fire.gif',
            'вечная зима': 'ice.gif',
            'зазеркалье': 'chara.gif'
        };
        for (let [kw, a] of Object.entries(ultKeywords)) {
            if (lower.includes(kw)) {
                target = isPlayerAction ? 'enemy' : 'hero';
                anim = a;
                return { target, anim };
            }
        }

        // Уклонение
        const dodgeKeywords = ['уклоняется', 'уворачивается', 'использует неуловимый манёвр'];
        for (let kw of dodgeKeywords) {
            if (lower.includes(kw)) {
                target = isPlayerAction ? 'hero' : 'enemy';
                anim = 'missx.gif';
                return { target, anim };
            }
        }

        // Урон от яда
        if (lower.includes('получает урона от яда') || lower.includes('яд разъедает')) {
            target = isPlayerAction ? 'hero' : 'enemy';
            anim = 'poison.gif';
            return { target, anim };
        }
        // Урон от огня
        if (lower.includes('получает урона от огня') || lower.includes('огонь пожирает')) {
            target = isPlayerAction ? 'hero' : 'enemy';
            anim = 'fire.gif';
            return { target, anim };
        }

        return { target: null, anim: null };
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
        if (this.timer) clearInterval(this.timer);
        if (this.finishTimeout) clearTimeout(this.finishTimeout);
        this.hideAnimations();
        if (this.onFinish) this.onFinish(this.battleData);
    },

    stop() {
        clearTimeout(this.interval);
        clearInterval(this.timer);
        this.hideAnimations();
    }
};
