// js/tower.js

const API_BASE = 'https://fight-club-api-4och.onrender.com';

let towerStatus = null;
let selectedClass = null;
let selectedSubclass = null;

async function loadTowerStatus() {
    try {
        const res = await fetch(`${API_BASE}/tower/status?tg_id=${userData.tg_id}`);
        if (!res.ok) throw new Error('Failed to load tower status');
        towerStatus = await res.json();

        // Всегда рендерим башню
        renderTower();

        // Если класс не выбран – показываем туториал поверх
        if (!towerStatus.chosenClass) {
            showTutorialOverlay();
        }
    } catch (e) {
        console.error('Ошибка загрузки башни:', e);
        alert('Ошибка загрузки башни');
    }
}

function showTutorialOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'tutorialOverlay';
    overlay.className = 'tutorial-overlay';
    overlay.innerHTML = `
        <div class="tutorial-grid">
            <div class="tutorial-left">
                <img src="/assets/tower/cat.png" alt="Кот" class="tutorial-cat">
            </div>
            <div class="tutorial-right" id="tutorialDialog">
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    showIntroStep();
}

function removeTutorialOverlay() {
    const overlay = document.getElementById('tutorialOverlay');
    if (overlay) overlay.remove();
}

function showIntroStep() {
    const dialog = document.getElementById('tutorialDialog');
    dialog.innerHTML = `
        <div class="dialog-content">
            <div class="dialog-text">
                <p>Мяу! Добро пожаловать в Башню Испытаний!</p>
                <p>Здесь ты встретишь сильнейших врагов, поднимаясь этаж за этажом.</p>
                <p>Каждый сезон ты можешь выбрать одного героя, за которого будешь проходить башню.</p>
                <p>Выбранный класс нельзя будет поменять до конца сезона (кроме особых билетов).</p>
                <p>Готов? Тогда выбери своего чемпиона!</p>
            </div>
            <button class="tutorial-btn next-btn" id="nextToClass">Далее</button>
        </div>
    `;
    document.getElementById('nextToClass').addEventListener('click', showClassSelection);
}

function showClassSelection() {
    const dialog = document.getElementById('tutorialDialog');
    dialog.innerHTML = `
        <div class="dialog-content">
            <div class="dialog-text">
                <p>Какой класс героя ты выберешь?</p>
            </div>
            <div class="class-buttons">
                <button class="tutorial-btn class-option" data-class="warrior">Воин</button>
                <button class="tutorial-btn class-option" data-class="assassin">Ассасин</button>
                <button class="tutorial-btn class-option" data-class="mage">Маг</button>
            </div>
            <button class="tutorial-btn next-btn" id="nextToRole" disabled>Далее</button>
        </div>
    `;
    document.querySelectorAll('.class-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.class-option').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedClass = e.target.dataset.class;
            document.getElementById('nextToRole').disabled = false;
        });
    });
    document.getElementById('nextToRole').addEventListener('click', showRoleSelection);
}

function showRoleSelection() {
    const dialog = document.getElementById('tutorialDialog');
    const roles = {
        warrior: ['guardian', 'berserker', 'knight'],
        assassin: ['assassin', 'venom_blade', 'blood_hunter'],
        mage: ['pyromancer', 'cryomancer', 'illusionist']
    };
    const roleNames = {
        guardian: 'Страж', berserker: 'Берсерк', knight: 'Рыцарь',
        assassin: 'Убийца', venom_blade: 'Ядовитый клинок', blood_hunter: 'Кровавый охотник',
        pyromancer: 'Поджигатель', cryomancer: 'Ледяной маг', illusionist: 'Иллюзионист'
    };
    const roleList = roles[selectedClass];
    dialog.innerHTML = `
        <div class="dialog-content">
            <div class="dialog-text">
                <p>Какую роль ты выберешь?</p>
            </div>
            <div class="role-buttons">
                ${roleList.map(role => `<button class="tutorial-btn role-option" data-role="${role}">${roleNames[role]}</button>`).join('')}
            </div>
            <div class="dialog-nav">
                <button class="tutorial-btn back-btn" id="backToClass">Назад</button>
                <button class="tutorial-btn confirm-btn" id="confirmRole" disabled>Подтвердить</button>
            </div>
        </div>
    `;
    document.querySelectorAll('.role-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.role-option').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedSubclass = e.target.dataset.role;
            document.getElementById('confirmRole').disabled = false;
        });
    });
    document.getElementById('backToClass').addEventListener('click', showClassSelection);
    document.getElementById('confirmRole').addEventListener('click', confirmSelection);
}

async function confirmSelection() {
    if (!selectedClass || !selectedSubclass) return;

    try {
        const res = await fetch(`${API_BASE}/tower/select-class`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tg_id: userData.tg_id,
                class: selectedClass,
                subclass: selectedSubclass
            })
        });
        const data = await res.json();
        if (data.success) {
            towerStatus.chosenClass = selectedClass;
            towerStatus.chosenSubclass = selectedSubclass;
            removeTutorialOverlay();
            renderTower();
        } else {
            alert('Ошибка при выборе класса: ' + data.error);
        }
    } catch (e) {
        console.error(e);
        alert('Ошибка соединения');
    }
}

function getFloorRewardInfo(floor) {
    if (floor % 20 === 0) {
        return { type: 'skin', icon: 'fas fa-square', label: 'скин' };
    }
    let amount;
    if (floor <= 5) amount = 30;
    else if (floor <= 10) amount = 40;
    else if (floor <= 40) amount = 50;
    else if (floor <= 60) amount = 100;
    else if (floor <= 80) amount = 250;
    else if (floor <= 99) amount = 500;
    else amount = 2000;
    return { type: 'coins', amount: amount, icon: 'fas fa-coins', label: 'монет' };
}

function renderTower() {
    const className = towerStatus.chosenClass
        ? (window.getClassNameRu ? getClassNameRu(towerStatus.chosenClass) : towerStatus.chosenClass)
        : '—';
    const subclassName = towerStatus.chosenSubclass
        ? getRoleNameRu(towerStatus.chosenSubclass)
        : '—';

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="tower-container">
            <div class="tower-header">
                <div class="header-grid">
                    <div class="grid-left">
                        <div class="grid-item">
                            <span class="header-label">Этаж:</span>
                            <span class="header-value">${towerStatus.currentFloor}</span>
                        </div>
                        <div class="grid-item">
                            <span class="header-label">Билеты:</span>
                            <span class="header-value">${towerStatus.attemptsLeft}</span>
                            <img src="/assets/icons/icon-ticket.png" alt="билет" style="width: 24px; height: auto; margin-left: 5px; vertical-align: middle; display: inline-block;">
                        </div>
                    </div>
                    <div class="grid-right">
                        <div class="grid-item">
                            <span class="header-label">Класс:</span>
                            <span class="header-value">${className}</span>
                        </div>
                        <div class="grid-item">
                            <span class="header-label">Роль:</span>
                            <span class="header-value">${subclassName}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="tower-floors" id="towerFloors"></div>
        </div>
    `;

    const floorsContainer = document.getElementById('towerFloors');
    floorsContainer.innerHTML = '';

    for (let i = 1; i <= 100; i++) {
        const floorDiv = document.createElement('div');
        floorDiv.className = 'tower-floor';
        if (i === 1) floorDiv.classList.add('first-floor');
        if (i === towerStatus.currentFloor) floorDiv.classList.add('active');
        if (i < towerStatus.currentFloor) floorDiv.classList.add('passed');

        const floorNumberClass = i === 100 ? 'floor-number small' : 'floor-number';

        let iconSrc;
        if (i === 1) {
            iconSrc = '/assets/tower/floor1.png';
        } else if (i % 2 === 0) {
            iconSrc = '/assets/tower/floor_even.png';
        } else {
            iconSrc = '/assets/tower/floor_odd.png';
        }

        const rewardInfo = getFloorRewardInfo(i);
        let rightHtml;

        if (rewardInfo.type === 'coins') {
            rightHtml = `
                <div class="floor-reward coins-reward">
                    <i class="${rewardInfo.icon}" style="color: white;"></i>
                    <span class="reward-amount">${rewardInfo.amount}</span>
                </div>
            `;
        } else {
            rightHtml = `
                <div class="floor-reward skin-reward">
                    <i class="${rewardInfo.icon}" style="color: white;"></i>
                    <span class="reward-label">${rewardInfo.label}</span>
                </div>
            `;
        }

        const centerContent = i === towerStatus.currentFloor
            ? `<div class="floor-center start-floor">
                <img src="${iconSrc}" alt="floor ${i}" onerror="this.style.display='none'; this.parentElement.style.backgroundColor='#2f3542';">
                <span class="start-label">СТАРТ</span>
               </div>`
            : `<div class="floor-center">
                <img src="${iconSrc}" alt="floor ${i}" onerror="this.style.display='none'; this.parentElement.style.backgroundColor='#2f3542';">
               </div>`;

        floorDiv.innerHTML = `
            <div class="floor-left">
                <span class="${floorNumberClass}">${i}</span>
                <span class="floor-text">этаж</span>
            </div>
            ${centerContent}
            <div class="floor-right">
                ${rightHtml}
            </div>
        `;
        floorsContainer.appendChild(floorDiv);
    }

    setTimeout(() => {
        const active = document.querySelector('.tower-floor.active');
        if (active) {
            active.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }, 100);

    document.querySelectorAll('.tower-floor').forEach(floorDiv => {
        floorDiv.addEventListener('click', () => {
            const floor = parseInt(floorDiv.querySelector('.floor-number').innerText);
            if (floor === towerStatus.currentFloor) {
                startTowerBattle();
            }
        });
    });
}

