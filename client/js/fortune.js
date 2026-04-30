// client/js/fortune.js
let fortuneData = null;
let selectedTickets = 1;

async function loadFortuneStatus() {
    try {
        const res = await window.apiRequest('/fortune/status');
        fortuneData = await res.json();
        updateFortuneUI();
    } catch(e) { console.error(e); }
}

function updateFortuneUI() {
    if (!fortuneData) return;
    document.getElementById('freeSpinsCount').innerText = fortuneData.freeSpins;
    document.getElementById('paidSpinsCount').innerText = fortuneData.paidSpins;
    document.getElementById('totalSpinsCount').innerText = fortuneData.totalSpins;
    const spinBtn = document.getElementById('spinBtn');
    if (spinBtn) spinBtn.disabled = (fortuneData.totalSpins === 0);
    const remainingDaily = 100 - (fortuneData.purchasedToday || 0);
    const maxBuy = Math.min(100, remainingDaily);
    const ticketInput = document.getElementById('ticketCount');
    if (ticketInput) {
        const val = parseInt(ticketInput.value) || 1;
        ticketInput.value = Math.min(Math.max(val, 1), maxBuy);
        selectedTickets = Math.min(Math.max(selectedTickets, 1), maxBuy);
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
    // модальное подтверждение
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

let isSpinning = false;
let animationFrame = null;
let stopAngle = 0;
let spinStartTime = 0;
const SPIN_DURATION = 7000; // 7 секунд
let prizeResult = null;

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function drawWheel(ctx, centerX, centerY, radius, angleOffset = 0) {
    const sectorCount = 10;
    const angleStep = (Math.PI * 2) / sectorCount;
    const colors = ['#2a303c', '#232833']; // чередование
    const prizesConfig = [
        { name: 'Легенд. сундук', color: '#f1c40f' },
        { name: '1000 монет', color: '#ffaa00' },
        { name: '250 опыта', color: '#88ff88' },
        { name: '50 угля', color: '#aaa' },
        { name: '50 опыта', color: '#88ff88' },
        { name: '10 угля', color: '#aaa' },
        { name: '300 монет', color: '#ffaa00' },
        { name: '20 опыта', color: '#88ff88' },
        { name: '100 монет', color: '#ffaa00' },
        { name: 'Бесплатный билет', color: '#00aaff' }
    ];
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
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(start + angleStep / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ddd';
        ctx.font = 'bold 12px "Segoe UI"';
        const textRadius = radius * 0.65;
        const prize = prizesConfig[i];
        ctx.fillText(prize.name, textRadius, 5);
        // иконка
        let icon = '';
        if (prize.name.includes('сундук')) icon = '🎁';
        else if (prize.name.includes('монет')) icon = '💰';
        else if (prize.name.includes('опыта')) icon = '⭐';
        else if (prize.name.includes('угля')) icon = '🪨';
        else if (prize.name.includes('билет')) icon = '🎫';
        ctx.fillText(icon, textRadius - 20, -8);
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
    const radius = size/2 - 5;
    drawWheel(ctx, centerX, centerY, radius, angleOffset);
    // указатель (треугольник сверху)
    ctx.beginPath();
    ctx.moveTo(centerX - 10, 10);
    ctx.lineTo(centerX + 10, 10);
    ctx.lineTo(centerX, 25);
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
        const angle = startAngle + (targetAngle - startAngle) * ease;
        currentAngle = angle;
        renderWheel(currentAngle);
        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            // анимация завершена
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

let currentAngle = 0;

async function fortuneSpin() {
    if (isSpinning) return;
    if (!fortuneData || fortuneData.totalSpins === 0) {
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
    // Определяем целевой угол для остановки на нужном секторе (на сервере вычислен индекс)
    // Здесь предполагаем, что сервер возвращает индекс сектора (0..9) в data.prize.index
    const targetSector = data.prize.index; // нужно добавить в ответ сервера index
    const sectorAngle = (Math.PI * 2) / 10;
    // вычисляем угол, чтобы указатель (0°) попал на середину целевого сектора
    let target = (Math.PI * 2) - (targetSector * sectorAngle + sectorAngle/2);
    // добавляем несколько полных оборотов
    const fullRotations = 5 + Math.random() * 5;
    target += fullRotations * Math.PI * 2;
    animateWheel(target);
}

function showClassChoiceModalForFortune(expAmount) {
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
    };
    btns.forEach(btn => btn.addEventListener('click', handler));
    const closeModal = () => modal.style.display = 'none';
    modal.querySelector('.close').onclick = closeModal;
    window.onclick = (event) => { if (event.target === modal) closeModal(); };
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
                <tr><td>Легендарный сундук</td><td>1%</td></tr>
                <tr><td>1000 монет</td><td>5%</td></tr>
                <tr><td>250 опыта</td><td>10%</td></tr>
                <tr><td>50 угля</td><td>12%</td></tr>
                <tr><td>50 опыта</td><td>25%</td></tr>
                <tr><td>10 угля</td><td>15%</td></tr>
                <tr><td>300 монет</td><td>8%</td></tr>
                <tr><td>20 опыта</td><td>3%</td></tr>
                <tr><td>100 монет</td><td>20%</td></tr>
                <tr><td>Бесплатный билет</td><td>1%</td></tr>
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
                <canvas id="wheelCanvas" width="300" height="300"></canvas>
            </div>
            <div class="fortune-stats">
                <div>🎫 Бесплатные: <span id="freeSpinsCount">0</span></div>
                <div>💎 Платные: <span id="paidSpinsCount">0</span></div>
                <div>🎟️ Всего билетов: <span id="totalSpinsCount">0</span></div>
            </div>
            <div class="fortune-buy">
                <div class="ticket-selector">
                    <button class="ticket-btn" id="ticketMinus">-</button>
                    <input type="number" id="ticketCount" value="1" min="1" max="100" readonly>
                    <button class="ticket-btn" id="ticketPlus">+</button>
                    <button class="ticket-max-btn" id="ticketMax">MAX</button>
                </div>
                <button class="fortune-buy-btn" id="buyTicketsBtn"><i class="fas fa-gem"></i> Купить 1 билет(ов) за 10 алмазов</button>
            </div>
            <button class="fortune-spin-btn" id="spinBtn">Испытать удачу</button>
        </div>
    `;
    const canvas = document.getElementById('wheelCanvas');
    canvas.width = 300; canvas.height = 300;
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
