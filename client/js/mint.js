// mint.js – Монетный двор (уголь и золото)

let freeCoalAvailable = false;
let coalLimit = { purchasedToday: 0, maxDaily: 1000 };

console.log('[mint.js] loaded');

async function updateMintBadge() {
    console.log('[updateMintBadge] start');
    try {
        const res = await window.apiRequest('/player/freecoal', { method: 'GET' });
        const data = await res.json();
        freeCoalAvailable = data.freeAvailable;
        console.log('[updateMintBadge] freeCoalAvailable =', freeCoalAvailable);
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

async function loadCoalLimit() {
    console.log('[loadCoalLimit] start');
    try {
        const res = await window.apiRequest('/player/coal-limit', { method: 'GET' });
        const data = await res.json();
        coalLimit = { purchasedToday: data.purchasedToday || 0, maxDaily: data.maxDaily || 1000 };
        console.log('[loadCoalLimit] loaded', coalLimit);
    } catch (e) {
        console.error('Failed to load coal limit', e);
    }
}

async function renderMint(container) {
    console.log('[renderMint] called');
    if (!container) {
        console.error('[renderMint] container is null');
        return;
    }
    if (!userData || !userData.id) {
        console.warn('[renderMint] userData not ready, skipping render');
        return;
    }

    try {
        const res = await window.apiRequest('/player/freecoal', { method: 'GET' });
        const data = await res.json();
        freeCoalAvailable = data.freeAvailable;
        console.log('[renderMint] freeCoalAvailable =', freeCoalAvailable);
    } catch (e) {
        freeCoalAvailable = false;
    }

    await loadCoalLimit();

    const coalDiamondItems = [
        { amount: 10, price: 1, currency: 'diamonds', free: freeCoalAvailable, image: '/assets/gold/buy_coal_1.png' },
        { amount: 50, price: 5, currency: 'diamonds', free: false, image: '/assets/gold/buy_coal_2.png' },
        { amount: 250, price: 20, currency: 'diamonds', free: false, image: '/assets/gold/buy_coal_3.png' }
    ];

    const coalCoinItems = [
        { amount: 10, price: 100, currency: 'coins', image: '/assets/gold/buy_coal_1.png' },
        { amount: 50, price: 400, currency: 'coins', image: '/assets/gold/buy_coal_2.png' },
        { amount: 250, price: 1500, currency: 'coins', image: '/assets/gold/buy_coal_3.png' }
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
                <button class="mint-buy-btn" data-type="coal_coins" data-amount="${item.amount}" data-price="${item.price}" data-currency="coins" ${btnDisabled ? 'disabled' : ''}>
                    ${priceLabel}
                </button>
            </div>
        `;
    });

    html += `</div>`;

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

    container.querySelectorAll('.mint-buy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const type = btn.dataset.type;
            const amount = parseInt(btn.dataset.amount);
            const price = parseInt(btn.dataset.price);
            const currency = btn.dataset.currency;
            const isFree = btn.dataset.free === 'true';
            console.log('[mint] button clicked', { type, amount, price, currency, isFree });

            if (isFree) {
                console.log('[mint] FREE COAL: отправка запроса', { amount });
                try {
                    const res = await window.apiRequest('/shop/buy-coal', {
                        method: 'POST',
                        body: JSON.stringify({ amount, free: true })
                    });
                    console.log('[mint] FREE COAL: статус ответа', res.status);
                    const data = await res.json();
                    console.log('[mint] FREE COAL: данные ответа', data);
                    if (data.success) {
                        alert(`Успешно! +${amount} угля`); // временный alert
                        if (typeof showToast === 'function') {
                            showToast(`+${amount} угля!`, 1500);
                        } else {
                            console.warn('[mint] showToast is not defined');
                        }
                        await refreshData();
                        updateMintBadge();
                    } else {
                        alert('Ошибка: ' + data.error);
                        if (typeof showToast === 'function') showToast('Ошибка: ' + data.error, 1500);
                    }
                } catch (err) {
                    console.error('[mint] FREE COAL: ошибка запроса', err);
                    alert('Ошибка соединения');
                    if (typeof showToast === 'function') showToast('Ошибка соединения', 1500);
                }
            } else if (type === 'coal_coins') {
                if (currency === 'coins' && userData.coins < price) {
                    if (typeof showToast === 'function') showToast('Недостаточно монет!', 1500);
                    return;
                }
                const remaining = coalLimit.maxDaily - coalLimit.purchasedToday;
                if (remaining < amount) {
                    if (typeof showToast === 'function') showToast(`Дневной лимит покупки угля исчерпан (осталось ${remaining} угля)`, 1500);
                    return;
                }
                try {
                    const res = await window.apiRequest('/shop/buy-coal-coins', {
                        method: 'POST',
                        body: JSON.stringify({ amount })
                    });
                    const data = await res.json();
                    if (data.success) {
                        if (typeof showToast === 'function') showToast(`+${amount} угля!`, 1500);
                        await refreshData();
                        await loadCoalLimit();
                        renderMint(container);
                        if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
                    } else {
                        if (typeof showToast === 'function') showToast('Ошибка: ' + data.error, 1500);
                    }
                } catch (err) {
                    console.error('[mint] COAL COINS: ошибка', err);
                    if (typeof showToast === 'function') showToast('Ошибка соединения', 1500);
                }
            } else {
                if (currency === 'diamonds' && userData.diamonds < price) {
                    if (typeof showToast === 'function') showToast('Недостаточно алмазов!', 1500);
                    return;
                }
                const endpoint = type === 'coal' ? '/shop/buy-coal' : '/shop/buy-gold';
                try {
                    const res = await window.apiRequest(endpoint, {
                        method: 'POST',
                        body: JSON.stringify({ amount, price, currency })
                    });
                    const data = await res.json();
                    if (data.success) {
                        if (typeof showToast === 'function') showToast(`+${amount} ${type === 'coal' ? 'угля' : 'монет'}!`, 1500);
                        await refreshData();
                        if (type === 'coal') updateMintBadge();
                        renderMint(container);
                    } else {
                        if (typeof showToast === 'function') showToast('Ошибка: ' + data.error, 1500);
                    }
                } catch (err) {
                    console.error('[mint] PURCHASE error', err);
                    if (typeof showToast === 'function') showToast('Ошибка соединения', 1500);
                }
            }
        });
    });
}

window.renderMint = renderMint;
window.updateMintBadge = updateMintBadge;
