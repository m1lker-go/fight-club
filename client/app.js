let tg = window.Telegram.WebApp;
tg.expand();

let userData = null;
let inventory = [];
let currentScreen = 'main';
let battleInProgress = false; // флаг, что бой идёт

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

// Показ экранов (с проверкой на бой)
function showScreen(screen) {
    if (battleInProgress && screen !== 'battle') return; // нельзя переключаться во время боя
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
        case 'battle': /* ничего не делаем, бой уже отрисован */ break;
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
                        <option value="warrior" ${userData.class === 'warrior' ? 'selected' : ''}>Воин</option>
                        <option value="assassin" ${userData.class === 'assassin' ? 'selected' : ''}>Ассасин</option>
                        <option value="mage" ${userData.class === 'mage' ? 'selected' : ''}>Маг</option>
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
            <p>Уровень ${userData.level} | Очков навыков: ${userData.skill_points}</p>
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

    updateSubclasses(userData.class);

    classSelect.addEventListener('change', async (e) => {
        const newClass = e.target.value;
        await fetch('/player/class', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id, class: newClass })
        });
        userData.class = newClass;
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
    const content = document.getElementById('content');
    content.innerHTML = `
        <h3>Профиль</h3>
        <div>Уровень: ${userData.level}</div>
        <div>Опыт: ${userData.exp}</div>
        <div>Класс: ${userData.class}</div>
        <div>Подкласс: ${userData.subclass}</div>
        <div>Очки навыков: ${userData.skill_points}</div>
        <h4>Характеристики</h4>
        <div>HP: ${(userData.hp_points || 0) * 2}</div>
        <div>ATK: ${(userData.atk_points || 0)}</div>
        <div>DEF: ${(userData.def_points || 0)}%</div>
        <div>RES: ${(userData.res_points || 0)}%</div>
        <div>SPD: ${(userData.spd_points || 0) + 10}</div>
        <div>CRIT: ${(userData.crit_points || 0)}%</div>
        <div>CRIT DMG: ${2.0 + ((userData.crit_dmg_points || 0) / 100)}x</div>
        <div>DODGE: ${(userData.dodge_points || 0)}%</div>
        <div>ACC: ${(userData.acc_points || 0) + 100}%</div>
        <div>MANA: ${(userData.mana_points || 0)}% усиление</div>
    `;
}

// ==================== БОЙ ====================
async function startBattle() {
    if (battleInProgress) return;
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
    // Скрываем нижнее меню (делаем его неактивным)
    document.querySelector('.bottom-menu').style.pointerEvents = 'none';
    document.querySelector('.bottom-menu').style.opacity = '0.5';
    battleInProgress = true;
    showBattleScreen(data);
}

