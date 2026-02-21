let tg = window.Telegram.WebApp;
tg.expand();

let userData = null;
let userClasses = [];
let inventory = [];
let currentScreen = 'main';

// Инициализация
async function init() {
    const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData })
    });
    const data = await response.json();
    if (data.user) {
        userData = data.user;
        userClasses = data.classes || [];
        inventory = data.inventory || [];
        updateTopBar();
        showScreen('main');
    } else {
        alert('Ошибка авторизации');
    }
}

function updateTopBar() {
    document.getElementById('coinCount').innerText = userData.coins;
    document.getElementById('rating').innerText = userData.rating;
    document.getElementById('energy').innerText = userData.energy;
}

function showScreen(screen) {
    currentScreen = screen;
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.screen === screen) item.classList.add('active');
    });

    const content = document.getElementById('content');
    content.innerHTML = '';

    switch (screen) {
        case 'main': renderMain(); break;
        case 'equip': renderEquip(); break;
        case 'shop': renderShop(); break;
        case 'market': renderMarket(); break;
        case 'tasks': renderTasks(); break;
        case 'profile': renderProfile(); break;
        case 'skills': renderSkills(); break;
    }
}

// ==================== ГЛАВНЫЙ ЭКРАН ====================
function renderMain() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="hero-avatar" style="width: 120px; height: 120px; margin: 20px auto;">
                <i class="fas fa-shield-alt"></i>
            </div>
            <h2>${userData.username}</h2>
            <div style="margin: 10px 0;">
                <label>Класс: 
                    <select id="classSelect">
                        <option value="warrior" ${userData.current_class === 'warrior' ? 'selected' : ''}>Воин</option>
                        <option value="assassin" ${userData.current_class === 'assassin' ? 'selected' : ''}>Ассасин</option>
                        <option value="mage" ${userData.current_class === 'mage' ? 'selected' : ''}>Маг</option>
                    </select>
                </label>
            </div>
            <div style="margin: 10px 0;">
                <label>Подкласс: 
                    <select id="subclassSelect">
                        <!-- заполняется динамически -->
                    </select>
                </label>
            </div>
            <p>Уровень ${getCurrentClassLevel()} | Очков навыков: ${getCurrentClassSkillPoints()}</p>
            <button class="btn" id="fightBtn">Начать бой</button>
        </div>
    `;

    const classSelect = document.getElementById('classSelect');
    const subclassSelect = document.getElementById('subclassSelect');

    function updateSubclasses(className) {
        const subclasses = {
            warrior: ['guardian', 'berserker', 'knight'],
            assassin: ['assassin', 'venom_blade', 'blood_hunter'],
            mage: ['pyromancer', 'cryomancer', 'illusionist']
        };
        const options = subclasses[className] || [];
        subclassSelect.innerHTML = options.map(sc => {
            const selected = (userData.subclass === sc) ? 'selected' : '';
            return `<option value="${sc}" ${selected}>${sc.replace('_', ' ').toUpperCase()}</option>`;
        }).join('');
    }

    updateSubclasses(userData.current_class);

    classSelect.addEventListener('change', async (e) => {
        const newClass = e.target.value;
        await fetch('/player/class', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id, class: newClass })
        });
        userData.current_class = newClass;
        const firstSubclass = {
            warrior: 'guardian',
            assassin: 'assassin',
            mage: 'pyromancer'
        }[newClass];
        userData.subclass = firstSubclass;
        await fetch('/player/subclass', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id, subclass: firstSubclass })
        });
        updateSubclasses(newClass);
        // Обновляем отображение уровня и очков
        document.querySelector('p').innerHTML = `Уровень ${getCurrentClassLevel()} | Очков навыков: ${getCurrentClassSkillPoints()}`;
    });

    subclassSelect.addEventListener('change', async (e) => {
        const newSubclass = e.target.value;
        await fetch('/player/subclass', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id, subclass: newSubclass })
        });
        userData.subclass = newSubclass;
    });

    document.getElementById('fightBtn').addEventListener('click', () => startBattle());
}

function getCurrentClassData() {
    return userClasses.find(c => c.class === userData.current_class) || { level: 1, skill_points: 0, hp_points:0, atk_points:0, def_points:0, res_points:0, spd_points:0, crit_points:0, crit_dmg_points:0, dodge_points:0, acc_points:0, mana_points:0 };
}

function getCurrentClassLevel() {
    return getCurrentClassData().level;
}

function getCurrentClassSkillPoints() {
    return getCurrentClassData().skill_points;
}

// ==================== ЭКИПИРОВКА ====================
function renderEquip() {
    const equipped = inventory.filter(item => item.equipped);
    const unequipped = inventory.filter(item => !item.equipped && !item.for_sale);

    let html = '<h3>Экипировка</h3><div class="equipped-slots" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">';
    const slotIcons = {
        weapon: 'fa-solid fa-gun',
        armor: 'fa-solid fa-shirt',
        helmet: 'fa-solid fa-helmet-battle',
        gloves: 'fa-solid fa-hand',
        boots: 'fa-solid fa-boot',
        accessory: 'fa-solid fa-ring'
    };
    for (let slot in slotIcons) {
        const item = equipped.find(i => i.type === slot);
        html += `<div class="item-card" style="width: 80px; height: 100px; flex-direction: column; text-align: center;">`;
        if (item) {
            html += `<div class="item-icon"><i class="${slotIcons[slot]}"></i></div>`;
            html += `<div class="item-name" style="font-size: 10px;">${item.name}</div>`;
        } else {
            html += `<div class="item-icon" style="opacity:0.3"><i class="${slotIcons[slot]}"></i></div>`;
            html += `<div style="font-size:10px;">пусто</div>`;
        }
        html += `</div>`;
    }
    html += '</div><h3>Рюкзак</h3><div class="inventory-list">';

    unequipped.forEach(item => {
        html += `
            <div class="item-card" data-item-id="${item.id}">
                <div class="item-icon"><i class="fas fa-box"></i></div>
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    <div class="item-stats">ATK+${item.atk_bonus} DEF+${item.def_bonus}</div>
                    <div class="item-rarity rarity-${item.rarity}">${item.rarity}</div>
                </div>
                <div>
                    <button class="btn-outline equip-btn" style="padding:5px 10px;">Надеть</button>
                    <button class="btn-outline sell-btn" style="padding:5px 10px;">Продать</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    document.getElementById('content').innerHTML = html;

    document.querySelectorAll('.equip-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const card = e.target.closest('.item-card');
            const itemId = card.dataset.itemId;
            await fetch('/inventory/equip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId })
            });
            refreshData();
        });
    });

    document.querySelectorAll('.sell-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const card = e.target.closest('.item-card');
            const itemId = card.dataset.itemId;
            const price = prompt('Введите цену в монетах:');
            if (price && !isNaN(price)) {
                await fetch('/inventory/sell', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId, price: parseInt(price) })
                });
                refreshData();
            }
        });
    });
}

