// gems.js – Алмазная лавка (VK Mini App: VKWebAppShowOrderBox, остальные – Robokassa)

let subscriptionStatus = null;
let pendingFreeCoin = false;

console.log('[gems.js] loaded');

// Функция показа модального окна с офертой
async function showLegalModal() {
    try {
        const response = await fetch('/legal.html');
        if (!response.ok) throw new Error('Ошибка загрузки оферты');
        const html = await response.text();
        const modal = document.getElementById('roleModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        if (!modal || !modalTitle || !modalBody) return;
        modalTitle.innerText = 'Реквизиты и оферта';
        modalBody.innerHTML = `<div style="max-height: 60vh; overflow-y: auto; padding: 5px;">${html}</div>`;
        modal.style.display = 'flex';
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
    } catch (err) {
        console.error('Ошибка загрузки оферты', err);
        if (typeof showToast === 'function') showToast('Не удалось загрузить оферту', 1500);
    }
}

async function loadSubscriptionStatus() {
    console.log('[loadSubscriptionStatus] start');
    try {
        const res = await window.apiRequest(`/subscription/status?_t=${Date.now()}`, { method: 'GET' });
        const data = await res.json();
        subscriptionStatus = data;
        console.log('[loadSubscriptionStatus] status:', data);
        return data;
    } catch (e) {
        console.error('Error loading subscription status', e);
        return null;
    }
}

function submitRobokassaForm(paramsUrl) {
    const urlParams = new URLSearchParams(paramsUrl.split('?')[1]);
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://auth.robokassa.ru/Merchant/Index.aspx';
    form.style.display = 'none';

    for (const [key, value] of urlParams.entries()) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
}

async function renderGems(container) {
    console.log('[renderGems] called, container:', container);
    if (!container) {
        console.error('[renderGems] container is null');
        return;
    }
    if (!userData || !userData.id) {
        console.warn('[renderGems] userData not ready, skipping render');
        return;
    }

    const isVK = window.isVKMiniApp === true;

    const status = await loadSubscriptionStatus();
    const hasSubscription = status?.hasSubscription || false;
    const freeCoinAvailable = status?.freeCoinAvailable || false;
    const bonusBought = status?.bonusPacks || {};

    // Пакеты для обычного режима (рубли)
    const packsRub = [
        { id: 1, diamonds: 50, price: 99, image: 'buy_diamond_1.png', bonus: true },
        { id: 2, diamonds: 150, price: 399, image: 'buy_diamond_2.png', bonus: true },
        { id: 3, diamonds: 350, price: 899, image: 'buy_diamond_3.png', bonus: true },
        { id: 4, diamonds: 700, price: 1599, image: 'buy_diamond_4.png', bonus: true },
        { id: 5, diamonds: 1150, price: 2499, image: 'buy_diamond_5.png', bonus: true },
        { id: 6, diamonds: 1800, price: 3999, image: 'buy_diamond_6.png', bonus: true }
    ];

    // Пакеты для VK Mini App (голоса) – цены в голосах
    const packsVK = [
        { id: 1, diamonds: 50, price: 15, image: 'buy_diamond_1.png', bonus: true },
        { id: 2, diamonds: 150, price: 57, image: 'buy_diamond_2.png', bonus: true },
        { id: 3, diamonds: 350, price: 129, image: 'buy_diamond_3.png', bonus: true },
        { id: 4, diamonds: 700, price: 229, image: 'buy_diamond_4.png', bonus: true },
        { id: 5, diamonds: 1150, price: 357, image: 'buy_diamond_5.png', bonus: true },
        { id: 6, diamonds: 1800, price: 572, image: 'buy_diamond_6.png', bonus: true }
    ];

    const packs = isVK ? packsVK : packsRub;
    const currencySymbol = isVK ? 'голосов' : '₽';

    let html = `
        <div class="gems-page">
            <div class="subscription-card-new">
                <div class="subscription-left-new">
                    <i class="fas fa-crown" style="color: #c0c0c0; font-size: 24px;"></i>
                    <div class="subscription-text">
                        <div class="subscription-label">Подписка</div>
                        <div class="subscription-name">VIP Silver</div>
                    </div>
                </div>
                <button class="subscription-view-btn-new" id="viewSubscriptionBtn">
                    ${freeCoinAvailable ? '<img src="/assets/icons/icon-new.png" style="width: 14px; height: 14px; margin-right: 4px;">' : ''}
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
                <button class="pack-buy-btn">${pack.price} ${currencySymbol}</button>
            </div>
        `;
    });

    html += `
            </div>
            <div class="shop-note-new">
                <i class="fas fa-info-circle"></i> Бонус +50% алмазов начисляется только <strong>один раз за каждый пакет</strong> при первой покупке на аккаунт.
            </div>
            <div class="shop-note-new">
                <i class="fas fa-file-contract"></i> <button id="showLegalBtn" class="legal-btn" style="background: none; border: none; color: #aaa; text-decoration: underline; cursor: pointer;">Реквизиты и оферта</button>
            </div>
        </div>
    `;
    container.innerHTML = html;

    // Обработчик кнопки оферты
    const legalBtn = document.getElementById('showLegalBtn');
    if (legalBtn) legalBtn.addEventListener('click', showLegalModal);

    document.getElementById('viewSubscriptionBtn')?.addEventListener('click', () => {
        console.log('[gems] viewSubscriptionBtn clicked');
        showSubscriptionModalNew(hasSubscription, freeCoinAvailable);
    });

    // Обработчики покупки алмазных пакетов
    document.querySelectorAll('.pack-card-new').forEach(card => {
        const buyBtn = card.querySelector('.pack-buy-btn');
        buyBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            const diamonds = parseInt(card.dataset.diamonds);
            const price = parseInt(card.dataset.price);
            const packId = parseInt(card.dataset.packId);
            const isBonus = !!card.querySelector('.bonus-badge-new');

            console.log(`[gems] Покупка пакета: ${diamonds} алмазов за ${price} ${isVK ? 'голосов' : '₽'}`);

            if (isVK) {
                // VK Mini App: официальный метод VKWebAppShowOrderBox
                try {
                    const result = await vkBridge.send('VKWebAppShowOrderBox', {
                        type: 'item',
                        item: String(packId),
                        demo: true 
                    });
                    if (result) {
                        showToast('Покупка успешно завершена! Товар будет зачислен через несколько секунд.', 2000);
                        setTimeout(async () => {
                            await refreshData();
                            if (window.currentScreen === 'trade' && window.tradeSubtab === 'gems') {
                                renderGems(container);
                            }
                            if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
                        }, 3000);
                    } else {
                        showToast('Платеж отменён', 2000);
                    }
                } catch (err) {
                    console.error('[gems] VKWebAppShowOrderBox error:', err);
                    showToast('Ошибка оплаты через VK Pay', 2000);
                }
            } else {
                // Robokassa (без изменений)
                try {
                    const res = await window.apiRequest('/payment/create', {
                        method: 'POST',
                        body: JSON.stringify({
                            userId: userData.id,
                            amount: price,
                            description: `Пакет ${diamonds} алмазов`,
                            metadata: {
                                type: 'diamonds_pack',
                                packId: packId,
                                diamonds: diamonds,
                                bonus: isBonus
                            }
                        })
                    });
                    const data = await res.json();
                    if (data.confirmationUrl) {
                        submitRobokassaForm(data.confirmationUrl);
                    } else {
                        showToast('Ошибка создания платежа: ' + (data.error || 'неизвестная ошибка'), 2000);
                    }
                } catch (err) {
                    console.error('[gems] Ошибка запроса к /payment/create:', err);
                    showToast('Сетевая ошибка. Попробуйте позже.', 2000);
                }
            }
        });
    });

    if (typeof window.updateTradeBadges === 'function') {
        window.updateTradeBadges();
    }
}

