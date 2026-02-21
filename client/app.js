let tg = window.Telegram.WebApp;
tg.expand();

let userData = null;
let inventory = [];
let currentScreen = 'main';

// Инициализация
async function init() {
    // Отправляем initData на сервер для авторизации
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

// Показ экранов
function showScreen(screen) {
    currentScreen = screen;
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.screen === screen) item.classList.add('active');
    });

    const content = document.getElementById('content');
    content.innerHTML = ''; // очистка

    switch (screen) {
        case 'main': renderMain(); break;
        case 'equip': renderEquip(); break;
        case 'shop': renderShop(); break;
        case 'market': renderMarket(); break;
        case 'tasks': renderTasks(); break;
        case 'profile': renderProfile(); break;
        case 'battle': renderBattle(); break;
    }
}

// Главный экран
function renderMain() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="hero-avatar" style="width: 120px; height: 120px; margin: 20px auto;">
                <i class="fas fa-shield-alt"></i>
            </div>
            <h2>${userData.username}</h2>
            <p>${userData.class} / ${userData.subclass}</p>
            <p>Уровень ${userData.level} | Очков навыков: ${userData.skill_points}</p>
            <button class="btn" id="fightBtn">Начать бой</button>
        </div>
    `;
    document.getElementById('fightBtn').addEventListener('click', () => startBattle());
}

// Экран экипировки
function renderEquip() {
    // Получаем экипированные предметы
    const equipped = inventory.filter(item => item.equipped);
    const unequipped = inventory.filter(item => !item.equipped && !item.for_sale);

    let html = '<h3>Экипировка</h3><div class="equipped-slots" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">';
    // Слоты: weapon, armor, helmet, gloves, boots, accessory
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
    content.innerHTML = html;

    // Обработчики
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

// Магазин сундуков
function renderShop() {
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

// Маркет
function renderMarket() {
    // Фильтры
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

// Задания
function renderTasks() {
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
        // Показать рейтинг (можно сделать отдельный экран)
        alert('Рейтинг пока не реализован');
    });
}

function renderProfile() {
    content.innerHTML = `
        <h3>Профиль</h3>
        <div>Уровень: ${userData.level}</div>
        <div>Опыт: ${userData.exp}</div>
        <div>Класс: ${userData.class}</div>
        <div>Подкласс: ${userData.subclass}</div>
        <div>Очки навыков: ${userData.skill_points}</div>
        <h4>Характеристики</h4>
        <div>HP: ${userData.hp_points * 2}</div>
        <div>ATK: ${userData.atk_points}</div>
        <!-- и так далее -->
    `;
}

// Бой
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
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-screen">
            <div class="battle-header">
                <div>${userData.username}</div>
                <div class="battle-timer" id="battleTimer">45</div>
                <div>${battleData.opponent.username}</div>
            </div>
            <div class="battle-arena">
                <div class="hero-card">
                    <div class="hero-avatar"><i class="fas fa-user"></i></div>
                    <div class="hp-bar"><div class="hp-fill" id="heroHp" style="width:100%"></div></div>
                    <div id="heroHpText">${battleData.result.player1_hp_remain}</div>
                </div>
                <div>VS</div>
                <div class="enemy-card">
                    <div class="enemy-avatar"><i class="fas fa-user"></i></div>
                    <div class="hp-bar"><div class="hp-fill" id="enemyHp" style="width:100%"></div></div>
                    <div id="enemyHpText">${battleData.result.player2_hp_remain}</div>
                </div>
            </div>
            <div class="battle-log" id="battleLog">
                ${battleData.result.log.map(l => `<div class="log-entry">${l}</div>`).join('')}
            </div>
            <div class="battle-controls">
                <button class="speed-btn active" data-speed="1">x1</button>
                <button class="speed-btn" data-speed="2">x2</button>
            </div>
        </div>
    `;

    let timeLeft = 45;
    const timer = setInterval(() => {
        timeLeft--;
        document.getElementById('battleTimer').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            // определить победителя по %
        }
    }, 1000);

    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const speed = btn.dataset.speed;
            // Здесь можно регулировать скорость анимации/лога
        });
    });
}

async function refreshData() {
    const res = await fetch(`/player/${userData.tg_id}`);
    const data = await res.json();
    userData = data.user;
    inventory = data.inventory;
    updateTopBar();
    showScreen(currentScreen); // перерендерим текущий экран
}

// Обработчики меню
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        showScreen(item.dataset.screen);
    });
});

// Запуск
init();