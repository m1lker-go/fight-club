// gems.js – Алмазная лавка с полной локализацией

let subscriptionStatus = null;
let pendingFreeCoin = false;

console.log('[gems.js] loaded');

// Функция показа модального окна с офертой (встроенная версия)
async function showLegalModal() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.innerText = window.$t('gems:Реквизиты и оферта', 'Реквизиты и оферта');

    modalBody.innerHTML = `
        <div style="max-height: 60vh; overflow-y: auto; padding: 5px;">
            <h2 style="color: #00aaff; margin-top: 0;">${window.$t('gems:Продавец', 'Продавец')}</h2>
            <p><strong>${window.$t('gems:Самозанятый: Лисовский Руслан Олегович', 'Самозанятый: Лисовский Руслан Олегович')}</strong></p>
            <p><strong>${window.$t('gems:ИНН: 021904557375', 'ИНН: 021904557375')}</strong></p>
            <p><strong>${window.$t('gems:Почта для связи: m1lker994@gmail.com', 'Почта для связи: m1lker994@gmail.com')}</strong></p>

            <h2 style="color: #00aaff;">${window.$t('gems:Договор-оферта', 'Договор-оферта')}</h2>
            <p>${window.$t('gems:Все покупки регулируются условиями публичной оферты.', 'Все покупки регулируются условиями публичной оферты.')}</p>

            <div style="display: flex; gap: 16px; justify-content: center; margin-top: 30px; flex-wrap: wrap;">
                <button id="legalDownloadBtn" class="legal-modal-btn" style="background-color: #2f3542; border: 2px solid #00aaff; border-radius: 40px; padding: 12px 24px; font-size: 16px; font-weight: bold; color: white; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fas fa-download"></i> ${window.$t('gems:Скачать PDF', 'Скачать PDF')}
                </button>
                <button id="legalShopBtn" class="legal-modal-btn" style="background-color: #2f3542; border: 2px solid #00aaff; border-radius: 40px; padding: 12px 24px; font-size: 16px; font-weight: bold; color: white; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fas fa-store"></i> ${window.$t('gems:Магазин в игре', 'Магазин в игре')}
                </button>
            </div>

            <div style="margin-top: 24px; font-size: 12px; color: #aaa; text-align: center;">
                <i class="fas fa-gavel"></i> ${window.$t('gems:Возврат средств возможен только в соответствии с условиями оферты.', 'Возврат средств возможен только в соответствии с условиями оферты.')}
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    const downloadBtn = document.getElementById('legalDownloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = '/legal/terms.pdf';
            link.download = 'terms.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    const shopBtn = document.getElementById('legalShopBtn');
    if (shopBtn) {
        shopBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            if (typeof showScreen === 'function') {
                showScreen('trade');
                if (typeof tradeSubtab !== 'undefined') {
                    tradeSubtab = 'gems';
                    if (typeof renderTrade === 'function') renderTrade();
                }
            }
        });
    }

    const closeBtn = modal.querySelector('.close');
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };
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

    const packsRub = [
        { id: 1, diamonds: 50, price: 99, image: 'buy_diamond_1.png', bonus: true },
        { id: 2, diamonds: 150, price: 399, image: 'buy_diamond_2.png', bonus: true },
        { id: 3, diamonds: 350, price: 899, image: 'buy_diamond_3.png', bonus: true },
        { id: 4, diamonds: 700, price: 1599, image: 'buy_diamond_4.png', bonus: true },
        { id: 5, diamonds: 1150, price: 2499, image: 'buy_diamond_5.png', bonus: true },
        { id: 6, diamonds: 1800, price: 3999, image: 'buy_diamond_6.png', bonus: true }
    ];

    const packsVK = [
        { id: 1, diamonds: 50, price: 15, image: 'buy_diamond_1.png', bonus: true },
        { id: 2, diamonds: 150, price: 57, image: 'buy_diamond_2.png', bonus: true },
        { id: 3, diamonds: 350, price: 129, image: 'buy_diamond_3.png', bonus: true },
        { id: 4, diamonds: 700, price: 229, image: 'buy_diamond_4.png', bonus: true },
        { id: 5, diamonds: 1150, price: 357, image: 'buy_diamond_5.png', bonus: true },
        { id: 6, diamonds: 1800, price: 572, image: 'buy_diamond_6.png', bonus: true }
    ];

    const packs = isVK ? packsVK : packsRub;
    const currencySymbol = isVK ? 'голосов' : '₽'; // не переводим, это символ

    let html = `
        <div class="gems-page">
            <div class="subscription-card-new">
                <div class="subscription-left-new">
                    <i class="fas fa-crown" style="color: #c0c0c0; font-size: 24px;"></i>
                    <div class="subscription-text">
                        <div class="subscription-label">${window.$t('gems:Подписка', 'Подписка')}</div>
                        <div class="subscription-name">${window.$t('gems:VIP Silver', 'VIP Silver')}</div>
                    </div>
                </div>
                <button class="subscription-view-btn-new" id="viewSubscriptionBtn">
                    ${freeCoinAvailable ? '<img src="/assets/icons/icon-new.png" style="width: 14px; height: 14px; margin-right: 4px;">' : ''}
                    <i class="fas fa-eye"></i> ${window.$t('gems:Подробнее', 'Подробнее')}
                </button>
            </div>

            <div class="packs-grid-new">
    `;

    packs.forEach(pack => {
        const isBonusActive = pack.bonus && !bonusBought[pack.id];
        html += `
            <div class="pack-card-new" data-pack-id="${pack.id}" data-diamonds="${pack.diamonds}" data-price="${pack.price}">
                ${isBonusActive ? `<div class="bonus-badge-new">${window.$t('gems:+50% на 1ую покупку', '+50% на 1ую покупку')}</div>` : ''}
                <div class="pack-image-new"><img src="/assets/diamond/${pack.image}" alt="${pack.diamonds} ${window.$t('gems:алмазов', 'алмазов')}"></div>
                <div class="pack-diamonds-new">${pack.diamonds} ${window.$t('gems:алмазов', 'алмазов')}</div>
                <button class="pack-buy-btn">${pack.price} ${currencySymbol}</button>
            </div>
        `;
    });

    html += `
            </div>
            <div class="shop-note-new">
                <i class="fas fa-info-circle"></i> ${window.$t('gems:Бонус +50% алмазов начисляется только <strong>один раз за каждый пакет</strong> при первой покупке на аккаунт.', 'Бонус +50% алмазов начисляется только <strong>один раз за каждый пакет</strong> при первой покупке на аккаунт.')}
            </div>
            <div class="shop-note-new">
                <i class="fas fa-file-contract"></i> <button id="showLegalBtn" class="legal-btn" style="background: none; border: none; color: #aaa; text-decoration: underline; cursor: pointer;">${window.$t('gems:Реквизиты и оферта', 'Реквизиты и оферта')}</button>
            </div>
        </div>
    `;
    container.innerHTML = html;

    const legalBtn = document.getElementById('showLegalBtn');
    if (legalBtn) legalBtn.addEventListener('click', showLegalModal);

    document.getElementById('viewSubscriptionBtn')?.addEventListener('click', () => {
        console.log('[gems] viewSubscriptionBtn clicked');
        showSubscriptionModalNew(hasSubscription, freeCoinAvailable);
    });

    document.querySelectorAll('.pack-card-new').forEach(card => {
        const buyBtn = card.querySelector('.pack-buy-btn');
        if (!buyBtn) return;
        buyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const diamonds = parseInt(card.dataset.diamonds);
            const price = parseInt(card.dataset.price);
            const packId = parseInt(card.dataset.packId);
            const isBonus = !!card.querySelector('.bonus-badge-new');

            console.log(`[gems] Покупка пакета: ${diamonds} алмазов за ${price} ${isVK ? 'голосов' : '₽'}`);

            if (isVK) {
                if (typeof vkBridge === 'undefined') {
                    showToast(window.$t('gems:VK Bridge не инициализирован', 'VK Bridge не инициализирован'), 2000);
                    return;
                }
                try {
                    const result = await vkBridge.send('VKWebAppShowOrderBox', {
                        type: 'item',
                        item: String(packId),
                        demo: true
                    });
                    if (result) {
                        showToast(window.$t('gems:Покупка успешно завершена! Товар будет зачислен через несколько секунд.', 'Покупка успешно завершена! Товар будет зачислен через несколько секунд.'), 2000);
                        setTimeout(async () => {
                            await refreshData();
                            if (window.currentScreen === 'trade' && window.tradeSubtab === 'gems') {
                                renderGems(container);
                            }
                            if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
                        }, 3000);
                    } else {
                        showToast(window.$t('gems:Платеж отменён', 'Платеж отменён'), 2000);
                    }
                } catch (err) {
                    console.error('[gems] VKWebAppShowOrderBox error:', err);
                    showToast(window.$t('gems:Ошибка оплаты через VK Pay. Попробуйте позже.', 'Ошибка оплаты через VK Pay. Попробуйте позже.'), 2000);
                }
            } else {
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
                        showToast(window.$t('gems:Ошибка создания платежа: ', 'Ошибка создания платежа: ') + (data.error || window.$t('common:неизвестная', 'неизвестная')), 2000);
                    }
                } catch (err) {
                    console.error('[gems] Ошибка запроса к /payment/create:', err);
                    showToast(window.$t('gems:Сетевая ошибка. Попробуйте позже.', 'Сетевая ошибка. Попробуйте позже.'), 2000);
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
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.innerHTML = `<i class="fas fa-crown" style="color: #c0c0c0;"></i> ${window.$t('gems:VIP Silver', 'VIP Silver')}`;

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
                    ${window.$t('gems:Забрать ежедневную награду', 'Забрать ежедневную награду')}
                </button>`;
        } else {
            mainButtonHtml = `
                <button class="subscription-buy-btn-new" id="dailyRewardBtn" disabled style="opacity: 0.6; cursor: not-allowed;">
                    ${window.$t('gems:Награда уже получена', 'Награда уже получена')}
                </button>`;
        }
    } else {
        if (isVK) {
            mainButtonHtml = `
                <button class="subscription-buy-btn-new" id="buySubscriptionBtnNew">
                    ${window.$t('gems:Оформить за {price} {currency}', 'Оформить за {price} {currency}', { price: 86, currency: 'голосов' })}
                </button>`;
        } else {
            mainButtonHtml = `
                <button class="subscription-buy-btn-new" id="buySubscriptionBtnNew">
                    ${window.$t('gems:Оформить за {price} {currency}', 'Оформить за {price} {currency}', { price: 599, currency: '₽/мес' })}
                </button>`;
        }
    }

    modalBody.innerHTML = `
        <div class="subscription-modal-new">
            <div class="sub-feature-row">
                <div class="sub-icon"><i class="fas fa-ban" style="color: #00aaff;"></i></div>
                <div class="sub-desc">${window.$t('gems:Пропуск рекламы', 'Пропуск рекламы')}</div>
            </div>
            <div class="sub-feature-row">
                <div class="sub-icon"><i class="fas fa-chart-line" style="color: #00aaff;"></i></div>
                <div class="sub-desc">${window.$t('gems:Дополнительные награды в бою:<br> +10% опыта, +10% монет', 'Дополнительные награды в бою:<br> +10% опыта, +10% монет')}</div>
            </div>
            <div class="sub-feature-row">
                <div class="sub-icon"><i class="fas fa-shield-alt" style="color: #00aaff;"></i></div>
                <div class="sub-desc">${window.$t('gems:Награда в случае поражения:<br> +5 опыта, +5 монет', 'Награда в случае поражения:<br> +5 опыта, +5 монет')}</div>
            </div>
            <div class="sub-feature-row">
                <div class="sub-icon"><i class="fas fa-gift" style="color: #00aaff;"></i></div>
                <div class="sub-desc">${window.$t('gems:Ежедневная награда:<br> 250 монет, 10 угля', 'Ежедневная награда:<br> 250 монет, 10 угля')}</div>
            </div>
            <div class="sub-feature-row">
                <div class="sub-icon"><i class="fas fa-gem" style="color: #00aaff;"></i></div>
                <div class="sub-desc">${window.$t('gems:Награда при оформлении:<br> 1500 монет, 50 угля, 100 алмазов', 'Награда при оформлении:<br> 1500 монет, 50 угля, 100 алмазов')}</div>
            </div>
            <div class="subscription-buttons-new">
                ${freeCoinButton}
                ${mainButtonHtml}
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    const freeBtn = document.getElementById('freeCoinBtnNew');
    if (freeBtn) {
        freeBtn.addEventListener('click', async () => {
            console.log('[gems] free coin button clicked');
            if (pendingFreeCoin) return;
            pendingFreeCoin = true;
            if (!freeCoinAvailable) {
                showToast(window.$t('gems:Бесплатная монета уже получена сегодня', 'Бесплатная монета уже получена сегодня'), 1500);
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
                    showToast(window.$t('gems:+20 монет!', '+20 монет!'), 1500);
                    await refreshData();
                    if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
                    modal.style.display = 'none';
                    const subContent = document.getElementById('tradeSubContent');
                    if (subContent) renderGems(subContent);
                } else {
                    showToast(data.error || window.$t('common:Ошибка', 'Ошибка'), 1500);
                }
            } catch (err) {
                console.error('[gems] FREE COIN: ошибка', err);
                showToast(window.$t('common:Ошибка соединения', 'Ошибка соединения'), 1500);
            } finally {
                pendingFreeCoin = false;
            }
        });
    }

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
                    showToast(window.$t('gems:+{coins} монет, +{coal} угля!', '+{coins} монет, +{coal} угля!', { coins: data.coins, coal: data.coal }), 2000);
                    subscriptionStatus.dailySubRewardAvailable = false;
                    await refreshData();
                    if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
                    modal.style.display = 'none';
                    const subContent = document.getElementById('tradeSubContent');
                    if (subContent) renderGems(subContent);
                } else {
                    showToast(data.error || window.$t('common:Ошибка', 'Ошибка'), 1500);
                    dailyBtn.disabled = false;
                }
            } catch (err) {
                console.error('[gems] daily reward error:', err);
                showToast(window.$t('common:Ошибка соединения', 'Ошибка соединения'), 1500);
                dailyBtn.disabled = false;
            }
        });
    }

    const buySubBtn = document.getElementById('buySubscriptionBtnNew');
    if (buySubBtn) {
        buySubBtn.addEventListener('click', async () => {
            console.log('[gems] buy subscription clicked');
            if (isVK) {
                if (typeof vkBridge === 'undefined') {
                    showToast(window.$t('gems:VK Bridge не инициализирован', 'VK Bridge не инициализирован'), 2000);
                    return;
                }
                try {
                    const result = await vkBridge.send('VKWebAppShowOrderBox', {
                        type: 'item',
                        item: '7',
                        demo: true
                    });
                    if (result) {
                        showToast(window.$t('gems:Подписка активирована! (зачисление через несколько секунд)', 'Подписка активирована! (зачисление через несколько секунд)'), 2000);
                        setTimeout(async () => {
                            await refreshData();
                            if (window.currentScreen === 'trade' && window.tradeSubtab === 'gems') {
                                renderGems(document.getElementById('tradeSubContent'));
                            }
                            if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
                        }, 3000);
                    } else {
                        showToast(window.$t('gems:Платеж отменён', 'Платеж отменён'), 2000);
                    }
                } catch (err) {
                    console.error('[gems] VK subscription error:', err);
                    showToast(window.$t('gems:Ошибка оплаты подписки', 'Ошибка оплаты подписки'), 2000);
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
                        showToast(window.$t('gems:Ошибка создания платежа', 'Ошибка создания платежа'), 2000);
                    }
                } catch (err) {
                    console.error('[gems] subscription error:', err);
                    showToast(window.$t('gems:Сетевая ошибка', 'Сетевая ошибка'), 2000);
                }
            }
        });
    }

    const closeBtn = modal.querySelector('.close');
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
}

window.renderGems = renderGems;
