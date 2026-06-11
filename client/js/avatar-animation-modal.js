// avatar-animation-modal.js – модальное окно просмотра аватара с анимациями

window.showAvatarAnimationModal = async function(avatarId, avatarFilename, owned) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalTitle || !modalBody) return;

    // Загружаем список аватаров, чтобы получить имя
    let avatarName = '';
    try {
        const res = await window.apiRequest('/avatars', { method: 'GET' });
        if (res.ok) {
            const avatars = await res.json();
            const avatar = avatars.find(a => a.id === avatarId);
            if (avatar) avatarName = translateSkinName(avatar.name);
        }
    } catch(e) { console.error(e); }

    const isActive = avatarId === userData.avatar_id;
    modalTitle.innerText = isActive ? 'Текущий аватар' : (owned ? 'Просмотр аватара' : 'Купить аватар');

    // Определяем наличие анимаций у скина через AnimationManager
    const hasVictory = window.AnimationManager && window.AnimationManager.hasSkinAnimation(avatarId) && 
                        window.AnimationManager.skinAnimations[avatarId]?.victory;
    const hasDefeat = window.AnimationManager && window.AnimationManager.hasSkinAnimation(avatarId) && 
                        window.AnimationManager.skinAnimations[avatarId]?.defeat;
    const hasAttack = window.AnimationManager && window.AnimationManager.hasSkinAnimation(avatarId) && 
                        window.AnimationManager.skinAnimations[avatarId]?.attack;
    const hasDodge = window.AnimationManager && window.AnimationManager.hasSkinAnimation(avatarId) && 
                        window.AnimationManager.skinAnimations[avatarId]?.dodge;
    // Для киберкота (ключ 'cybercat') особая проверка
    const isCybercat = (avatarFilename === 'cybercat-skin.png');
    const effectiveSkinId = isCybercat ? 'cybercat' : avatarId;

    // Если киберкот, используем его проверку
    const finalHasVictory = isCybercat ? (window.AnimationManager?.skinAnimations?.cybercat?.victory) : hasVictory;
    const finalHasDefeat = isCybercat ? (window.AnimationManager?.skinAnimations?.cybercat?.defeat) : hasDefeat;
    const finalHasAttack = isCybercat ? (window.AnimationManager?.skinAnimations?.cybercat?.attack) : hasAttack;
    const finalHasDodge = isCybercat ? (window.AnimationManager?.skinAnimations?.cybercat?.dodge) : hasDodge;

    // Формируем кнопки левой и правой колонки
    // Левая колонка: победа, атака
    // Правая колонка: поражение, уворот
    const leftButtons = [
        { type: 'victory', label: 'Победа', icon: 'fas fa-trophy', available: finalHasVictory },
        { type: 'attack', label: 'Атака', icon: 'fas fa-fist-raised', available: finalHasAttack }
    ];
    const rightButtons = [
        { type: 'defeat', label: 'Поражение', icon: 'fas fa-skull', available: finalHasDefeat },
        { type: 'dodge', label: 'Уворот', icon: 'fas fa-running', available: finalHasDodge }
    ];

    // Контейнер для анимации (будет размещён поверх аватара)
    modalBody.innerHTML = `
        <div class="avatar-modal-layout">
            <div class="avatar-modal-left">
                ${leftButtons.map(btn => `
                    <button class="avatar-anim-btn ${!btn.available ? 'disabled' : ''}" data-anim="${btn.type}" ${!btn.available ? 'disabled' : ''}>
                        <i class="${btn.icon}"></i>
                        <span>${btn.label}</span>
                    </button>
                `).join('')}
            </div>
            <div class="avatar-modal-center">
                <div class="avatar-preview-container" id="avatarPreviewContainer">
                    <img src="/assets/${escapeHtml(avatarFilename)}" alt="avatar" class="avatar-preview-img">
                    <div id="avatarAnimationOverlay" class="avatar-animation-overlay"></div>
                </div>
                <div class="avatar-name">${escapeHtml(avatarName)}</div>
                ${!owned && !isActive ? `
                    <div class="avatar-price">
                        ${getAvatarPriceHtml(avatarId)}
                    </div>
                ` : ''}
                <div class="avatar-modal-actions">
                    ${!owned && !isActive ? '<button class="btn" id="buyAvatarBtn">Купить</button>' : ''}
                    ${owned && !isActive ? '<button class="btn" id="activateAvatarBtn">Активировать</button>' : ''}
                    <button class="btn" id="closeAvatarModalBtn">Закрыть</button>
                </div>
            </div>
            <div class="avatar-modal-right">
                ${rightButtons.map(btn => `
                    <button class="avatar-anim-btn ${!btn.available ? 'disabled' : ''}" data-anim="${btn.type}" ${!btn.available ? 'disabled' : ''}>
                        <i class="${btn.icon}"></i>
                        <span>${btn.label}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    // Функция воспроизведения анимации в модалке
    function playAnimationInModal(animType) {
        const overlay = document.getElementById('avatarAnimationOverlay');
        if (!overlay) return;
        // Очищаем предыдущую анимацию
        overlay.innerHTML = '';
        overlay.style.display = 'block';

        // Определяем URL анимации
        let animUrl = null;
        const skinData = window.AnimationManager?.skinAnimations?.[effectiveSkinId];
        if (skinData && skinData[animType]) {
            animUrl = skinData[animType];
        }

        if (!animUrl) {
            console.warn(`Анимация ${animType} для скина ${effectiveSkinId} не найдена`);
            overlay.style.display = 'none';
            return;
        }

        // Создаём img и позиционируем как в бою (похоже на .skin-animation)
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

        // Длительность анимации (как в AnimationManager)
        let duration = 1000;
        if (animType === 'victory' || animType === 'defeat') duration = 2500;
        else duration = 2000;

        setTimeout(() => {
            overlay.innerHTML = '';
            overlay.style.display = 'none';
        }, duration);
    }

    // Навешиваем обработчики на кнопки анимаций
    document.querySelectorAll('.avatar-anim-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (btn.disabled) return;
            const animType = btn.dataset.anim;
            playAnimationInModal(animType);
        });
    });

    // Кнопки покупки/активации
    const buyBtn = document.getElementById('buyAvatarBtn');
    if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
            const res = await window.apiRequest('/avatars/buy', {
                method: 'POST',
                body: JSON.stringify({ avatar_id: avatarId })
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

    const activateBtn = document.getElementById('activateAvatarBtn');
    if (activateBtn) {
        activateBtn.addEventListener('click', async () => {
            const res = await window.apiRequest('/player/avatar', {
                method: 'POST',
                body: JSON.stringify({ avatar_id: avatarId })
            });
            const data = await res.json();
            if (data.success) {
                userData.avatar_id = avatarId;
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

// Вспомогательная функция для цены
async function getAvatarPriceHtml(avatarId) {
    try {
        const res = await window.apiRequest('/avatars', { method: 'GET' });
        if (res.ok) {
            const avatars = await res.json();
            const avatar = avatars.find(a => a.id === avatarId);
            if (avatar) {
                const priceGold = avatar.price_gold || 0;
                const priceDiamonds = avatar.price_diamonds || 0;
                let parts = [];
                if (priceGold > 0) parts.push(`${priceGold} <i class="fas fa-coins"></i>`);
                if (priceDiamonds > 0) parts.push(`${priceDiamonds} <i class="fas fa-gem"></i>`);
                if (parts.length) return parts.join(' + ');
                else return 'Бесплатно';
            }
        }
    } catch(e) {}
    return '';
}

// Функция перевода имени скина (скопируйте из screens.js, если нужно)
function translateSkinName(name) {
    if (!name) return 'Аватар';
    const translations = {
        'cat_heroweb.png': 'Обычный кот',
        'cybercat-skin.png': 'Кибер-кот'
        // добавьте остальные при необходимости
    };
    return translations[name] || name.replace(/\.png$/, '').replace(/_/g, ' ');
}