// ==================== МАГАЗИН СУНДУКОВ ====================
function renderShop() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h3>Магазин сундуков</h3>
        <div class="chest-list">
            <div class="item-card">
                <div class="item-icon"><i class="fas fa-box"></i></div>
                <div class="item-details">
                    <div class="item-name">Редкий сундук</div>
                    <div>Шанс: редкие предметы</div>
                    <div>Цена: 100 монет</div>
                </div>
                <button class="btn" data-chest="rare">Купить</button>
            </div>
            <div class="item-card">
                <div class="item-icon"><i class="fas fa-box-open"></i></div>
                <div class="item-details">
                    <div class="item-name">Эпический сундук</div>
                    <div>Шанс: эпические предметы</div>
                    <div>Цена: 500 монет</div>
                </div>
                <button class="btn" data-chest="epic">Купить</button>
            </div>
            <div class="item-card">
                <div class="item-icon"><i class="fas fa-crown"></i></div>
                <div class="item-details">
                    <div class="item-name">Легендарный сундук</div>
                    <div>Гарантия легендарки</div>
                    <div>Цена: 2000 монет</div>
                </div>
                <button class="btn" data-chest="legendary">Купить</button>
            </div>
        </div>
    `;
    document.querySelectorAll('[data-chest]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const chest = btn.dataset.chest;
            const res = await fetch('/shop/buychest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, chestType: chest })
            });
            const data = await res.json();
            if (data.item) {
                alert(`Вы получили: ${data.item.name}`);
                refreshData();
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });
}

// ==================== МАРКЕТ ====================
function renderMarket() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h3>Маркет</h3>
        <div class="filters">
            <select id="classFilter">
                <option value="any">Любой класс</option>
                <option value="warrior">Воин</option>
                <option value="assassin">Ассасин</option>
                <option value="mage">Маг</option>
            </select>
            <select id="rarityFilter">
                <option value="any">Любая редкость</option>
                <option value="rare">Редкий</option>
                <option value="epic">Эпический</option>
                <option value="legendary">Легендарный</option>
            </select>
            <button class="btn" id="applyFilters">Применить</button>
        </div>
        <div id="marketItems"></div>
    `;
    loadMarketItems();

    document.getElementById('applyFilters').addEventListener('click', loadMarketItems);
}

