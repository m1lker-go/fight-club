// avatar-animation-modal.js – ФИНАЛ (4+4, правильные названия)

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

    // Проверка анимаций через AnimationManager
    const isCybercat = (avatarFilename === 'cybercat-skin.png');
    const effectiveSkinId = isCybercat ? 'cybercat' : numericAvatarId;
    const skinAnim = window.AnimationManager?.skinAnimations?.[effectiveSkinId] || {};

    const hasAttack   = !!skinAnim.attack;
    const hasDodge    = !!skinAnim.dodge;
    const hasBlock    = !!skinAnim.block;
    const hasVictory  = !!skinAnim.victory;
    const hasDefeat   = !!skinAnim.defeat;
    const hasCrit     = !!skinAnim.crit;
    const hasUltimate = !!skinAnim.ultimate;

    // Левая колонка: Аватар, Атака, Уворот, Защита
    const leftButtons = [
        { type: 'avatar', label: 'Аватар', icon: 'fas fa-user-circle', available: true, alwaysEnabled: true }, // всегда активна для сброса
        { type: 'attack', label: 'Атака',  icon: 'fas fa-fist-raised', available: hasAttack },
        { type: 'dodge',  label: 'Уворот', icon: 'fas fa-running', available: hasDodge },
        { type: 'block',  label: 'Защита', icon: 'fas fa-shield-alt', available: hasBlock }
    ];

    // Правая колонка: Победа, Поражение, Крит, Ультимейт
    const rightButtons = [
        { type: 'victory',  label: 'Победа',     icon: 'fas fa-trophy', available: hasVictory },
        { type: 'defeat',   label: 'Поражение',  icon: 'fas fa-skull', available: hasDefeat },
        { type: 'crit',     label: 'Крит',       icon: 'fas fa-bolt', available: hasCrit },
        { type: 'ultimate', label: 'Ультимейт',  icon: 'fas fa-meteor', available: hasUltimate }
    ];

    let priceHtml = '';
    if (!owned && !isActive) {
        let parts = [];
        if (priceGold > 0) parts.push(`${priceGold} <i class="fas fa-coins"></i>`);
        if (priceDiamonds > 0) parts.push(`${priceDiamonds} <i class="fas fa-gem"></i>`);
        priceHtml = parts.length ? `<div style="font-size:14px; color:#f1c40f; background:rgba(0,0,0,0.6); padding:4px 12px; border-radius:20px; display:inline-block; margin:8px 0;">${parts.join(' + ')}</div>` : '<div style="font-size:14px; color:#f1c40f; background:rgba(0,0,0,0.6); padding:4px 12px; border-radius:20px; display:inline-block; margin:8px 0;">Бесплатно</div>';
    }

    // Функция генерации кнопки с учётом скруглений
    function renderButton(btn, idx, total, side) {
        const isFirst = idx === 0;
        const isLast = idx === total - 1;
        let borderRadius = '';
        if (side === 'left') {
            if (isFirst) borderRadius = 'border-radius: 12px 0 0 0;';
            else if (isLast) borderRadius = 'border-radius: 0 0 0 12px;';
        } else {
            if (isFirst) borderRadius = 'border-radius: 0 12px 0 0;';
            else if (isLast) borderRadius = 'border-radius: 0 0 12px 0;';
        }
        const isActiveButton = btn.alwaysEnabled || btn.available;
        const disabledAttr = !isActiveButton ? 'disabled' : '';
        const inactiveClass = (!isActiveButton && !btn.alwaysEnabled) ? 'inactive' : '';
        // Для кнопки "Аватар" иконка и текст всегда показываются
        const content = `<i class="${btn.icon}" style="font-size:20px; color:#aaa;"></i><span style="font-size:10px; color:#aaa;">${btn.label}</span>`;
        return `<button class="avatar-anim-btn ${inactiveClass}" data-anim="${btn.type}" ${disabledAttr} style="background-color: #232833; border: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: ${isActiveButton ? 'pointer' : 'default'}; width: 100%; min-height: 70px; color: #aaa; font-size: 11px; padding: 0; margin: 0; ${borderRadius}">${content}</button>`;
    }

    const leftHtml = leftButtons.map((btn, idx) => renderButton(btn, idx, leftButtons.length, 'left')).join('');
    const rightHtml = rightButtons.map((btn, idx) => renderButton(btn, idx, rightButtons.length, 'right')).join('');

    const html = `
        <style>
            .avatar-modal-layout {
                display: flex !important;
                align-items: center !important;
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
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
            }
            .avatar-preview-container {
                position: relative !important;
                width: 100% !important;
                max-width: 200px !important;
                margin: 0 auto !important;
            }
            .avatar-preview-img {
                width: 100% !important;
                height: auto !important;
                display: block !important;
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
                opacity: 0.6 !important;
                cursor: default !important;
            }
            .avatar-name {
                margin-top: 12px !important;
                font-size: 18px !important;
                font-weight: bold !important;
                color: white !important;
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
        </style>
        <div class="avatar-modal-layout">
            <div class="avatar-modal-left">
                ${leftHtml}
            </div>
            <div class="avatar-modal-center">
                <div class="avatar-preview-container">
                    <img src="/assets/${escapeHtml(avatarFilename)}" alt="avatar" class="avatar-preview-img">
                    <div id="avatarAnimationOverlay" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; display:none; z-index:10;"></div>
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
                ${rightHtml}
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
    modal.style.display = 'flex';

    // Подстройка высоты кнопок под 1/4 высоты аватара
    const avatarContainer = document.querySelector('.avatar-preview-container');
    const btns = document.querySelectorAll('.avatar-anim-btn');
    if (avatarContainer && btns.length) {
        setTimeout(() => {
            const avatarHeight = avatarContainer.offsetHeight;
            if (avatarHeight > 0) {
                const btnHeight = Math.floor(avatarHeight / 4);
                btns.forEach(btn => {
                    btn.style.height = btnHeight + 'px';
                    btn.style.minHeight = btnHeight + 'px';
                });
            }
        }, 100);
    }

    // Воспроизведение анимации
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

    // Обработчики для кнопок (кроме кнопки "Аватар")
    document.querySelectorAll('.avatar-anim-btn').forEach(btn => {
        const animType = btn.dataset.anim;
        if (animType === 'avatar') {
            // Кнопка "Аватар" – очищает анимацию
            btn.addEventListener('click', () => {
                const overlay = document.getElementById('avatarAnimationOverlay');
                if (overlay) {
                    overlay.innerHTML = '';
                    overlay.style.display = 'none';
                }
            });
        } else if (!btn.disabled && !btn.classList.contains('inactive')) {
            btn.addEventListener('click', () => {
                if (animType) playAnimationInModal(animType);
            });
        }
    });

    // Покупка / активация / закрытие
    const buyBtn = document.getElementById('buyAvatarBtn');
    if (buyBtn) buyBtn.addEventListener('click', async () => {
        const res = await window.apiRequest('/avatars/buy', { method: 'POST', body: JSON.stringify({ avatar_id: numericAvatarId }) });
        const data = await res.json();
        if (data.success) {
            await refreshData();
            modal.style.display = 'none';
            renderProfileTab('skins');
        } else showToast('Ошибка: ' + data.error, 1500);
    });

    const activateBtn = document.getElementById('activateAvatarBtn');
    if (activateBtn) activateBtn.addEventListener('click', async () => {
        const res = await window.apiRequest('/player/avatar', { method: 'POST', body: JSON.stringify({ avatar_id: numericAvatarId }) });
        const data = await res.json();
        if (data.success) {
            userData.avatar_id = numericAvatarId;
            userData.avatar = avatarFilename;
            modal.style.display = 'none';
            renderProfileTab('skins');
            if (currentScreen === 'main') renderMain();
            if (currentScreen === 'equip') renderEquip();
        } else showToast('Ошибка при смене аватара', 1500);
    });

    const closeBtn = document.getElementById('closeAvatarModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    const closeX = modal.querySelector('.close');
    if (closeX) closeX.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
};
