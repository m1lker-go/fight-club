// js/tower.js

const API_BASE = 'https://fight-club-api-4och.onrender.com';

let towerStatus = null;

async function loadTowerStatus() {
    try {
        const res = await fetch(`${API_BASE}/tower/status?tg_id=${userData.tg_id}`);
        if (!res.ok) throw new Error('Failed to load tower status');
        towerStatus = await res.json();
        renderTower();
    } catch (e) {
        console.error('Ошибка загрузки башни:', e);
        alert('Ошибка загрузки башни');
    }
}

function getFloorRewardInfo(floor) {
    // Особые этажи (аватар)
    if (floor % 20 === 0) {
        return { type: 'skin', icon: '🃏', label: 'скин' };
    }
    // Обычные этажи – монеты
    let amount;
    if (floor <= 5) amount = 30;
    else if (floor <= 10) amount = 40;
    else if (floor <= 40) amount = 50;
    else if (floor <= 60) amount = 100;
    else if (floor <= 80) amount = 250;
    else if (floor <= 99) amount = 500;
    else amount = 2000; // 100 этаж (хотя он особый)
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

    // Для всех этажей показываем награду (будущую или полученную)
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

    // Добавляем надпись СТАРТ на центральную картинку активного этажа
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
                <!-- Карточка героя -->
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

function showRewardModal(reward) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    if (reward.type === 'coins') {
        modalTitle.innerText = 'Награда';
        modalBody.innerHTML = `<p style="text-align:center;">Вы получили ${reward.amount} монет!</p>`;
    } else {
        // Аватар
        modalTitle.innerText = 'Новый скин!';
        // Загружаем информацию об аватаре
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
