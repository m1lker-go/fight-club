// client/js/fortune.js
let fortuneData = null;
let selectedTickets = 1;
let isSpinning = false;
let currentAngle = 0;
let prizeResult = null;
let animFrame = null;
const SPIN_DURATION = 7000;

// Сектора: тип, название, количество (если есть), иконка FA, отображаемый текст
const sectors = [
    { type: 'legendary_chest', name: 'Легендарное', amount: null, icon: 'fa-tshirt', display: 'Снаряжение' },
    { type: 'coins', name: '1000 монет', amount: 1000, icon: 'fa-coins', display: '1000' },
    { type: 'exp', name: '250 опыта', amount: 250, icon: 'fa-star', display: '250' },
    { type: 'coal', name: '50 угля', amount: 50, icon: 'fa-cube', display: '50' },
    { type: 'exp', name: '50 опыта', amount: 50, icon: 'fa-star', display: '50' },
    { type: 'coal', name: '10 угля', amount: 10, icon: 'fa-cube', display: '10' },
    { type: 'coins', name: '300 монет', amount: 300, icon: 'fa-coins', display: '300' },
    { type: 'exp', name: '20 опыта', amount: 20, icon: 'fa-star', display: '20' },
    { type: 'coins', name: '100 монет', amount: 100, icon: 'fa-coins', display: '100' },
    { type: 'free_spin', name: 'Бесплатный билет', amount: null, icon: 'fa-ticket-alt', display: 'Билет' }
];

// Шансы для каждого сектора (сумма 100)
sectors[0].chance = 1;
sectors[1].chance = 5;
sectors[2].chance = 10;
sectors[3].chance = 12;
sectors[4].chance = 25;
sectors[5].chance = 15;
sectors[6].chance = 8;
sectors[7].chance = 3;
sectors[8].chance = 20;
sectors[9].chance = 1;

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function drawWheel(ctx, centerX, centerY, radius, angleOffset = 0) {
    const sectorCount = sectors.length;
    const angleStep = (Math.PI * 2) / sectorCount;
    const colors = ['#2a303c', '#232833'];
    for (let i = 0; i < sectorCount; i++) {
        const start = i * angleStep + angleOffset;
        const end = (i + 1) * angleStep + angleOffset;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, start, end);
        ctx.fillStyle = colors[i % 2];
        ctx.fill();
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Рисуем иконку и текст, повёрнутые наружу
        ctx.save();
        ctx.translate(centerX, centerY);
        const midAngle = start + angleStep / 2;
        ctx.rotate(midAngle);
        const textRadius = radius * 0.65;
        // Иконка FontAwesome (рисуем вручную, так как canvas не поддерживает шрифты FA, используем символы)
        // Вместо реальных глифов используем текстовые символы из FontAwesome через обычный шрифт,
        // но проще – использовать стандартные иконки из набора Unicode или просто текст.
        // Поскольку FontAwesome – это шрифт, мы можем применить его в canvas, если установлен.
        // Но для надёжности используем текстовые метки.
        ctx.font = '24px "Font Awesome 6 Free", "Segoe UI", sans-serif';
        ctx.fillStyle = '#ddd';
        let iconChar = '';
        if (sectors[i].icon === 'fa-coins') iconChar = '💰';
        else if (sectors[i].icon === 'fa-star') iconChar = '⭐';
        else if (sectors[i].icon === 'fa-cube') iconChar = '🪨';
        else if (sectors[i].icon === 'fa-tshirt') iconChar = '👕';
        else if (sectors[i].icon === 'fa-ticket-alt') iconChar = '🎫';
        ctx.fillText(iconChar, textRadius - 8, -10);
        // Текст (цифра или слово)
        ctx.font = 'bold 14px "Segoe UI"';
        ctx.fillStyle = '#ccc';
        let displayText = sectors[i].display;
        if (sectors[i].type === 'legendary_chest') displayText = 'Снаряжение';
        else if (sectors[i].type === 'free_spin') displayText = 'Билет';
        else displayText = sectors[i].display;
        ctx.fillText(displayText, textRadius - 20, 12);
        // Дополнительная надпись для легендарного сундука
        if (sectors[i].type === 'legendary_chest') {
            ctx.font = '10px "Segoe UI"';
            ctx.fillStyle = '#aaa';
            ctx.fillText('Легенд.', textRadius - 20, 28);
        }
        ctx.restore();
    }
}

function renderWheel(angleOffset) {
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const centerX = size/2;
    const centerY = size/2;
    const radius = size/2 - 15;
    drawWheel(ctx, centerX, centerY, radius, angleOffset);
    // Ярко-голубой указатель
    ctx.beginPath();
    ctx.moveTo(centerX - 12, 12);
    ctx.lineTo(centerX + 12, 12);
    ctx.lineTo(centerX, 28);
    ctx.fillStyle = '#00aaff';
    ctx.fill();
}

