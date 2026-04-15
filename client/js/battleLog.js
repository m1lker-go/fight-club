// client/js/battleLog.js
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
    stopped: false,

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
    playerRage: 0,
    enemyRage: 0,

    getRageLevelFromPercent(percent) {
        if (percent < 20) return 5;
        if (percent < 35) return 4;
        if (percent < 50) return 3;
        if (percent < 65) return 2;
        if (percent < 80) return 1;
        return 0;
    },

    init(battleData, logContainer, onFinish) {
        console.log('[BattleLog] init');
        this.stop();
        this.stopped = false;
        if (this.interval) clearTimeout(this.interval);
        if (this.deathTimerHero) clearTimeout(this.deathTimerHero);
        if (this.deathTimerEnemy) clearTimeout(this.deathTimerEnemy);

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
        this.playerRage = 0;
        this.enemyRage = 0;

        this.messages = battleData.result.messages ? [...battleData.result.messages] : [];
        this.states = battleData.result.states ? [...battleData.result.states] : [];
        this.currentMsgIndex = 0;
        this.currentStateIndex = 0;
        this.logContainer = logContainer;
        this.battleData = battleData;
        this.onFinish = onFinish;
        this.speed = 1;

        if (this.logContainer) this.logContainer.innerHTML = '';

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
        if (this.stopped || !this.battleData) return;
        
        const heroHpText = document.getElementById('heroHpText');
        const enemyHpText = document.getElementById('enemyHpText');
        const heroHpBar = document.getElementById('heroHp');
        const enemyHpBar = document.getElementById('enemyHp');
        const heroMana = document.getElementById('heroMana');
        const enemyMana = document.getElementById('enemyMana');
        const heroManaText = document.getElementById('heroManaText');
        const enemyManaText = document.getElementById('enemyManaText');

        const playerMaxHp = this.battleData.result?.playerMaxHp || 1;
        const enemyMaxHp = this.battleData.result?.enemyMaxHp || 1;

        if (heroHpText) heroHpText.innerText = `${state.playerHp ?? 0}/${playerMaxHp}`;
        if (heroHpBar) heroHpBar.style.width = ((state.playerHp ?? 0) / playerMaxHp) * 100 + '%';
        if (enemyHpText) enemyHpText.innerText = `${state.enemyHp ?? 0}/${enemyMaxHp}`;
        if (enemyHpBar) enemyHpBar.style.width = ((state.enemyHp ?? 0) / enemyMaxHp) * 100 + '%';

        if (state.playerMana !== undefined && state.playerMana !== null) {
            if (heroMana) heroMana.style.width = Math.min(100, (state.playerMana / 100) * 100) + '%';
            if (heroManaText) heroManaText.innerText = state.playerMana;
        }
        if (state.enemyMana !== undefined && state.enemyMana !== null) {
            if (enemyMana) enemyMana.style.width = Math.min(100, (state.enemyMana / 100) * 100) + '%';
            if (enemyManaText) enemyManaText.innerText = state.enemyMana;
        }

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

        if (this.battleData.playerSubclass === 'berserker') {
            const playerPercent = ((state.playerHp ?? 0) / playerMaxHp) * 100;
            this.playerRage = this.getRageLevelFromPercent(playerPercent);
        } else {
            this.playerRage = 0;
        }
        if (this.battleData.enemySubclass === 'berserker') {
            const enemyPercent = ((state.enemyHp ?? 0) / enemyMaxHp) * 100;
            this.enemyRage = this.getRageLevelFromPercent(enemyPercent);
        } else {
            this.enemyRage = 0;
        }

        if ((state.playerHp ?? 0) <= 0) this.playerFrozen = 0;
        if ((state.enemyHp ?? 0) <= 0) this.enemyFrozen = 0;
        
        const heroFrozen = document.querySelector('.hero-card .frozen-overlay');
        const enemyFrozen = document.querySelector('.enemy-card .frozen-overlay');
        if (heroFrozen) heroFrozen.classList.toggle('active', this.playerFrozen > 0);
        if (enemyFrozen) enemyFrozen.classList.toggle('active', this.enemyFrozen > 0);

        this.renderEffects('player');
        this.renderEffects('enemy');

        // Применение состояния поражения с небольшой задержкой для плавности
        const applyDefeatState = (card, hp) => {
            if (!card) return;
            if (hp <= 0 && !card.classList.contains('defeated')) {
                setTimeout(() => card.classList.add('defeated'), 800);
            } else if (hp > 0 && card.classList.contains('defeated')) {
                card.classList.remove('defeated');
            }
        };
        applyDefeatState(document.querySelector('.hero-card'), state.playerHp);
        applyDefeatState(document.querySelector('.enemy-card'), state.enemyHp);
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
                for (let i = 0; i < this.playerPoisonStacks; i++) {
                    effects.push({ type: 'poison', icon: '/assets/icons/icon_poison.png' });
                }
            }
            for (let i = 0; i < this.playerBurnStacks; i++) {
                effects.push({ type: 'burn', icon: '/assets/icons/icon_fire.png' });
            }
            if (this.playerShield) {
                effects.push({ type: 'shield', icon: '/assets/icons/icon_shield.png' });
            }
            if (this.playerRage > 0) {
                for (let i = 0; i < this.playerRage; i++) {
                    effects.push({ type: 'rage', icon: '/assets/icons/icon_rage.png' });
                }
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
                for (let i = 0; i < this.enemyPoisonStacks; i++) {
                    effects.push({ type: 'poison', icon: '/assets/icons/icon_poison.png' });
                }
            }
            for (let i = 0; i < this.enemyBurnStacks; i++) {
                effects.push({ type: 'burn', icon: '/assets/icons/icon_fire.png' });
            }
            if (this.enemyShield) {
                effects.push({ type: 'shield', icon: '/assets/icons/icon_shield.png' });
            }
            if (this.enemyRage > 0) {
                for (let i = 0; i < this.enemyRage; i++) {
                    effects.push({ type: 'rage', icon: '/assets/icons/icon_rage.png' });
                }
            }
        }
        return effects;
    },

    renderEffects(side) {
        const slots = document.querySelectorAll(`.debuff-slot[data-side="${side}"]`);
        const effects = this.buildEffectsList(side);

        const negativeEffects = [];
        const positiveEffects = [];
        for (let effect of effects) {
            if (effect.type === 'rage' || effect.type === 'shield') {
                positiveEffects.push(effect);
            } else {
                negativeEffects.push(effect);
            }
        }

        slots.forEach(slot => { if (slot) slot.innerHTML = ''; });

        for (let i = 0; i < 5; i++) {
            const slot = slots[i];
            if (!slot) continue;

            if (i < negativeEffects.length) {
                const effect = negativeEffects[i];
                const img = document.createElement('img');
                img.src = effect.icon;
                img.alt = effect.type;
                img.className = 'negative-icon';
                slot.appendChild(img);
            }

            if (i < positiveEffects.length) {
                const effect = positiveEffects[i];
                const img = document.createElement('img');
                img.src = effect.icon;
                img.alt = effect.type;
                img.className = effect.type === 'rage' ? 'rage-icon' : 'positive-icon';
                slot.appendChild(img);
            }
        }
    },

    formatLogText(text) {
        if (!text) return '';
        // Исправленные регулярные выражения без лишних пробелов в атрибутах
        text = text.replace(/(Урон -)(\d+)/g, '$1<span class="damage-number">$2</span>');
        text = text.replace(/(Крит\. урон -)(\d+)/g, '$1<span class="damage-number">$2</span>');
        text = text.replace(/(Урон от огня -)(\d+)/g, '$1<span class="damage-number">$2</span>');
        text = text.replace(/(Урон от яда -)(\d+)/g, '$1<span class="damage-number">$2</span>');
        text = text.replace(/(Отражение -)(\d+)/g, '$1<span class="damage-number">$2</span>');
        text = text.replace(/(Вампиризм \+)(\d+)/g, '$1<span class="heal-number">$2</span>');
        text = text.replace(/(Здоровье \+)(\d+)/g, '$1<span class="heal-number">$2</span>');
        text = text.replace(/(Лед накапливается\. Уровень \d+\.)/g, '<span class="ice-text">$1</span>');
        text = text.replace(/([^\s]+ застывает во льду! Заморозка\.)/g, '<span class="ice-text">$1</span>');
        text = text.replace(/([^\s]+ скован льдом ещё \d+ хода\.)/g, '<span class="ice-text">$1</span>');
        text = text.replace(/([^\s]+ освобождается ото льда\.)/g, '<span class="ice-text">$1</span>');
        text = text.replace(/([^\s]+ уже заморожен\.)/g, '<span class="ice-text">$1</span>');
        return text;
    },

    playNext() {
        if (this.stopped || !this.battleData) {
            console.log('[BattleLog] stopped or no battleData, ignoring');
            return;
        }
        if (this.currentMsgIndex >= this.messages.length) {
            console.log('[BattleLog] All messages shown, finishing');
            this.finish();
            return;
        }

        const entry = this.messages[this.currentMsgIndex];
        if (!entry) {
            this.currentMsgIndex++;
            if (this.currentStateIndex < this.states.length) {
                this.applyState(this.states[this.currentStateIndex]);
                this.currentStateIndex++;
            }
            this.interval = setTimeout(() => this.playNext(), 2000 / this.speed);
            return;
        }

        const msgText = entry.text || '';
        const type = entry.type;
        const attacker = entry.attacker;

        // Специальная обработка для берсерка
        const isBerserker = (attacker === 'player' && this.battleData.playerSubclass === 'berserker') ||
                            (attacker === 'enemy' && this.battleData.enemySubclass === 'berserker');

        if (isBerserker && type === 'damage_self') {
            const selfMatch = msgText.match(/Урон -(\d+)/);
            if (selfMatch) {
                const selfDamage = parseInt(selfMatch[1], 10);
                const currentState = this.states[this.currentStateIndex - 1] || this.states[0] || {};
                const currentHp = attacker === 'player' ? (currentState.playerHp ?? 0) : (currentState.enemyHp ?? 0);
                const maxHp = attacker === 'player' ? (this.battleData.result?.playerMaxHp ?? 1) : (this.battleData.result?.enemyMaxHp ?? 1);
                const targetBar = attacker === 'player' ? document.getElementById('heroHp') : document.getElementById('enemyHp');
                const targetText = attacker === 'player' ? document.getElementById('heroHpText') : document.getElementById('enemyHpText');
                const afterSelf = Math.max(0, currentHp - selfDamage);
                if (targetBar) targetBar.style.width = (afterSelf / maxHp) * 100 + '%';
                if (targetText) targetText.innerText = `${afterSelf}/${maxHp}`;
            }
            setTimeout(() => { this.processBerserkerAttack(attacker); }, 1500 / this.speed);
        }

        // Обычная обработка для всех сообщений
        const logEntry = document.createElement('div');
        let entryClass = 'log-entry';
        if (type === 'dodge') entryClass += ' dodge-message';
        else if (type && (type.includes('ult') || type === 'fire_ult' || type === 'ice_ult' || type === 'poison_ult')) entryClass += ' ult-message';
        else if (type === 'poison_stack' || type === 'poison_dot') entryClass += ' poison-message';
        else if (type === 'burn_stack' || type === 'burn_dot') entryClass += ' fire-message';
        else if (type === 'freeze_stack' || type === 'frozen_enter' || type === 'frozen_end' || type === 'frozen_continue' || type === 'frozen_already') entryClass += ' ice-message';

        if (attacker === 'player') entryClass += ' attacker-player';
        else if (attacker === 'enemy') entryClass += ' attacker-enemy';

        logEntry.className = entryClass;
        logEntry.innerHTML = this.formatLogText(msgText);
        if (this.logContainer) {
            this.logContainer.appendChild(logEntry);
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
        }

        // Анимации
        const isStackMessage = type === 'poison_stack' || type === 'burn_stack' || type === 'freeze_stack' || type === 'frozen_already' || type === 'poison_dot' || type === 'burn_dot';
        if (!isStackMessage) {
            let animTarget = null;
            let animFile = null;
            if (type === 'attack' || type === 'crit' || type === 'damage') {
                animTarget = (attacker === 'player') ? 'enemy' : 'hero';
                animFile = 'shot.gif';
            } else if (type === 'dodge') {
                animTarget = (attacker === 'player') ? 'enemy' : 'hero';
                animFile = 'missx.gif';
            } else if (type === 'ult' || type === 'fire_ult' || type === 'ice_ult' || type === 'poison_ult') {
                animTarget = (attacker === 'player') ? 'enemy' : 'hero';
                if (type === 'fire_ult') animFile = 'fire.gif';
                else if (type === 'ice_ult') animFile = 'ice.gif';
                else if (type === 'poison_ult') animFile = 'poison.gif';
                else animFile = 'ultimate.gif';
            } else if (type === 'heal' || type === 'buff') {
                animTarget = (attacker === 'player') ? 'hero' : 'enemy';
                animFile = (type === 'heal') ? 'hill.gif' : 'shield.gif';
            } else if (type === 'frozen_enter' || type === 'frozen_end') {
                animTarget = (attacker === 'player') ? 'enemy' : 'hero';
                animFile = 'frozenx.gif';
            }
            if (animTarget && animFile) this.showAnimation(animTarget, animFile);
        }

        this.parseAndShowFloatingNumber(entry);
        this.currentMsgIndex++;

        // Применение состояния
        if (!(isBerserker && type === 'damage_self')) {
            if (this.currentStateIndex < this.states.length) {
                this.applyState(this.states[this.currentStateIndex]);
                this.currentStateIndex++;
            }
        } else {
            if (this.currentStateIndex < this.states.length) this.currentStateIndex++;
        }

        this.interval = setTimeout(() => this.playNext(), 2000 / this.speed);
    },

    processBerserkerAttack(attacker) {
        let attackMsg = null;
        for (let i = this.currentMsgIndex; i < this.messages.length; i++) {
            const msg = this.messages[i];
            if (msg && (msg.type === 'attack' || msg.type === 'crit') && msg.attacker === attacker) {
                attackMsg = msg;
                break;
            }
        }
        if (!attackMsg) return;

        const msgText = attackMsg.text || '';
        const damageMatch = msgText.match(/Урон -(\d+)/);
        const vampMatch = msgText.match(/вампиризм \+(\d+)/i);
        const reflectMatch = msgText.match(/Отражение -(\d+)/i);

        if (!damageMatch) return;

        const damageToEnemy = parseInt(damageMatch[1], 10);
        const isPlayerAttacking = (attacker === 'player');
        const enemySide = isPlayerAttacking ? 'enemy' : 'player';
        const playerSide = isPlayerAttacking ? 'player' : 'enemy';

        const enemyBar = document.getElementById(enemySide === 'enemy' ? 'enemyHp' : 'heroHp');
        const enemyText = document.getElementById(enemySide === 'enemy' ? 'enemyHpText' : 'heroHpText');
        const playerBar = document.getElementById(playerSide === 'player' ? 'heroHp' : 'enemyHp');
        const playerText = document.getElementById(playerSide === 'player' ? 'heroHpText' : 'enemyHpText');

        if (!enemyText || !playerText) return;

        let currentEnemyHp = parseInt((enemyText.innerText.split('/')[0] || '0'), 10);
        let currentPlayerHp = parseInt((playerText.innerText.split('/')[0] || '0'), 10);
        const maxEnemyHp = enemySide === 'enemy' ? (this.battleData.result?.enemyMaxHp ?? 1) : (this.battleData.result?.playerMaxHp ?? 1);
        const maxPlayerHp = playerSide === 'player' ? (this.battleData.result?.playerMaxHp ?? 1) : (this.battleData.result?.enemyMaxHp ?? 1);

        // Этап 2: урон по врагу + вампиризм
        const afterDamage = Math.max(0, currentEnemyHp - damageToEnemy);
        if (enemyBar) enemyBar.style.width = (afterDamage / maxEnemyHp) * 100 + '%';
        if (enemyText) enemyText.innerText = `${afterDamage}/${maxEnemyHp}`;

        if (vampMatch) {
            const vampValue = parseInt(vampMatch[1], 10);
            const afterVamp = Math.min(maxPlayerHp, currentPlayerHp + vampValue);
            if (playerBar) playerBar.style.width = (afterVamp / maxPlayerHp) * 100 + '%';
            if (playerText) playerText.innerText = `${afterVamp}/${maxPlayerHp}`;
            currentPlayerHp = afterVamp;
        }

        // Этап 3: отражение
        if (reflectMatch) {
            const reflectValue = parseInt(reflectMatch[1], 10);
            setTimeout(() => {
                const currentAfterVamp = parseInt((playerText.innerText.split('/')[0] || '0'), 10);
                const afterReflect = Math.max(0, currentAfterVamp - reflectValue);
                if (playerBar) playerBar.style.width = (afterReflect / maxPlayerHp) * 100 + '%';
                if (playerText) playerText.innerText = `${afterReflect}/${maxPlayerHp}`;
            }, 1500 / this.speed);
        }
    },

    parseAndShowFloatingNumber(entry) {
        if (!entry) return;
        const msgText = entry.text || '';
        const type = entry.type;
        const attacker = entry.attacker;

        let numberValue = null;
        let icon = null;
        let colorClass = null;
        let numberTarget = null;

        if (type === 'attack' || type === 'crit' || type === 'damage' || type === 'ult' || type === 'fire_ult' || type === 'ice_ult' || type === 'poison_ult') {
            const match = msgText.match(/Урон -(\d+)/i) || msgText.match(/Крит\. урон -(\d+)/i);
            if (match) {
                numberValue = -parseInt(match[1], 10);
                icon = '⚔️';
                if (type === 'fire_ult') icon = '🔥';
                else if (type === 'ice_ult') icon = '❄️';
                else if (type === 'poison_ult') icon = '💧';
                colorClass = 'red';
                numberTarget = (attacker === 'player') ? 'enemy' : 'hero';
            }
        } else if (type === 'damage_self') {
            const match = msgText.match(/Урон -(\d+)/i);
            if (match) {
                numberValue = -parseInt(match[1], 10);
                icon = '⚔️';
                colorClass = 'red';
                numberTarget = (attacker === 'player') ? 'hero' : 'enemy';
            }
        } else if (type === 'poison_dot') {
            const match = msgText.match(/Урон от яда -(\d+)/i);
            if (match) {
                numberValue = -parseInt(match[1], 10);
                icon = '💧';
                colorClass = 'red';
                numberTarget = (attacker === 'player') ? 'hero' : 'enemy';
            }
        } else if (type === 'burn_dot') {
            const match = msgText.match(/Урон от огня -(\d+)/i);
            if (match) {
                numberValue = -parseInt(match[1], 10);
                icon = '🔥';
                colorClass = 'red';
                numberTarget = (attacker === 'player') ? 'hero' : 'enemy';
            }
        } else if (type === 'heal') {
            const match = msgText.match(/Здоровье \+(\d+)/i);
            if (match) {
                numberValue = parseInt(match[1], 10);
                icon = '❤️';
                colorClass = 'green';
                numberTarget = (attacker === 'player') ? 'hero' : 'enemy';
            }
        }

        if (type === 'attack' || type === 'crit') {
            const vampMatch = msgText.match(/Вампиризм \+(\d+)/i);
            if (vampMatch) {
                const vampValue = parseInt(vampMatch[1], 10);
                this.showFloatingNumber(attacker === 'player' ? 'hero' : 'enemy', vampValue, '❤️', 'green');
            }
            const reflectMatch = msgText.match(/Отражение -(\d+)/i);
            if (reflectMatch) {
                const reflectValue = -parseInt(reflectMatch[1], 10);
                this.showFloatingNumber(attacker === 'player' ? 'hero' : 'enemy', reflectValue, '🛡️', 'red');
            }
        }

        if (numberValue !== null && numberTarget) {
            this.showFloatingNumber(numberTarget, numberValue, icon, colorClass);
        }
    },

    showFloatingNumber(target, value, icon, colorClass) {
        const containerId = target === 'hero' ? 'hero-floating' : 'enemy-floating';
        const container = document.getElementById(containerId);
        if (!container) return;

        const existing = container.children.length;
        const offset = existing * 20;

        const numDiv = document.createElement('div');
        numDiv.className = `floating-number ${colorClass || ''}`;
        numDiv.style.top = `calc(50% + ${offset}px)`;
        const sign = value > 0 ? '+' : '';

        let iconPath = '/assets/icon-log/icon-damage.png';
        switch (icon) {
            case '⚔️': case 'damage': iconPath = '/assets/icon-log/icon-damage.png'; break;
            case '🔥': case 'fire': iconPath = '/assets/icon-log/icon-fire.png'; break;
            case '💧': case 'poison': iconPath = '/assets/icon-log/icon-poison.png'; break;
            case '❄️': case 'ice': iconPath = '/assets/icon-log/icon-ice.png'; break;
            case '❤️': case 'heal': iconPath = '/assets/icon-log/icon-heal.png'; break;
            case '🛡️': case 'shield': iconPath = '/assets/icon-log/icon-shield.png'; break;
            case 'crit': iconPath = '/assets/icon-log/icon-crit.png'; break;
            case 'reflect': iconPath = '/assets/icon-log/icon-reflect.png'; break;
        }

        numDiv.innerHTML = `${sign}${value} <img src="${iconPath}" class="floating-icon" alt="">`;
        container.appendChild(numDiv);

        setTimeout(() => { if (numDiv.parentNode) numDiv.remove(); }, 2000);
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
        if (this.interval) { clearTimeout(this.interval); this.interval = null; }
        if (this.deathTimerHero) clearTimeout(this.deathTimerHero);
        if (this.deathTimerEnemy) clearTimeout(this.deathTimerEnemy);
        this.hideAnimations();
        this.stopped = true;
        this.messages = [];
        this.states = [];
        this.currentMsgIndex = 0;
        this.currentStateIndex = 0;
        this.battleData = null;
        this.onFinish = null;
    }
};

// Экспорт для использования в других модулях (если нужно)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BattleLog;
}
