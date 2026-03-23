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

    // Для отложенного обновления полоски врага (берсерк) – больше не нужно? Оставим для совместимости
    delayEnemyHpUpdate: false,
    delayedEnemyHp: null,
    delayedTimer: null,

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
        this.delayEnemyHpUpdate = false;
        if (this.delayedTimer) clearTimeout(this.delayedTimer);
        this.delayedTimer = null;

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

        // Обработка вражеской полоски с возможной задержкой (для берсерка)
        if (this.delayEnemyHpUpdate) {
            if (this.delayedTimer) clearTimeout(this.delayedTimer);
            this.delayedEnemyHp = state.enemyHp;
            this.delayedTimer = setTimeout(() => {
                if (enemyHpBar) enemyHpBar.style.width = (this.delayedEnemyHp / this.battleData.result.enemyMaxHp) * 100 + '%';
                if (enemyHpText) enemyHpText.innerText = `${this.delayedEnemyHp}/${this.battleData.result.enemyMaxHp}`;
                this.delayedTimer = null;
            }, 2000 / this.speed);
            this.delayEnemyHpUpdate = false;
        } else {
            if (this.delayedTimer) {
                clearTimeout(this.delayedTimer);
                this.delayedTimer = null;
            }
            if (enemyHpText) enemyHpText.innerText = `${state.enemyHp}/${this.battleData.result.enemyMaxHp}`;
            if (enemyHpBar) enemyHpBar.style.width = (state.enemyHp / this.battleData.result.enemyMaxHp) * 100 + '%';
        }

        // Здоровье игрока обновляем сразу
        if (heroHpText) heroHpText.innerText = `${state.playerHp}/${this.battleData.result.playerMaxHp}`;
        if (heroHpBar) heroHpBar.style.width = (state.playerHp / this.battleData.result.playerMaxHp) * 100 + '%';

        // Мана
        if (state.playerMana !== undefined) {
           if (heroMana) heroMana.style.width = Math.min(100, (state.playerMana / 100) * 100) + '%';
            if (heroManaText) heroManaText.innerText = state.playerMana;
        }
        if (state.enemyMana !== undefined) {
           if (enemyMana) enemyMana.style.width = Math.min(100, (state.enemyMana / 100) * 100) + '%';
            if (enemyManaText) enemyManaText.innerText = state.enemyMana;
        }

        // Отладка маны
        console.log(`[MANA] player: ${state.playerMana}, enemy: ${state.enemyMana}`);
        if (state.playerMana >= 100) console.log('[MANA] Player ULT ready!');
        if (state.enemyMana >= 100) console.log('[MANA] Enemy ULT ready!');

        // Обновление статусных переменных
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

        // Расчёт ярости
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

        // Оверлей заморозки
        if (state.playerHp <= 0) this.playerFrozen = 0;
        if (state.enemyHp <= 0) this.enemyFrozen = 0;
        const heroFrozen = document.querySelector('.hero-card .frozen-overlay');
        const enemyFrozen = document.querySelector('.enemy-card .frozen-overlay');
        if (heroFrozen) heroFrozen.classList.toggle('active', this.playerFrozen > 0);
        if (enemyFrozen) enemyFrozen.classList.toggle('active', this.enemyFrozen > 0);

        this.renderEffects('player');
        this.renderEffects('enemy');

        // Смерть
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

        // Специальная обработка для сообщений атаки берсерка (в них есть вампиризм и отражение)
        if ((type === 'attack' || type === 'crit') &&
            ((attacker === 'player' && this.battleData.playerSubclass === 'berserker') ||
             (attacker === 'enemy' && this.battleData.enemySubclass === 'berserker'))) {

            // Извлекаем урон врагу, вампиризм, отражение
            const damageMatch = msgText.match(/Урон -(\d+)/i);
            const vampMatch = msgText.match(/вампиризм \+(\d+)/i);
            const reflectMatch = msgText.match(/Отражение -(\d+)/i);

            const damage = damageMatch ? parseInt(damageMatch[1]) : 0;
            const vampHeal = vampMatch ? parseInt(vampMatch[1]) : 0;
            const reflectDamage = reflectMatch ? parseInt(reflectMatch[1]) : 0;

            // Получаем текущие значения HP из последнего состояния
            const lastState = this.states[this.currentStateIndex - 1] || this.states[0];
            let playerHp = lastState.playerHp;
            let enemyHp = lastState.enemyHp;
            const playerMax = this.battleData.result.playerMaxHp;
            const enemyMax = this.battleData.result.enemyMaxHp;

            // Определяем, кто атакует (игрок или враг)
            const isPlayerAttacking = (attacker === 'player');
            const targetHp = isPlayerAttacking ? enemyHp : playerHp;
            const targetBar = isPlayerAttacking ? document.getElementById('enemyHp') : document.getElementById('heroHp');
            const targetText = isPlayerAttacking ? document.getElementById('enemyHpText') : document.getElementById('heroHpText');
            const targetMax = isPlayerAttacking ? enemyMax : playerMax;

            const selfBar = isPlayerAttacking ? document.getElementById('heroHp') : document.getElementById('enemyHp');
            const selfText = isPlayerAttacking ? document.getElementById('heroHpText') : document.getElementById('enemyHpText');
            const selfMax = isPlayerAttacking ? playerMax : enemyMax;

            // Применяем урон по врагу
            const newTargetHp = Math.max(0, targetHp - damage);
            targetBar.style.width = (newTargetHp / targetMax) * 100 + '%';
            targetText.innerText = `${newTargetHp}/${targetMax}`;
            // Показываем красную цифру на аватаре врага
            this.showFloatingNumber(isPlayerAttacking ? 'enemy' : 'hero', -damage, '⚔️', 'red');

            // Применяем вампиризм к атакующему
            let newSelfHp = selfHp + vampHeal;
            if (newSelfHp > selfMax) newSelfHp = selfMax;
            selfBar.style.width = (newSelfHp / selfMax) * 100 + '%';
            selfText.innerText = `${newSelfHp}/${selfMax}`;
            // Показываем зелёную цифру на аватаре атакующего
            this.showFloatingNumber(isPlayerAttacking ? 'hero' : 'enemy', vampHeal, '❤️', 'green');

            // Если есть отражение, применяем его через 1 секунду
            if (reflectDamage > 0) {
                setTimeout(() => {
                    let finalSelfHp = newSelfHp - reflectDamage;
                    if (finalSelfHp < 0) finalSelfHp = 0;
                    selfBar.style.width = (finalSelfHp / selfMax) * 100 + '%';
                    selfText.innerText = `${finalSelfHp}/${selfMax}`;
                    // Показываем красную цифру с иконкой щита
                    this.showFloatingNumber(isPlayerAttacking ? 'hero' : 'enemy', -reflectDamage, '🛡️', 'red');
                }, 1000); // задержка 1 секунда
            }

            // После этого обновляем состояния (чтобы следующий шаг не перезаписал)
            // Нам нужно применить изменения к последнему состоянию, чтобы applyState не перебил
            // Просто временно обновим значения в this.states? Лучше не трогать, а позволить applyState применить их на следующем шаге.
            // Но так как мы уже изменили полоски вручную, нужно также обновить this.states[this.currentStateIndex]?
            // Вручную обновим значения в текущем состоянии, которое будет применено после этого сообщения.
            if (this.currentStateIndex < this.states.length) {
                const nextState = this.states[this.currentStateIndex];
                if (isPlayerAttacking) {
                    nextState.playerHp = newSelfHp;
                    nextState.enemyHp = newTargetHp;
                } else {
                    nextState.enemyHp = newSelfHp;
                    nextState.playerHp = newTargetHp;
                }
                // Учтём отражение в следующем состоянии? Отражение уже в newSelfHp? Нет, отражение ещё не применено, его нужно применить через секунду, но состояние для следующего шага будет отображать его после задержки? Сложно.
                // Лучше не трогать состояния, а полагаться на то, что applyState придёт и перезапишет. Но applyState придёт после этого сообщения, когда мы уже вручную всё обновили, и он перезапишет. Поэтому мы должны либо не применять изменения к состояниям, либо подменить их.
                // Самый простой способ – не применять изменения вручную к полоскам, а использовать стандартный механизм applyState, но тогда не получится разделить отражение во времени.
                // Поэтому оставим ручное обновление полосок и откажемся от применения состояния для этого сообщения, чтобы applyState не перезаписал.
                // Пропустим вызов applyState для этого индекса, увеличив currentStateIndex на 1, но без применения.
            }
        }

        // Стандартная обработка для всех сообщений (лог, анимации)
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

        logEntry.className = entryClass;
        logEntry.innerHTML = this.formatLogText(msgText);
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

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
            } else if (type === 'damage_self') {
                animTarget = null;
                animFile = null;
            } else if (type === 'heal' || type === 'buff') {
                animTarget = (attacker === 'player') ? 'hero' : 'enemy';
                animFile = (type === 'heal') ? 'hill.gif' : 'shield.gif';
            } else if (type === 'frozen_enter' || type === 'frozen_end') {
                animTarget = (attacker === 'player') ? 'enemy' : 'hero';
                animFile = 'frozenx.gif';
                console.log(`[DEBUG] frozen: type=${type}, attacker=${attacker}, animTarget=${animTarget}`);
            }

            if (animTarget && animFile) {
                console.log(`[BattleLog] Playing animation ${animFile} on ${animTarget}`);
                this.showAnimation(animTarget, animFile);
            }
        }

        // Обычные всплывающие числа (для урона, яда и т.д.) – они уже могут быть обработаны выше, поэтому пропускаем?
        // Чтобы не дублировать, вызовем parseAndShowFloatingNumber, но для берсерка мы уже показали числа вручную, поэтому можно пропустить или дополнить.
        // Для единообразия оставим, но для берсерка числа уже показаны.
        if (!((type === 'attack' || type === 'crit') &&
              ((attacker === 'player' && this.battleData.playerSubclass === 'berserker') ||
               (attacker === 'enemy' && this.battleData.enemySubclass === 'berserker')))) {
            this.parseAndShowFloatingNumber(entry);
        }

        this.currentMsgIndex++;

        if (this.currentStateIndex < this.states.length) {
            this.applyState(this.states[this.currentStateIndex]);
            this.currentStateIndex++;
        }

        // Отладка ультимейта
        if (entry.type === 'ult' || entry.type === 'ice_ult' || entry.type === 'fire_ult' || entry.type === 'poison_ult') {
            console.log(`[ULT] type=${entry.type}, text="${entry.text}"`);
        }

        this.interval = setTimeout(() => this.playNext(), 2000 / this.speed);
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
                // Для берсерка числа уже показаны вручную, поэтому здесь пропускаем
                const isBerserker = (attacker === 'player' && this.battleData.playerSubclass === 'berserker') ||
                                    (attacker === 'enemy' && this.battleData.enemySubclass === 'berserker');
                if (!isBerserker) {
                    this.showFloatingNumber(attacker === 'player' ? 'hero' : 'enemy', vampValue, '❤️', 'green');
                }
            }
            const reflectMatch = msgText.match(/отражение -(\d+)/i);
            if (reflectMatch) {
                const reflectValue = -parseInt(reflectMatch[1]);
                // Для берсерка отражение будет показано через setTimeout вручную, здесь пропускаем
                const isBerserker = (attacker === 'player' && this.battleData.playerSubclass === 'berserker') ||
                                    (attacker === 'enemy' && this.battleData.enemySubclass === 'berserker');
                if (!isBerserker) {
                    this.showFloatingNumber(attacker === 'player' ? 'hero' : 'enemy', reflectValue, '🛡️', 'red');
                }
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
        if (this.delayedTimer) clearTimeout(this.delayedTimer);
        this.hideAnimations();
        this.stopped = true;
        this.messages = [];
        this.states = [];
        this.currentMsgIndex = 0;
        this.currentStateIndex = 0;
        this.battleData = null;
        this.onFinish = null;
        this.delayedTimer = null;
    }
};
