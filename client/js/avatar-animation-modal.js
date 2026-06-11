// avatar-animation-modal.js – финальная версия с инлайновыми стилями

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

    const numericAvatarId = Number(avatarId);
    const isActive = numericAvatarId === userData.avatar_id;
    modalTitle.innerText = isActive ? 'Текущий аватар' : (owned ? 'Просмотр аватара' : 'Купить аватар');

    const isCybercat = (avatarFilename === 'cybercat-skin.png');
    // КЛЮЧ СТРОКОЙ – ВАЖНО!
    const effectiveSkinId = isCybercat ? 'cybercat' : String(numericAvatarId);
    const skinAnim = window.AnimationManager?.skinAnimations?.[effectiveSkinId] || {};

    const hasVictory = !!skinAnim.victory;
    const hasDefeat  = !!skinAnim.defeat;
    const hasAttack  = !!skinAnim.attack;
    const hasDodge   = !!skinAnim.dodge;

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

    let priceHtml = '';
    if (!owned && !isActive) {
        let parts = [];
        if (priceGold > 0) parts.push(`${priceGold} <i class="fas fa-coins"></i>`);
        if (priceDiamonds > 0) parts.push(`${priceDiamonds} <i class="fas fa-gem"></i>`);
        priceHtml = parts.length ? `<div class="avatar-price">${parts.join(' + ')}</div>` : '<div class="avatar-price">Бесплатно</div>';
    }

    // ИНЛАЙНОВЫЕ СТИЛИ (самый надёжный способ)
    const inlineStyles = `
        <style>
            .avatar-modal-layout {
                display: flex !important;
                align-items: stretch !important;
                gap: 0 !important;
            }
            .avatar-modal-left, .avatar-modal-right {
                width: 80px !important;
                flex-shrink: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                gap: 0 !important;
            }
            .avatar-modal-center {
                flex: 1 !important;
                text-align: center !important;
            }
            .avatar-anim-btn {
                background-color: #232833 !important;
                border: none !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 4px !important;
                cursor: pointer !important;
                width: 100% !important;
                min-height: 70px !important;
                color: #aaa !important;
                font-size: 11px !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            .avatar-anim-btn i {
                font-size: 20px !important;
                color: #aaa !important;
            }
            .avatar-anim-btn span {
                font-size: 10px !important;
                color: #aaa !important;
            }
            .avatar-anim-btn:not(.inactive):hover {
                background-color: #2f3542 !important;
            }
            .avatar-anim-btn:not(.inactive):hover i,
            .avatar-anim-btn:not(.inactive):hover span {
                color: #00aaff !important;
            }
            .avatar-anim-btn.inactive {
                background-color: transparent !important;
                border: 1px solid #3a4050 !important;
                opacity: 0.5 !important;
                cursor: default !important;
            }
            .avatar-anim-btn.inactive i,
            .avatar-anim-btn.inactive span {
                display: none !important;
            }
            .avatar-price {
                font-size: 14px !important;
                color: #f1c40f !important;
                background: rgba(0,0,0,0.6) !important;
                padding: 4px 12px !important;
                border-radius: 20px !important;
                display: inline-block !important;
                margin: 8px 0 !important;
            }
            .avatar-modal-actions {
                display: flex !important;
                gap: 12px !important;
                justify-content: center !important;
                margin-top: 8px !important;
            }
            .avatar-modal-actions .btn {
                background-color: #2f3542 !important;
                color: #aaa !important;
                border: none !important;
                padding: 8px 16px !important;
                border-radius: 30px !important;
                font-size: 14px !important;
                cursor: pointer !important;
            }
            .avatar-modal-actions .btn:hover {
                background-color: #3a4050 !important;
                color: #00aaff !important;
            }
            .avatar-name {
                margin-top: 12px !important;
                font-size: 18px !important;
                font-weight: bold !important;
                color: white !important;
            }
        </style>
    `;

    const html = inlineStyles + `
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
        }, 100);
    }

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

    document.querySelectorAll('.avatar-anim-btn:not(.inactive)').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            const animType = btn.dataset.anim;
            if (animType) playAnimationInModal(animType);
        });
    });

    const buyBtn = document.getElementById('buyAvatarBtn');
    if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
            const res = await window.apiRequest('/avatars/buy', { method: 'POST', body: JSON.stringify({ avatar_id: numericAvatarId }) });
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

    const activateBtn = document.getElementById('activateAvatarBtn');
    if (activateBtn) {
        activateBtn.addEventListener('click', async () => {
            const res = await window.apiRequest('/player/avatar', { method: 'POST', body: JSON.stringify({ avatar_id: numericAvatarId }) });
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

    const closeBtn = document.getElementById('closeAvatarModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    const closeX = modal.querySelector('.close');
    if (closeX) closeX.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
};
