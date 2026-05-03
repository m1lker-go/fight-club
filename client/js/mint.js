// mint.js – Монетный двор (уголь и золото)

let freeCoalAvailable = false;
let coalLimit = { purchasedToday: 0, maxDaily: 1000 };

// Обновление бейджа (используем центральную функцию updateTradeBadges)
async function updateMintBadge() {
    try {
        const res = await window.apiRequest('/player/freecoal', { method: 'GET' });
        const data = await res.json();
        freeCoalAvailable = data.freeAvailable;
        if (typeof window.updateTradeBadges === 'function') {
            window.updateTradeBadges();
        }
        if (window.currentScreen === 'trade' && window.tradeSubtab === 'coins') {
            const subContent = document.getElementById('tradeSubContent');
            if (subContent) renderMint(subContent);
        }
    } catch (e) {
        console.error('Failed to fetch free coal status', e);
    }
}

// Получение лимита покупки угля за монеты
async function loadCoalLimit() {
    try {
        const res = await window.apiRequest('/coal-limit', { method: 'GET' });
        const data = await res.json();
        coalLimit = { purchasedToday: data.purchasedToday || 0, maxDaily: data.maxDaily || 1000 };
    } catch (e) {
        console.error('Failed to load coal limit', e);
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

    // Загружаем лимит покупки угля за монеты
    await loadCoalLimit();

    // Товары: уголь за алмазы (3 шт) + бесплатный уголь
    const coalDiamondItems = [
        { amount: 10, price: 1, currency: 'diamonds', free: freeCoalAvailable, image: '/assets/gold/buy_coal_1.png' },
        { amount: 50, price: 5, currency: 'diamonds', free: false, image: '/assets/gold/buy_coal_2.png' },
        { amount: 250, price: 20, currency: 'diamonds', free: false, image: '/assets/gold/buy_coal_3.png' }
    ];

    // Уголь за монеты (с лимитом)
    const coalCoinItems = [
        { amount: 10, price: 100, currency: 'coins', image: '/assets/gold/buy_coal_1.png' },
        { amount: 50, price: 400, currency: 'coins', image: '/assets/gold/buy_coal_2.png' },
        { amount: 250, price: 1500, currency: 'coins', image: '/assets/gold/buy_coal_3.png' }
    ];

    // Золото (монеты за алмазы)
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
            <!-- Уголь за алмазы / бесплатно -->
            <div class="mint-section-title">Уголь за алмазы</div>
            <div class="mint-grid coal-grid">
    `;

    coalDiamondItems.forEach(item => {
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

    html += `</div>`;

    // Уголь за монеты (с лимитом)
    html += `<div class="mint-section-title">Уголь за монеты (лимит ${coalLimit.purchasedToday}/${coalLimit.maxDaily})</div>`;
    html += `<div class="mint-grid coal-grid">`;

    coalCoinItems.forEach(item => {
        const remaining = coalLimit.maxDaily - coalLimit.purchasedToday;
        const canBuy = remaining >= item.amount;
        const btnDisabled = !canBuy || (userData.coins < item.price);
        const priceLabel = `${item.price} <i class="fas fa-coins"></i>`;
        html += `
            <div class="mint-card">
                <div class="mint-card-image">
                    <img src="${item.image}" alt="уголь ${item.amount}">
                </div>
                <div class="mint-card-title">${item.amount} угля</div>
                <button class="mint-buy-btn-coins" data-type="coal_coins" data-amount="${item.amount}" data-price="${item.price}" data-currency="coins" ${btnDisabled ? 'disabled' : ''}>
                    ${priceLabel}
                </button>
            </div>
        `;
    });

    html += `</div>`;

    // Золото (монеты за алмазы)
    html += `<div class="mint-section-title">Золото за алмазы</div>`;
    html += `<div class="mint-grid gold-grid">`;

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

    // Обработчики кнопок (алмазы / бесплатный уголь)
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
                    updateMintBadge();
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
                    renderMint(container);
                } else {
                    showToast('Ошибка: ' + data.error, 1500);
                }
            }
        });
    });

    // Обработчики кнопок для угля за монеты
    container.querySelectorAll('.mint-buy-btn-coins').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const amount = parseInt(btn.dataset.amount);
            const price = parseInt(btn.dataset.price);
            const currency = btn.dataset.currency;

            if (currency === 'coins' && userData.coins < price) {
                showToast('Недостаточно монет!', 1500);
                return;
            }

            // Проверка лимита на клиенте (сервер тоже проверит)
            const remaining = coalLimit.maxDaily - coalLimit.purchasedToday;
            if (remaining < amount) {
                showToast(`Дневной лимит покупки угля исчерпан (осталось ${remaining} угля)`, 1500);
                return;
            }

            const res = await window.apiRequest('/shop/buy-coal-coins', {
                method: 'POST',
                body: JSON.stringify({ amount })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`+${amount} угля!`, 1500);
                await refreshData();
                await loadCoalLimit(); // обновляем лимит
                renderMint(container); // перерисовываем для обновления состояния
                if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
            } else {
                showToast('Ошибка: ' + data.error, 1500);
            }
        });
    });
}

// Глобальный экспорт
window.renderMint = renderMint;
window.updateMintBadge = updateMintBadge;
