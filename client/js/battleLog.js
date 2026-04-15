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
        if (this.stopped) return;
        const heroHpText = document.getElementById('heroHpText');
        const enemyHpText = document.getElementById('enemyHpText');
        const heroHpBar = document.getElementById('heroHp');
        const enemyHpBar = document.getElementById('enemyHp');
        const heroMana = document.getElementById('heroMana');
        const enemyMana = document.getElementById('enemyMana');
        const heroManaText = document.getElementById('heroManaText');
        const enemyManaText = document.getElementById('enemyManaText');

        if (heroHpText) heroHpText.innerText = `${state.playerHp}/${this.battleData.result.playerMaxHp}`;
        if (heroHpBar) heroHpBar.style.width = (state.playerHp / this.battleData.result.playerMaxHp) * 100 + '%';
        if (enemyHpText) enemyHpText.innerText = `${state.enemyHp}/${this.battleData.result.enemyMaxHp}`;
        if (enemyHpBar) enemyHpBar.style.width = (state.enemyHp / this.battleData.result.enemyMaxHp) * 100 + '%';

        if (state.playerMana !== undefined) {
            if (heroMana) heroMana.style.width = Math.min(100, (state.playerMana / 100) * 100) + '%';
            if (heroManaText) heroManaText.innerText = state.playerMana;
        }
        if (state.enemyMana !== undefined) {
            if (enemyMana) enemyMana.style.width = Math.min(100, (state.enemyMana / 100) * 100) + '%';
            if (enemyManaText) enemyManaText.innerText = state.enemyMana;
        }

        console.log(`[MANA] player: ${state.playerMana}, enemy: ${state.enemyMana}`);
        if (state.playerMana >= 100) console.log('[MANA] Player ULT ready!');
        if (state.enemyMana >= 100) console.log('[MANA] Enemy ULT ready!');

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
            const playerPercent = (state.playerHp / this.battleData.result.playerMaxHp) * 100;
            this.playerRage = this.getRageLevelFromPercent(playerPercent);
        } else {
            this.playerRage = 0;
        }
        if (this.battleData.enemySubclass === 'berserker') {
            const enemyPercent = (state.enemyHp / this.battleData.result.enemyMaxHp) * 100;
            this.enemyRage = this.getRageLevelFromPercent(enemyPercent);
        } else {
            this.enemyRage = 0;
        }

        if (state.playerHp <= 0) this.playerFrozen = 0;
        if (state.enemyHp <= 0) this.enemyFrozen = 0;
        const heroFrozen = document.querySelector('.hero-card .frozen-overlay');
        const enemyFrozen = document.querySelector('.enemy-card .frozen-overlay');
        if (heroFrozen) heroFrozen.classList.toggle('active', this.playerFrozen > 0);
        if (enemyFrozen) enemyFrozen.classList.toggle('active', this.enemyFrozen > 0);

        this.renderEffects('player');
        this.renderEffects('enemy');

        const heroCard = document.querySelector('.hero-card');
        const enemyCard = document.querySelector('.enemy-card');

       const applyDefeatState = (card, hp) => {
    if (!card) return;
    if (hp <= 0 && !card.classList.contains('defeated')) {
        // Небольшая задержка, чтобы игрок успел увидеть момент падения HP
        setTimeout(() => card.classList.add('defeated'), 800);
    } else if (hp > 0 && card.classList.contains('defeated')) {
        card.classList.remove('defeated');
    }
};

