// avatar-animation-modal.js – жёсткая сетка, фикс размеры

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
    const effectiveSkinId = isCybercat ? 'cybercat' : numericAvatarId;
    const skinAnim = window.AnimationManager?.skinAnimations?.[effectiveSkinId] || {};

    const hasAttack   = !!skinAnim.attack;
    const hasDodge    = !!skinAnim.dodge;
    const hasBlock    = !!skinAnim.block;
    const hasVictory  = !!skinAnim.victory;
    const hasDefeat   = !!skinAnim.defeat;
    const hasCrit     = !!skinAnim.crit;
    const hasUltimate = !!skinAnim.ultimate;

    // Левая колонка (Аватар, Атака, Уворот, Защита)
    const leftButtons = [
        { type: 'avatar', label: 'Аватар', icon: 'fas fa-user-circle', available: true, alwaysEnabled: true },
        { type: 'attack', label: 'Атака',  icon: 'fas fa-fist-raised', available: hasAttack },
        { type: 'dodge',  label: 'Уворот', icon: 'fas fa-running', available: hasDodge },
        { type: 'block',  label: 'Защита', icon: 'fas fa-shield-alt', available: hasBlock }
    ];
    // Правая колонка (Победа, Поражение, Крит, Ультимейт)
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

    // Функция генерации одной кнопки
    function renderButton(btn, idx, side) {
        const isFirst = idx === 0;
        const isLast = idx === 3;
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
        const content = `<i class="${btn.icon}" style="font-size:20px; color:#aaa;"></i><span style="font-size:10px; color:#aaa;">${btn.label}</span>`;
        return `<button class="avatar-anim-btn ${inactiveClass}" data-anim="${btn.type}" ${disabledAttr} style="width: 75px; height: 75px; background-color: #232833; border: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: ${isActiveButton ? 'pointer' : 'default'}; color: #aaa; font-size: 11px; padding: 0; margin: 0; box-sizing: border-box; ${borderRadius}">${content}</button>`;
    }

    // Собираем левую колонку
    let leftHtml = '';
    for (let i = 0; i < leftButtons.length; i++) {
        leftHtml += renderButton(leftButtons[i], i, 'left');
    }
    // Собираем правую колонку
    let rightHtml = '';
    for (let i = 0; i < rightButtons.length; i++) {
        rightHtml += renderButton(rightButtons[i], i, 'right');
    }

    // Структура: таблица 1x3 (лево, центр, право)
    const html = `
        <div style="display: flex; flex-direction: row; justify-content: center; align-items: flex-start; gap: 0; margin: 0; padding: 0;">
            <!-- Левая колонка -->
            <div style="display: flex; flex-direction: column; gap: 0; margin: 0; padding: 0;">
                ${leftHtml}
            </div>
            <!-- Центр -->
            <div style="display: flex; flex-direction: column; align-items: center; margin: 0 10px; padding: 0;">
                <div id="avatarPreviewContainer" style="position: relative; width: 300px; height: 300px; margin: 0; padding: 0;">
                    <img src="/assets/${escapeHtml(avatarFilename)}" alt="avatar" style="width: 100%; height: 100%; object-fit: cover; display: block; margin: 0; padding: 0;">
                    <div id="avatarAnimationOverlay" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; display:none; z-index:10;"></div>
                </div>
                <div style="margin-top: 12px; font-size: 18px; font-weight: bold; color: white;">${escapeHtml(avatarName)}</div>
                ${priceHtml}
                <div style="display: flex; gap: 12px; justify-content: center; margin-top: 8px;">
                    ${!owned && !isActive ? '<button class="btn" id="buyAvatarBtn" style="background-color: #2f3542; color: #aaa; border: none; padding: 8px 16px; border-radius: 30px; font-size: 14px; cursor: pointer;">Купить</button>' : ''}
                    ${owned && !isActive ? '<button class="btn" id="activateAvatarBtn" style="background-color: #2f3542; color: #aaa; border: none; padding: 8px 16px; border-radius: 30px; font-size: 14px; cursor: pointer;">Активировать</button>' : ''}
                    <button class="btn" id="closeAvatarModalBtn" style="background-color: #2f3542; color: #aaa; border: none; padding: 8px 16px; border-radius: 30px; font-size: 14px; cursor: pointer;">Закрыть</button>
                </div>
            </div>
            <!-- Правая колонка -->
            <div style="display: flex; flex-direction: column; gap: 0; margin: 0; padding: 0;">
                ${rightHtml}
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
    modal.style.display = 'flex';

    // --- Воспроизведение анимаций ---
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

    // Обработчики для кнопок анимаций
    document.querySelectorAll('.avatar-anim-btn').forEach(btn => {
        const animType = btn.dataset.anim;
        if (animType === 'avatar') {
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
