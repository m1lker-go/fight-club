// client/js/fortune.js – полностью локализованная версия
let fortuneData = null;
let selectedTickets = 1;
let isSpinning = false;
let currentAngle = 0;
let prizeResult = null;
let animFrame = null;
let fortuneCountdownInterval = null;
let currentCountdown = 0;
const SPIN_DURATION = 7000;

// Определяем сектора (названия для отображения берём из локализации)
const sectors = [
    { type: 'legendary_chest', nameKey: 'fortune:Легендарное снаряжение', amount: null, displayKey: 'fortune:Снаряжение', icon: '\uf553', chance: 1 },
    { type: 'coins', nameKey: 'fortune:1000 монет', amount: 1000, displayKey: 'fortune:Монеты', icon: '\uf51e', chance: 3 },
    { type: 'exp', nameKey: 'fortune:250 опыта', amount: 250, displayKey: 'fortune:Опыт', icon: '\uf005', chance: 3 },
    { type: 'coal', nameKey: 'fortune:50 угля', amount: 50, displayKey: 'fortune:Уголь', icon: '\uf275', chance: 9 },
    { type: 'exp', nameKey: 'fortune:50 опыта', amount: 50, displayKey: 'fortune:Опыт', icon: '\uf005', chance: 10 },
    { type: 'coal', nameKey: 'fortune:10 угля', amount: 10, displayKey: 'fortune:Уголь', icon: '\uf275', chance: 18 },
    { type: 'coins', nameKey: 'fortune:300 монет', amount: 300, displayKey: 'fortune:Монеты', icon: '\uf51e', chance: 10 },
    { type: 'exp', nameKey: 'fortune:20 опыта', amount: 20, displayKey: 'fortune:Опыт', icon: '\uf005', chance: 18, isSpecial: true },
    { type: 'coins', nameKey: 'fortune:100 монет', amount: 100, displayKey: 'fortune:Монеты', icon: '\uf51e', chance: 18 },
    { type: 'free_spin', nameKey: 'fortune:Билет лотереи', amount: null, displayKey: 'fortune:Билет', icon: '\uf3ff', chance: 10 }
];

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function drawWheel(ctx, centerX, centerY, radius, angleOffset = 0) {
    const sectorCount = sectors.length;
    const angleStep = (Math.PI * 2) / sectorCount;
    const colors = ['#2a303c', '#232833'];
    const startShift = -Math.PI / 2 - angleStep / 2;

    function getLabelByType(type) {
        switch (type) {
            case 'coins': return window.$t('fortune:Монеты', 'Монеты');
            case 'exp': return window.$t('fortune:Опыт', 'Опыт');
            case 'coal': return window.$t('fortune:Уголь', 'Уголь');
            case 'legendary_chest': return window.$t('fortune:Снаряжение', 'Сундук');
            case 'free_spin': return window.$t('fortune:Билет', 'Билет');
            default: return '';
        }
    }

    for (let i = 0; i < sectorCount; i++) {
        const sector = sectors[i];
        const start = i * angleStep + angleOffset + startShift;
        const end = (i + 1) * angleStep + angleOffset + startShift;

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
        ctx.rotate(midAngle + Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '20px "Font Awesome 6 Free", "FontAwesome", sans-serif';
        ctx.fillStyle = sector.type === 'legendary_chest' ? '#f1c40f' : '#ddd';
        ctx.fillText(sector.icon, 0, -20);

        ctx.font = '12px "Segoe UI", sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText(getLabelByType(sector.type), 0, 0);

        if (sector.type === 'coins' || sector.type === 'exp' || sector.type === 'coal') {
            ctx.font = 'bold 12px "Segoe UI", sans-serif';
            ctx.fillStyle = 'white';
            ctx.fillText(sector.displayKey ? window.$t(sector.displayKey, sector.amount.toString()) : '', 0, 18);
        }
        ctx.restore();
    }
}

function drawCenter(ctx, centerX, centerY, radius) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1f2b';
    ctx.fill();
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (currentCountdown > 0) {
        ctx.font = 'bold 20px "Segoe UI", sans-serif';
        ctx.fillStyle = '#00aaff';
        ctx.fillText(currentCountdown.toString(), centerX, centerY);
    } else {
        ctx.font = '20px "Font Awesome 6 Free", "FontAwesome", sans-serif';
        ctx.fillStyle = '#ddd';
        ctx.fillText('\uf024', centerX, centerY);
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
            localStorage.setItem('fortuneCurrentAngle', currentAngle.toString());
            if (prizeResult) {
                if (prizeResult.type === 'exp') {
                    showClassChoiceModalForFortune(prizeResult.amount);
                } else {
                    let msg = window.$t('fortune:Вы выиграли: {prizeName}', 'Вы выиграли: {prizeName}', { prizeName: prizeResult.name });
                    showToast(msg, 2000);
                    if (typeof window.updateTradeBadges === 'function') {
                        window.updateTradeBadges();
                    }
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
    if (!userData || !userData.id) return;
    try {
        const res = await window.apiRequest('/fortune/status');
        fortuneData = await res.json();
        updateFortuneUI();
    } catch(e) { console.error(e); }
}

function updateFortuneUI() {
    if (!fortuneData) return;
    const total = (fortuneData.freeSpins || 0) + (fortuneData.paidSpins || 0);
    const totalSpinsEl = document.getElementById('totalSpinsCount');
    if (totalSpinsEl) totalSpinsEl.innerText = total;
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
        window.$t('fortune:Вы уверены, что хотите купить {count} лотерейных билетов за {totalDiamonds} алмазов?', 'Вы уверены, что хотите купить {count} лотерейных билетов за {totalDiamonds} алмазов?', { count, totalDiamonds }),
        async () => {
            const res = await window.apiRequest('/fortune/buy-tickets', {
                method: 'POST',
                body: JSON.stringify({ count })
            });
            const data = await res.json();
            if (data.success) {
                showToast(window.$t('fortune:Вы получили {count} лотерейных билетов!', 'Вы получили {count} лотерейных билетов!', { count }), 2000);
                await loadFortuneStatus();
                await refreshData();
            } else {
                showToast(data.error || window.$t('common:Ошибка покупки', 'Ошибка покупки'), 1500);
            }
        }
    );
}

async function fortuneSpin() {
    if (isSpinning) return;
    if (!userData) return;
    if (fortuneCountdownInterval) {
        clearInterval(fortuneCountdownInterval);
        fortuneCountdownInterval = null;
    }
    currentCountdown = 0;

    const total = (fortuneData?.freeSpins || 0) + (fortuneData?.paidSpins || 0);
    if (!fortuneData || total === 0) {
        showToast(window.$t('fortune:Нет билетов! Купите билеты или дождитесь завтра.', 'Нет билетов! Купите билеты или дождитесь завтра.'), 1500);
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

    let sectorIndex = sectors.findIndex(s => {
        if (s.type !== prizeResult.type) return false;
        if (prizeResult.type === 'legendary_chest' || prizeResult.type === 'free_spin') return true;
        return s.amount === prizeResult.amount;
    });
    if (sectorIndex === -1) sectorIndex = 0;

    let targetDeg = -(sectorIndex * 36);
    targetDeg = ((targetDeg % 360) + 360) % 360;

    const currentDeg = (currentAngle * 180 / Math.PI) % 360;
    let deltaDeg = targetDeg - currentDeg;
    const fullRotationsDeg = 3 * 360;
    const totalDeltaDeg = deltaDeg + fullRotationsDeg;
    const targetRad = (currentAngle * 180 / Math.PI + totalDeltaDeg) * Math.PI / 180;

    console.log(`Сектор ${sectorIndex} (${sectors[sectorIndex].nameKey}), целевой угол ${targetDeg}°, текущий ${currentDeg}°, дельта ${deltaDeg}°, +3 оборота = ${totalDeltaDeg}°`);
    animateWheel(targetRad);
}

function showClassChoiceModalForFortune(expAmount) {
    return new Promise((resolve) => {
        const modal = document.getElementById('roleModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        modalTitle.innerText = window.$t('fortune:Выберите класс', 'Выберите класс');
        modalBody.innerHTML = `
            <p>${window.$t('fortune:Вы получили {expAmount} опыта. Какому классу хотите его вручить?', 'Вы получили {expAmount} опыта. Какому классу хотите его вручить?', { expAmount })}</p>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                <button class="btn class-choice" data-class="warrior">${window.$t('common:Воин', 'Воин')}</button>
                <button class="btn class-choice" data-class="assassin">${window.$t('common:Ассасин', 'Ассасин')}</button>
                <button class="btn class-choice" data-class="mage">${window.$t('common:Маг', 'Маг')}</button>
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
                await refreshData();
                showToast(window.$t('fortune:Опыт добавлен классу {className}', 'Опыт добавлен классу {className}', { className: getClassNameRu(chosenClass) }), 1500);
                if (data.leveledUp) showLevelUpModal(chosenClass);
                if (typeof window.updateTradeBadges === 'function') {
                    window.updateTradeBadges();
                }
                if (currentScreen === 'fortune') {
                    renderFortune();
                }
            } else {
                showToast(window.$t('fortune:Ошибка начисления опыта', 'Ошибка начисления опыта'), 1500);
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
    modalTitle.innerText = window.$t('fortune:Правила', 'Правила');
    modalBody.innerHTML = `
        <div style="padding: 5px 15px 15px 15px;">
            <div style="margin-bottom: 20px; line-height: 1.5;">
                <p><i class="fas fa-ticket-alt" style="color: #00aaff;"></i> ${window.$t('fortune:Каждый день даётся <strong>3 бесплатных билета</strong>.', 'Каждый день даётся <strong>3 бесплатных билета</strong>.')}</p>
                <p><i class="fas fa-gem" style="color: #e67e22;"></i> ${window.$t('fortune:Дополнительные билеты можно купить за <strong>10 алмазов</strong> (максимум 100 билетов в день).', 'Дополнительные билеты можно купить за <strong>10 алмазов</strong> (максимум 100 билетов в день).')}</p>
            </div>
            <table style="width:100%; border-collapse: collapse; background: rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                <thead>
                    <tr style="background: #1a1f2b; color: #ddd;">
                        <th style="padding: 12px 8px; text-align: left;">${window.$t('fortune:Награда', 'Награда')}</th>
                        <th style="padding: 12px 8px; text-align: center; width: 70px;">${window.$t('fortune:Шанс', 'Шанс')}</th>
                      </tr>
                </thead>
                <tbody>
                    <tr style="background: rgba(255,255,255,0.03);">
                        <td style="padding: 10px 8px;"><i class="fas fa-tshirt" style="color: #f1c40f; width: 28px;"></i> ${window.$t('fortune:Легендарное снаряжение', 'Легендарное снаряжение')}</td>
                        <td style="padding: 10px 8px; text-align: center;">1%</td>
                     </tr>
                    <tr>
                        <td style="padding: 10px 8px;"><i class="fas fa-ticket-alt" style="color: #ccc;"></i> ${window.$t('fortune:Билет лотереи', 'Билет лотереи')}</td>
                        <td style="padding: 10px 8px; text-align: center;">10%</td>
                     </tr>
                    <tr style="background: rgba(255,255,255,0.03);">
                        <td style="padding: 10px 8px;"><i class="fas fa-coins" style="color: #ccc;"></i> ${window.$t('fortune:100 монет', '100 монет')}</td>
                        <td style="padding: 10px 8px; text-align: center;">18%</td>
                     </tr>
                    <tr>
                        <td style="padding: 10px 8px;"><i class="fas fa-coins" style="color: #ccc;"></i> ${window.$t('fortune:300 монет', '300 монет')}</td>
                        <td style="padding: 10px 8px; text-align: center;">10%</td>
                     </tr>
                    <tr style="background: rgba(255,255,255,0.03);">
                        <td style="padding: 10px 8px;"><i class="fas fa-coins" style="color: #ccc;"></i> ${window.$t('fortune:1000 монет', '1000 монет')}</td>
                        <td style="padding: 10px 8px; text-align: center;">3%</td>
                     </tr>
                    <tr>
                        <td style="padding: 10px 8px;"><i class="fas fa-star" style="color: #ccc;"></i> ${window.$t('fortune:20 опыта', '20 опыта')}</td>
                        <td style="padding: 10px 8px; text-align: center;">18%</td>
                     </tr>
                    <tr style="background: rgba(255,255,255,0.03);">
                        <td style="padding: 10px 8px;"><i class="fas fa-star" style="color: #ccc;"></i> ${window.$t('fortune:50 опыта', '50 опыта')}</td>
                        <td style="padding: 10px 8px; text-align: center;">10%</td>
                     </tr>
                    <tr>
                        <td style="padding: 10px 8px;"><i class="fas fa-star" style="color: #ccc;"></i> ${window.$t('fortune:250 опыта', '250 опыта')}</td>
                        <td style="padding: 10px 8px; text-align: center;">3%</td>
                     </tr>
                    <tr style="background: rgba(255,255,255,0.03);">
                        <td style="padding: 10px 8px;"><i class="fas fa-industry" style="color: #ccc;"></i> ${window.$t('fortune:10 угля', '10 угля')}</td>
                        <td style="padding: 10px 8px; text-align: center;">18%</td>
                     </tr>
                    <tr>
                        <td style="padding: 10px 8px;"><i class="fas fa-industry" style="color: #ccc;"></i> ${window.$t('fortune:50 угля', '50 угля')}</td>
                        <td style="padding: 10px 8px; text-align: center;">9%</td>
                     </tr>
                </tbody>
            </table>
            <button id="closeRulesBtn" style="width:100%; padding: 12px; border-radius: 8px; background: #2a303c; color: white; border: none; font-size: 16px; cursor: pointer; margin-top: 20px;">${window.$t('common:Назад', 'Назад')}</button>
        </div>
    `;
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) closeBtn.style.display = 'none';
    modal.style.display = 'flex';
    const backBtn = document.getElementById('closeRulesBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
}

function renderFortune() {
    const content = document.getElementById('content');
    if (!content) return;
    // Проверка на userData происходит в loadFortuneStatus, но здесь тоже можно
    if (!userData) {
        console.warn('renderFortune: userData not ready');
        return;
    }
    content.innerHTML = `
        <div class="fortune-container">
            <div class="fortune-header">
                <h2>${window.$t('fortune:Колесо Фортуны', 'Колесо Фортуны')}</h2>
                <i class="fas fa-question-circle" id="fortuneHelpBtn"></i>
            </div>
            <div class="fortune-wheel-area">
                <canvas id="wheelCanvas" width="340" height="340"></canvas>
            </div>
            <div class="fortune-stats">
                <span><i class="fas fa-ticket-alt"></i> ${window.$t('fortune:Билеты лотереи:', 'Билеты лотереи:')} <strong id="totalSpinsCount">0</strong></span>
            </div>
            <button id="spinBtn" class="fortune-spin-btn">${window.$t('fortune:Испытать удачу', 'Испытать удачу')}</button>
            <div class="fortune-buy">
                <div class="buy-header">${window.$t('fortune:Покупка билетов', 'Покупка билетов')}</div>
                <div class="buy-content">
                    <div class="buy-label">${window.$t('fortune:Количество', 'Количество')}</div>
                    <div class="buy-controls">
                        <div class="input-group">
                            <input type="number" id="ticketCount" value="1" min="1" max="100" class="number-input">
                            <div class="ticket-buttons-group">
                                <button id="ticketMinus" class="ticket-btn">-</button>
                                <button id="ticketPlus" class="ticket-btn">+</button>
                                <button id="ticketMax" class="ticket-max-btn">${window.$t('fortune:Max', 'Max')}</button>
                            </div>
                        </div>
                        <button id="buyTicketsBtn" class="fortune-buy-btn">10 <i class="fas fa-gem"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `;
    const canvas = document.getElementById('wheelCanvas');
    canvas.width = 340; canvas.height = 340;
    const savedAngle = localStorage.getItem('fortuneCurrentAngle');
    if (savedAngle !== null) {
        currentAngle = parseFloat(savedAngle);
    } else {
        currentAngle = 0;
    }
    renderWheel(currentAngle);
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
