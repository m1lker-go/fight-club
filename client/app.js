let tg = window.Telegram.WebApp;
tg.expand();

let userData = null;          // данные из таблицы users
let classesData = [];         // данные по каждому классу (warrior, assassin, mage)
let inventory = [];
let currentScreen = 'main';
let battleInProgress = false; // блокировка меню во время боя

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
        classesData = data.classes || [];
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

// Показ экранов (с проверкой боя)
function showScreen(screen) {
    if (battleInProgress && screen !== 'battle') {
        // Во время боя нельзя переключаться
        return;
    }
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
        case 'skills': renderSkills(); break;          // новый экран навыков
        case 'shop': renderShop(); break;
        case 'market': renderMarket(); break;
        case 'tasks': renderTasks(); break;
        case 'profile': renderProfile(); break;
        case 'battle': /* рендерится через startBattle */ break;
    }
}

// ==================== ГЛАВНЫЙ ЭКРАН ====================
function renderMain() {
    const content = document.getElementById('content');
    const currentClass = classesData.find(c => c.class === userData.current_class) || classesData[0];
    content.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="hero-avatar" style="width: 120px; height: 120px; margin: 20px auto;">
                <i class="fas fa-shield-alt"></i>
            </div>
            <h2>${userData.username}</h2>
            <p>Текущий класс: ${userData.current_class} / ${userData.subclass}</p>
            <p>Уровень ${currentClass?.level || 1} | Очков навыков: ${currentClass?.skill_points || 0}</p>
            <button class="btn" id="fightBtn">Начать бой</button>
        </div>
    `;
    document.getElementById('fightBtn').addEventListener('click', () => startBattle());
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

// ==================== ЭКРАН НАВЫКОВ (ПРОКАЧКА) ====================
function renderSkills() {
    const content = document.getElementById('content');
    // Кнопки выбора класса
    const classTabs = ['warrior', 'assassin', 'mage'].map(cls => {
        const active = (cls === userData.current_class) ? 'active' : '';
        return `<button class="class-tab ${active}" data-class="${cls}">${cls}</button>`;
    }).join('');

    // Данные текущего класса
    const currentClass = classesData.find(c => c.class === userData.current_class) || classesData[0];
    if (!currentClass) return;

    const statFields = [
        { label: 'Здоровье (+2 HP)', key: 'hp_points', value: currentClass.hp_points || 0 },
        { label: 'Атака (+1 ATK)', key: 'atk_points', value: currentClass.atk_points || 0 },
        { label: 'Защита (+1% DEF)', key: 'def_points', value: currentClass.def_points || 0 },
        { label: 'Сопротивление (+1% RES)', key: 'res_points', value: currentClass.res_points || 0 },
        { label: 'Скорость (+1 SPD)', key: 'spd_points', value: currentClass.spd_points || 0 },
        { label: 'Шанс крита (+1% CRIT)', key: 'crit_points', value: currentClass.crit_points || 0 },
        { label: 'Крит. урон (+1% DMG)', key: 'crit_dmg_points', value: currentClass.crit_dmg_points || 0 },
        { label: 'Уворот (+1% DODGE)', key: 'dodge_points', value: currentClass.dodge_points || 0 },
        { label: 'Меткость (+1% ACC)', key: 'acc_points', value: currentClass.acc_points || 0 },
        { label: 'Мана (+1% усиление)', key: 'mana_points', value: currentClass.mana_points || 0 }
    ];

    let statsHtml = '';
    statFields.forEach(stat => {
        statsHtml += `
            <div class="stat-row">
                <span>${stat.label}: ${stat.value}</span>
                <button class="upgrade-btn" data-stat="${stat.key}">+</button>
            </div>
        `;
    });

    content.innerHTML = `
        <h3>Навыки</h3>
        <div class="class-tabs">${classTabs}</div>
        <p>Доступно очков навыков: ${currentClass.skill_points || 0}</p>
        <div class="stats-list">
            ${statsHtml}
        </div>
    `;

    // Обработчики вкладок классов
    document.querySelectorAll('.class-tab').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const newClass = e.target.dataset.class;
            if (newClass === userData.current_class) return;
            // Сначала обновляем на сервере текущий класс
            await fetch('/player/class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, class: newClass })
            });
            userData.current_class = newClass;
            // Загружаем свежие данные по этому классу
            const res = await fetch(`/player/class/${userData.tg_id}/${newClass}`);
            const classInfo = await res.json();
            // Обновляем classesData
            const index = classesData.findIndex(c => c.class === newClass);
            if (index !== -1) classesData[index] = classInfo;
            else classesData.push(classInfo);
            renderSkills(); // перерисовываем
        });
    });

    // Обработчики улучшения
    document.querySelectorAll('.upgrade-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const stat = e.target.dataset.stat;
            const currentClass = userData.current_class;
            const classObj = classesData.find(c => c.class === currentClass);
            if (!classObj || classObj.skill_points < 1) {
                alert('Недостаточно очков навыков');
                return;
            }
            const res = await fetch('/player/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tg_id: userData.tg_id,
                    class: currentClass,
                    stat: stat,
                    points: 1
                })
            });
            const data = await res.json();
            if (data.success) {
                // Обновляем локально
                classObj[stat] = (classObj[stat] || 0) + 1;
                classObj.skill_points -= 1;
                renderSkills();
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });
}

// ==================== МАГАЗИН ====================
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
    const content = document.getElementById('content');
    const currentClass = classesData.find(c => c.class === userData.current_class) || classesData[0];
    content.innerHTML = `
        <h3>Профиль</h3>
        <div>Текущий класс: ${userData.current_class}</div>
        <div>Подкласс: ${userData.subclass}</div>
        <div>Уровень (текущий класс): ${currentClass?.level || 1}</div>
        <div>Опыт: ${currentClass?.exp || 0}</div>
        <div>Очки навыков: ${currentClass?.skill_points || 0}</div>
        <h4>Характеристики (база)</h4>
        <div>HP: ${(currentClass?.hp_points || 0) * 2}</div>
        <div>ATK: ${(currentClass?.atk_points || 0)}</div>
        <div>DEF: ${(currentClass?.def_points || 0)}%</div>
        <div>RES: ${(currentClass?.res_points || 0)}%</div>
        <div>SPD: ${(currentClass?.spd_points || 0) + 10}</div>
        <div>CRIT: ${(currentClass?.crit_points || 0)}%</div>
        <div>CRIT DMG: ${2.0 + ((currentClass?.crit_dmg_points || 0) / 100)}x</div>
        <div>DODGE: ${(currentClass?.dodge_points || 0)}%</div>
        <div>ACC: ${(currentClass?.acc_points || 0) + 100}%</div>
        <div>MANA: ${(currentClass?.mana_points || 0)}% усиление</div>
    `;
}

// ==================== БОЙ ====================
async function startBattle() {
    if (userData.energy < 1) {
        alert('Недостаточно энергии');
        return;
    }
    battleInProgress = true;
    const res = await fetch('/battle/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tg_id: userData.tg_id })
    });
    const data = await res.json();
    if (data.error) {
        alert(data.error);
        battleInProgress = false;
        return;
    }
    showBattleScreen(data);
}

function showBattleScreen(battleData) {
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
                        <div class="hp-fill" id="heroHpFill" style="width:100%"></div>
                    </div>
                    <div class="mana-bar">
                        <div class="mana-fill" id="heroManaFill" style="width:0%"></div>
                    </div>
                    <div id="heroHpText">${battleData.result.playerHpRemain}/${battleData.result.playerMaxHp}</div>
                </div>
                <div>VS</div>
                <div class="enemy-card">
                    <div class="enemy-avatar"><i class="fas fa-user"></i></div>
                    <div class="hp-bar">
                        <div class="hp-fill" id="enemyHpFill" style="width:100%"></div>
                    </div>
                    <div class="mana-bar">
                        <div class="mana-fill" id="enemyManaFill" style="width:0%"></div>
                    </div>
                    <div id="enemyHpText">${battleData.result.enemyHpRemain}/${battleData.result.enemyMaxHp}</div>
                </div>
            </div>
            <div class="battle-log" id="battleLog">
                <!-- Лог будет обновляться -->
            </div>
            <div class="battle-controls">
                <button class="speed-btn active" data-speed="1">x1</button>
                <button class="speed-btn" data-speed="2">x2</button>
            </div>
        </div>
    `;

    // Данные боя
    const turns = battleData.result.turns || [];
    const logDiv = document.getElementById('battleLog');
    let turnIndex = 0;
    let timeLeft = 45;
    let speed = 1;
    let interval = setInterval(updateTurn, 1000 / speed);

    function updateTurn() {
        if (turnIndex < turns.length) {
            const turn = turns[turnIndex];
            // Обновляем полоски HP
            const heroHpPercent = (turn.playerHp / battleData.result.playerMaxHp) * 100;
            const enemyHpPercent = (turn.enemyHp / battleData.result.enemyMaxHp) * 100;
            document.getElementById('heroHpFill').style.width = heroHpPercent + '%';
            document.getElementById('enemyHpFill').style.width = enemyHpPercent + '%';
            document.getElementById('heroHpText').innerText = `${turn.playerHp}/${battleData.result.playerMaxHp}`;
            document.getElementById('enemyHpText').innerText = `${turn.enemyHp}/${battleData.result.enemyMaxHp}`;

            // Обновляем ману (условно)
            const heroManaPercent = (turn.playerMana / 100) * 100;
            const enemyManaPercent = (turn.enemyMana / 100) * 100;
            document.getElementById('heroManaFill').style.width = heroManaPercent + '%';
            document.getElementById('enemyManaFill').style.width = enemyManaPercent + '%';

            // Добавляем лог
            if (turn.action) {
                logDiv.innerHTML += `<div class="log-entry">${turn.action}</div>`;
                logDiv.scrollTop = logDiv.scrollHeight;
            }

            turnIndex++;
        } else {
            // Бой завершён
            clearInterval(interval);
            finishBattle(battleData);
        }
    }

    // Таймер
    const timerEl = document.getElementById('battleTimer');
    const timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            clearInterval(interval);
            finishBattle(battleData, true); // принудительное завершение по таймеру
        }
    }, 1000);

    // Управление скоростью
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            speed = parseInt(btn.dataset.speed);
            clearInterval(interval);
            interval = setInterval(updateTurn, 1000 / speed);
        });
    });

    function finishBattle(battleData, timeout = false) {
        clearInterval(timerInterval);
        clearInterval(interval);
        battleInProgress = false;

        let resultMessage = '';
        if (timeout) {
            // Определяем победителя по % HP
            const playerPercent = battleData.result.playerHpRemain / battleData.result.playerMaxHp;
            const enemyPercent = battleData.result.enemyHpRemain / battleData.result.enemyMaxHp;
            if (playerPercent > enemyPercent) {
                resultMessage = 'Победа (по истечении времени)';
            } else if (enemyPercent > playerPercent) {
                resultMessage = 'Поражение (по истечении времени)';
            } else {
                resultMessage = 'Ничья';
            }
        } else {
            if (battleData.result.winner === 'player') resultMessage = 'Победа!';
            else if (battleData.result.winner === 'enemy') resultMessage = 'Поражение...';
            else resultMessage = 'Ничья';
        }

        // Отображаем результат и награды
        content.innerHTML += `
            <div class="battle-result-overlay">
                <div class="battle-result-card">
                    <h2>${resultMessage}</h2>
                    <p>Получено опыта: ${battleData.reward.exp}</p>
                    <p>Получено монет: ${battleData.reward.coins}</p>
                    ${battleData.reward.leveledUp ? '<p>Уровень повышен!</p>' : ''}
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn" id="againBtn">В бой</button>
                        <button class="btn btn-outline" id="backBtn">Назад</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('againBtn').addEventListener('click', () => {
            refreshData(); // обновляем данные (энергия, опыт и т.д.)
            startBattle();
        });

        document.getElementById('backBtn').addEventListener('click', () => {
            refreshData();
            showScreen('main');
        });
    }
}

async function refreshData() {
    const res = await fetch(`/player/${userData.tg_id}`);
    const data = await res.json();
    userData = data.user;
    classesData = data.classes || [];
    inventory = data.inventory || [];
    updateTopBar();
    showScreen(currentScreen);
}

// Обработчики меню
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        if (battleInProgress && item.dataset.screen !== 'battle') return;
        showScreen(item.dataset.screen);
    });
});

// Запуск
init();