async function loadMarketItems() {
    const classFilter = document.getElementById('classFilter').value;
    const rarityFilter = document.getElementById('rarityFilter').value;
    const params = new URLSearchParams({ class: classFilter, rarity: rarityFilter });
    const res = await fetch('/market?' + params);
    const items = await res.json();
    const container = document.getElementById('marketItems');
    container.innerHTML = '';
    items.forEach(item => {
        container.innerHTML += `
            <div class="item-card">
                <div class="item-icon"><i class="fas fa-box"></i></div>
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    <div>Продавец: ${item.seller_name}</div>
                    <div>Цена: ${item.price} монет</div>
                </div>
                <button class="btn buy-btn" data-market-id="${item.id}">Купить</button>
            </div>
        `;
    });
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const marketId = btn.dataset.marketId;
            const res = await fetch('/market/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, market_id: marketId })
            });
            const data = await res.json();
            if (data.success) {
                alert('Покупка успешна!');
                refreshData();
                loadMarketItems();
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });
}

// ==================== ЗАДАНИЯ ====================
function renderTasks() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h3>Ежедневные задания</h3>
        <div class="task-card">
            <div>Ежедневный вход</div>
            <div>Текущая серия: ${userData.daily_streak || 0} дней</div>
            <button class="btn" id="dailyBtn">Получить награду</button>
        </div>
        <div class="task-card">
            <div>Реферальная программа</div>
            <div>Ваш код: ${userData.referral_code}</div>
            <div>Пригласите друга и получите 50 монет</div>
        </div>
        <div class="task-card">
            <div>Топ игроков</div>
            <button class="btn" id="ratingBtn">Рейтинг</button>
        </div>
    `;
    document.getElementById('dailyBtn').addEventListener('click', async () => {
        const res = await fetch('/tasks/daily', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id })
        });
        const data = await res.json();
        if (data.streak !== undefined) {
            alert(`Получено ${data.rewardCoins} монет! Серия: ${data.streak}`);
            refreshData();
        } else {
            alert('Ошибка: ' + data.error);
        }
    });

    document.getElementById('ratingBtn').addEventListener('click', () => {
        alert('Рейтинг пока не реализован');
    });
}

// ==================== ПРОФИЛЬ ====================
function renderProfile() {
    const classData = getCurrentClassData();
    const content = document.getElementById('content');
    content.innerHTML = `
        <h3>Профиль</h3>
        <div>Уровень: ${classData.level}</div>
        <div>Опыт: ${classData.exp}</div>
        <div>Текущий класс: ${userData.current_class}</div>
        <div>Подкласс: ${userData.subclass}</div>
        <div>Очки навыков: ${classData.skill_points}</div>
        <h4>Характеристики</h4>
        <div>HP: ${(classData.hp_points || 0) * 2}</div>
        <div>ATK: ${(classData.atk_points || 0) + 5}</div>
        <div>DEF: ${(classData.def_points || 0)}%</div>
        <div>RES: ${(classData.res_points || 0)}%</div>
        <div>SPD: ${(classData.spd_points || 0) + 10}</div>
        <div>CRIT: ${(classData.crit_points || 0)}%</div>
        <div>CRIT DMG: ${2.0 + ((classData.crit_dmg_points || 0) / 100)}x</div>
        <div>DODGE: ${(classData.dodge_points || 0)}%</div>
        <div>ACC: ${(classData.acc_points || 0) + 100}%</div>
        <div>MANA: ${(classData.mana_points || 0)}% усиление</div>
    `;
}

// ==================== НАВЫКИ ====================
function renderSkills() {
    const classData = getCurrentClassData();
    const content = document.getElementById('content');
    content.innerHTML = `
        <h3>Навыки ${userData.current_class === 'warrior' ? 'Воина' : userData.current_class === 'assassin' ? 'Ассасина' : 'Мага'}</h3>
        <div>Доступно очков навыков: ${classData.skill_points}</div>
        <div class="skills-list">
            <div class="skill-item">
                <span>Здоровье (+2 HP)</span>
                <span>Текущий уровень: ${classData.hp_points}</span>
                <button class="btn skill-up" data-stat="hp_points" ${classData.skill_points < 1 ? 'disabled' : ''}>+</button>
            </div>
            <div class="skill-item">
                <span>Атака (+1 ATK)</span>
                <span>Текущий уровень: ${classData.atk_points}</span>
                <button class="btn skill-up" data-stat="atk_points" ${classData.skill_points < 1 ? 'disabled' : ''}>+</button>
            </div>
            <div class="skill-item">
                <span>Защита (+1% DEF)</span>
                <span>Текущий уровень: ${classData.def_points}</span>
                <button class="btn skill-up" data-stat="def_points" ${classData.skill_points < 1 ? 'disabled' : ''}>+</button>
            </div>
            <div class="skill-item">
                <span>Сопротивление (+1% RES)</span>
                <span>Текущий уровень: ${classData.res_points}</span>
                <button class="btn skill-up" data-stat="res_points" ${classData.skill_points < 1 ? 'disabled' : ''}>+</button>
            </div>
            <div class="skill-item">
                <span>Скорость (+1 SPD)</span>
                <span>Текущий уровень: ${classData.spd_points}</span>
                <button class="btn skill-up" data-stat="spd_points" ${classData.skill_points < 1 ? 'disabled' : ''}>+</button>
            </div>
            <div class="skill-item">
                <span>Шанс крита (+1% CRIT)</span>
                <span>Текущий уровень: ${classData.crit_points}</span>
                <button class="btn skill-up" data-stat="crit_points" ${classData.skill_points < 1 ? 'disabled' : ''}>+</button>
            </div>
            <div class="skill-item">
                <span>Крит. урон (+1% CRIT DMG)</span>
                <span>Текущий уровень: ${classData.crit_dmg_points}</span>
                <button class="btn skill-up" data-stat="crit_dmg_points" ${classData.skill_points < 1 ? 'disabled' : ''}>+</button>
            </div>
            <div class="skill-item">
                <span>Уворот (+1% DODGE)</span>
                <span>Текущий уровень: ${classData.dodge_points}</span>
                <button class="btn skill-up" data-stat="dodge_points" ${classData.skill_points < 1 ? 'disabled' : ''}>+</button>
            </div>
            <div class="skill-item">
                <span>Меткость (+1% ACC)</span>
                <span>Текущий уровень: ${classData.acc_points}</span>
                <button class="btn skill-up" data-stat="acc_points" ${classData.skill_points < 1 ? 'disabled' : ''}>+</button>
            </div>
            <div class="skill-item">
                <span>Мана (+1% усиление)</span>
                <span>Текущий уровень: ${classData.mana_points}</span>
                <button class="btn skill-up" data-stat="mana_points" ${classData.skill_points < 1 ? 'disabled' : ''}>+</button>
            </div>
        </div>
    `;

    document.querySelectorAll('.skill-up').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const stat = e.target.dataset.stat;
            const res = await fetch('/player/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tg_id: userData.tg_id,
                    class: userData.current_class,
                    stat: stat,
                    points: 1
                })
            });
            const data = await res.json();
            if (data.success) {
                refreshData();
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });
}

// ==================== БОЙ ====================
async function startBattle() {
    const res = await fetch('/battle/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tg_id: userData.tg_id })
    });
    const data = await res.json();
    if (data.error) {
        alert(data.error);
        return;
    }
    showBattleScreen(data);
}

function showBattleScreen(battleData) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.pointerEvents = 'none';
        item.style.opacity = '0.5';
    });

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-screen">
            <div class="battle-header">
                <div>${userData.username} (${userData.current_class})</div>
                <div class="battle-timer" id="battleTimer">45</div>
                <div>${battleData.opponent.username} (${battleData.opponent.class})</div>
            </div>
            <div class="battle-arena">
                <div class="hero-card">
                    <div class="hero-avatar"><i class="fas fa-user"></i></div>
                    <div class="hp-bar">
                        <div class="hp-fill" id="heroHp" style="width:${(battleData.result.playerHpRemain / battleData.result.playerMaxHp) * 100}%"></div>
                    </div>
                    <div id="heroHpText">${battleData.result.playerHpRemain}/${battleData.result.playerMaxHp}</div>
                    <div class="mana-bar">
                        <div class="mana-fill" id="heroMana" style="width:0%"></div>
                    </div>
                </div>
                <div>VS</div>
                <div class="enemy-card">
                    <div class="enemy-avatar"><i class="fas fa-user"></i></div>
                    <div class="hp-bar">
                        <div class="hp-fill" id="enemyHp" style="width:${(battleData.result.enemyHpRemain / battleData.result.enemyMaxHp) * 100}%"></div>
                    </div>
                    <div id="enemyHpText">${battleData.result.enemyHpRemain}/${battleData.result.enemyMaxHp}</div>
                    <div class="mana-bar">
                        <div class="mana-fill" id="enemyMana" style="width:0%"></div>
                    </div>
                </div>
            </div>
            <div class="battle-log" id="battleLog"></div>
            <div class="battle-controls">
                <button class="speed-btn active" data-speed="1">x1</button>
                <button class="speed-btn" data-speed="2">x2</button>
            </div>
        </div>
    `;

    let turnIndex = 0;
    const turns = battleData.result.turns || [];
    const logContainer = document.getElementById('battleLog');
    let speed = 1;
    let interval;

    function playTurn() {
        if (turnIndex >= turns.length) {
            clearInterval(interval);
            showBattleResult(battleData);
            return;
        }
        const turn = turns[turnIndex];
        document.getElementById('heroHp').style.width = (turn.playerHp / battleData.result.playerMaxHp) * 100 + '%';
        document.getElementById('heroHpText').innerText = turn.playerHp + '/' + battleData.result.playerMaxHp;
        document.getElementById('enemyHp').style.width = (turn.enemyHp / battleData.result.enemyMaxHp) * 100 + '%';
        document.getElementById('enemyHpText').innerText = turn.enemyHp + '/' + battleData.result.enemyMaxHp;
        document.getElementById('heroMana').style.width = (turn.playerMana / 100) * 100 + '%';
        document.getElementById('enemyMana').style.width = (turn.enemyMana / 100) * 100 + '%';

        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerText = turn.action;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;

        turnIndex++;
    }

    playTurn();
    interval = setInterval(playTurn, 1000 / speed);

    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            speed = parseInt(btn.dataset.speed);
            clearInterval(interval);
            interval = setInterval(playTurn, 1000 / speed);
        });
    });

    let timeLeft = 45;
    const timerEl = document.getElementById('battleTimer');
    const timer = setInterval(() => {
        timeLeft--;
        timerEl.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            clearInterval(interval);
            const playerPercent = battleData.result.playerHpRemain / battleData.result.playerMaxHp;
            const enemyPercent = battleData.result.enemyHpRemain / battleData.result.enemyMaxHp;
            let winner;
            if (playerPercent > enemyPercent) winner = 'player';
            else if (enemyPercent > playerPercent) winner = 'enemy';
            else winner = 'draw';
            showBattleResult({ ...battleData, result: { ...battleData.result, winner } }, true);
        }
    }, 1000);
}

