// js/tower.js

const API_BASE = 'https://fight-club-api-4och.onrender.com';

let towerStatus = null;
let claimedFloors = new Set();

async function loadTowerStatus() {
    try {
        const res = await fetch(`${API_BASE}/tower/status?tg_id=${userData.tg_id}`);
        if (!res.ok) throw new Error('Failed to load tower status');
        towerStatus = await res.json();
        renderTower();
    } catch (e) {
        console.error(e);
        alert('Ошибка загрузки башни');
    }
}

function renderTower() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="tower-container">
            <div class="tower-header">
                <div class="tower-stats">
                    <span>Этаж: <span id="currentFloorDisplay">${towerStatus.currentFloor}</span></span>
                    <span>Билеты: <span id="ticketsDisplay">${towerStatus.attemptsLeft}/10</span></span>
                </div>
                <div class="tower-class-info">
                    Класс: ${window.getClassNameRu ? getClassNameRu(towerStatus.chosenClass) : towerStatus.chosenClass} (${getRoleNameRu(towerStatus.chosenSubclass)})
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

        let iconSrc;
        if (i === 1) {
            iconSrc = '/assets/tower/floor1.png';
        } else if (i % 2 === 0) {
            iconSrc = '/assets/tower/floor_even.png';
        } else {
            iconSrc = '/assets/tower/floor_odd.png';
        }

        const showClaimButton = i < towerStatus.currentFloor && !claimedFloors.has(i);

        floorDiv.innerHTML = `
            <div class="floor-left">
                <span class="floor-number">${i}</span>
                <span class="floor-text">этаж</span>
            </div>
            <div class="floor-center">
                <img src="${iconSrc}" alt="floor ${i}" onerror="this.src='/assets/tower/default.png'">
            </div>
            <div class="floor-right">
                ${showClaimButton ? 
                    `<button class="claim-btn" data-floor="${i}"><i class="fas fa-coins"></i></button>` : 
                    (i === towerStatus.currentFloor ? '<span class="current-marker">▶</span>' : '')}
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

    document.querySelectorAll('.claim-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const floor = btn.dataset.floor;
            claimFloorReward(floor);
        });
    });

    document.querySelectorAll('.tower-floor').forEach(floorDiv => {
        floorDiv.addEventListener('click', () => {
            const floor = parseInt(floorDiv.querySelector('.floor-number').innerText);
            if (floor === towerStatus.currentFloor) {
                startTowerBattle();
            }
        });
    });
}

async function claimFloorReward(floor) {
    try {
        const res = await fetch(`${API_BASE}/tower/claim-floor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id, floor })
        });
        const data = await res.json();
        if (data.success) {
            claimedFloors.add(parseInt(floor));
            const btn = document.querySelector(`.claim-btn[data-floor="${floor}"]`);
            if (btn) btn.remove();
            userData.coins += 10;
            updateTopBar();
        } else {
            alert('Ошибка: ' + data.error);
        }
    } catch (e) {
        console.error(e);
        alert('Ошибка соединения');
    }
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
        showTowerBattleScreen(data);
    } catch (e) {
        console.error(e);
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
                <!-- Здесь нужно вставить полную разметку арены из battleUI.js -->
                <!-- Для теста можно оставить пустым, но лучше скопировать -->
            </div>
            <div class="battle-log" id="battleLog" style="height:250px; overflow-y:auto; background-color:#232833; border-radius:10px; padding:10px; margin-top:10px;"></div>
        </div>
    `;

    BattleLog.init(battleData.battleResult, document.getElementById('battleLog'), () => {
        handleTowerBattleEnd(battleData);
    });
}

function handleTowerBattleEnd(battleData) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.pointerEvents = 'auto';
        item.style.opacity = '1';
    });

    if (battleData.victory) {
        alert(`Победа! Вы получили ${battleData.reward.coins} монет.`);
        towerStatus.currentFloor = battleData.newFloor;
        towerStatus.attemptsLeft = battleData.attemptsLeft;
        userData.coins += battleData.reward.coins;
        updateTopBar();
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
