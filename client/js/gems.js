// gems.js – Алмазная лавка (подписка + пакеты алмазов) – НОВЫЙ ДИЗАЙН

let subscriptionStatus = null;
let pendingFreeCoin = false;

// Функция получения статуса подписки и бонусов
async function loadSubscriptionStatus() {
    try {
        const res = await window.apiRequest('/subscription/status', { method: 'GET' });
        const data = await res.json();
        subscriptionStatus = data;
        return data;
    } catch (e) {
        console.error('Error loading subscription status', e);
        return null;
    }
}

// Рендер алмазной лавки
async function renderGems(container) {
    if (!container) return;

    const status = await loadSubscriptionStatus();
    const hasSubscription = status?.hasSubscription || false;
    const freeCoinAvailable = status?.freeCoinAvailable || false;
    const bonusBought = status?.bonusPacks || {};

    const packs = [
        { id: 1, diamonds: 20, price: 149, image: 'buy_diamond_1.png', bonus: true },
        { id: 2, diamonds: 50, price: 229, image: 'buy_diamond_2.png', bonus: true },
        { id: 3, diamonds: 100, price: 399, image: 'buy_diamond_3.png', bonus: true },
        { id: 4, diamonds: 500, price: 1199, image: 'buy_diamond_4.png', bonus: true },
        { id: 5, diamonds: 2000, price: 2999, image: 'buy_diamond_5.png', bonus: true },
        { id: 6, diamonds: 5000, price: 4999, image: 'buy_diamond_6.png', bonus: true }
    ];

    // Формируем HTML с новым дизайном
    let html = `
        <div class="gems-page">
            <!-- Карточка подписки VIP Silver (уменьшенный шрифт, значок, широкая кнопка) -->
            <div class="subscription-card-new">
                <div class="subscription-left-new">
                    <i class="fas fa-crown" style="color: #c0c0c0; font-size: 24px;"></i>
                    <span class="subscription-title-new">Подписка "VIP Silver"</span>
                </div>
                <button class="subscription-view-btn-new" id="viewSubscriptionBtn">
                    <i class="fas fa-eye"></i> Подробнее
                </button>
            </div>

            <div class="packs-grid-new">
    `;

    packs.forEach(pack => {
        const isBonusActive = pack.bonus && !bonusBought[pack.id];
        html += `
            <div class="pack-card-new" data-pack-id="${pack.id}" data-diamonds="${pack.diamonds}" data-price="${pack.price}">
                ${isBonusActive ? '<div class="bonus-badge-new">+50% на 1ую покупку</div>' : ''}
                <div class="pack-image-new"><img src="/assets/diamond/${pack.image}" alt="${pack.diamonds} алмазов"></div>
                <div class="pack-diamonds-new">${pack.diamonds} алмазов</div>
                <button class="pack-buy-btn">${pack.price} ₽</button>
            </div>
        `;
    });

    html += `
            </div>
            <div class="shop-note-new">
                <i class="fas fa-info-circle"></i> Бонус +50% алмазов начисляется только <strong>один раз за каждый пакет</strong> при первой покупке на аккаунт.
            </div>
        </div>
    `;
    container.innerHTML = html;

    // Обработчик кнопки подписки
    document.getElementById('viewSubscriptionBtn')?.addEventListener('click', () => {
        showSubscriptionModalNew(hasSubscription, freeCoinAvailable);
    });

    // Обработчики пакетов алмазов (клик по карточке или по кнопке)
    document.querySelectorAll('.pack-card-new').forEach(card => {
        const buyBtn = card.querySelector('.pack-buy-btn');
        if (buyBtn) {
            buyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const packId = card.dataset.packId;
                const diamonds = parseInt(card.dataset.diamonds);
                const price = parseInt(card.dataset.price);
                // Покупка алмазов – заглушка (позже интеграция с платёжной системой)
                showToast(`Покупка ${diamonds} алмазов за ${price} ₽ — разработка оплаты`, 2000);
                // После успешной покупки: refreshData, обновить статус бонуса, перерисовать
            });
        }
    });

    // Если есть бесплатная монета – обнови бейджи через центральную функцию
    if (freeCoinAvailable && typeof window.updateTradeBadges === 'function') {
        window.updateTradeBadges();
    }
}

// Новое модальное окно подписки VIP Silver
function showSubscriptionModalNew(hasSubscription, freeCoinAvailable) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerHTML = `<i class="fas fa-crown" style="color: #c0c0c0;"></i> VIP Silver`;
    modalBody.innerHTML = `
        <div class="subscription-modal-new">
            <div class="feature-item"><i class="fas fa-ban"></i> Пропуск рекламы</div>
            <div class="feature-item"><i class="fas fa-chart-line"></i> Дополнительные награды в бою:<br> +10% опыта <i class="fas fa-star"></i>, +10% монет <i class="fas fa-coins"></i></div>
            <div class="feature-item"><i class="fas fa-shield-alt"></i> Награда в случае поражения:<br> +5 опыта <i class="fas fa-star"></i>, +5 монет <i class="fas fa-coins"></i></div>
            <div class="feature-item"><i class="fas fa-gift"></i> Ежедневная награда:<br> 250 монет <i class="fas fa-coins"></i>, 10 угля <i class="fas fa-cube"></i></div>
            <div class="feature-item"><i class="fas fa-gem"></i> Награда при оформлении:<br> 1500 монет <i class="fas fa-coins"></i>, 50 угля <i class="fas fa-cube"></i>, 100 алмазов <i class="fas fa-gem"></i></div>
            <div class="subscription-buttons-new">
                <button class="subscription-free-btn-new" id="freeCoinBtnNew" ${!freeCoinAvailable ? 'disabled' : ''}>
                    20 <i class="fas fa-coins"></i>
                </button>
                <button class="subscription-buy-btn-new" id="buySubscriptionBtnNew">
                    Оформить подписку
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    // Бесплатные 20 монет
    const freeBtn = document.getElementById('freeCoinBtnNew');
    if (freeBtn) {
        freeBtn.addEventListener('click', async () => {
            if (pendingFreeCoin) return;
            pendingFreeCoin = true;
            if (!freeCoinAvailable) {
                showToast('Бесплатная монета уже получена сегодня', 1500);
                pendingFreeCoin = false;
                return;
            }
            const res = await window.apiRequest('/subscription/claim-free-coin', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('+20 монет!', 1500);
                await refreshData();
                // Обновляем бейджи
                if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
                modal.style.display = 'none';
                const subContent = document.getElementById('tradeSubContent');
                if (subContent) renderGems(subContent);
            } else {
                showToast(data.error || 'Ошибка', 1500);
            }
            pendingFreeCoin = false;
        });
    }

    // Покупка подписки
    const buyBtn = document.getElementById('buySubscriptionBtnNew');
    if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
            const res = await window.apiRequest('/subscription/buy', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('Подписка оформлена!', 2000);
                await refreshData();
                if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
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
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
}

// Глобальный экспорт
window.renderGems = renderGems;
