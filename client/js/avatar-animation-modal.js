// avatar-animation-modal.js – финальная версия с корректным определением анимаций

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

    // Приводим avatarId к числу (важно!)
    const numericAvatarId = parseInt(String(avatarId).trim(), 10);
    if (isNaN(numericAvatarId)) {
        console.error('Invalid avatarId:', avatarId);
        return;
    }
    const isActive = numericAvatarId === userData.avatar_id;
    modalTitle.innerText = isActive ? 'Текущий аватар' : (owned ? 'Просмотр аватара' : 'Купить аватар');

    const isCybercat = (avatarFilename === 'cybercat-skin.png');
    // Для киберкота используем строковый ключ 'cybercat'
    const effectiveSkinId = isCybercat ? 'cybercat' : numericAvatarId;
    const skinAnim = window.AnimationManager?.skinAnimations?.[effectiveSkinId] || {};

    // Отладка – убедимся, что анимации найдены
    console.log(`[AvatarModal] skinId=${effectiveSkinId}`, skinAnim);

    const hasAttack   = !!skinAnim.attack;
    const hasDodge    = !!skinAnim.dodge;
    const hasBlock    = !!skinAnim.block;
    const hasVictory  = !!skinAnim.victory;
    const hasDefeat   = !!skinAnim.defeat;
    const hasCrit     = !!skinAnim.crit;
    const hasUltimate = !!skinAnim.ultimate;

    const leftButtons = [
        { type: 'avatar', label: 'Аватар', icon: 'fas fa-user-circle', active: true },
        { type: 'attack', label: 'Атака',  icon: 'fas fa-fist-raised', active: hasAttack },
        { type: 'dodge',  label: 'Уворот', icon: 'fas fa-running', active: hasDodge },
        { type: 'block',  label: 'Защита', icon: 'fas fa-shield-alt', active: hasBlock }
    ];
    const rightButtons = [
        { type: 'victory',  label: 'Победа',     icon: 'fas fa-trophy', active: hasVictory },
        { type: 'defeat',   label: 'Поражение',  icon: 'fas fa-skull', active: hasDefeat },
        { type: 'crit',     label: 'Крит',       icon: 'fas fa-bolt', active: hasCrit },
        { type: 'ultimate', label: 'Ультимейт',  icon: 'fas fa-meteor', active: hasUltimate }
    ];

    let priceHtml = '';
    if (!owned && !isActive) {
        let parts = [];
        if (priceGold > 0) parts.push(`${priceGold} <i class="fas fa-coins"></i>`);
        if (priceDiamonds > 0) parts.push(`${priceDiamonds} <i class="fas fa-gem"></i>`);
        priceHtml = parts.length ? `<div style="font-size:14px; color:#f1c40f; background:rgba(0,0,0,0.6); padding:4px 12px; border-radius:20px; display:inline-block; margin:8px 0;">${parts.join(' + ')}</div>` : '<div style="font-size:14px; color:#f1c40f; background:rgba(0,0,0,0.6); padding:4px 12px; border-radius:20px; display:inline-block; margin:8px 0;">Бесплатно</div>';
    }

    function makeButton(btn, idx, side) {
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
        const isActiveBtn = btn.active;
        const disabledAttr = isActiveBtn ? '' : 'disabled';
        const inactiveClass = isActiveBtn ? '' : 'inactive';
        const cursor = isActiveBtn ? 'pointer' : 'default';
        const opacity = isActiveBtn ? '1' : '0.5';
        const background = isActiveBtn ? '#232833' : 'transparent';
        const border = isActiveBtn ? 'none' : '1px solid #3a4050';
        return `<button class="avatar-anim-btn ${inactiveClass}" data-anim="${btn.type}" ${disabledAttr} style="width: 60px; height: 60px; background-color: ${background}; border: ${border}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: ${cursor}; color: #aaa; font-size: 11px; padding: 0; margin: 0; box-sizing: border-box; ${borderRadius} opacity: ${opacity};"><i class="${btn.icon}" style="font-size:20px; color:#aaa;"></i><span style="font-size:10px; color:#aaa;">${btn.label}</span></button>`;
    }

    const leftCol = leftButtons.map((btn, i) => makeButton(btn, i, 'left')).join('');
    const rightCol = rightButtons.map((btn, i) => makeButton(btn, i, 'right')).join('');

    const html = `
        <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
            <div style="display: flex; flex-direction: row; justify-content: center; align-items: flex-start; gap: 0; margin: 0; padding: 0;">
                <div style="display: flex; flex-direction: column; gap: 0; margin: 0; padding: 0;">
                    ${leftCol}
                </div>
                <div style="margin: 0; padding: 0; width: 160px; height: 240px; position: relative;">
                    <img id="avatarStaticImg" src="/assets/${escapeHtml(avatarFilename)}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                    <div id="avatarAnimationOverlay" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; display:none; z-index:10;"></div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0; margin: 0; padding: 0;">
                    ${rightCol}
                </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; margin-top: 16px;">
                <div style="font-size: 18px; font-weight: bold; color: white;">${escapeHtml(avatarName)}</div>
                ${priceHtml}
                <div style="display: flex; gap: 12px; justify-content: center; margin-top: 8px;">
                    ${!owned && !isActive ? '<button class="btn" id="buyAvatarBtn" style="background-color: #2f3542; color: #aaa; border: none; padding: 8px 16px; border-radius: 30px; font-size: 14px; cursor: pointer;">Купить</button>' : ''}
                    ${owned && !isActive ? '<button class="btn" id="activateAvatarBtn" style="background-color: #2f3542; color: #aaa; border: none; padding: 8px 16px; border-radius: 30px; font-size: 14px; cursor: pointer;">Активировать</button>' : ''}
                    <button class="btn" id="closeAvatarModalBtn" style="background-color: #2f3542; color: #aaa; border: none; padding: 8px 16px; border-radius: 30px; font-size: 14px; cursor: pointer;">Закрыть</button>
                </div>
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
    modal.style.display = 'flex';

    function playAnimationInModal(animType) {
        const overlay = document.getElementById('avatarAnimationOverlay');
        const staticImg = document.getElementById('avatarStaticImg');
        if (!overlay) return;
        overlay.innerHTML = '';
        overlay.style.display = 'block';
        if (staticImg) staticImg.style.visibility = 'hidden'; // скрываем статику
        const animUrl = skinAnim[animType];
        if (!animUrl) {
            overlay.style.display = 'none';
            if (staticImg) staticImg.style.visibility = 'visible';
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
            if (staticImg) staticImg.style.visibility = 'visible';
        }, duration);
    }

    document.querySelectorAll('.avatar-anim-btn').forEach(btn => {
        const animType = btn.dataset.anim;
        if (animType === 'avatar') {
            btn.addEventListener('click', () => {
                const overlay = document.getElementById('avatarAnimationOverlay');
                const staticImg = document.getElementById('avatarStaticImg');
                if (overlay) {
                    overlay.innerHTML = '';
                    overlay.style.display = 'none';
                }
                if (staticImg) staticImg.style.visibility = 'visible';
            });
        } else if (btn.disabled === false) {
            btn.addEventListener('click', () => {
                if (animType) playAnimationInModal(animType);
            });
        }
    });

    // Покупка/активация/закрытие (без изменений)
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
