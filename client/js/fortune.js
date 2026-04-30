// client/js/fortune.js
let fortuneData = null;
let selectedTickets = 1;
let isSpinning = false;
let currentAngle = 0;
let prizeResult = null;
let animFrame = null;
let fortuneCountdownInterval = null; // переименовано
let currentCountdown = 0;
const SPIN_DURATION = 7000;

// Определяем сектора ГЛОБАЛЬНО
const sectors = [
    { type: 'legendary_chest', name: 'Легендарное снаряжение', amount: null, display: 'Снаряжение', icon: '\uf553', chance: 1 },
    { type: 'coins', name: '1000 монет', amount: 1000, display: '1000', icon: '\uf51e', chance: 3 },
    { type: 'exp', name: '250 опыта', amount: 250, display: '250', icon: '\uf005', chance: 3 },
    { type: 'coal', name: '50 угля', amount: 50, display: '50', icon: '\uf275', chance: 9 },
    { type: 'exp', name: '50 опыта', amount: 50, display: '50', icon: '\uf005', chance: 10 },
    { type: 'coal', name: '10 угля', amount: 10, display: '10', icon: '\uf275', chance: 18 },
    { type: 'coins', name: '300 монет', amount: 300, display: '300', icon: '\uf51e', chance: 10 },
    { type: 'exp', name: '20 опыта', amount: 20, display: '20', icon: '\uf005', chance: 18, isSpecial: true },
    { type: 'coins', name: '100 монет', amount: 100, display: '100', icon: '\uf51e', chance: 18 },
    { type: 'free_spin', name: 'Билет лотереи', amount: null, display: 'Билет', icon: '\uf3ff', chance: 10 }
];

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

        const midAngle = start + angleStep / 2;
        const textRadius = radius * 0.75;
        const x = centerX + Math.cos(midAngle) * textRadius;
        const y = centerY + Math.sin(midAngle) * textRadius;

        ctx.save();
        ctx.translate(x, y);
        // Только один поворот – низ текста смотрит на центр
        ctx.rotate(midAngle + Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (sectors[i].isSpecial) {
            // Сектор 20 опыта
            ctx.font = '20px "Font Awesome 6 Free", "FontAwesome", sans-serif';
            ctx.fillStyle = '#ffaa00';
            ctx.fillText(sectors[i].icon, 0, -20);
            ctx.font = '12px "Segoe UI", sans-serif';
            ctx.fillStyle = '#ccc';
            ctx.fillText('опыт', 0, 0);
            ctx.font = 'bold 16px "Segoe UI", sans-serif';
            ctx.fillStyle = 'white';
            ctx.fillText(sectors[i].display, 0, 20);
        } else {
            let iconChar = sectors[i].icon;
            let displayText = '';
            if (sectors[i].type === 'legendary_chest') {
                displayText = '';
            } else if (sectors[i].type === 'free_spin') {
                displayText = 'Билет';
            } else {
                displayText = sectors[i].display;
            }

            ctx.font = '20px "Font Awesome 6 Free", "FontAwesome", sans-serif';
            if (sectors[i].type === 'legendary_chest') {
                ctx.fillStyle = '#f1c40f';
            } else {
                ctx.fillStyle = '#ddd';
            }
            ctx.fillText(iconChar, 0, -12);
            
            if (displayText) {
                ctx.font = '12px "Segoe UI", sans-serif';
                ctx.fillStyle = '#ccc';
                ctx.fillText(displayText, 0, 12);
            }
        }
        ctx.restore();
    }
}

function drawCenter(ctx, centerX, centerY, radius) {
    // Рисуем центральный круг (фон как заголовок)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1f2b';
    ctx.fill();
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Если идёт обратный отсчёт (колесо крутится) – показываем цифру
    if (currentCountdown > 0) {
        ctx.font = 'bold 24px "Segoe UI", sans-serif';
        ctx.fillStyle = '#00aaff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentCountdown.toString(), centerX, centerY);
    } 
    // Если не крутится – показываем флаг
    else {
        ctx.font = '32px "Font Awesome 6 Free", "FontAwesome", sans-serif';
        ctx.fillStyle = '#ddd';
        ctx.fillText('\uf024', centerX, centerY); // fa-flag-checkered
    }
}

