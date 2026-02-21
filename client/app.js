let tg = window.Telegram.WebApp;
tg.expand();

let userData = null;
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
    content.innerHTML = '';

    switch (screen) {
        case 'main': renderMain(); break;
        case 'equip': renderEquip(); break;
        case 'shop': renderShop(); break;
        case 'market': renderMarket(); break;
        case 'tasks': renderTasks(); break;
        case 'profile': renderProfile(); break;
        case 'battle': /* уже обработано в startBattle */ break;
    }
}

// Главный экран с выбором класса и подкласса
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
        // При смене класса сбрасываем подкласс на первый подходящий
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

// Остальные функции (renderEquip, renderShop, renderMarket, renderTasks, renderProfile) остаются без изменений
// (при необходимости можно скопировать из текущего app.js, они уже есть)

// Для краткости я не копирую их сюда, но они должны остаться.
// В вашем app.js они уже есть, поэтому мы их не трогаем.

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
                <div>${userData.username} (${userData.class})</div>
                <div class="battle-timer" id="battleTimer">45</div>
                <div>${battleData.opponent.username} (${battleData.opponent.class})</div>
            </div>
            <div class="battle-arena">
                <div class="hero-card">
                    <div class="hero-avatar"><i class="fas fa-user"></i></div>
                    <div class="hp-bar"><div class="hp-fill" id="heroHp" style="width:100%"></div></div>
                    <div id="heroHpText">${battleData.result.playerHpRemain}</div>
                </div>
                <div>VS</div>
                <div class="enemy-card">
                    <div class="enemy-avatar"><i class="fas fa-user"></i></div>
                    <div class="hp-bar"><div class="hp-fill" id="enemyHp" style="width:100%"></div></div>
                    <div id="enemyHpText">${battleData.result.enemyHpRemain}</div>
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
            // По истечении времени можно автоматически завершить бой (по % HP)
        }
    }, 1000);

    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Здесь можно регулировать скорость анимации (пока не реализовано)
        });
    });
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
