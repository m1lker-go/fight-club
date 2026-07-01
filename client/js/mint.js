// mint.js – Монетный двор (полная локализация)

let freeCoalAvailable = false;
let coalLimit = { purchasedToday: 0, maxDaily: 1000 };

console.log('[mint.js] loaded');

async function updateMintBadge() {
    console.log('[updateMintBadge] start');
    try {
        const res = await window.apiRequest(`/player/freecoal?_t=${Date.now()}`, { method: 'GET' });
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
        const res = await window.apiRequest(`/player/coal-limit?_t=${Date.now()}`, { method: 'GET' });
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
        const res = await window.apiRequest(`/player/freecoal?_t=${Date.now()}`, { method: 'GET' });
        const data = await res.json();
        freeCoalAvailable = data.freeAvailable;
        console.log('[renderMint] freeCoalAvailable =', freeCoalAvailable);
    } catch (e) {
        freeCoalAvailable = false;
    }

    await loadCoalLimit();

    const coalDiamondItems = [
        { amount: 10, price: 2, currency: 'diamonds', free: freeCoalAvailable, image: '/assets/gold/buy_coal_1.png' },
        { amount: 50, price: 8, currency: 'diamonds', free: false, image: '/assets/gold/buy_coal_2.png' },
        { amount: 250, price: 35, currency: 'diamonds', free: false, image: '/assets/gold/buy_coal_3.png' }
    ];

    const coalCoinItems = [
        { amount: 10, price: 25, currency: 'coins', image: '/assets/gold/buy_coal_1.png' },
        { amount: 50, price: 100, currency: 'coins', image: '/assets/gold/buy_coal_2.png' },
        { amount: 250, price: 450, currency: 'coins', image: '/assets/gold/buy_coal_3.png' }
    ];

    const goldItems = [
        { amount: 100, price: 11, currency: 'diamonds', image: '/assets/gold/buy_gold_1.png' },
        { amount: 250, price: 28, currency: 'diamonds', image: '/assets/gold/buy_gold_2.png' },
        { amount: 500, price: 55, currency: 'diamonds', image: '/assets/gold/buy_gold_3.png' },
        { amount: 1000, price: 110, currency: 'diamonds', image: '/assets/gold/buy_gold_4.png' },
        { amount: 2000, price: 210, currency: 'diamonds', image: '/assets/gold/buy_gold_5.png' },
        { amount: 5000, price: 500, currency: 'diamonds', image: '/assets/gold/buy_gold_6.png' }
    ];

    const scrollItems = [
        { id: 1037, nameKey: 'mint:Редкий Свиток', rarity: 'rare', price: 500, currency: 'coins', image: '/assets/equip/scrolls/scroll_rare.png' },
        { id: 1038, nameKey: 'mint:Эпический Свиток', rarity: 'epic', price: 50, currency: 'diamonds', image: '/assets/equip/scrolls/scroll_epic.png' },
        { id: 1039, nameKey: 'mint:Легендарный Свиток', rarity: 'legendary', price: 150, currency: 'diamonds', image: '/assets/equip/scrolls/scroll_legendary.png' }
    ];

    let html = `<div class="mint-page">`;

    // Уголь за алмазы
    html += `<div class="mint-section-title">${window.$t('mint:Уголь за алмазы', 'Уголь за алмазы')}</div>`;
    html += `<div class="mint-grid coal-grid">`;
    coalDiamondItems.forEach(item => {
        const btnDisabled = (!item.free && userData.diamonds < item.price);
        const btnText = item.free ? window.$t('mint:FREE', 'FREE') : `${item.price} <i class="fas fa-gem"></i>`;
        html += `
            <div class="mint-card">
                <div class="mint-card-image">
                    <img src="${item.image}" alt="${item.amount} ${window.$t('common:Уголь', 'Уголь')}">
                </div>
                <div class="mint-card-title">${item.amount} ${window.$t('common:Уголь', 'Уголь')}</div>
                <button class="mint-buy-btn" data-type="coal_diamond" data-amount="${item.amount}" data-price="${item.price}" data-currency="diamonds" data-free="${item.free}" ${btnDisabled ? 'disabled' : ''}>
                    ${btnText}
                </button>
            </div>`;
    });
    html += `</div>`;

    // Уголь за монеты
    html += `<div class="mint-section-title">${window.$t('mint:Уголь за монеты', 'Уголь за монеты')}</div>`;
    html += `<div class="mint-grid coal-grid">`;
    coalCoinItems.forEach(item => {
        const remaining = coalLimit.maxDaily - coalLimit.purchasedToday;
        const canBuy = remaining >= item.amount;
        const btnDisabled = !canBuy || (userData.coins < item.price);
        const priceLabel = `${item.price} <i class="fas fa-coins"></i>`;
        html += `
            <div class="mint-card">
                <div class="mint-card-image">
                    <img src="${item.image}" alt="${item.amount} ${window.$t('common:Уголь', 'Уголь')}">
                </div>
                <div class="mint-card-title">${item.amount} ${window.$t('common:Уголь', 'Уголь')}</div>
                <button class="mint-buy-btn" data-type="coal_coins" data-amount="${item.amount}" data-price="${item.price}" data-currency="coins" ${btnDisabled ? 'disabled' : ''}>
                    ${priceLabel}
                </button>
            </div>`;
    });
    html += `</div>`;

    // Золото за алмазы
    html += `<div class="mint-section-title">${window.$t('mint:Золото за алмазы', 'Золото за алмазы')}</div>`;
    html += `<div class="mint-grid gold-grid">`;
    goldItems.forEach(item => {
        const btnDisabled = (userData.diamonds < item.price);
        html += `
            <div class="mint-card">
                <div class="mint-card-image">
                    <img src="${item.image}" alt="${item.amount} ${window.$t('common:Монеты', 'Монеты')}">
                </div>
                <div class="mint-card-title">${item.amount} ${window.$t('common:Монеты', 'Монеты')}</div>
                <button class="mint-buy-btn" data-type="gold" data-amount="${item.amount}" data-price="${item.price}" data-currency="diamonds" ${btnDisabled ? 'disabled' : ''}>
                    ${item.price} <i class="fas fa-gem"></i>
                </button>
            </div>`;
    });
    html += `</div>`;

    // Свитки
    html += `<div class="mint-section-title">${window.$t('mint:Свитки', 'Свитки')}</div>`;
    html += `<div class="mint-grid coal-grid">`;
    scrollItems.forEach(scroll => {
        const scrollDisplayName = window.$t(scroll.nameKey, scroll.nameKey).replace(' ', '<br>');
        const currencySymbol = scroll.currency === 'coins' ? `<i class="fas fa-coins"></i>` : `<i class="fas fa-gem"></i>`;
        html += `
            <div class="mint-card">
                <div class="mint-card-image">
                    <img src="${scroll.image}" alt="${window.$t(scroll.nameKey, '')}" style="width:100%; height:auto;">
                </div>
                <div class="mint-card-title" style="text-align: center; line-height: 1.3;">${scrollDisplayName}</div>
                <button class="mint-buy-btn" data-type="scroll" data-scroll-id="${scroll.id}" data-price="${scroll.price}" data-currency="${scroll.currency}" ${(scroll.currency === 'coins' ? userData.coins < scroll.price : userData.diamonds < scroll.price) ? 'disabled' : ''}>
                    ${scroll.price} ${currencySymbol}
                </button>
            </div>`;
    });
    html += `</div>`;
    html += `</div>`;
    container.innerHTML = html;

    // Обработчики кнопок
    container.querySelectorAll('.mint-buy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const type = btn.dataset.type;
            const amount = parseInt(btn.dataset.amount);
            const price = parseInt(btn.dataset.price);
            const currency = btn.dataset.currency;
            const isFree = btn.dataset.free === 'true';

            if (type === 'coal_diamond' && isFree) {
                try {
                    const res = await window.apiRequest('/shop/buy-coal', { method: 'POST', body: JSON.stringify({ amount, free: true }) });
                    const data = await res.json();
                    if (data.success) {
                        showToast(window.$t('mint:+{amount} угля!', '+{amount} угля!', { amount }), 1500);
                        await refreshData();
                        updateMintBadge();
                        renderMint(container);
                    } else {
                        showToast(window.$t('common:Ошибка: ', 'Ошибка: ') + data.error, 1500);
                    }
                } catch (err) {
                    showToast(window.$t('common:Ошибка соединения', 'Ошибка соединения'), 1500);
                }
            } else if (type === 'coal_diamond') {
                if (userData.diamonds < price) {
                    showToast(window.$t('common:Недостаточно алмазов!', 'Недостаточно алмазов!'), 1500);
                    return;
                }
                try {
                    const res = await window.apiRequest('/shop/buy-coal', { method: 'POST', body: JSON.stringify({ amount, price, currency }) });
                    const data = await res.json();
                    if (data.success) {
                        showToast(window.$t('mint:+{amount} угля!', '+{amount} угля!', { amount }), 1500);
                        await refreshData();
                        updateMintBadge();
                        renderMint(container);
                    } else {
                        showToast(window.$t('common:Ошибка: ', 'Ошибка: ') + data.error, 1500);
                    }
                } catch (err) {
                    showToast(window.$t('common:Ошибка соединения', 'Ошибка соединения'), 1500);
                }
            } else if (type === 'coal_coins') {
                if (userData.coins < price) {
                    showToast(window.$t('common:Недостаточно монет!', 'Недостаточно монет!'), 1500);
                    return;
                }
                const remaining = coalLimit.maxDaily - coalLimit.purchasedToday;
                if (remaining < amount) {
                    showToast(window.$t('mint:Дневной лимит покупки угля исчерпан (осталось {remaining} угля)', 'Дневной лимит покупки угля исчерпан (осталось {remaining} угля)', { remaining }), 1500);
                    return;
                }
                try {
                    const res = await window.apiRequest('/shop/buy-coal-coins', { method: 'POST', body: JSON.stringify({ amount }) });
                    const data = await res.json();
                    if (data.success) {
                        const newLimit = coalLimit.purchasedToday + amount;
                        showToast(window.$t('mint:Вы купили: {amount} угля. Дневной лимит: {newLimit}/{maxDaily}', 'Вы купили: {amount} угля. Дневной лимит: {newLimit}/{maxDaily}', { amount, newLimit, maxDaily: coalLimit.maxDaily }), 2000);
                        await refreshData();
                        await loadCoalLimit();
                        renderMint(container);
                        if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
                    } else {
                        showToast(window.$t('common:Ошибка: ', 'Ошибка: ') + data.error, 1500);
                    }
                } catch (err) {
                    showToast(window.$t('common:Ошибка соединения', 'Ошибка соединения'), 1500);
                }
            } else if (type === 'gold') {
                if (userData.diamonds < price) {
                    showToast(window.$t('common:Недостаточно алмазов!', 'Недостаточно алмазов!'), 1500);
                    return;
                }
                try {
                    const res = await window.apiRequest('/shop/buy-gold', { method: 'POST', body: JSON.stringify({ amount, price, currency }) });
                    const data = await res.json();
                    if (data.success) {
                        showToast(window.$t('mint:+{amount} монет!', '+{amount} монет!', { amount }), 1500);
                        await refreshData();
                        renderMint(container);
                    } else {
                        showToast(window.$t('common:Ошибка: ', 'Ошибка: ') + data.error, 1500);
                    }
                } catch (err) {
                    showToast(window.$t('common:Ошибка соединения', 'Ошибка соединения'), 1500);
                }
            } else if (type === 'scroll') {
                const scrollId = btn.dataset.scrollId;
                const scroll = scrollItems.find(s => s.id == scrollId);
                const scrollPlainName = window.$t(scroll.nameKey, '').replace('<br>', ' ').trim();
                const currencyText = scroll.currency === 'coins' ? window.$t('common:монет', 'монет') : window.$t('common:алмазов', 'алмазов');
                const confirmMessage = window.$t('mint:Купить "{scrollName}" за {price} {currency}?', 'Купить "{scrollName}" за {price} {currency}?', {
                    scrollName: scrollPlainName,
                    price: scroll.price,
                    currency: currencyText
                });
                showConfirmModal(confirmMessage, async () => {
                    try {
                        const res = await window.apiRequest('/shop/buy-scroll', {
                            method: 'POST',
                            body: JSON.stringify({ scroll_id: scrollId })
                        });
                        const data = await res.json();
                        if (data.success) {
                            showToast(window.$t('mint:+1 {scrollName}', '+1 {scrollName}', { scrollName: scrollPlainName }), 1500);
                            await refreshData();
                            renderMint(container);
                            if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
                        } else {
                            showToast(window.$t('common:Ошибка: ', 'Ошибка: ') + data.error, 1500);
                        }
                    } catch (err) {
                        showToast(window.$t('common:Ошибка соединения', 'Ошибка соединения'), 1500);
                    }
                });
            }
        });
    });
}

// Заглушка showConfirmModal (если отсутствует) с локализацией
if (typeof showConfirmModal !== 'function') {
    window.showConfirmModal = function(message, onConfirm) {
        const modal = document.getElementById('roleModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');
        title.innerText = window.$t('common:Подтверждение', 'Подтверждение');
        body.innerHTML = `
            <div style="text-align:center;">
                <p>${message}</p>
                <button class="btn" id="confirmYes">${window.$t('common:Да', 'Да')}</button>
                <button class="btn" id="confirmNo">${window.$t('common:Нет', 'Нет')}</button>
            </div>`;
        modal.style.display = 'flex';
        document.getElementById('confirmYes').onclick = () => { modal.style.display = 'none'; onConfirm(); };
        document.getElementById('confirmNo').onclick = () => { modal.style.display = 'none'; };
    };
}

window.renderMint = renderMint;
window.updateMintBadge = updateMintBadge;
