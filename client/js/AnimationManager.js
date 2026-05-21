// AnimationManager.js
// Единый менеджер для всех анимаций боя (обычные, скиновые, увороты)

window.AnimationManager = (function() {
    // Кэш загруженных изображений
    const imageCache = new Map();
    
    // Список анимаций для предзагрузки (обычные)
    const commonAnimations = {
        attack: '/assets/fight/shot.gif',
        dodge: '/assets/fight/missx.gif',
        fire_ult: '/assets/fight/fire.gif',
        ice_ult: '/assets/fight/ice.gif',
        poison_ult: '/assets/fight/poison.gif',
        ultimate: '/assets/fight/ultimate.gif',
        heal: '/assets/fight/hill.gif',
        buff: '/assets/fight/shield.gif',
        frozen: '/assets/fight/frozenx.gif'
    };
    
    // Скиновые анимации (по ID скина)
    const skinAnimations = {
        13: {
            attack: '/assets/skins/animations/attack_skin12.gif',
            dodge: '/assets/skins/animations/dodge_skin12.gif'
        }
        // при необходимости добавить другие скины
    };
    
    // Предзагрузка изображений
    function preloadImage(url) {
        return new Promise((resolve, reject) => {
            if (imageCache.has(url)) {
                resolve(imageCache.get(url));
                return;
            }
            const img = new Image();
            img.onload = () => {
                imageCache.set(url, img);
                resolve(img);
            };
            img.onerror = () => reject(new Error(`Failed to load ${url}`));
            img.src = url;
        });
    }
    
    // Предзагрузка всех анимаций (вызывать при старте игры)
    function preloadAllAnimations() {
        const promises = [];
        // Обычные анимации
        for (const url of Object.values(commonAnimations)) {
            promises.push(preloadImage(url).catch(err => console.warn(err.message)));
        }
        // Скиновые анимации
        for (const skin of Object.values(skinAnimations)) {
            for (const url of Object.values(skin)) {
                promises.push(preloadImage(url).catch(err => console.warn(err.message)));
            }
        }
        return Promise.all(promises);
    }
    
    // Воспроизведение анимации
    // target: 'hero' или 'enemy'
    // animType: 'attack', 'dodge', 'fire_ult', 'ice_ult', 'poison_ult', 'ultimate', 'heal', 'buff', 'frozen'
    // options: { isSkinAttack: false, skinId: null, isDodge: false }
    function playAnimation(target, animType, options = {}) {
        const { isSkinAttack = false, skinId = null, isDodge = false } = options;
        
        return new Promise((resolve) => {
            const container = document.getElementById(`${target}-animation`);
            if (!container) {
                console.warn(`[AnimationManager] Контейнер ${target}-animation не найден`);
                resolve();
                return;
            }
            
            // Определяем URL анимации
            let url = null;
            let isSkin = false;
            let skinSpecific = false;
            
            if (isSkinAttack && skinId && skinAnimations[skinId]) {
                if (isDodge && skinAnimations[skinId].dodge) {
                    url = skinAnimations[skinId].dodge;
                    isSkin = true;
                    skinSpecific = true;
                } else if (skinAnimations[skinId].attack) {
                    url = skinAnimations[skinId].attack;
                    isSkin = true;
                    skinSpecific = true;
                }
            }
            
            if (!url) {
                // Обычная анимация
                if (animType === 'dodge') url = commonAnimations.dodge;
                else if (animType === 'fire_ult') url = commonAnimations.fire_ult;
                else if (animType === 'ice_ult') url = commonAnimations.ice_ult;
                else if (animType === 'poison_ult') url = commonAnimations.poison_ult;
                else if (animType === 'ultimate') url = commonAnimations.ultimate;
                else if (animType === 'heal') url = commonAnimations.heal;
                else if (animType === 'buff') url = commonAnimations.buff;
                else if (animType === 'frozen') url = commonAnimations.frozen;
                else url = commonAnimations.attack; // 'attack' по умолчанию
            }
            
            if (!url) {
                console.warn(`[AnimationManager] Неизвестный тип анимации: ${animType}`);
                resolve();
                return;
            }
            
            // Получаем изображение из кэша или загружаем
            let img = imageCache.get(url);
            if (!img) {
                img = new Image();
                img.src = url;
                imageCache.set(url, img);
            }
            
            // Создаём новый элемент img (клонировать нельзя, создаём заново)
            const animImg = img.cloneNode(true);
            animImg.style.position = 'absolute';
            
            // Получаем размеры аватара
            const parentCard = document.querySelector(`.${target}-card`);
            if (!parentCard) {
                console.warn(`[AnimationManager] Карточка .${target}-card не найдена`);
                container.innerHTML = '';
                container.appendChild(animImg);
                container.style.display = 'block';
                setTimeout(() => {
                    container.style.display = 'none';
                    container.innerHTML = '';
                    resolve();
                }, 1000);
                return;
            }
            
            const cardRect = parentCard.getBoundingClientRect();
            const avatarContainer = parentCard.querySelector('div:first-child');
            let avatarHeight = cardRect.height;
            let avatarTopOffset = 0;
            if (avatarContainer) {
                const avatarRect = avatarContainer.getBoundingClientRect();
                avatarHeight = avatarRect.height;
                avatarTopOffset = avatarRect.top - cardRect.top;
            }
            
            // Позиционирование в зависимости от типа анимации
            if (isSkin && skinSpecific) {
                // Скиновая анимация (атака или уворот)
                if (animType === 'dodge') {
                    // Уворот: по центру аватара, без зеркала, ширина = ширине карточки (аватара)
                    animImg.style.top = avatarTopOffset + 'px';
                    animImg.style.left = '50%';
                    animImg.style.transform = 'translateX(-50%)';
                    animImg.style.width = '100%';
                    animImg.style.height = 'auto';
                    animImg.style.maxHeight = avatarHeight + 'px';
                    animImg.style.objectFit = 'contain';
                } else {
                    // Атака скином: левый край + зеркало для героя, правый край для врага
                    const proportionalWidth = (600 / 480) * avatarHeight; // для attack_skin12.gif (600x480)
                    animImg.style.height = avatarHeight + 'px';
                    animImg.style.width = proportionalWidth + 'px';
                    animImg.style.objectFit = 'contain';
                    animImg.style.top = avatarTopOffset + 'px';
                    if (target === 'hero') {
                        animImg.style.left = '0';
                        animImg.style.right = 'auto';
                        animImg.style.transform = 'scaleX(-1)';
                    } else {
                        animImg.style.left = 'auto';
                        animImg.style.right = '0';
                        animImg.style.transform = 'none';
                    }
                }
            } else {
                // Обычная анимация: центрирована, ширина = 100% от карточки
                animImg.style.top = avatarTopOffset + 'px';
                animImg.style.left = '50%';
                animImg.style.transform = 'translateX(-50%)';
                animImg.style.width = '100%';
                animImg.style.height = 'auto';
                animImg.style.maxHeight = avatarHeight + 'px';
                animImg.style.objectFit = 'contain';
            }
            
            animImg.style.pointerEvents = 'none';
            
            container.innerHTML = '';
            container.appendChild(animImg);
            container.style.display = 'block';
            
            // Длительность анимации: для скиновой атаки 2000 мс, для остальных 1000 мс
            const duration = (isSkin && skinSpecific && animType !== 'dodge') ? 2000 : 1000;
            setTimeout(() => {
                container.style.display = 'none';
                container.innerHTML = '';
                resolve();
            }, duration);
        });
    }
    
    // Публичное API
    return {
        preloadAllAnimations,
        playAnimation
    };
})();