function animateWheel(targetAngle) {
    const startAngle = currentAngle;
    const startTime = performance.now();
    function step(now) {
        const elapsed = now - startTime;
        let t = Math.min(1, elapsed / SPIN_DURATION);
        const ease = easeOutCubic(t);
        currentAngle = startAngle + (targetAngle - startAngle) * ease;
        renderWheel(currentAngle);
        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            isSpinning = false;
            if (prizeResult) {
                if (prizeResult.type === 'exp') {
                    showClassChoiceModalForFortune(prizeResult.amount);
                } else {
                    let msg = `Вы выиграли: ${prizeResult.name}`;
                    if (prizeResult.amount) msg += ` (${prizeResult.amount})`;
                    showToast(msg, 2000);
                }
                loadFortuneStatus();
                refreshData();
                prizeResult = null;
            }
        }
    }
    requestAnimationFrame(step);
}

async function loadFortuneStatus() {
    try {
        const res = await window.apiRequest('/fortune/status');
        fortuneData = await res.json();
        updateFortuneUI();
    } catch(e) { console.error(e); }
}

function updateFortuneUI() {
    if (!fortuneData) return;
    const total = (fortuneData.freeSpins || 0) + (fortuneData.paidSpins || 0);
    document.getElementById('totalSpinsCount').innerText = total;
    const spinBtn = document.getElementById('spinBtn');
    if (spinBtn) spinBtn.disabled = (total === 0);
    const remainingDaily = 100 - (fortuneData.purchasedToday || 0);
    const maxBuy = Math.min(100, remainingDaily);
    const ticketInput = document.getElementById('ticketCount');
    if (ticketInput) {
        let val = parseInt(ticketInput.value) || 1;
        val = Math.min(Math.max(val, 1), maxBuy);
        if (val !== ticketInput.value) ticketInput.value = val;
        selectedTickets = val;
    }
    const buyBtn = document.getElementById('buyTicketsBtn');
    if (buyBtn) {
        const totalDiamonds = selectedTickets * 10;
        buyBtn.innerHTML = `${totalDiamonds} <i class="fas fa-gem"></i>`;
    }
}

function changeTicketCount(delta) {
    let newVal = selectedTickets + delta;
    const remainingDaily = 100 - (fortuneData?.purchasedToday || 0);
    const maxBuy = Math.min(100, remainingDaily);
    newVal = Math.min(Math.max(newVal, 1), maxBuy);
    if (newVal !== selectedTickets) {
        selectedTickets = newVal;
        const input = document.getElementById('ticketCount');
        if (input) input.value = selectedTickets;
        updateFortuneUI();
    }
}

function setMaxTickets() {
    const remaining = 100 - (fortuneData?.purchasedToday || 0);
    selectedTickets = Math.min(100, remaining);
    const input = document.getElementById('ticketCount');
    if (input) input.value = selectedTickets;
    updateFortuneUI();
}

async function buyTickets() {
    const count = selectedTickets;
    if (count < 1) return;
    const totalDiamonds = count * 10;
    showConfirmModal(
        `Вы уверены, что хотите купить ${count} лотерейных билетов за ${totalDiamonds} алмазов?`,
        async () => {
            const res = await window.apiRequest('/fortune/buy-tickets', {
                method: 'POST',
                body: JSON.stringify({ count })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Вы получили ${count} лотерейных билетов!`, 2000);
                await loadFortuneStatus();
                await refreshData();
            } else {
                showToast(data.error || 'Ошибка покупки', 1500);
            }
        }
    );
}

async function fortuneSpin() {
    if (isSpinning) return;
    const total = (fortuneData?.freeSpins || 0) + (fortuneData?.paidSpins || 0);
    if (!fortuneData || total === 0) {
        showToast('Нет билетов! Купите билеты или дождитесь завтра.', 1500);
        return;
    }
    isSpinning = true;
    const res = await window.apiRequest('/fortune/spin', { method: 'POST' });
    const data = await res.json();
    if (data.error) {
        showToast(data.error, 1500);
        isSpinning = false;
        return;
    }
    prizeResult = data.prize;
    let sectorIndex = sectors.findIndex(s => 
        s.type === prizeResult.type && 
        (prizeResult.amount === s.amount || (s.type === 'legendary_chest' && prizeResult.type === 'legendary_chest') ||
         (s.type === 'free_spin' && prizeResult.type === 'free_spin'))
    );
    if (sectorIndex === -1) sectorIndex = 0;
    const sectorAngle = (Math.PI * 2) / sectors.length;
    let target = (Math.PI * 2) - (sectorIndex * sectorAngle + sectorAngle/2);
    const fullRotations = 5 + Math.random() * 5;
    target += fullRotations * Math.PI * 2;
    animateWheel(target);
}

function showClassChoiceModalForFortune(expAmount) {
    return new Promise((resolve) => {
        const modal = document.getElementById('roleModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        modalTitle.innerText = 'Выберите класс';
        modalBody.innerHTML = `
            <p>Вы получили ${expAmount} опыта. Какому классу хотите его вручить?</p>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                <button class="btn class-choice" data-class="warrior">Воин</button>
                <button class="btn class-choice" data-class="assassin">Ассасин</button>
                <button class="btn class-choice" data-class="mage">Маг</button>
            </div>
        `;
        modal.style.display = 'flex';
        const btns = modalBody.querySelectorAll('.class-choice');
        const handler = async (e) => {
            const chosenClass = e.target.dataset.class;
            modal.style.display = 'none';
            const res = await window.apiRequest('/fortune/claim-exp', {
                method: 'POST',
                body: JSON.stringify({ exp: expAmount, class: chosenClass })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Опыт добавлен классу ${getClassNameRu(chosenClass)}`, 1500);
                if (data.leveledUp) showLevelUpModal(chosenClass);
            } else {
                showToast('Ошибка начисления опыта', 1500);
            }
            resolve(chosenClass);
        };
        btns.forEach(btn => btn.addEventListener('click', handler));
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; resolve(null); };
        window.onclick = (event) => { if (event.target === modal) { modal.style.display = 'none'; resolve(null); } };
    });
}

