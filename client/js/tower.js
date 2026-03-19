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
    // Создаём затемняющий оверлей с туториалом
    const overlay = document.createElement('div');
    overlay.id = 'tutorialOverlay';
    overlay.className = 'tutorial-overlay';
    overlay.innerHTML = `
        <div class="tutorial-grid">
            <div class="tutorial-left">
                <img src="/assets/tower/cat.png" alt="Кот" class="tutorial-cat">
            </div>
            <div class="tutorial-right" id="tutorialDialog">
                <!-- Динамическое содержимое -->
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
            // Обновляем локальные данные
            towerStatus.chosenClass = selectedClass;
            towerStatus.chosenSubclass = selectedSubclass;
            // Убираем оверлей
            removeTutorialOverlay();
            // Обновляем отображение башни (класс и роль в шапке)
            renderTower(); // можно просто обновить текстовые поля, но проще перерендерить
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
        return { type: 'skin', icon: '🃏', label: 'скин' };
    }
    let amount;
    if (floor <= 5) amount = 30;
    else if (floor <= 10) amount = 40;
    else if (floor <= 40) amount = 50;
    else if (floor <= 60) amount = 100;
    else if (floor <= 80) amount = 250;
    else if (floor <= 99) amount = 500;
    else amount = 2000;
    return { type: 'coins', amount: amount, icon: '💰', label: 'монет' };
}

function renderTower() {
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
                            <span class="ticket-icon">🎟</span>
                        </div>
                    </div>
                    <div class="grid-right">
                        <div class="grid-item">
                            <span class="header-label">Класс:</span>
                            <span class="header-value">${window.getClassNameRu ? getClassNameRu(towerStatus.chosenClass) : towerStatus.chosenClass}</span>
                        </div>
                        <div class="grid-item">
                            <span class="header-label">Роль:</span>
                            <span class="header-value">${getRoleNameRu(towerStatus.chosenSubclass)}</span>
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
                    <i class="fas fa-coins"></i>
                    <span class="reward-amount">${rewardInfo.amount}</span>
                </div>
            `;
        } else {
            rightHtml = `
                <div class="floor-reward skin-reward">
                    <span class="reward-icon">${rewardInfo.icon}</span>
                    <span class="reward-label">скин</span>
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

    battleData.playerClass = userData.current_class;
    battleData.enemyClass = battleData.opponent.class;
    battleData.playerSubclass = userData.subclass;
    battleData.enemySubclass = battleData.opponent.subclass;

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-screen">
            <div class="battle-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 20px;">
                <div style="text-align: left;">
                    <div>${userData.username}</div>
                    <div style="font-size: 12px; color: #aaa;">${getClassNameRu(userData.current_class)} (${getRoleNameRu(userData.subclass)})</div>
                </div>
                <div style="text-align: right;">
                    <div>${battleData.opponent.username}</div>
                    <div style="font-size: 12px; color: #aaa;">${getClassNameRu(battleData.opponent.class)} (${getRoleNameRu(battleData.opponent.subclass)})</div>
                </div>
            </div>
            <div class="battle-arena" style="display: flex; align-items: stretch; justify-content: center; gap: 0px; padding: 5px 2px;">
                <!-- Здесь полная вёрстка боя, как в battleUI.js, её можно оставить без изменений -->
                <!-- Для краткости я не буду повторять весь HTML, он уже есть в вашем файле -->
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

function showRewardModal(reward) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    if (reward.type === 'coins') {
        modalTitle.innerText = 'Награда';
        modalBody.innerHTML = `<p style="text-align:center;">Вы получили ${reward.amount} монет!</p>`;
    } else {
        modalTitle.innerText = 'Новый скин!';
        fetch(`/avatars/${reward.avatarId}`)
            .then(res => res.json())
            .then(avatar => {
                modalBody.innerHTML = `
                    <div style="text-align: center;">
                        <img src="/assets/${avatar.filename}" style="max-width: 100px; border-radius: 8px; margin-bottom: 10px;">
                        <p>Вы получили скин «${translateSkinName(avatar.name)}»!</p>
                    </div>
                `;
            })
            .catch(() => {
                modalBody.innerHTML = '<p style="text-align:center;">Вы получили новый скин!</p>';
            });
    }
    modal.style.display = 'block';

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };
}

function handleTowerBattleEnd(battleData) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.pointerEvents = 'auto';
        item.style.opacity = '1';
    });

    if (battleData.victory) {
        showRewardModal(battleData.reward);
        towerStatus.currentFloor = battleData.newFloor;
        towerStatus.attemptsLeft = battleData.attemptsLeft;
        if (battleData.reward.type === 'coins') {
            userData.coins += battleData.reward.amount;
            updateTopBar();
        }
    } else {
        alert('Поражение...');
        towerStatus.attemptsLeft = battleData.attemptsLeft;
    }

    renderTower();
}

function getRoleNameRu(role) {
    const roles = {
        guardian: 'Страж', berserker: 'Берсерк', knight: 'Рыцарь',
        assassin: 'Убийца', venom_blade: 'Ядовитый клинок', blood_hunter: 'Кровавый охотник',
        pyromancer: 'Поджигатель', cryomancer: 'Ледяной маг', illusionist: 'Иллюзионист'
    };
    return roles[role] || role;
}