async function startTowerBattle() {
    if (towerStatus.attemptsLeft <= 0) {
        alert('У вас не осталось билетов на сегодня');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/tower/battle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id })
        });
        const data = await res.json();
        if (!res.ok) {
            alert('Ошибка: ' + data.error);
            return;
        }
        if (!data.result) {
            console.error('Ответ сервера не содержит result:', data);
            alert('Ошибка данных боя');
            return;
        }
        showTowerBattleScreen(data);
    } catch (e) {
        console.error('Ошибка при старте боя:', e);
        alert('Ошибка соединения');
    }
}

function showTowerBattleScreen(battleData) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.pointerEvents = 'none';
        item.style.opacity = '0.5';
    });

    // Используем выбранный в башне класс, если он есть, иначе текущий
    const playerClassForBattle = towerStatus.chosenClass || userData.current_class;
    const playerSubclassForBattle = towerStatus.chosenSubclass || userData.subclass;

    battleData.playerClass = playerClassForBattle;
    battleData.enemyClass = battleData.opponent.class;
    battleData.playerSubclass = playerSubclassForBattle;
    battleData.enemySubclass = battleData.opponent.subclass;

    // Определяем отображаемые названия для шапки
    const playerDisplayClass = towerStatus.chosenClass
        ? (window.getClassNameRu ? getClassNameRu(towerStatus.chosenClass) : towerStatus.chosenClass)
        : getClassNameRu(userData.current_class);
    const playerDisplaySubclass = towerStatus.chosenSubclass
        ? getRoleNameRu(towerStatus.chosenSubclass)
        : getRoleNameRu(userData.subclass);

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-screen">
            <div class="battle-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 20px;">
                <div style="text-align: left;">
                    <div>${userData.username}</div>
                    <div style="font-size: 12px; color: #aaa;">${playerDisplayClass} (${playerDisplaySubclass})</div>
                </div>
                <div style="text-align: right;">
                    <div>${battleData.opponent.username}</div>
                    <div style="font-size: 12px; color: #aaa;">${getClassNameRu(battleData.opponent.class)} (${getRoleNameRu(battleData.opponent.subclass)})</div>
                </div>
            </div>

            <div class="battle-arena" style="display: flex; align-items: stretch; justify-content: center; gap: 0px; padding: 5px 2px;">
                <div class="hero-card" style="flex: 0 0 140px; display: flex; flex-direction: column; justify-content: flex-start; text-align: center;">
                    <div style="position: relative; width: 110px; height: 165px; margin: 0 auto;">
                        <img src="/assets/${userData.avatar || 'cat_heroweb.png'}" alt="hero" style="width:100%; height:100%; object-fit: cover;" class="hero-avatar-img">
                        <div class="frozen-overlay"><img src="/assets/fight/frozenx.gif" alt="frozen"></div>
                        <div class="defeat-overlay">ПРОИГРАЛ</div>
                        <div id="hero-animation" class="animation-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: none; z-index: 10;"></div>
                        <div class="floating-numbers-container" id="hero-floating"></div>
                    </div>
                    <div class="stat-bar hp-bar" style="width: 100px; margin: 3px auto;">
                        <div class="stat-fill hp-fill" id="heroHp" style="width:${(battleData.result.playerHpRemain / battleData.result.playerMaxHp) * 100}%"></div>
                        <div class="stat-text" id="heroHpText">${battleData.result.playerHpRemain ?? 0}/${battleData.result.playerMaxHp ?? 0}</div>
                    </div>
                    <div class="stat-bar mana-bar" style="width: 100px; margin: 1px auto;">
                        <div class="stat-fill mana-fill" id="heroMana" style="width:0%"></div>
                        <div class="stat-text" id="heroManaText">0</div>
                    </div>
                </div>

                <div class="player-debuffs" style="flex: 0 0 40px; display: flex; flex-direction: column; justify-content: flex-start; gap: 0;">
                    <div class="debuff-slot" data-side="player" data-slot="0"></div>
                    <div class="debuff-slot" data-side="player" data-slot="1"></div>
                    <div class="debuff-slot" data-side="player" data-slot="2"></div>
                    <div class="debuff-slot" data-side="player" data-slot="3"></div>
                    <div class="debuff-slot" data-side="player" data-slot="4"></div>
                </div>

                <div class="battle-center" style="flex: 0 0 40px; position: relative; height: 120px;">
                    <div class="battle-timer" id="battleTimer" style="position: absolute; top: 48px; left: 50%; transform: translateX(-50%); width: 40px; height: 40px; border: 2px solid #00aaff; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: transparent; color: white; font-weight: bold; font-size: 16px;">45</div>
                    <button id="singleSpeedBtn" class="speed-btn" style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 40px; height: 40px; border-radius: 50%; background: transparent; border: 2px solid #aaa; color: #aaa; padding: 0; font-weight: bold; font-size: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer;">x1</button>
                </div>

                <div class="enemy-debuffs" style="flex: 0 0 40px; display: flex; flex-direction: column; justify-content: flex-start; gap: 0;">
                    <div class="debuff-slot" data-side="enemy" data-slot="0"></div>
                    <div class="debuff-slot" data-side="enemy" data-slot="1"></div>
                    <div class="debuff-slot" data-side="enemy" data-slot="2"></div>
                    <div class="debuff-slot" data-side="enemy" data-slot="3"></div>
                    <div class="debuff-slot" data-side="enemy" data-slot="4"></div>
                </div>

                <div class="enemy-card" style="flex: 0 0 140px; display: flex; flex-direction: column; justify-content: flex-start; text-align: center;">
                    <div style="position: relative; width: 110px; height: 165px; margin: 0 auto;">
                        <img src="/assets/${battleData.opponent.is_cybercat ? 'cybercat-skin.png' : (battleData.opponent.avatar_id ? getAvatarFilenameById(battleData.opponent.avatar_id) : 'cat_heroweb.png')}" alt="enemy" style="width:100%; height:100%; object-fit: cover;" class="enemy-avatar-img">
                        <div class="frozen-overlay"><img src="/assets/fight/frozenx.gif" alt="frozen"></div>
                        <div class="defeat-overlay">ПРОИГРАЛ</div>
                        <div id="enemy-animation" class="animation-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: none; z-index: 10;"></div>
                        <div class="floating-numbers-container" id="enemy-floating"></div>
                    </div>
                    <div class="stat-bar hp-bar" style="width: 100px; margin: 3px auto;">
                        <div class="stat-fill hp-fill" id="enemyHp" style="width:${(battleData.result.enemyHpRemain / battleData.result.enemyMaxHp) * 100}%"></div>
                        <div class="stat-text" id="enemyHpText">${battleData.result.enemyHpRemain ?? 0}/${battleData.result.enemyMaxHp ?? 0}</div>
                    </div>
                    <div class="stat-bar mana-bar" style="width: 100px; margin: 1px auto;">
                        <div class="stat-fill mana-fill" id="enemyMana" style="width:0%"></div>
                        <div class="stat-text" id="enemyManaText">0</div>
                    </div>
                </div>
            </div>

            <div class="battle-log" id="battleLog" style="height:250px; overflow-y:auto; background-color:#232833; border-radius:10px; padding:10px; margin-top:10px;"></div>
        </div>
    `;

    BattleLog.init(battleData, document.getElementById('battleLog'), () => {
        handleTowerBattleEnd(battleData);
    });

    const speedBtn = document.getElementById('singleSpeedBtn');
    if (speedBtn) {
        speedBtn.addEventListener('click', () => {
            const newSpeed = BattleLog.speed === 1 ? 2 : 1;
            speedBtn.textContent = newSpeed === 1 ? 'x1' : 'x2';
            BattleLog.setSpeed(newSpeed);
        });
    }
}

// ===== Функции для экрана результата =====

function computeTowerStats(messages) {
    let playerStats = { hits:0, crits:0, dodges:0, totalDamage:0, heal:0, reflect:0 };
    let enemyStats = { hits:0, crits:0, dodges:0, totalDamage:0, heal:0, reflect:0 };

    messages.forEach(msg => {
        const text = msg.text;
        const attacker = msg.attacker;
        if (!attacker || attacker === 'none') return;

        const targetStats = attacker === 'player' ? playerStats : enemyStats;
        const opponentStats = attacker === 'player' ? enemyStats : playerStats;

        let match = text.match(/Урон -(\d+)/);
        if (match) {
            const dmg = parseInt(match[1]);
            targetStats.hits++;
            targetStats.totalDamage += dmg;
        }

        match = text.match(/Крит\. урон -(\d+)/);
        if (match) {
            const dmg = parseInt(match[1]);
            targetStats.hits++;
            targetStats.crits++;
            targetStats.totalDamage += dmg;
        }

        match = text.match(/Урон от (?:яда|огня) -(\d+)/);
        if (match) {
            const dmg = parseInt(match[1]);
            targetStats.totalDamage += dmg;
        }

        if (text.toLowerCase().includes('уворот')) {
            opponentStats.dodges++;
        }

        match = text.match(/Вампиризм \+(\d+)/);
        if (match) {
            const heal = parseInt(match[1]);
            targetStats.heal += heal;
        }
        match = text.match(/Здоровье \+(\d+)/);
        if (match) {
            const heal = parseInt(match[1]);
            targetStats.heal += heal;
        }

        match = text.match(/Отражение -(\d+)/);
        if (match) {
            const reflect = parseInt(match[1]);
            opponentStats.reflect += reflect;
        }
    });

    return { playerStats, enemyStats };
}

function showAvatarModal(avatar) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = avatar.name;
    modalBody.innerHTML = `
        <div style="text-align: center;">
            <img src="/assets/${avatar.filename}" style="max-width: 200px; border-radius: 10px; margin-bottom: 15px;">
            <button class="tutorial-btn" id="closeAvatarModal" style="width: 100%;">ОКЕЙ</button>
        </div>
    `;

    modal.style.display = 'block';

    document.getElementById('closeAvatarModal').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };
}

function showTowerResultScreen(battleData) {
    const { result, victory, reward, newFloor, floor } = battleData;
    const resultText = victory ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ';
    const { playerStats, enemyStats } = computeTowerStats(result.messages);

    const passedFloor = floor; // этаж, который только что прошли

    let rewardHtml = '';
    if (reward) {
        if (reward.type === 'coins') {
            rewardHtml = `
                <div class="reward-line">
                    <div class="reward-main">Вы прошли ${passedFloor} этаж башни</div>
                    <div class="reward-value">Вы получили: ${reward.amount} <i class="fas fa-coins" style="color: white;"></i></div>
                </div>
            `;
        } else if (reward.type === 'avatar') {
            rewardHtml = `
                <div class="reward-line" id="avatarRewardContainer">
                    <div class="reward-main">Вы прошли ${passedFloor} этаж башни</div>
                    <div class="reward-value">Вы получили: Скин <span id="avatarName">...</span> 
                        <i class="fas fa-eye" id="showAvatarBtn" style="color: white; cursor: pointer;"></i>
                    </div>
                </div>
            `;
        }
    }

    const logArray = result.messages.map(m => {
        let entryClass = 'log-entry';
        const type = m.type;
        if (type === 'dodge') entryClass += ' dodge-message';
        else if (type && (type.includes('ult') || type === 'fire_ult' || type === 'ice_ult' || type === 'poison_ult')) entryClass += ' ult-message';
        else if (type === 'poison_stack' || type === 'poison_dot') entryClass += ' poison-message';
        else if (type === 'burn_stack' || type === 'burn_dot') entryClass += ' fire-message';
        else if (type === 'freeze_stack' || type === 'frozen_enter' || type === 'frozen_end' || type === 'frozen_continue' || type === 'frozen_already') entryClass += ' ice-message';
        return `<div class="${entryClass}">${BattleLog.formatLogText(m.text)}</div>`;
    }).join('');

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-result" style="padding: 10px;">
            <h2 style="text-align:center; margin-bottom:10px;">${resultText}</h2>
            ${rewardHtml}

            <div class="tower-result-grid">
                ${victory
                    ? '<button class="tower-result-btn" id="towerNextBtn">Следующий этаж</button>'
                    : (towerStatus.attemptsLeft > 0
                        ? '<button class="tower-result-btn" id="towerRetryBtn">Повторить</button>'
                        : '<button class="tower-result-btn" disabled>Нет билетов</button>')
                }
                <button class="tower-result-btn" id="towerBackBtn">Назад</button>
                <button class="tower-result-btn result-tab active" id="tabLog">Лог боя</button>
                <button class="tower-result-btn result-tab" id="tabStats">Статистика</button>
            </div>

            <div id="resultContent" style="max-height: 300px; overflow-y: auto; background-color: #232833; padding: 10px; border-radius: 8px; margin-top: 10px;">
                ${logArray}
            </div>
        </div>
    `;

    const resultDiv = document.getElementById('resultContent');
    const tabLog = document.getElementById('tabLog');
    const tabStats = document.getElementById('tabStats');

    tabLog.addEventListener('click', () => {
        tabLog.classList.add('active');
        tabStats.classList.remove('active');
        resultDiv.innerHTML = logArray;
    });

    tabStats.addEventListener('click', () => {
        tabLog.classList.remove('active');
        tabStats.classList.add('active');
        resultDiv.innerHTML = `
            <table class="stats-table stats-battle">
                <thead><tr><th>Игрок</th><th>Параметр</th><th>Соперник</th></tr></thead>
                <tbody>
                    <tr><td class="player-col">${playerStats.hits}</td><td>Ударов</td><td class="enemy-col">${enemyStats.hits}</td></tr>
                    <tr><td class="player-col">${playerStats.crits}</td><td>Критов</td><td class="enemy-col">${enemyStats.crits}</td></tr>
                    <tr><td class="player-col">${playerStats.dodges}</td><td>Уклонений</td><td class="enemy-col">${enemyStats.dodges}</td></tr>
                    <tr><td class="player-col">${playerStats.totalDamage}</td><td>Урона</td><td class="enemy-col">${enemyStats.totalDamage}</td></tr>
                    <tr><td class="player-col">${playerStats.heal}</td><td>Исцелено</td><td class="enemy-col">${enemyStats.heal}</td></tr>
                    <tr><td class="player-col">${playerStats.reflect}</td><td>Отражено</td><td class="enemy-col">${enemyStats.reflect}</td></tr>
                </tbody>
            </table>
        `;
    });

    document.getElementById('towerBackBtn').addEventListener('click', () => {
        renderTower();
    });

    if (victory) {
        document.getElementById('towerNextBtn').addEventListener('click', () => {
            startTowerBattle();
        });
    } else {
        const retryBtn = document.getElementById('towerRetryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                startTowerBattle();
            });
        }
    }

    if (reward && reward.type === 'avatar') {
    fetch(`${API_BASE}/avatars/${reward.avatarId}`)
        .then(res => {
            if (!res.ok) throw new Error('Avatar fetch failed');
            return res.json();
        })
        .then(avatar => {
            const avatarNameSpan = document.getElementById('avatarName');
            if (avatarNameSpan) avatarNameSpan.innerText = avatar.name;
            const eyeBtn = document.getElementById('showAvatarBtn');
            if (eyeBtn) {
                eyeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showAvatarModal(avatar);
                });
            }
        })
        .catch(err => {
            console.error('Error loading avatar:', err);
            const avatarNameSpan = document.getElementById('avatarName');
            if (avatarNameSpan) avatarNameSpan.innerText = 'неизвестный скин';
        });
}
            })
            .catch(() => {
                const avatarNameSpan = document.getElementById('avatarName');
                if (avatarNameSpan) avatarNameSpan.innerText = 'неизвестный скин';
            });
    }
}

function handleTowerBattleEnd(battleData) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.pointerEvents = 'auto';
        item.style.opacity = '1';
    });

    // Обновляем монеты, если это была победа и награда — монеты
    if (battleData.victory && battleData.reward && battleData.reward.type === 'coins') {
        userData.coins += battleData.reward.amount;
        updateTopBar();
    }

    towerStatus.currentFloor = battleData.newFloor;
    towerStatus.attemptsLeft = battleData.attemptsLeft;

    showTowerResultScreen(battleData);
}

function getRoleNameRu(role) {
    const roles = {
        guardian: 'Страж', berserker: 'Берсерк', knight: 'Рыцарь',
        assassin: 'Убийца', venom_blade: 'Ядовитый клинок', blood_hunter: 'Кровавый охотник',
        pyromancer: 'Поджигатель', cryomancer: 'Ледяной маг', illusionist: 'Иллюзионист'
    };
    return roles[role] || role;
}
