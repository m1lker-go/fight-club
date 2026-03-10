// battleLog.js

// ==================== МОДУЛЬ ОТОБРАЖЕНИЯ ЛОГОВ ====================
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
        // ... (без изменений, как в предыдущей версии)
    },

    setBarWidth(barId, percent) {
        // ...
    },

    buildEffectsList(side) {
        // ...
    },

    renderEffects(side) {
        // ...
    },

    updateAllEffects() {
        // ...
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

        // Запускаем анимацию только для значимых сообщений
        const { target, anim } = this.getAnimationForAction(msg);
        if (anim) this.showAnimation(target, anim);

        this.currentMsgIndex++;

        if (this.currentStateIndex < this.states.length) {
            this.applyState(this.states[this.currentStateIndex]);
            this.currentStateIndex++;
        }

        this.interval = setTimeout(() => {
            this.playNext();
        }, 1500 / this.speed);
    },

    // Новая, более точная логика определения анимации
    getAnimationForAction(action) {
        const lower = action.toLowerCase();
        let target = null;
        let anim = null;

        // Атаки и ультимейты (всегда анимация на цель)
        if (lower.includes('сокрушает') || lower.includes('обрушивает топор') ||
            lower.includes('пробивает броню') || lower.includes('яростно атакует') ||
            lower.includes('бьёт щитом') || lower.includes('вонзает кинжал') ||
            lower.includes('подкрадывается') || lower.includes('отравляет клинок') ||
            lower.includes('делает выпад') || lower.includes('исчезает в тени') ||
            lower.includes('выпускает огненный шар') || lower.includes('читает заклинание') ||
            lower.includes('призывает молнию') || lower.includes('создаёт магический взрыв') ||
            lower.includes('проклинает')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'enemy' : 'hero';
            anim = 'shot.gif';
        }
        // Ультимейты с особыми анимациями
        else if (lower.includes('несокрушимость')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'hero' : 'enemy';
            anim = 'hill.gif';
        }
        else if (lower.includes('кровопускание')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'enemy' : 'hero';
            anim = 'crit.gif';
        }
        else if (lower.includes('щит правосудия')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'hero' : 'enemy';
            anim = 'shield.gif';
        }
        else if (lower.includes('смертельный удар')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'enemy' : 'hero';
            anim = 'ultimate.gif';
        }
        else if (lower.includes('ядовитая волна')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'enemy' : 'hero';
            anim = 'poison.gif';
        }
        else if (lower.includes('кровавая жатва')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'enemy' : 'hero';
            anim = 'crit.gif';
        }
        else if (lower.includes('огненный шторм')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'enemy' : 'hero';
            anim = 'fire.gif';
        }
        else if (lower.includes('вечная зима')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'enemy' : 'hero';
            anim = 'ice.gif';
        }
        else if (lower.includes('зазеркалье')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'enemy' : 'hero';
            anim = 'chara.gif';
        }
        // Урон от яда/огня – анимация на цель
        else if (lower.includes('получает урона от яда') || lower.includes('яд разъедает')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'hero' : 'enemy';
            anim = 'poison.gif';
        }
        else if (lower.includes('получает урона от огня') || lower.includes('огонь пожирает')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'hero' : 'enemy';
            anim = 'fire.gif';
        }
        // Заморозка
        else if (lower.includes('превращается в ледяную глыбу') || lower.includes('заморожен')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'hero' : 'enemy';
            anim = 'frozenx.gif';
        }
        else if (lower.includes('остаётся в ледяном плену')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'hero' : 'enemy';
            anim = 'frozenx.gif';
        }
        else if (lower.includes('лёд тает') || lower.includes('освобождается')) {
            target = lower.includes(userData.username.toLowerCase()) ? 'hero' : 'enemy';
            anim = 'frozenx.gif';
        }

        return { target, anim };
    },

    showAnimation(target, animationFile) {
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