function showBattleResult(battleData, timeOut = false) {
    const winner = battleData.result.winner;
    const isVictory = (winner === 'player');
    const resultText = isVictory ? 'ПОБЕДА' : (winner === 'draw' ? 'НИЧЬЯ' : 'ПОРАЖЕНИЕ');

    const expGain = battleData.reward?.exp || 0;
    const coinGain = battleData.reward?.coins || 0;
    const leveledUp = battleData.reward?.leveledUp || false;

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-result">
            <h2>${resultText}</h2>
            <p>Получено опыта: ${expGain}</p>
            <p>Получено монет: ${coinGain}</p>
            ${leveledUp ? '<p>🎉 Уровень повышен!</p>' : ''}
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button class="btn" id="rematchBtn">В бой</button>
                <button class="btn" id="backBtn">Назад</button>
            </div>
        </div>
    `;

    document.getElementById('rematchBtn').addEventListener('click', () => {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.style.pointerEvents = 'auto';
            item.style.opacity = '1';
        });
        startBattle();
    });

    document.getElementById('backBtn').addEventListener('click', () => {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.style.pointerEvents = 'auto';
            item.style.opacity = '1';
        });
        showScreen('main');
    });
}

async function refreshData() {
    const res = await fetch(`/player/${userData.tg_id}`);
    const data = await res.json();
    userData = data.user;
    userClasses = data.classes || [];
    inventory = data.inventory || [];
    updateTopBar();
    showScreen(currentScreen);
}

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        showScreen(item.dataset.screen);
    });
});

init();
