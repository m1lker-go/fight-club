// avatar-animation-modal.js – финальная версия с правильными стилями как на главной

// Обеспечиваем escapeHtml
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

    // Приводим avatarId к числу
    const numericAvatarId = Number(avatarId);
    const isActive = numericAvatarId === userData.avatar_id;
    modalTitle.innerText = isActive ? 'Текущий аватар' : (owned ? 'Просмотр аватара' : 'Купить аватар');

    // Определяем наличие анимаций через AnimationManager
    const isCybercat = (avatarFilename === 'cybercat-skin.png');
    const effectiveSkinId = isCybercat ? 'cybercat' : numericAvatarId;
    const skinAnim = window.AnimationManager?.skinAnimations?.[effectiveSkinId] || {};

    const hasVictory = !!skinAnim.victory;
    const hasDefeat  = !!skinAnim.defeat;
    const hasAttack  = !!skinAnim.attack;
    const hasDodge   = !!skinAnim.dodge;

    // 4 кнопки слева и справа (всегда 8 штук)
    const leftButtons = [
        { type: 'victory', label: 'Победа', icon: 'fas fa-trophy', available: hasVictory },
        { type: 'attack',  label: 'Атака',  icon: 'fas fa-fist-raised', available: hasAttack },
        { type: null,      label: '',       icon: '', available: false },
        { type: null,      label: '',       icon: '', available: false }
    ];
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
        if (parts.length) priceHtml = `<div class="avatar-price">${parts.join(' + ')}</div>`;
        else priceHtml = `<div class="avatar-price">Бесплатно</div>`;
    }

    // Динамически добавляем стили, если их ещё нет (один раз)
    if (!document.getElementById('avatar-modal-main-styles')) {
        const style = document.createElement('style');
        style.id = 'avatar-modal-main-styles';
        style.textContent = `
            /* Контейнер модального окна */
            .avatar-modal-layout {
                display: flex;
                align-items: stretch;
                gap: 0;
                min-height: 320px;
            }
            /* Левая и правая колонки – фиксированная ширина, как у .main-buttons-col */
            .avatar-modal-left,
            .avatar-modal-right {
                width: 80px;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                gap: 0;
            }
            /* Центр */
            .avatar-modal-center {
                flex: 1;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            /* Контейнер аватара */
            .avatar-preview-container {
                position: relative;
                width: 100%;
                max-width: 200px;
                margin: 0 auto;
            }
            .avatar-preview-img {
                width: 100%;
                height: auto;
                display: block;
            }
            /* Кнопки анимаций – точная копия .main-icon-btn */
            .avatar-anim-btn {
                background-color: #232833;
                border: none;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 4px;
                cursor: pointer;
                transition: background-color 0.2s;
                color: #aaa;
                font-size: 11px;
                font-weight: normal;
                padding: 0;
                border-radius: 0;
                width: 100%;
                height: 80px;
                min-width: 0;
                box-sizing: border-box;
            }
            .avatar-anim-btn i {
                font-size: 20px;
                color: #aaa;
            }
            .avatar-anim-btn span {
                font-size: 10px;
                color: #aaa;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 90%;
            }
            .avatar-anim-btn:not(.inactive):hover {
                background-color: #2f3542;
            }
            .avatar-anim-btn:not(.inactive):hover i {
                color: #00aaff;
            }
            .avatar-anim-btn:not(.inactive):hover span {
                color: white;
            }
            /* Неактивная кнопка (без анимации) – пустая, но занимает место */
            .avatar-anim-btn.inactive {
                opacity: 0.3;
                cursor: default;
                background-color: transparent;
                border: 1px solid #3a4050;
            }
            .avatar-anim-btn.inactive i,
            .avatar-anim-btn.inactive span {
                display: none;
            }
            /* Название аватара */
            .avatar-name {
                font-size: 18px;
                font-weight: bold;
                color: white;
                margin-top: 12px;
            }
            .avatar-price {
                font-size: 14px;
                color: #f1c40f;
                background: rgba(0,0,0,0.6);
                padding: 4px 12px;
                border-radius: 20px;
                display: inline-block;
                margin: 8px 0;
            }
            .avatar-modal-actions {
                display: flex;
                gap: 12px;
                justify-content: center;
                margin-top: 12px;
            }
            .avatar-modal-actions .btn {
                background-color: #2f3542;
                color: #aaa;
                border: none;
                padding: 8px 16px;
                border-radius: 30px;
                font-size: 14px;
                cursor: pointer;
            }
            .avatar-modal-actions .btn:hover {
                background-color: #3a4050;
                color: #00aaff;
            }
        `;
        document.head.appendChild(style);
    }

    // Генерируем HTML
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

    // Функция воспроизведения анимации
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

    // Обработчики для активных кнопок
    document.querySelectorAll('.avatar-anim-btn:not(.inactive)').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            const animType = btn.dataset.anim;
            if (animType) playAnimationInModal(animType);
        });
    });

    // Покупка
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

    // Активация
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

    // Закрытие
    const closeBtn = document.getElementById('closeAvatarModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    const closeX = modal.querySelector('.close');
    if (closeX) closeX.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
};
