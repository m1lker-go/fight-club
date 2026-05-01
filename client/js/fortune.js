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

    // Вспомогательная функция для получения подписи по типу сектора
    function getLabelByType(type) {
        switch (type) {
            case 'coins': return 'Монеты';
            case 'exp': return 'Опыт';
            case 'coal': return 'Уголь';
            case 'legendary_chest': return 'Сундук';
            case 'free_spin': return 'Билет';
            default: return '';
        }
    }

    for (let i = 0; i < sectorCount; i++) {
        const sector = sectors[i];
        const start = i * angleStep + angleOffset;
        const end = (i + 1) * angleStep + angleOffset;

        // Рисуем сектор
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, start, end);
        ctx.fillStyle = colors[i % 2];
        ctx.fill();
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Подготовка к отрисовке текста
        const midAngle = start + angleStep / 2;
        const textRadius = radius * 0.75;
        const x = centerX + Math.cos(midAngle) * textRadius;
        const y = centerY + Math.sin(midAngle) * textRadius;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(midAngle + Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Иконка (20px, шрифт и цвет не меняем)
        ctx.font = '20px "Font Awesome 6 Free", "FontAwesome", sans-serif';
        if (sector.type === 'legendary_chest') {
            ctx.fillStyle = '#f1c40f';
        } else {
            ctx.fillStyle = '#ddd';
        }
        ctx.fillText(sector.icon, 0, -20);

        // Подпись типа (нежирный, 12px)
        ctx.font = '12px "Segoe UI", sans-serif';
        ctx.fillStyle = '#aaa';
        const label = getLabelByType(sector.type);
        ctx.fillText(label, 0, 0);

        // Цифры награды (жирный, 12px) – только для монет, опыта и угля
        if (sector.type === 'coins' || sector.type === 'exp' || sector.type === 'coal') {
            ctx.font = 'bold 12px "Segoe UI", sans-serif';
            ctx.fillStyle = 'white';
            ctx.fillText(sector.display, 0, 18);
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
        // Корректировка для идеального центрирования (опционально)
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
    // Угол, на который нужно повернуть колесо, чтобы указатель смотрел на середину нужного сектора
    let targetSectorAngle = (Math.PI * 2) - (sectorIndex * sectorAngle + sectorAngle/2);
    // Нормализуем в диапазон [0, 2*PI)
    targetSectorAngle = ((targetSectorAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
    // Текущий угол колеса
    let current = currentAngle % (Math.PI * 2);
    // Вычисляем минимальный угол, на который нужно довернуть колесо, чтобы достичь targetSectorAngle
    let delta = targetSectorAngle - current;
    // Приводим delta к диапазону [-PI, PI], чтобы крутить в ближайшую сторону? Не нужно – мы хотим много оборотов.
    // Добавляем несколько полных оборотов
    const fullRotations = 5 + Math.random() * 5;
    let target = currentAngle + delta + fullRotations * Math.PI * 2;
    // Анимируем до target
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
        <div style="padding: 5px 15px 15px 15px;">
            <div style="margin-bottom: 20px; line-height: 1.5;">
                <p><i class="fas fa-ticket-alt" style="color: #00aaff;"></i> Каждый день даётся <strong>3 бесплатных билета</strong>.</p>
                <p><i class="fas fa-gem" style="color: #e67e22;"></i> Дополнительные билеты можно купить за <strong>10 алмазов</strong> (максимум 100 билетов в день).</p>
            </div>
            <table style="width:100%; border-collapse: collapse; background: rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                <thead>
                    <tr style="background: #1a1f2b; color: #ddd;">
                        <th style="padding: 12px 8px; text-align: left;">Награда</th>
                        <th style="padding: 12px 8px; text-align: center; width: 70px;">Шанс</th>
                     </tr>
                </thead>
                <tbody>
                    <tr style="background: rgba(255,255,255,0.03);">
                        <td style="padding: 10px 8px;"><i class="fas fa-tshirt" style="color: #f1c40f; width: 28px;"></i> Легендарное снаряжение</td>
                        <td style="padding: 10px 8px; text-align: center;">1%</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 8px;"><i class="fas fa-ticket-alt" style="color: #ccc;"></i> Билет лотереи</td>
                        <td style="padding: 10px 8px; text-align: center;">10%</td>
                    </tr>
                    <tr style="background: rgba(255,255,255,0.03);">
                        <td style="padding: 10px 8px;"><i class="fas fa-coins" style="color: #ccc;"></i> 100 монет</td>
                        <td style="padding: 10px 8px; text-align: center;">18%</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 8px;"><i class="fas fa-coins" style="color: #ccc;"></i> 300 монет</td>
                        <td style="padding: 10px 8px; text-align: center;">10%</td>
                    </tr>
                    <tr style="background: rgba(255,255,255,0.03);">
                        <td style="padding: 10px 8px;"><i class="fas fa-coins" style="color: #ccc;"></i> 1000 монет</td>
                        <td style="padding: 10px 8px; text-align: center;">3%</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 8px;"><i class="fas fa-star" style="color: #ccc;"></i> 20 опыта</td>
                        <td style="padding: 10px 8px; text-align: center;">18%</td>
                    </tr>
                    <tr style="background: rgba(255,255,255,0.03);">
                        <td style="padding: 10px 8px;"><i class="fas fa-star" style="color: #ccc;"></i> 50 опыта</td>
                        <td style="padding: 10px 8px; text-align: center;">10%</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 8px;"><i class="fas fa-star" style="color: #ccc;"></i> 250 опыта</td>
                        <td style="padding: 10px 8px; text-align: center;">3%</td>
                    </tr>
                    <tr style="background: rgba(255,255,255,0.03);">
                        <td style="padding: 10px 8px;"><i class="fas fa-industry" style="color: #ccc;"></i> 10 угля</td>
                        <td style="padding: 10px 8px; text-align: center;">18%</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 8px;"><i class="fas fa-industry" style="color: #ccc;"></i> 50 угля</td>
                        <td style="padding: 10px 8px; text-align: center;">9%</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    modal.style.display = 'flex';
    // Обработка закрытия через крестик уже есть в глобальной логике модального окна
    // (используется .close, который не трогаем)
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
                <div class="buy-header">Покупка билетов</div>
                <div class="buy-content">
                    <div class="buy-label">Количество</div>
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