function showFortuneRules() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Правила';
    modalBody.innerHTML = `
        <div style="padding: 10px;">
            <p>🎫 Каждый день даётся <strong>3 бесплатных билета</strong>.</p>
            <p>💰 Дополнительные билеты можно купить за <strong>10 алмазов</strong> (максимум 100 билетов в день).</p>
            <p>🎡 Шансы выигрыша:</p>
            <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                <thead><tr><th>Награда</th><th>Шанс</th></tr></thead>
                <tbody>
                    ${sectors.map(s => `<tr><td>${s.name}</td><td>${s.chance}%</td></tr>`).join('')}
                </tbody>
            </table>
        </div>
        <button class="btn" id="closeRulesBtn" style="margin-top: 20px;">Закрыть</button>
    `;
    modal.style.display = 'flex';
    document.getElementById('closeRulesBtn').addEventListener('click', () => modal.style.display = 'none');
    const closeX = modal.querySelector('.close');
    if (closeX) closeX.onclick = () => modal.style.display = 'none';
}

function renderFortune() {
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = `
        <div class="fortune-container">
            <div class="fortune-header">
                <h2>Колесо Фортуны</h2>
                <i class="fas fa-question-circle" id="fortuneHelpBtn"></i>
            </div>
            <div class="fortune-wheel-area">
                <canvas id="wheelCanvas" width="320" height="320"></canvas>
            </div>
            <div class="fortune-stats">
                <span>🎟️ Билеты лотереи: <strong id="totalSpinsCount">0</strong></span>
            </div>
            <button id="spinBtn" class="fortune-spin-btn">Испытать удачу</button>
            <div class="fortune-buy">
                <div class="buy-title">Покупка билетов</div>
                <div class="buy-controls">
                    <input type="number" id="ticketCount" value="1" min="1" max="100" class="number-input">
                    <div class="ticket-buttons-group">
                        <button id="ticketMinus" class="ticket-btn">-</button>
                        <button id="ticketPlus" class="ticket-btn">+</button>
                        <button id="ticketMax" class="ticket-max-btn">Max</button>
                    </div>
                    <button id="buyTicketsBtn" class="fortune-buy-btn">10 <i class="fas fa-gem"></i></button>
                </div>
            </div>
        </div>
    `;
    const canvas = document.getElementById('wheelCanvas');
    canvas.width = 320; canvas.height = 320;
    renderWheel(0);
    loadFortuneStatus();
    document.getElementById('fortuneHelpBtn').addEventListener('click', showFortuneRules);
    document.getElementById('ticketMinus').addEventListener('click', () => changeTicketCount(-1));
    document.getElementById('ticketPlus').addEventListener('click', () => changeTicketCount(1));
    document.getElementById('ticketMax').addEventListener('click', setMaxTickets);
    document.getElementById('buyTicketsBtn').addEventListener('click', buyTickets);
    document.getElementById('spinBtn').addEventListener('click', fortuneSpin);
    document.getElementById('ticketCount').addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        const remaining = 100 - (fortuneData?.purchasedToday || 0);
        const maxBuy = Math.min(100, remaining);
        val = Math.min(Math.max(val || 1, 1), maxBuy);
        selectedTickets = val;
        e.target.value = selectedTickets;
        updateFortuneUI();
    });
}

window.renderFortune = renderFortune;