function showBattleScreen(battleData) {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-screen">
            <div class="battle-header">
                <div>${userData.username} (${userData.class})</div>
                <div class="battle-timer" id="battleTimer">45</div>
                <div>${battleData.opponent.username} (${battleData.opponent.class})</div>
            </div>
            <div class="battle-arena">
                <div class="hero-card">
                    <div class="hero-avatar"><i class="fas fa-user"></i></div>
                    <div class="hp-bar">
                        <div class="hp-fill" id="heroHpFill" style="width:100%"></div>
                    </div>
                    <div id="heroHpText">${battleData.result.playerMaxHp}/${battleData.result.playerMaxHp}</div>
                </div>
                <div>VS</div>
                <div class="enemy-card">
                    <div class="enemy-avatar"><i class="fas fa-user"></i></div>
                    <div class="hp-bar">
                        <div class="hp-fill" id="enemyHpFill" style="width:100%"></div>
                    </div>
                    <div id="enemyHpText">${battleData.result.enemyMaxHp}/${battleData.result.enemyMaxHp}</div>
                </div>
            </div>
            <div class="battle-log" id="battleLog"></div>
            <div class="battle-controls">
                <button class="speed-btn active" data-speed="1">x1</button>
                <button class="speed-btn" data-speed="2">x2</button>
            </div>
        </div>
        <div id="battleResultOverlay" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #232833; padding: 20px; border-radius: 12px; border: 2px solid #00aaff; text-align: center; z-index: 1000;">
            <h2 id="resultTitle"></h2>
            <p id="resultDetails"></p>
            <button class="btn" id="rematchBtn">В бой</button>
            <button class="btn" id="backToMainBtn">Назад</button>
        </div>
    `;

    const steps = battleData.result.steps;
    const playerMaxHp = battleData.result.playerMaxHp;
    const enemyMaxHp = battleData.result.enemyMaxHp;
    let currentPlayerHp = playerMaxHp;
    let currentEnemyHp = enemyMaxHp;
    let stepIndex = 0;
    let speed = 1000; // мс между шагами
    let timerSeconds = 45;
    const timerElement = document.getElementById('battleTimer');
    const logElement = document.getElementById('battleLog');
    const heroHpFill = document.getElementById('heroHpFill');
    const enemyHpFill = document.getElementById('enemyHpFill');
    const heroHpText = document.getElementById('heroHpText');
    const enemyHpText = document.getElementById('enemyHpText');

    // Обновление отображения HP
    function updateHpDisplay() {
        const heroPercent = (currentPlayerHp / playerMaxHp) * 100;
        const enemyPercent = (currentEnemyHp / enemyMaxHp) * 100;
        heroHpFill.style.width = heroPercent + '%';
        enemyHpFill.style.width = enemyPercent + '%';
        heroHpText.innerText = `${currentPlayerHp}/${playerMaxHp}`;
        enemyHpText.innerText = `${currentEnemyHp}/${enemyMaxHp}`;
    }

    // Добавление записи в лог
    function addLog(message) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerText = message;
        logElement.appendChild(entry);
        logElement.scrollTop = logElement.scrollHeight;
    }

    // Функция выполнения следующего шага
    function nextStep() {
        if (stepIndex >= steps.length) {
            // Бой завершён, показываем результат
            finishBattle(battleData.result.winner);
            return true; // завершено
        }
        const step = steps[stepIndex];
        if (step.attacker === 'player') {
            currentEnemyHp = step.enemyHp;
        } else {
            currentPlayerHp = step.playerHp;
        }
        updateHpDisplay();
        addLog(step.message);
        stepIndex++;
        return false;
    }

    // Таймер обратного отсчёта
    const timerInterval = setInterval(() => {
        timerSeconds--;
        timerElement.innerText = timerSeconds;
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            // Определяем победителя по проценту HP
            const playerPercent = (currentPlayerHp / playerMaxHp) * 100;
            const enemyPercent = (currentEnemyHp / enemyMaxHp) * 100;
            let winner;
            if (playerPercent > enemyPercent) winner = 'player';
            else if (enemyPercent > playerPercent) winner = 'enemy';
            else winner = 'draw';
            finishBattle(winner, true);
        }
    }, 1000);

    // Запуск пошагового выполнения
    let battleInterval = setInterval(() => {
        const finished = nextStep();
        if (finished) {
            clearInterval(battleInterval);
            clearInterval(timerInterval);
        }
    }, speed);

    // Обработка кнопок скорости
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            speed = btn.dataset.speed === '1' ? 1000 : 500;
            // Перезапускаем интервал с новой скоростью
            clearInterval(battleInterval);
            battleInterval = setInterval(() => {
                const finished = nextStep();
                if (finished) {
                    clearInterval(battleInterval);
                    clearInterval(timerInterval);
                }
            }, speed);
        });
    });

    // Функция завершения боя
    function finishBattle(winner, timeExpired = false) {
        clearInterval(battleInterval);
        clearInterval(timerInterval);
        battleInProgress = false;
        document.querySelector('.bottom-menu').style.pointerEvents = 'auto';
        document.querySelector('.bottom-menu').style.opacity = '1';

        const overlay = document.getElementById('battleResultOverlay');
        const title = document.getElementById('resultTitle');
        const details = document.getElementById('resultDetails');

        let resultText = '';
        if (winner === 'player') {
            resultText = 'Победа!';
        } else if (winner === 'enemy') {
            resultText = 'Поражение';
        } else {
            resultText = 'Ничья';
        }
        title.innerText = resultText;
        if (timeExpired) {
            details.innerText = 'Время вышло. Результат по проценту HP.';
        } else {
            details.innerText = '';
        }
        overlay.style.display = 'block';

        document.getElementById('rematchBtn').onclick = () => {
            overlay.style.display = 'none';
            startBattle();
        };
        document.getElementById('backToMainBtn').onclick = () => {
            overlay.style.display = 'none';
            showScreen('main');
        };
    }
}

async function refreshData() {
    const res = await fetch(`/player/${userData.tg_id}`);
    const data = await res.json();
    userData = data.user;
    inventory = data.inventory;
    updateTopBar();
    showScreen(currentScreen);
}

// Обработчики меню
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        showScreen(item.dataset.screen);
    });
});

// Запуск
init();
