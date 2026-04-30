// client/js/fortune.js
let fortuneData = null;
let selectedTickets = 1;
let isSpinning = false;
let animationFrame = null;
let currentAngle = 0;
let prizeResult = null;
const SPIN_DURATION = 7000;

// конфигурация секторов
const sectors = [
    { name: 'Легенд. сундук', type: 'legendary_chest', amount: null, chance: 1, color: '#f1c40f', icon: '🎁' },
    { name: '1000 монет', type: 'coins', amount: 1000, chance: 5, color: '#ffaa00', icon: '💰' },
    { name: '250 опыта', type: 'exp', amount: 250, chance: 10, color: '#88ff88', icon: '⭐' },
    { name: '50 угля', type: 'coal', amount: 50, chance: 12, color: '#aaa', icon: '🪨' },
    { name: '50 опыта', type: 'exp', amount: 50, chance: 25, color: '#88ff88', icon: '⭐' },
    { name: '10 угля', type: 'coal', amount: 10, chance: 15, color: '#aaa', icon: '🪨' },
    { name: '300 монет', type: 'coins', amount: 300, chance: 8, color: '#ffaa00', icon: '💰' },
    { name: '20 опыта', type: 'exp', amount: 20, chance: 3, color: '#88ff88', icon: '⭐' },
    { name: '100 монет', type: 'coins', amount: 100, chance: 20, color: '#ffaa00', icon: '💰' },
    { name: 'Беспл. билет', type: 'free_spin', amount: null, chance: 1, color: '#00aaff', icon: '🎫' }
];

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function drawWheel(ctx, centerX, centerY, radius, angleOffset = 0) {
    const sectorCount = sectors.length;
    const angleStep = (Math.PI * 2) / sectorCount;
    const colors = ['#2a303c', '#232833']; // чередование фона
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

        // Текст и иконка
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(start + angleStep / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textRadius = radius * 0.7;
        // Иконка
        ctx.fillStyle = '#ddd';
        ctx.font = '16px "Segoe UI"';
        ctx.fillText(sectors[i].icon, textRadius - 10, -8);
        // Текст (цифра)
        let displayText = '';
        if (sectors[i].type === 'coins') displayText = `${sectors[i].amount}`;
        else if (sectors[i].type === 'exp') displayText = `${sectors[i].amount}`;
        else if (sectors[i].type === 'coal') displayText = `${sectors[i].amount}`;
        else if (sectors[i].type === 'legendary_chest') displayText = 'Сундук';
        else if (sectors[i].type === 'free_spin') displayText = 'Билет';
        ctx.font = 'bold 14px "Segoe UI"';
        ctx.fillStyle = '#ccc';
        ctx.fillText(displayText, textRadius, 12);
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
    // указатель (треугольник сверху)
    ctx.beginPath();
    ctx.moveTo(centerX - 12, 12);
    ctx.lineTo(centerX + 12, 12);
    ctx.lineTo(centerX, 28);
    ctx.fillStyle = '#aaa';
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
        ticketInput.value = val;
        selectedTickets = val;
    }
    const buyBtn = document.getElementById('buyTicketsBtn');
    if (buyBtn) {
        const totalDiamonds = selectedTickets * 10;
        buyBtn.innerHTML = `<i class="fas fa-gem"></i> Купить ${selectedTickets} билет(ов) за ${totalDiamonds} алмазов`;
    }
}

function changeTicketCount(delta) {
    let newVal = selectedTickets + delta;
    const remainingDaily = 100 - (fortuneData?.purchasedToday || 0);
    const maxBuy = Math.min(100, remainingDaily);
    newVal = Math.min(Math.max(newVal, 1), maxBuy);
    if (newVal !== selectedTickets) {
        selectedTickets = newVal;
        document.getElementById('ticketCount').value = selectedTickets;
        updateFortuneUI();
    }
}

function setMaxTickets() {
    const remaining = 100 - (fortuneData?.purchasedToday || 0);
    selectedTickets = Math.min(100, remaining);
    document.getElementById('ticketCount').value = selectedTickets;
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
    // находим индекс сектора по prize
    let sectorIndex = 0;
    for (let i = 0; i < sectors.length; i++) {
        if (sectors[i].type === prizeResult.type &&
            (prizeResult.amount === sectors[i].amount || (prizeResult.type === 'legendary_chest' && sectors[i].type === 'legendary_chest') ||
             (prizeResult.type === 'free_spin' && sectors[i].type === 'free_spin'))) {
            sectorIndex = i;
            break;
        }
    }
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
                <tr><th>Награда</th><th>Шанс</th></tr>
                ${sectors.map(s => `<tr><td>${s.icon} ${s.name}</td><td>${s.chance}%</td>`).join('')}
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
                <i class="fas fa-circle-question" id="fortuneHelpBtn"></i>
            </div>
            <div class="fortune-wheel-area">
                <canvas id="wheelCanvas" width="320" height="320"></canvas>
            </div>
            <div class="fortune-stats" style="display: flex; justify-content: center; gap: 20px; background: #2a303c; padding: 8px; border-radius: 14px; margin: 10px;">
                <div>🎟️ Билеты лотереи: <span id="totalSpinsCount">0</span></div>
            </div>
            <div class="fortune-buy" style="background: #2a303c; border-radius: 14px; padding: 12px; margin: 0 10px 10px;">
                <div style="font-weight: bold; margin-bottom: 8px;">Купить билет лотереи 🎟️</div>
                <div style="display: flex; align-items: center; gap: 15px; justify-content: space-between;">
                    <div style="display: flex; gap: 5px;">
                        <div style="display: flex; flex-direction: column; gap: 0;">
                            <button id="ticketPlus" class="ticket-btn" style="border-radius: 14px 14px 0 0; padding: 8px 12px;">+</button>
                            <button id="ticketMinus" class="ticket-btn" style="border-radius: 0 0 14px 14px; padding: 8px 12px;">-</button>
                        </div>
                        <button id="ticketMax" class="ticket-max-btn" style="padding: 8px 16px;">MAX</button>
                    </div>
                    <input type="number" id="ticketCount" value="1" min="1" max="100" style="width: 70px; text-align: center; background: #2f3542; border: 1px solid #aaa; border-radius: 14px; color: white; padding: 8px 0;">
                    <button id="buyTicketsBtn" class="fortune-buy-btn" style="padding: 8px 16px;">Купить</button>
                </div>
            </div>
            <button id="spinBtn" class="fortune-spin-btn" style="margin: 0 10px 16px;">Испытать удачу</button>
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
        updateFortuneUI();
    });
}

window.renderFortune = renderFortune;
