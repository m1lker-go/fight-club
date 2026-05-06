// mint.js – Монетный двор (обновлённый: без заголовков, с свитками)

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

    // Свитки (элементы для покупки)
    const scrollItems = [
        { id: 1037, name: 'Редкий свиток', rarity: 'rare', price: 500, currency: 'coins', image: '/assets/gold/scroll_rare.png' },
        { id: 1038, name: 'Эпический свиток', rarity: 'epic', price: 50, currency: 'diamonds', image: '/assets/gold/scroll_epic.png' },
        { id: 1039, name: 'Легендарный свиток', rarity: 'legendary', price: 150, currency: 'diamonds', image: '/assets/gold/scroll_legendary.png' }
    ];

    let html = `<div class="mint-page">`;

    // Уголь за алмазы (без заголовка)
    html += `<div class="mint-grid coal-grid">`;
    coalDiamondItems.forEach(item => {
        const btnDisabled = (!item.free && userData.diamonds < item.price);
        const btnText = item.free ? 'FREE' : `${item.price} <i class="fas fa-gem"></i>`;
        html += `
            <div class="mint-card">
                <div class="mint-card-image">
                    <img src="${item.image}" alt="уголь ${item.amount}">
                </div>
                <div class="mint-card-title">${item.amount} угля</div>
                <button class="mint-buy-btn" data-type="coal_diamond" data-amount="${item.amount}" data-price="${item.price}" data-currency="diamonds" data-free="${item.free}" ${btnDisabled ? 'disabled' : ''}>
                    ${btnText}
                </button>
            </div>`;
    });
    html += `</div>`;

    // Уголь за монеты (без заголовка)
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
            </div>`;
    });
    html += `</div>`;

    // Золото за алмазы (без заголовка)
    html += `<div class="mint-grid gold-grid">`;
    goldItems.forEach(item => {
        const btnDisabled = (userData.diamonds < item.price);
        html += `
            <div class="mint-card">
                <div class="mint-card-image">
                    <img src="${item.image}" alt="золото ${item.amount}">
                </div>
                <div class="mint-card-title">${item.amount} монет</div>
                <button class="mint-buy-btn" data-type="gold" data-amount="${item.amount}" data-price="${item.price}" data-currency="diamonds" ${btnDisabled ? 'disabled' : ''}>
                    ${item.price} <i class="fas fa-gem"></i>
                </button>
            </div>`;
    });
    html += `</div>`;

    // Свитки (новый блок)
    html += `<div class="mint-grid coal-grid">`;  // используем ту же сетку 3 в ряд
    scrollItems.forEach(scroll => {
        const currencySymbol = scroll.currency === 'coins' ? `<i class="fas fa-coins"></i>` : `<i class="fas fa-gem"></i>`;
        html += `
            <div class="mint-card">
                <div class="mint-card-image">
                    <img src="${scroll.image}" alt="${scroll.name}" style="width:100%; height:auto;">
                </div>
                <div class="mint-card-title">${scroll.name}</div>
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
            console.log('[mint] button clicked', { type, amount, price, currency, isFree });

            if (type === 'coal_diamond' && isFree) {
                // Бесплатный уголь
                try {
                    const res = await window.apiRequest('/shop/buy-coal', { method: 'POST', body: JSON.stringify({ amount, free: true }) });
                    const data = await res.json();
                    if (data.success) {
                        showToast(`+${amount} угля!`, 1500);
                        await refreshData();
                        updateMintBadge();
                    } else {
                        showToast('Ошибка: ' + data.error, 1500);
                    }
                } catch (err) {
                    showToast('Ошибка соединения', 1500);
                }
            } else if (type === 'coal_diamond') {
                // Уголь за алмазы
                if (userData.diamonds < price) { showToast('Недостаточно алмазов!', 1500); return; }
                try {
                    const res = await window.apiRequest('/shop/buy-coal', { method: 'POST', body: JSON.stringify({ amount, price, currency }) });
                    const data = await res.json();
                    if (data.success) {
                        showToast(`+${amount} угля!`, 1500);
                        await refreshData();
                        updateMintBadge();
                        renderMint(container);
                    } else {
                        showToast('Ошибка: ' + data.error, 1500);
                    }
                } catch (err) {
                    showToast('Ошибка соединения', 1500);
                }
            } else if (type === 'coal_coins') {
                if (userData.coins < price) { showToast('Недостаточно монет!', 1500); return; }
                const remaining = coalLimit.maxDaily - coalLimit.purchasedToday;
                if (remaining < amount) {
                    showToast(`Дневной лимит покупки угля исчерпан (осталось ${remaining} угля)`, 1500);
                    return;
                }
                try {
                    const res = await window.apiRequest('/shop/buy-coal-coins', { method: 'POST', body: JSON.stringify({ amount }) });
                    const data = await res.json();
                    if (data.success) {
                        // Показываем модальное окно с лимитом вместо обычного тоста
                        const newLimit = coalLimit.purchasedToday + amount;
                        showToast(`<div style="text-align:center;">Вы купили: ${amount} угля<br>Дневной лимит: ${newLimit}/${coalLimit.maxDaily}</div>`, 2000);
                        await refreshData();
                        await loadCoalLimit();
                        renderMint(container);
                        if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
                    } else {
                        showToast('Ошибка: ' + data.error, 1500);
                    }
                } catch (err) {
                    showToast('Ошибка соединения', 1500);
                }
            } else if (type === 'gold') {
                if (userData.diamonds < price) { showToast('Недостаточно алмазов!', 1500); return; }
                try {
                    const res = await window.apiRequest('/shop/buy-gold', { method: 'POST', body: JSON.stringify({ amount, price, currency }) });
                    const data = await res.json();
                    if (data.success) {
                        showToast(`+${amount} монет!`, 1500);
                        await refreshData();
                        renderMint(container);
                    } else {
                        showToast('Ошибка: ' + data.error, 1500);
                    }
                } catch (err) {
                    showToast('Ошибка соединения', 1500);
                }
            } else if (type === 'scroll') {
                // Покупка свитка (пока заглушка – позже добавим серверный эндпоинт)
                const scrollId = btn.dataset.scrollId;
                const scrollName = scrollItems.find(s => s.id == scrollId)?.name || 'свиток';
              showConfirmModal(`Купить "${scrollName}" за ${price} ${currency === 'coins' ? 'монет' : 'алмазов'}?`, async () => {
                    try {
                        const res = await window.apiRequest('/shop/buy-scroll', {
                            method: 'POST',
                            body: JSON.stringify({ scroll_id: scrollId })
                        });
                        const data = await res.json();
                        if (data.success) {
                            showToast(`+1 ${scrollName}`, 1500);
                            await refreshData();
                            renderMint(container);
                            if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
                        } else {
                            showToast('Ошибка: ' + data.error, 1500);
                        }
                    } catch (err) {
                        showToast('Ошибка соединения', 1500);
                    }
                });
            }
        });
    });
}

// Функция подтверждения (уже должна быть в проекте, если нет – определим)
if (typeof showConfirmModal !== 'function') {
    window.showConfirmModal = function(message, onConfirm) {
        const modal = document.getElementById('roleModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');
        title.innerText = 'Подтверждение';
        body.innerHTML = `<div style="text-align:center;"><p>${message}</p><button class="btn" id="confirmYes">Да</button> <button class="btn" id="confirmNo">Нет</button></div>`;
        modal.style.display = 'flex';
        document.getElementById('confirmYes').onclick = () => { modal.style.display = 'none'; onConfirm(); };
        document.getElementById('confirmNo').onclick = () => { modal.style.display = 'none'; };
    };
}

window.renderMint = renderMint;
window.updateMintBadge = updateMintBadge;
