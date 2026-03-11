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

    // Локальные переменные для иконок статусов
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
        if (effects.length > 0) console.log(`[BattleLog] Rendered ${effects.length} icons for ${side}`);
    },

    formatLogText(text) {
    // Урон (обычный, критический, от стихий, отражение)
    text = text.replace(/(Урон -)(\d+)/g, '$1<span class="damage-number">$2</span>');
    text = text.replace(/(Крит\. урон -)(\d+)/g, '$1<span class="damage-number">$2</span>');
    text = text.replace(/(Урон от огня -)(\d+)/g, '$1<span class="damage-number">$2</span>');
    text = text.replace(/(Урон от яда -)(\d+)/g, '$1<span class="damage-number">$2</span>');
    text = text.replace(/(Отражение -)(\d+)/g, '$1<span class="damage-number">$2</span>');
    
    // Лечение, вампиризм
    text = text.replace(/(Вампиризм \+)(\d+)/g, '$1<span class="heal-number">$2</span>');
    text = text.replace(/(Здоровье \+)(\d+)/g, '$1<span class="heal-number">$2</span>');
    
    return text;
},
    
    playNext() {
        if (this.currentMsgIndex >= this.messages.length) {
            console.log('[BattleLog] All messages shown, finishing');
            this.finish();
            return;
        }

        const entry = this.messages[this.currentMsgIndex];
        const msgText = entry.text;
        const type = entry.type;
        const attacker = entry.attacker; // 'player' или 'enemy'

        console.log(`[BattleLog] #${this.currentMsgIndex} type=${type}, attacker=${attacker}, text="${msgText.substring(0,60)}..."`);

        // Сообщения о стаках не выводим в лог (но числа показываем)
        const isStackMessage = type === 'poison_stack' || type === 'burn_stack' || type === 'freeze_stack' || type === 'frozen_already' || type === 'poison_dot' || type === 'burn_dot';

        // --- Лог и анимация для не-стековых сообщений ---
        if (!isStackMessage) {
            // Добавляем запись в лог
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.innerHTML = msgText;
            this.logContainer.appendChild(logEntry);
            this.logContainer.scrollTop = this.logContainer.scrollHeight;

            // --- Определяем анимацию ---
            let animTarget = null;
            let animFile = null;

            if (type === 'attack' || type === 'crit' || type === 'damage') {
                animTarget = (attacker === 'player') ? 'enemy' : 'hero';
                animFile = 'shot.gif';
            } else if (type === 'dodge') {
                animTarget = (attacker === 'player') ? 'hero' : 'enemy';
                animFile = 'missx.gif';
            } else if (type === 'ult' || type === 'fire_ult' || type === 'ice_ult' || type === 'poison_ult' || type === 'damage_self') {
                animTarget = (attacker === 'player') ? 'enemy' : 'hero';
                if (type === 'fire_ult') animFile = 'fire.gif';
                else if (type === 'ice_ult') animFile = 'ice.gif';
                else if (type === 'poison_ult') animFile = 'poison.gif';
                else animFile = 'ultimate.gif';
            } else if (type === 'heal' || type === 'buff') {
                animTarget = (attacker === 'player') ? 'hero' : 'enemy';
                animFile = (type === 'heal') ? 'hill.gif' : 'shield.gif';
            } else if (type === 'frozen_enter' || type === 'frozen_end') {
                animTarget = (attacker === 'player') ? 'hero' : 'enemy';
                animFile = 'frozenx.gif';
            }

            if (animTarget && animFile) {
                console.log(`[BattleLog] Playing animation ${animFile} on ${animTarget}`);
                this.showAnimation(animTarget, animFile);
            }
        }

        // --- ВСЕГДА парсим число и показываем всплывающее сообщение (включая стаки) ---
        this.parseAndShowFloatingNumber(entry);

        this.currentMsgIndex++;

        if (this.currentStateIndex < this.states.length) {
            this.applyState(this.states[this.currentStateIndex]);
            this.currentStateIndex++;
        }

        this.interval = setTimeout(() => this.playNext(), 2000 / this.speed);
    },

    // Новый метод для парсинга и отображения чисел
    parseAndShowFloatingNumber(entry) {
        const msgText = entry.text;
        const type = entry.type;
        const attacker = entry.attacker;

        let numberValue = null;
        let icon = null;
        let colorClass = null;
        let numberTarget = null;

        // --- Обработка различных типов сообщений ---

        // Атаки, криты, ульты (урон)
        if (type === 'attack' || type === 'crit' || type === 'damage' || type === 'ult' || type === 'fire_ult' || type === 'ice_ult' || type === 'poison_ult' || type === 'damage_self') {
            const match = msgText.match(/Урон -(\d+)/) || msgText.match(/Крит\. урон -(\d+)/);
            if (match) {
                numberValue = -parseInt(match[1]);
                icon = '⚔️';
                if (type === 'fire_ult') icon = '🔥';
                else if (type === 'ice_ult') icon = '❄️';
                else if (type === 'poison_ult') icon = '💧';
                colorClass = 'red';
                numberTarget = (attacker === 'player') ? 'enemy' : 'hero';
            }
        }
        // Урон от яда
        else if (type === 'poison_dot') {
            const match = msgText.match(/Урон от яда -(\d+)/);
            if (match) {
                numberValue = -parseInt(match[1]);
                icon = '💧';
                colorClass = 'red';
                numberTarget = (attacker === 'player') ? 'hero' : 'enemy';
            }
        }
        // Урон от огня
        else if (type === 'burn_dot') {
            const match = msgText.match(/Урон от огня -(\d+)/);
            if (match) {
                numberValue = -parseInt(match[1]);
                icon = '🔥';
                colorClass = 'red';
                numberTarget = (attacker === 'player') ? 'hero' : 'enemy';
            }
        }
        // Лечение
        else if (type === 'heal') {
            const match = msgText.match(/Здоровье \+(\d+)/);
            if (match) {
                numberValue = parseInt(match[1]);
                icon = '❤️';
                colorClass = 'green';
                numberTarget = (attacker === 'player') ? 'hero' : 'enemy';
            }
        }

        // Дополнительные эффекты, которые могут быть в том же сообщении (вампиризм, отражение)
        if (type === 'attack' || type === 'crit') {
            const vampMatch = msgText.match(/Вампиризм \+(\d+)/);
            if (vampMatch) {
                const vampValue = parseInt(vampMatch[1]);
                this.showFloatingNumber(attacker === 'player' ? 'hero' : 'enemy', vampValue, '❤️', 'green');
            }
            const reflectMatch = msgText.match(/Отражение -(\d+)/);
            if (reflectMatch) {
                const reflectValue = -parseInt(reflectMatch[1]);
                this.showFloatingNumber(attacker === 'player' ? 'hero' : 'enemy', reflectValue, '🛡️', 'red');
            }
        }

        // Если есть основное число, показываем его
        if (numberValue !== null && numberTarget) {
            this.showFloatingNumber(numberTarget, numberValue, icon, colorClass);
        }
    },

  showFloatingNumber(target, value, icon, colorClass) {
    const containerId = target === 'hero' ? 'hero-floating' : 'enemy-floating';
    const container = document.getElementById(containerId);
    if (!container) return;

    const numDiv = document.createElement('div');
    numDiv.className = `floating-number ${colorClass}`; // colorClass может остаться для цвета текста (числа)
    const sign = value > 0 ? '+' : '';

    // Определяем путь к иконке в зависимости от типа (icon)
    let iconPath = '';
    switch (icon) {
        case '⚔️':
        case 'damage':
            iconPath = '/assets/icon-log/icon-damage.png';
            break;
        case '🔥':
        case 'fire':
            iconPath = '/assets/icon-log/icon-fire.png';
            break;
        case '💧':
        case 'poison':
            iconPath = '/assets/icon-log/icon-poison.png';
            break;
        case '❄️':
        case 'ice':
            iconPath = '/assets/icon-log/icon-ice.png';
            break;
        case '❤️':
        case 'heal':
            iconPath = '/assets/icon-log/icon-heal.png';
            break;
        case '🛡️':
        case 'shield':
            iconPath = '/assets/icon-log/icon-shield.png';
            break;
        case 'crit':
            iconPath = '/assets/icon-log/icon-crit.png';
            break;
        case 'reflect':
            iconPath = '/assets/icon-log/icon-reflect.png';
            break;
        default:
            // Если тип не распознан, используем иконку урона
            iconPath = '/assets/icon-log/icon-damage.png';
    }

    // Формируем HTML: число + иконка
    numDiv.innerHTML = `${sign}${value} <img src="${iconPath}" class="floating-icon" alt="">`;
    container.appendChild(numDiv);

    setTimeout(() => {
        numDiv.remove();
    }, 2000);
},

    showAnimation(target, animationFile) {
        this.hideAnimations();
        const container = document.getElementById(target + '-animation');
        if (!container) {
            console.error(`[BattleLog] Container ${target}-animation not found`);
            return;
        }
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
