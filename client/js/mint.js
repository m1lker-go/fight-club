// mint.js – Монетный двор (уголь и золото)

let freeCoalAvailable = false;

// Обновление бейджа (используем центральную функцию updateTradeBadges)
async function updateMintBadge() {
    try {
        const res = await window.apiRequest('/player/freecoal', { method: 'GET' });
        const data = await res.json();
        freeCoalAvailable = data.freeAvailable;
        // Вызываем центральное обновление бейджей (обновит главную кнопку и табы)
        if (typeof window.updateTradeBadges === 'function') {
            window.updateTradeBadges();
        }
        // Если мы на странице монетного двора – перерисовываем
        if (window.currentScreen === 'trade' && window.tradeSubtab === 'coins') {
            const subContent = document.getElementById('tradeSubContent');
            if (subContent) renderMint(subContent);
        }
    } catch (e) {
        console.error('Failed to fetch free coal status', e);
    }
}

async function renderMint(container) {
    if (!container) return;

    // Проверяем доступность бесплатного угля
    try {
        const res = await window.apiRequest('/player/freecoal', { method: 'GET' });
        const data = await res.json();
        freeCoalAvailable = data.freeAvailable;
    } catch (e) {
        freeCoalAvailable = false;
    }

    // Товары: уголь (3 шт) + золото (6 шт)
    const coalItems = [
        { amount: 10, price: 1, currency: 'diamonds', free: freeCoalAvailable, image: '/assets/gold/buy_coal_1.png' },
        { amount: 50, price: 5, currency: 'diamonds', free: false, image: '/assets/gold/buy_coal_2.png' },
        { amount: 250, price: 20, currency: 'diamonds', free: false, image: '/assets/gold/buy_coal_3.png' }
    ];

    const goldItems = [
        { amount: 50, price: 1, currency: 'diamonds', image: '/assets/gold/buy_gold_1.png' },
        { amount: 250, price: 3, currency: 'diamonds', image: '/assets/gold/buy_gold_2.png' },
        { amount: 500, price: 5, currency: 'diamonds', image: '/assets/gold/buy_gold_3.png' },
        { amount: 1000, price: 20, currency: 'diamonds', image: '/assets/gold/buy_gold_4.png' },
        { amount: 3000, price: 50, currency: 'diamonds', image: '/assets/gold/buy_gold_5.png' },
        { amount: 5000, price: 500, currency: 'diamonds', image: '/assets/gold/buy_gold_6.png' }
    ];

    let html = `
        <div class="mint-page">
            <div class="mint-grid coal-grid">
    `;

    // Уголь
    coalItems.forEach(item => {
        const btnDisabled = (!item.free && userData.diamonds < item.price);
        const btnText = item.free ? 'FREE' : `${item.price} <i class="fas fa-gem"></i>`;
        html += `
            <div class="mint-card">
                <div class="mint-card-image">
                    <img src="${item.image}" alt="уголь ${item.amount}">
                </div>
                <div class="mint-card-title">${item.amount} угля</div>
                <button class="mint-buy-btn" data-type="coal" data-amount="${item.amount}" data-price="${item.price}" data-currency="${item.currency}" data-free="${item.free}" ${btnDisabled ? 'disabled' : ''}>
                    ${btnText}
                </button>
            </div>
        `;
    });

    html += `</div><div class="mint-grid gold-grid">`;

    // Золото
    goldItems.forEach(item => {
        const btnDisabled = (userData.diamonds < item.price);
        html += `
            <div class="mint-card">
                <div class="mint-card-image">
                    <img src="${item.image}" alt="золото ${item.amount}">
                </div>
                <div class="mint-card-title">${item.amount} монет</div>
                <button class="mint-buy-btn" data-type="gold" data-amount="${item.amount}" data-price="${item.price}" data-currency="${item.currency}" ${btnDisabled ? 'disabled' : ''}>
                    ${item.price} <i class="fas fa-gem"></i>
                </button>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;

    // Обработчики кнопок
    container.querySelectorAll('.mint-buy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const type = btn.dataset.type;
            const amount = parseInt(btn.dataset.amount);
            const price = parseInt(btn.dataset.price);
            const currency = btn.dataset.currency;
            const isFree = btn.dataset.free === 'true';

            if (isFree) {
                // Бесплатная выдача угля
                const res = await window.apiRequest('/shop/buy-coal', {
                    method: 'POST',
                    body: JSON.stringify({ amount, free: true })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`+${amount} угля!`, 1500);
                    await refreshData();
                    updateMintBadge(); // обновить бейдж и перерисовать
                } else {
                    showToast('Ошибка: ' + data.error, 1500);
                }
            } else {
                if (currency === 'diamonds' && userData.diamonds < price) {
                    showToast('Недостаточно алмазов!', 1500);
                    return;
                }
                const endpoint = type === 'coal' ? '/shop/buy-coal' : '/shop/buy-gold';
                const res = await window.apiRequest(endpoint, {
                    method: 'POST',
                    body: JSON.stringify({ amount, price, currency })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`+${amount} ${type === 'coal' ? 'угля' : 'монет'}!`, 1500);
                    await refreshData();
                    if (type === 'coal') updateMintBadge();
                    renderMint(container); // перерисовка для обновления состояния кнопок
                } else {
                    showToast('Ошибка: ' + data.error, 1500);
                }
            }
        });
    });
}

// Глобальный экспорт
window.renderMint = renderMint;
window.updateMintBadge = updateMintBadge;
