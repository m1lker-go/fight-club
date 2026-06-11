// avatar-animation-modal.js – модальное окно аватара (стиль как на главной странице)

// Обеспечиваем наличие escapeHtml
if (typeof escapeHtml === 'undefined') {
    window.escapeHtml = function(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    };
    var escapeHtml = window.escapeHtml;
}

window.showAvatarAnimationModal = function(avatarId, avatarFilename, owned, avatarName, priceGold, priceDiamonds) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalTitle || !modalBody) return;

    // Приводим avatarId к числу (важно для поиска в skinAnimations)
    const numericAvatarId = Number(avatarId);
    const isActive = numericAvatarId === userData.avatar_id;
    modalTitle.innerText = isActive ? 'Текущий аватар' : (owned ? 'Просмотр аватара' : 'Купить аватар');

    // Определяем наличие анимаций
    const isCybercat = (avatarFilename === 'cybercat-skin.png');
    const effectiveSkinId = isCybercat ? 'cybercat' : numericAvatarId;
    const skinAnim = window.AnimationManager?.skinAnimations?.[effectiveSkinId] || {};

    // Проверяем наличие каждой анимации
    const hasVictory = !!skinAnim.victory;
    const hasDefeat  = !!skinAnim.defeat;
    const hasAttack  = !!skinAnim.attack;
    const hasDodge   = !!skinAnim.dodge;

    // 4 кнопки слева: Победа, Атака, (две пустые)
    const leftButtons = [
        { type: 'victory', label: 'Победа', icon: 'fas fa-trophy', available: hasVictory },
        { type: 'attack',  label: 'Атака',  icon: 'fas fa-fist-raised', available: hasAttack },
        { type: null,      label: '',       icon: '', available: false },
        { type: null,      label: '',       icon: '', available: false }
    ];
    // 4 кнопки справа: Поражение, Уворот, (две пустые)
    const rightButtons = [
        { type: 'defeat', label: 'Поражение', icon: 'fas fa-skull', available: hasDefeat },
        { type: 'dodge',  label: 'Уворот',    icon: 'fas fa-running', available: hasDodge },
        { type: null,     label: '',          icon: '', available: false },
        { type: null,     label: '',          icon: '', available: false }
    ];

    // Формируем цену
    let priceHtml = '';
    if (!owned && !isActive) {
        let parts = [];
        if (priceGold > 0) parts.push(`${priceGold} <i class="fas fa-coins"></i>`);
        if (priceDiamonds > 0) parts.push(`${priceDiamonds} <i class="fas fa-gem"></i>`);
        if (parts.length) {
            priceHtml = `<div class="avatar-price">${parts.join(' + ')}</div>`;
        } else {
            priceHtml = `<div class="avatar-price">Бесплатно</div>`;
        }
    }

    const html = `
        <div class="avatar-modal-layout">
            <div class="avatar-modal-left">
                ${leftButtons.map(btn => `
                    <button class="avatar-anim-btn ${btn.available ? '' : 'inactive'}" data-anim="${btn.type || ''}" ${!btn.available ? 'disabled' : ''}>
                        ${btn.available ? `<i class="${btn.icon}"></i><span>${btn.label}</span>` : ''}
                    </button>
                `).join('')}
            </div>
            <div class="avatar-modal-center">
                <div class="avatar-preview-container">
                    <img src="/assets/${escapeHtml(avatarFilename)}" alt="avatar" class="avatar-preview-img">
                    <div id="avatarAnimationOverlay" class="avatar-animation-overlay"></div>
                </div>
                <div class="avatar-name">${escapeHtml(avatarName)}</div>
                ${priceHtml}
                <div class="avatar-modal-actions">
                    ${!owned && !isActive ? '<button class="btn" id="buyAvatarBtn">Купить</button>' : ''}
                    ${owned && !isActive ? '<button class="btn" id="activateAvatarBtn">Активировать</button>' : ''}
                    <button class="btn" id="closeAvatarModalBtn">Закрыть</button>
                </div>
            </div>
            <div class="avatar-modal-right">
                ${rightButtons.map(btn => `
                    <button class="avatar-anim-btn ${btn.available ? '' : 'inactive'}" data-anim="${btn.type || ''}" ${!btn.available ? 'disabled' : ''}>
                        ${btn.available ? `<i class="${btn.icon}"></i><span>${btn.label}</span>` : ''}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
    modal.style.display = 'flex';

    // Подстройка высоты кнопок под 1/4 высоты аватара
    const avatarContainer = document.querySelector('.avatar-preview-container');
    const buttons = document.querySelectorAll('.avatar-anim-btn');
    if (avatarContainer && buttons.length) {
        setTimeout(() => {
            const avatarHeight = avatarContainer.offsetHeight;
            if (avatarHeight > 0) {
                const btnHeight = Math.floor(avatarHeight / 4);
                buttons.forEach(btn => {
                    btn.style.height = btnHeight + 'px';
                    btn.style.minHeight = btnHeight + 'px';
                });
            }
        }, 50);
    }

    // Воспроизведение анимации в модалке
    function playAnimationInModal(animType) {
        const overlay = document.getElementById('avatarAnimationOverlay');
        if (!overlay) return;
        overlay.innerHTML = '';
        overlay.style.display = 'block';
        const animUrl = skinAnim[animType];
        if (!animUrl) {
            overlay.style.display = 'none';
            return;
        }
        const img = document.createElement('img');
        img.src = animUrl;
        img.className = 'modal-skin-animation';
        img.style.position = 'absolute';
        img.style.top = '0';
        img.style.left = '0';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.pointerEvents = 'none';
        overlay.appendChild(img);
        const duration = (animType === 'victory' || animType === 'defeat') ? 2500 : 2000;
        setTimeout(() => {
            overlay.innerHTML = '';
            overlay.style.display = 'none';
        }, duration);
    }

    // Обработчики для активных кнопок анимаций
    document.querySelectorAll('.avatar-anim-btn:not(.inactive)').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            const animType = btn.dataset.anim;
            if (animType) playAnimationInModal(animType);
        });
    });

    // Покупка аватара
    const buyBtn = document.getElementById('buyAvatarBtn');
    if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
            const res = await window.apiRequest('/avatars/buy', {
                method: 'POST',
                body: JSON.stringify({ avatar_id: numericAvatarId })
            });
            const data = await res.json();
            if (data.success) {
                await refreshData();
                modal.style.display = 'none';
                renderProfileTab('skins');
            } else {
                showToast('Ошибка: ' + data.error, 1500);
            }
        });
    }

    // Активация аватара (если уже куплен)
    const activateBtn = document.getElementById('activateAvatarBtn');
    if (activateBtn) {
        activateBtn.addEventListener('click', async () => {
            const res = await window.apiRequest('/player/avatar', {
                method: 'POST',
                body: JSON.stringify({ avatar_id: numericAvatarId })
            });
            const data = await res.json();
            if (data.success) {
                userData.avatar_id = numericAvatarId;
                userData.avatar = avatarFilename;
                modal.style.display = 'none';
                renderProfileTab('skins');
                if (currentScreen === 'main') renderMain();
                if (currentScreen === 'equip') renderEquip();
            } else {
                showToast('Ошибка при смене аватара', 1500);
            }
        });
    }

    // Кнопка закрытия
    const closeBtn = document.getElementById('closeAvatarModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');

    // Крестик в углу модального окна
    const closeX = modal.querySelector('.close');
    if (closeX) closeX.onclick = () => modal.style.display = 'none';

    // Закрытие по клику вне окна
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
};
