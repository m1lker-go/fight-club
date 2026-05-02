// mint.js – страница монетного двора (уголь и золото)

let freeCoalAvailable = false;

// Функция обновления бейджа на кнопке Торговля (аналогично сундуку)
async function updateMintBadge() {
    try {
        const res = await window.apiRequest('/player/freecoal', { method: 'GET' });
        const data = await res.json();
        freeCoalAvailable = data.freeAvailable;
        if (window.updateTradeButtonIcon) {
            window.updateTradeButtonIcon(); // предполагается, что она обновляет иконку бесплатного сундука и угля
        }
        // Если мы на странице монетного двора, перерисуем её
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
        console.error(e);
        freeCoalAvailable = false;
    }

    // Данные для товаров
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
            <div class="mint-section">
                <div class="mint-section-title">Уголь</div>
                <div class="mint-grid coal-grid">
    `;

    coalItems.forEach(item => {
        const priceHtml = item.free ? 'FREE' : `${item.price} <i class="fas fa-gem"></i>`;
        const btnDisabled = item.free ? false : (userData.diamonds < item.price);
        html += `
            <div class="mint-card">
                <div class="mint-card-image">
                    <img src="${item.image}" alt="уголь ${item.amount}">
                </div>
                <div class="mint-card-title">${item.amount} угля</div>
                <div class="mint-card-price">${priceHtml}</div>
                <button class="mint-buy-btn" data-type="coal" data-amount="${item.amount}" data-price="${item.price}" data-currency="${item.currency}" data-free="${item.free}" ${btnDisabled ? 'disabled' : ''}>
                    ${item.free ? 'ЗАБРАТЬ' : 'КУПИТЬ'}
                </button>
            </div>
        `;
    });

    html += `
                </div>
            </div>
            <div class="mint-section">
                <div class="mint-section-title">Золото</div>
                <div class="mint-grid gold-grid">
    `;

    goldItems.forEach(item => {
        const btnDisabled = userData.diamonds < item.price;
        html += `
            <div class="mint-card">
                <div class="mint-card-image">
                    <img src="${item.image}" alt="золото ${item.amount}">
                </div>
                <div class="mint-card-title">${item.amount} монет</div>
                <div class="mint-card-price">${item.price} <i class="fas fa-gem"></i></div>
                <button class="mint-buy-btn" data-type="gold" data-amount="${item.amount}" data-price="${item.price}" data-currency="${item.currency}" ${btnDisabled ? 'disabled' : ''}>
                    КУПИТЬ
                </button>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>
    `;
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

// Экспорт функции обновления бейджа для использования в торговле
window.updateMintBadge = updateMintBadge;
