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

    // Локальные переменные для состояния (как в старом коде)
    playerFrozen: 0,
    enemyFrozen: 0,
    playerShield: 0,
    enemyShield: 0,
    playerFreezeStacks: 0,
    enemyFreezeStacks: 0,
    playerPoisonStacks: 0,
    enemyPoisonStacks: 0,
    playerBurnStacks: 0,
    enemyBurnStacks: 0,

    init(battleData, logContainer, onFinish) {
        console.log('[BattleLog] init');
        if (this.interval) clearTimeout(this.interval);
        if (this.deathTimerHero) clearTimeout(this.deathTimerHero);
        if (this.deathTimerEnemy) clearTimeout(this.deathTimerEnemy);

        // Сброс состояния
        this.playerFrozen = 0;
        this.enemyFrozen = 0;
        this.playerShield = 0;
        this.enemyShield = 0;
        this.playerFreezeStacks = 0;
        this.enemyFreezeStacks = 0;
        this.playerPoisonStacks = 0;
        this.enemyPoisonStacks = 0;
        this.playerBurnStacks = 0;
        this.enemyBurnStacks = 0;

        this.messages = battleData.result.messages ? [...battleData.result.messages] : [];
        this.states = battleData.result.states ? [...battleData.result.states] : [];
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

        // Обновляем внутренние переменные
        this.playerFrozen = state.playerFrozen || 0;
        this.enemyFrozen = state.enemyFrozen || 0;
        this.playerShield = state.playerShield || 0;
        this.enemyShield = state.enemyShield || 0;
        this.playerFreezeStacks = state.playerFreezeStacks || 0;
        this.enemyFreezeStacks = state.enemyFreezeStacks || 0;
        this.playerPoisonStacks = state.playerPoisonStacks || 0;
        this.enemyPoisonStacks = state.enemyPoisonStacks || 0;
        this.playerBurnStacks = state.playerBurnStacks || 0;
        this.enemyBurnStacks = state.enemyBurnStacks || 0;

        // Оверлей заморозки
        const heroFrozen = document.querySelector('.hero-card .frozen-overlay');
        const enemyFrozen = document.querySelector('.enemy-card .frozen-overlay');
        if (heroFrozen) heroFrozen.classList.toggle('active', this.playerFrozen > 0);
        if (enemyFrozen) enemyFrozen.classList.toggle('active', this.enemyFrozen > 0);

        // Обновление иконок статусов
        this.renderEffects('player');
        this.renderEffects('enemy');

        // Смерть с задержкой 2 секунды
        const heroCard = document.querySelector('.hero-card');
        const enemyCard = document.querySelector('.enemy-card');

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

    // Построение списка эффектов (как в старом коде)
    buildEffectsList(side) {
        const effects = [];
        if (side === 'player') {
            if (this.playerFrozen > 0) {
                effects.push({ type: 'frozen', icon: '/assets/icons/icon_frozen.png' });
            } else {
                for (let i = 0; i < this.playerFreezeStacks; i++) {
                    effects.push({ type: 'ice', icon: '/assets/icons/icon_ice.png' });
                }
            }
            if (this.playerPoisonStacks > 0) {
                effects.push({ type: 'poison', icon: '/assets/icons/icon_poison.png' });
            }
            for (let i = 0; i < this.playerBurnStacks; i++) {
                effects.push({ type: 'burn', icon: '/assets/icons/icon_fire.png' });
            }
            if (this.playerShield) {
                effects.push({ type: 'shield', icon: '/assets/icons/icon_shield.png' });
            }
        } else {
            if (this.enemyFrozen > 0) {
                effects.push({ type: 'frozen', icon: '/assets/icons/icon_frozen.png' });
            } else {
                for (let i = 0; i < this.enemyFreezeStacks; i++) {
                    effects.push({ type: 'ice', icon: '/assets/icons/icon_ice.png' });
                }
            }
            if (this.enemyPoisonStacks > 0) {
                effects.push({ type: 'poison', icon: '/assets/icons/icon_poison.png' });
            }
            for (let i = 0; i < this.enemyBurnStacks; i++) {
                effects.push({ type: 'burn', icon: '/assets/icons/icon_fire.png' });
            }
            if (this.enemyShield) {
                effects.push({ type: 'shield', icon: '/assets/icons/icon_shield.png' });
            }
        }
        return effects;
    },

    renderEffects(side) {
        const slots = document.querySelectorAll(`.debuff-slot[data-side="${side}"]`);
        const effects = this.buildEffectsList(side);
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

    playNext() {
        if (this.currentMsgIndex >= this.messages.length) {
            console.log('[BattleLog] finish');
            this.finish();
            return;
        }

        // Получаем текущее сообщение (это просто строка)
        const msg = this.messages[this.currentMsgIndex];

        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = msg;
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // Анимация – берём из старой функции getAnimationForAction
        const lower = msg.toLowerCase();
        let target = null;
        let anim = null;

        // Определяем, чьё это действие (игрока или противника)
        const isPlayerAction = userData && lower.includes(userData.username.toLowerCase());

        if (lower.includes('уклоняется') || lower.includes('уворачивается') || lower.includes('использует неуловимый манёвр')) {
            target = isPlayerAction ? 'hero' : 'enemy';
            anim = 'missx.gif';
        } else if (lower.includes('несокрушимость')) {
            target = isPlayerAction ? 'hero' : 'enemy';
            anim = 'hill.gif';
        } else if (lower.includes('кровопускание')) {
            target = isPlayerAction ? 'enemy' : 'hero';
            anim = 'crit.gif';
        } else if (lower.includes('щит правосудия')) {
            target = isPlayerAction ? 'hero' : 'enemy';
            anim = 'shield.gif';
        } else if (lower.includes('смертельный удар')) {
            target = isPlayerAction ? 'enemy' : 'hero';
            anim = 'ultimate.gif';
        } else if (lower.includes('ядовитая волна')) {
            target = isPlayerAction ? 'enemy' : 'hero';
            anim = 'poison.gif';
        } else if (lower.includes('кровавая жатва')) {
            target = isPlayerAction ? 'enemy' : 'hero';
            anim = 'crit.gif';
        } else if (lower.includes('огненный шторм')) {
            target = isPlayerAction ? 'enemy' : 'hero';
            anim = 'fire.gif';
        } else if (lower.includes('вечная зима')) {
            target = isPlayerAction ? 'enemy' : 'hero';
            anim = 'ice.gif';
        } else if (lower.includes('зазеркалье')) {
            target = isPlayerAction ? 'enemy' : 'hero';
            anim = 'chara.gif';
        } else if (lower.includes('яд разъедает') || lower.includes('получает урона от яда')) {
            target = isPlayerAction ? 'hero' : 'enemy';
            anim = 'poison.gif';
        } else if (lower.includes('огонь пожирает') || lower.includes('получает урона от огня')) {
            target = isPlayerAction ? 'hero' : 'enemy';
            anim = 'fire.gif';
        } else if (lower.includes('заморожен') || lower.includes('освобождается')) {
            target = isPlayerAction ? 'hero' : 'enemy';
            anim = 'frozenx.gif';
        } else {
            // Обычные атаки – по наличию ключевых слов
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
                    break;
                }
            }
        }

        if (target && anim) {
            this.showAnimation(target, anim);
        }

        this.currentMsgIndex++;

        // Применяем следующее состояние (если есть)
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