applyDefeatState(document.querySelector('.hero-card'), state.playerHp);
applyDefeatState(document.querySelector('.enemy-card'), state.enemyHp);,

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

        slots.forEach(slot => slot.innerHTML = '');

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

        if (effects.length > 0) console.log(`[BattleLog] Rendered ${effects.length} icons for ${side}`);
    },

   formatLogText(text) {
    text = text.replace(/(Урон -)(\d+)/g, '$1 <span class="damage-number">$2</span>');
    text = text.replace(/(Крит\. урон -)(\d+)/g, '$1 <span class="damage-number">$2</span>');
    text = text.replace(/(Урон от огня -)(\d+)/g, '$1 <span class="damage-number">$2</span>');
    text = text.replace(/(Урон от яда -)(\d+)/g, '$1 <span class="damage-number">$2</span>');
    text = text.replace(/(Отражение -)(\d+)/g, '$1 <span class="damage-number">$2</span>');
    text = text.replace(/(Вампиризм \+)(\d+)/g, '$1 <span class="heal-number">$2</span>');
    text = text.replace(/(Здоровье \+)(\d+)/g, '$1 <span class="heal-number">$2</span>');
    text = text.replace(/(Лед накапливается\. Уровень \d+\.)/g, '<span class="ice-text">$1</span>');
    text = text.replace(/([^\s]+ застывает во льду! Заморозка\.)/g, '<span class="ice-text">$1</span>');
    text = text.replace(/([^\s]+ скован льдом ещё \d+ хода\.)/g, '<span class="ice-text">$1</span>');
    text = text.replace(/([^\s]+ освобождается ото льда\.)/g, '<span class="ice-text">$1</span>');
    text = text.replace(/([^\s]+ уже заморожен\.)/g, '<span class="ice-text">$1</span>');
    return text;
},
    playNext() {
        if (this.stopped) {
            console.log('[BattleLog] stopped, ignoring');
            return;
        }
        if (this.currentMsgIndex >= this.messages.length) {
            console.log('[BattleLog] All messages shown, finishing');
            this.finish();
            return;
        }

        const entry = this.messages[this.currentMsgIndex];
        const msgText = entry.text;
        const type = entry.type;
        const attacker = entry.attacker;

        console.log(`[BattleLog] #${this.currentMsgIndex} type=${type}, attacker=${attacker}, text="${msgText.substring(0,60)}..."`);

        // Специальная обработка для берсерка
        const isBerserker = (attacker === 'player' && this.battleData.playerSubclass === 'berserker') ||
                            (attacker === 'enemy' && this.battleData.enemySubclass === 'berserker');

        if (isBerserker && type === 'damage_self') {
            // Этап 1: урон по себе
            const selfMatch = msgText.match(/Урон -(\d+)/);
            if (selfMatch) {
                const selfDamage = parseInt(selfMatch[1]);
                const currentState = this.states[this.currentStateIndex - 1] || this.states[0];
                const currentHp = attacker === 'player' ? currentState.playerHp : currentState.enemyHp;
                const maxHp = attacker === 'player' ? this.battleData.result.playerMaxHp : this.battleData.result.enemyMaxHp;
                const targetBar = attacker === 'player' ? document.getElementById('heroHp') : document.getElementById('enemyHp');
                const targetText = attacker === 'player' ? document.getElementById('heroHpText') : document.getElementById('enemyHpText');
                const afterSelf = Math.max(0, currentHp - selfDamage);
                targetBar.style.width = (afterSelf / maxHp) * 100 + '%';
                targetText.innerText = `${afterSelf}/${maxHp}`;
            }

            // После этого сообщения идёт следующее – атака. Запланируем её обработку через 1.5 секунды
            setTimeout(() => {
                this.processBerserkerAttack(attacker);
            }, 1500 / this.speed);
        }

        // Обычная обработка для всех сообщений (лог, анимации, числа)
        const logEntry = document.createElement('div');
        let entryClass = 'log-entry';
        if (type === 'dodge') {
            entryClass += ' dodge-message';
        } else if (type.includes('ult') || type === 'fire_ult' || type === 'ice_ult' || type === 'poison_ult') {
            entryClass += ' ult-message';
        } else if (type === 'poison_stack' || type === 'poison_dot') {
            entryClass += ' poison-message';
        } else if (type === 'burn_stack' || type === 'burn_dot') {
            entryClass += ' fire-message';
        } else if (type === 'freeze_stack' || type === 'frozen_enter' || type === 'frozen_end' || type === 'frozen_continue' || type === 'frozen_already') {
            entryClass += ' ice-message';
        }

        // Добавляем класс атакующего для цветового разделения
        if (attacker === 'player') {
            entryClass += ' attacker-player';
        } else if (attacker === 'enemy') {
            entryClass += ' attacker-enemy';
        }

        logEntry.className = entryClass;
        logEntry.innerHTML = this.formatLogText(msgText);
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

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
            if (animTarget && animFile) {
                this.showAnimation(animTarget, animFile);
            }
        }

        this.parseAndShowFloatingNumber(entry);
        this.currentMsgIndex++;

        // Для берсерка пропускаем обычное применение состояния, так как мы обрабатываем всё вручную
        if (!(isBerserker && type === 'damage_self')) {
            if (this.currentStateIndex < this.states.length) {
                this.applyState(this.states[this.currentStateIndex]);
                this.currentStateIndex++;
            }
        } else {
            // Для сообщения damage_self мы не применяем состояние, но нужно продвинуть индекс состояния
            if (this.currentStateIndex < this.states.length) {
                this.currentStateIndex++;
            }
        }

        if (entry.type === 'ult' || entry.type === 'ice_ult' || entry.type === 'fire_ult' || entry.type === 'poison_ult') {
            console.log(`[ULT] type=${entry.type}, text="${entry.text}"`);
        }

        this.interval = setTimeout(() => this.playNext(), 2000 / this.speed);
    },

    // Новый метод для обработки атаки берсерка (этапы 2 и 3)
    processBerserkerAttack(attacker) {
        // Находим следующее сообщение (атаку) от того же атакующего
        let attackMsg = null;
        for (let i = this.currentMsgIndex; i < this.messages.length; i++) {
            const msg = this.messages[i];
            if ((msg.type === 'attack' || msg.type === 'crit') && msg.attacker === attacker) {
                attackMsg = msg;
                break;
            }
        }
        if (!attackMsg) return;

        const msgText = attackMsg.text;
        const damageMatch = msgText.match(/Урон -(\d+)/);
        const vampMatch = msgText.match(/вампиризм \+(\d+)/i);
        const reflectMatch = msgText.match(/Отражение -(\d+)/i);

        if (!damageMatch) return;

        const damageToEnemy = parseInt(damageMatch[1]);
        const isPlayerAttacking = (attacker === 'player');
        const enemySide = isPlayerAttacking ? 'enemy' : 'player';
        const playerSide = isPlayerAttacking ? 'player' : 'enemy';

        // Получаем текущие значения HP из DOM (так как после первого этапа они уже изменены)
        const enemyBar = document.getElementById(enemySide === 'enemy' ? 'enemyHp' : 'heroHp');
        const enemyText = document.getElementById(enemySide === 'enemy' ? 'enemyHpText' : 'heroHpText');
        const playerBar = document.getElementById(playerSide === 'player' ? 'heroHp' : 'enemyHp');
        const playerText = document.getElementById(playerSide === 'player' ? 'heroHpText' : 'enemyHpText');

        let currentEnemyHp = parseInt(enemyText.innerText.split('/')[0]);
        let currentPlayerHp = parseInt(playerText.innerText.split('/')[0]);
        const maxEnemyHp = enemySide === 'enemy' ? this.battleData.result.enemyMaxHp : this.battleData.result.playerMaxHp;
        const maxPlayerHp = playerSide === 'player' ? this.battleData.result.playerMaxHp : this.battleData.result.enemyMaxHp;

        // Этап 2: урон по врагу + вампиризм (одновременно)
        const afterDamage = Math.max(0, currentEnemyHp - damageToEnemy);
        enemyBar.style.width = (afterDamage / maxEnemyHp) * 100 + '%';
        enemyText.innerText = `${afterDamage}/${maxEnemyHp}`;

        let vampValue = 0;
        if (vampMatch) {
            vampValue = parseInt(vampMatch[1]);
            const afterVamp = Math.min(maxPlayerHp, currentPlayerHp + vampValue);
            playerBar.style.width = (afterVamp / maxPlayerHp) * 100 + '%';
            playerText.innerText = `${afterVamp}/${maxPlayerHp}`;
            currentPlayerHp = afterVamp;
        }

        // Этап 3: отражение (если есть) – через 1.5 секунды
        if (reflectMatch) {
            const reflectValue = parseInt(reflectMatch[1]);
            setTimeout(() => {
                const currentAfterVamp = parseInt(playerText.innerText.split('/')[0]);
                const afterReflect = Math.max(0, currentAfterVamp - reflectValue);
                playerBar.style.width = (afterReflect / maxPlayerHp) * 100 + '%';
                playerText.innerText = `${afterReflect}/${maxPlayerHp}`;
            }, 1500 / this.speed);
        }
    },

    parseAndShowFloatingNumber(entry) {
        const msgText = entry.text;
        const type = entry.type;
        const attacker = entry.attacker;

        let numberValue = null;
        let icon = null;
        let colorClass = null;
        let numberTarget = null;

        if (type === 'attack' || type === 'crit' || type === 'damage' || type === 'ult' || type === 'fire_ult' || type === 'ice_ult' || type === 'poison_ult') {
            const match = msgText.match(/урон -(\d+)/i) || msgText.match(/крит\. урон -(\d+)/i);
            if (match) {
                numberValue = -parseInt(match[1]);
                icon = '⚔️';
                if (type === 'fire_ult') icon = '🔥';
                else if (type === 'ice_ult') icon = '❄️';
                else if (type === 'poison_ult') icon = '💧';
                colorClass = 'red';
                numberTarget = (attacker === 'player') ? 'enemy' : 'hero';
            }
        } else if (type === 'damage_self') {
            const match = msgText.match(/урон -(\d+)/i);
            if (match) {
                numberValue = -parseInt(match[1]);
                icon = '⚔️';
                colorClass = 'red';
                numberTarget = (attacker === 'player') ? 'hero' : 'enemy';
            }
        } else if (type === 'poison_dot') {
            const match = msgText.match(/урон от яда -(\d+)/i);
            if (match) {
                numberValue = -parseInt(match[1]);
                icon = '💧';
                colorClass = 'red';
                numberTarget = (attacker === 'player') ? 'hero' : 'enemy';
            }
        } else if (type === 'burn_dot') {
            const match = msgText.match(/урон от огня -(\d+)/i);
            if (match) {
                numberValue = -parseInt(match[1]);
                icon = '🔥';
                colorClass = 'red';
                numberTarget = (attacker === 'player') ? 'hero' : 'enemy';
            }
        } else if (type === 'heal') {
            const match = msgText.match(/здоровье \+(\d+)/i);
            if (match) {
                numberValue = parseInt(match[1]);
                icon = '❤️';
                colorClass = 'green';
                numberTarget = (attacker === 'player') ? 'hero' : 'enemy';
            }
        }

        if (type === 'attack' || type === 'crit') {
            const vampMatch = msgText.match(/вампиризм \+(\d+)/i);
            if (vampMatch) {
                const vampValue = parseInt(vampMatch[1]);
                this.showFloatingNumber(attacker === 'player' ? 'hero' : 'enemy', vampValue, '❤️', 'green');
            }
            const reflectMatch = msgText.match(/отражение -(\d+)/i);
            if (reflectMatch) {
                const reflectValue = -parseInt(reflectMatch[1]);
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
        numDiv.className = `floating-number ${colorClass}`;
        numDiv.style.top = `calc(50% + ${offset}px)`;
        const sign = value > 0 ? '+' : '';

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
                iconPath = '/assets/icon-log/icon-damage.png';
        }

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
        if (this.interval) {
            clearTimeout(this.interval);
            this.interval = null;
        }
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
