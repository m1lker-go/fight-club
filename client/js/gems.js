// gems.js – Алмазная лавка (подписка + пакеты алмазов)

let subscriptionStatus = null;

// Функция получения статуса подписки и бонусов
async function loadSubscriptionStatus() {
    try {
        const res = await window.apiRequest('/subscription/status', { method: 'GET' });
        const data = await res.json();
        subscriptionStatus = data; // { hasSubscription, freeCoinAvailable, bonusPacks: { packId: bought } }
        return data;
    } catch (e) {
        console.error('Error loading subscription status', e);
        return null;
    }
}

// Рендер алмазной лавки
async function renderGems(container) {
    if (!container) return;

    // Загружаем статус подписки и бонусов
    const status = await loadSubscriptionStatus();
    const hasSubscription = status?.hasSubscription || false;
    const freeCoinAvailable = status?.freeCoinAvailable || false;
    const bonusBought = status?.bonusPacks || {};

    // Пакеты алмазов (соответствуют картинкам, порядок как в старом коде)
    const packs = [
        { id: 1, diamonds: 20, price: 149, image: 'buy_diamond_1.png', bonus: true },
        { id: 2, diamonds: 50, price: 229, image: 'buy_diamond_2.png', bonus: true },
        { id: 3, diamonds: 100, price: 399, image: 'buy_diamond_3.png', bonus: true },
        { id: 4, diamonds: 500, price: 1199, image: 'buy_diamond_4.png', bonus: true },
        { id: 5, diamonds: 2000, price: 2999, image: 'buy_diamond_5.png', bonus: true },
        { id: 6, diamonds: 5000, price: 4999, image: 'buy_diamond_6.png', bonus: true }
    ];

    // Формируем HTML
    let html = `
        <div class="gems-page">
            <!-- Карточка подписки VIP Silver -->
            <div class="subscription-card">
                <div class="subscription-left">
                    <i class="fas fa-crown" style="color: #c0c0c0;"></i>
                    <span class="subscription-title">Подписка "VIP Silver"</span>
                </div>
                <button class="subscription-view-btn" id="viewSubscriptionBtn">
                    <i class="fas fa-eye"></i>
                </button>
            </div>

            <div class="packs-grid">
    `;

    // Пакеты алмазов
    packs.forEach(pack => {
        const isBonusActive = pack.bonus && !bonusBought[pack.id];
        const bonusLabel = isBonusActive ? '<div class="bonus-badge">+50% на 1ую покупку</div>' : '';
        html += `
            <div class="pack-card" data-pack-id="${pack.id}" data-diamonds="${pack.diamonds}" data-price="${pack.price}">
                <div class="pack-image"><img src="/assets/diamond/${pack.image}" alt="${pack.diamonds} алмазов"></div>
                <div class="pack-diamonds">${pack.diamonds} алмазов</div>
                <div class="pack-price">${pack.price} ₽</div>
                ${bonusLabel}
            </div>
        `;
    });

    html += `
            </div>
            <div class="shop-note">
                <i class="fas fa-info-circle"></i> Бонус +50% алмазов начисляется только <strong>один раз за каждый пакет</strong> при первой покупке на аккаунт.
            </div>
        </div>
    `;
    container.innerHTML = html;

    // Обработчик кнопки подписки (открывает модальное окно)
    document.getElementById('viewSubscriptionBtn')?.addEventListener('click', () => {
        showSubscriptionModal(hasSubscription, freeCoinAvailable);
    });

    // Обработчики пакетов алмазов
    document.querySelectorAll('.pack-card').forEach(card => {
        card.addEventListener('click', async (e) => {
            const packId = card.dataset.packId;
            const diamonds = parseInt(card.dataset.diamonds);
            const price = parseInt(card.dataset.price);
            // Здесь должен быть вызов API для покупки алмазов (через платёжную систему)
            // Пока заглушка:
            showToast(`Покупка ${diamonds} алмазов за ${price} ₽ — разработка оплаты`, 2000);
            // После успешной покупки – обновить статус бонуса и перерисовать
            // await refreshData();
            // await loadSubscriptionStatus();
            // renderGems(container);
        });
    });
}

// Модальное окно подписки VIP Silver
function showSubscriptionModal(hasSubscription, freeCoinAvailable) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerHTML = `<i class="fas fa-crown" style="color: #c0c0c0;"></i> VIP Silver`;
    modalBody.innerHTML = `
        <div class="subscription-modal">
            <div class="subscription-features">
                <div class="feature-item"><i class="fas fa-ban"></i> Пропуск всей рекламы</div>
                <div class="feature-item"><i class="fas fa-coins"></i> Ежедневно: <strong>250 монет + 10 угля</strong> (письмом)</div>
                <div class="feature-item"><i class="fas fa-gift"></i> При оформлении: <strong>1500 монет, 50 угля, 100 алмазов</strong></div>
                <div class="feature-item"><i class="fas fa-chart-line"></i> +10% к опыту и монетам с боёв</div>
                <div class="feature-item"><i class="fas fa-shield-alt"></i> Даже за поражение: +5 опыта и +5 монет</div>
            </div>
            <div class="subscription-buttons">
                <button class="subscription-free-btn" id="freeCoinBtn" ${!freeCoinAvailable ? 'disabled' : ''}>
                    <i class="fas fa-coins"></i> 20 монет
                </button>
                <button class="subscription-buy-btn" id="buySubscriptionBtn">
                    Оформить подписку
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    // Кнопка бесплатных монет
    const freeBtn = document.getElementById('freeCoinBtn');
    if (freeBtn) {
        freeBtn.addEventListener('click', async () => {
            if (!freeCoinAvailable) {
                showToast('Бесплатная монета уже получена сегодня', 1500);
                return;
            }
            const res = await window.apiRequest('/subscription/claim-free-coin', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('+20 монет!', 1500);
                await refreshData();
                modal.style.display = 'none';
                // Обновляем алмазную лавку
                const subContent = document.getElementById('tradeSubContent');
                if (subContent) renderGems(subContent);
            } else {
                showToast(data.error || 'Ошибка', 1500);
            }
        });
    }

    // Кнопка покупки подписки
    const buyBtn = document.getElementById('buySubscriptionBtn');
    if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
            const res = await window.apiRequest('/subscription/buy', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('Подписка оформлена!', 2000);
                await refreshData();
                modal.style.display = 'none';
                const subContent = document.getElementById('tradeSubContent');
                if (subContent) renderGems(subContent);
            } else {
                showToast(data.error || 'Ошибка оформления', 1500);
            }
        });
    }

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };
}

// Глобальный экспорт
window.renderGems = renderGems;