function renderWheel(angleOffset) {
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 15;
    drawWheel(ctx, centerX, centerY, radius, angleOffset);
    drawCenter(ctx, centerX, centerY, radius);
    ctx.beginPath();
    ctx.moveTo(centerX - 12, 14);
    ctx.lineTo(centerX + 12, 14);
    ctx.lineTo(centerX, 30);
    ctx.fillStyle = '#00aaff';
    ctx.fill();
}

function animateWheel(targetAngle) {
    const startAngle = currentAngle;
    const startTime = performance.now();
    if (fortuneCountdownInterval) clearInterval(fortuneCountdownInterval);
    currentCountdown = 7;
    
    fortuneCountdownInterval = setInterval(() => {
        if (currentCountdown > 1) {
            currentCountdown--;
            renderWheel(currentAngle);
        } else {
            clearInterval(fortuneCountdownInterval);
            fortuneCountdownInterval = null;
            currentCountdown = 0;
            renderWheel(currentAngle);
        }
    }, 1000);
    
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
            if (fortuneCountdownInterval) clearInterval(fortuneCountdownInterval);
            fortuneCountdownInterval = null;
            currentCountdown = 0;
            renderWheel(currentAngle);
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
    const input = document.getElementById('ticketCount');
    if (input) {
        let val = parseInt(input.value) || 1;
        val = Math.min(Math.max(val, 1), maxBuy);
        if (val !== parseInt(input.value)) input.value = val;
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
    if (fortuneCountdownInterval) {
        clearInterval(fortuneCountdownInterval);
        fortuneCountdownInterval = null;
    }
    currentCountdown = 0;

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
            <p><i class="fas fa-ticket-alt"></i> Каждый день даётся <strong>3 бесплатных билета</strong>.</p>
            <p><i class="fas fa-gem"></i> Дополнительные билеты можно купить за <strong>10 алмазов</strong> (максимум 100 билетов в день).</p>
            <p><i class="fas fa-chart-simple"></i> Шансы выигрыша:</p>
            <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                <thead><tr><th>Награда</th><th>Шанс</th></tr></thead>
                <tbody>
                    <tr><td>Легендарное снаряжение</td><td>1%</td></tr>
                    <tr><td>Билет лотереи</td><td>10%</td></tr>
                    <tr><td>100 монет</td><td>18%</td></tr>
                    <tr><td>300 монет</td><td>10%</td></tr>
                    <tr><td>1000 монет</td><td>3%</td></tr>
                    <tr><td>20 опыта</td><td>18%</td></tr>
                    <tr><td>50 опыта</td><td>10%</td></tr>
                    <tr><td>250 опыта</td><td>3%</td></tr>
                    <tr><td>10 угля</td><td>18%</td></tr>
                    <tr><td>50 угля</td><td>9%</td></tr>
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
                <canvas id="wheelCanvas" width="340" height="340"></canvas>
            </div>
            <div class="fortune-stats">
                <span><i class="fas fa-ticket-alt"></i> Билеты лотереи: <strong id="totalSpinsCount">0</strong></span>
            </div>
            <button id="spinBtn" class="fortune-spin-btn">Испытать удачу</button>
            <div class="fortune-buy">
                <div class="buy-title">Покупка билетов</div>
                <div class="buy-controls">
                    <div class="input-group">
                        <input type="number" id="ticketCount" value="1" min="1" max="100" class="number-input">
                        <div class="ticket-buttons-group">
                            <button id="ticketMinus" class="ticket-btn">-</button>
                            <button id="ticketPlus" class="ticket-btn">+</button>
                            <button id="ticketMax" class="ticket-max-btn">Max</button>
                        </div>
                    </div>
                    <button id="buyTicketsBtn" class="fortune-buy-btn">10 <i class="fas fa-gem"></i></button>
                </div>
            </div>
        </div>
    `;
    const canvas = document.getElementById('wheelCanvas');
    canvas.width = 340; canvas.height = 340;
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