function showSubscriptionModalNew(hasSubscription, freeCoinAvailable) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerHTML = `<i class="fas fa-crown" style="color: #c0c0c0;"></i> VIP Silver`;

    const isVK = window.isVKMiniApp === true;

    const freeCoinButton = freeCoinAvailable ? `
        <button class="subscription-free-btn-new" id="freeCoinBtnNew">
            <img src="/assets/icons/icon-new.png" style="width: 14px; height: 14px; margin-right: 4px;">
            20 <i class="fas fa-coins"></i>
        </button>` : '';

    let mainButtonHtml = '';
    if (hasSubscription) {
        const dailyAvailable = subscriptionStatus?.dailySubRewardAvailable;
        if (dailyAvailable) {
            mainButtonHtml = `
                <button class="subscription-buy-btn-new" id="dailyRewardBtn" style="position: relative;">
                    <img src="/assets/icons/icon-new.png" style="width: 14px; height: 14px; margin-right: 4px;">
                    Забрать ежедневную награду
                </button>`;
        } else {
            mainButtonHtml = `
                <button class="subscription-buy-btn-new" id="dailyRewardBtn" disabled style="opacity: 0.6; cursor: not-allowed;">
                    Награда уже получена
                </button>`;
        }
    } else {
        if (isVK) {
            mainButtonHtml = `
                <button class="subscription-buy-btn-new" id="buySubscriptionBtnNew">
                    Оформить за 86 голосов
                </button>`;
        } else {
            mainButtonHtml = `
                <button class="subscription-buy-btn-new" id="buySubscriptionBtnNew">
                    Оформить за 599 ₽/мес
                </button>`;
        }
    }

    modalBody.innerHTML = `
        <div class="subscription-modal-new">
            <div class="sub-feature-row">
                <div class="sub-icon"><i class="fas fa-ban" style="color: #00aaff;"></i></div>
                <div class="sub-desc">Пропуск рекламы</div>
            </div>
            <div class="sub-feature-row">
                <div class="sub-icon"><i class="fas fa-chart-line" style="color: #00aaff;"></i></div>
                <div class="sub-desc">Дополнительные награды в бою:<br> +10% опыта, +10% монет</div>
            </div>
            <div class="sub-feature-row">
                <div class="sub-icon"><i class="fas fa-shield-alt" style="color: #00aaff;"></i></div>
                <div class="sub-desc">Награда в случае поражения:<br> +5 опыта, +5 монет</div>
            </div>
            <div class="sub-feature-row">
                <div class="sub-icon"><i class="fas fa-gift" style="color: #00aaff;"></i></div>
                <div class="sub-desc">Ежедневная награда:<br> 250 монет, 10 угля</div>
            </div>
            <div class="sub-feature-row">
                <div class="sub-icon"><i class="fas fa-gem" style="color: #00aaff;"></i></div>
                <div class="sub-desc">Награда при оформлении:<br> 1500 монет, 50 угля, 100 алмазов</div>
            </div>
            <div class="subscription-buttons-new">
                ${freeCoinButton}
                ${mainButtonHtml}
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    // Бесплатная монета
    const freeBtn = document.getElementById('freeCoinBtnNew');
    if (freeBtn) {
        freeBtn.addEventListener('click', async () => {
            console.log('[gems] free coin button clicked');
            if (pendingFreeCoin) return;
            pendingFreeCoin = true;
            if (!freeCoinAvailable) {
                showToast('Бесплатная монета уже получена сегодня', 1500);
                pendingFreeCoin = false;
                return;
            }
            try {
                const res = await window.apiRequest('/subscription/claim-free-coin', {
                    method: 'POST',
                    body: JSON.stringify({})
                });
                const data = await res.json();
                if (data.success) {
                    showToast('+20 монет!', 1500);
                    await refreshData();
                    if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
                    modal.style.display = 'none';
                    const subContent = document.getElementById('tradeSubContent');
                    if (subContent) renderGems(subContent);
                } else {
                    showToast(data.error || 'Ошибка', 1500);
                }
            } catch (err) {
                console.error('[gems] FREE COIN: ошибка', err);
                showToast('Ошибка соединения', 1500);
            } finally {
                pendingFreeCoin = false;
            }
        });
    }

    // Ежедневная награда подписчика
    const dailyBtn = document.getElementById('dailyRewardBtn');
    if (dailyBtn && !dailyBtn.disabled) {
        dailyBtn.addEventListener('click', async () => {
            console.log('[gems] daily reward button clicked');
            dailyBtn.disabled = true;
            try {
                const res = await window.apiRequest('/subscription/claim-daily-reward', {
                    method: 'POST',
                    body: JSON.stringify({})
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`+${data.coins} монет, +${data.coal} угля!`, 2000);
                    subscriptionStatus.dailySubRewardAvailable = false;
                    await refreshData();
                    if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
                    modal.style.display = 'none';
                    const subContent = document.getElementById('tradeSubContent');
                    if (subContent) renderGems(subContent);
                } else {
                    showToast(data.error || 'Ошибка', 1500);
                    dailyBtn.disabled = false;
                }
            } catch (err) {
                console.error('[gems] daily reward error:', err);
                showToast('Ошибка соединения', 1500);
                dailyBtn.disabled = false;
            }
        });
    }

    // Покупка подписки
    const buySubBtn = document.getElementById('buySubscriptionBtnNew');
    if (buySubBtn) {
        buySubBtn.addEventListener('click', async () => {
            console.log('[gems] buy subscription clicked');
            if (isVK) {
                try {
                    const result = await vkBridge.send('VKWebAppShowOrderBox', {
                        type: 'item',
                        item: '7',
                        demo: true
                    });
                    if (result) {
                        showToast('Подписка активирована! (зачисление через несколько секунд)', 2000);
                        setTimeout(async () => {
                            await refreshData();
                            if (window.currentScreen === 'trade' && window.tradeSubtab === 'gems') {
                                renderGems(document.getElementById('tradeSubContent'));
                            }
                            if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
                        }, 3000);
                    } else {
                        showToast('Платеж отменён', 2000);
                    }
                } catch (err) {
                    console.error('[gems] VK subscription error:', err);
                    showToast('Ошибка оплаты подписки', 2000);
                }
            } else {
                try {
                    const res = await window.apiRequest('/payment/create', {
                        method: 'POST',
                        body: JSON.stringify({
                            userId: userData.id,
                            amount: 599,
                            description: 'Подписка VIP Silver на 30 дней',
                            metadata: { type: 'subscription' }
                        })
                    });
                    const data = await res.json();
                    if (data.confirmationUrl) {
                        submitRobokassaForm(data.confirmationUrl);
                    } else {
                        showToast('Ошибка создания платежа', 2000);
                    }
                } catch (err) {
                    console.error('[gems] subscription error:', err);
                    showToast('Сетевая ошибка', 2000);
                }
            }
        });
    }

    const closeBtn = modal.querySelector('.close');
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
}

window.renderGems = renderGems;
