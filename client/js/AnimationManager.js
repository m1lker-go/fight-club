// AnimationManager.js — исправленная версия
window.AnimationManager = (function() {
    const imageCache = new Map();       // url -> HTMLImageElement (полностью загруженный)
    const activeAnimations = { hero: false, enemy: false };
    const pendingTimeouts = { hero: null, enemy: null };

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

    const skinAnimations = {
        13: {
            attack: '/assets/skins/animations/attack_skin12.gif',
            dodge: '/assets/skins/animations/dodge_skin12.gif'
        },
        12: {
            attack: '/assets/skins/animations/attack_skin11.gif',
            dodge: '/assets/skins/animations/dodge_skin11.gif'
        }
    };

    // Загрузка одного изображения с ожиданием
    function loadImage(url) {
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
        const urls = [
            ...Object.values(commonAnimations),
            ...Object.values(skinAnimations).flatMap(skin => Object.values(skin))
        ];
        return Promise.all(urls.map(url => loadImage(url).catch(e => console.warn(e.message))));
    }

    // Остановить текущую анимацию на цели (принудительно)
    function stopAnimation(target) {
        if (pendingTimeouts[target]) {
            clearTimeout(pendingTimeouts[target]);
            pendingTimeouts[target] = null;
        }
        const container = document.getElementById(`${target}-animation`);
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
        activeAnimations[target] = false;
    }

    // Определить URL анимации по параметрам
    function getAnimationUrl(animType, options) {
        const { isSkinAttack = false, skinId = null, isDodge = false } = options;

        if (isSkinAttack && skinId && skinAnimations[skinId]) {
            if (isDodge && skinAnimations[skinId].dodge)
                return skinAnimations[skinId].dodge;
            if (!isDodge && skinAnimations[skinId].attack)
                return skinAnimations[skinId].attack;
        }

        switch (animType) {
            case 'dodge': return commonAnimations.dodge;
            case 'fire_ult': return commonAnimations.fire_ult;
            case 'ice_ult': return commonAnimations.ice_ult;
            case 'poison_ult': return commonAnimations.poison_ult;
            case 'ultimate': return commonAnimations.ultimate;
            case 'heal': return commonAnimations.heal;
            case 'buff': return commonAnimations.buff;
            case 'frozen': return commonAnimations.frozen;
            default: return commonAnimations.attack;
        }
    }

    // Получить длительность анимации (можно анализировать GIF, но проще — из атрибута data-duration или фиксированно)
    // Пока оставим 1000 мс для всех, кроме скинов-атак
    function getAnimationDuration(animType, isSkinAttack, skinId) {
        if (isSkinAttack && skinId && skinAnimations[skinId] && animType !== 'dodge') {
            return 2000;   // скиновые атаки дольше
        }
        return 1000;
    }

    // Позиционирование анимации
    function positionAnimation(imgElement, target, avatarTopOffset, avatarHeight, isSkin, isDodge) {
        const card = document.querySelector(`.${target}-card`);
        if (!card) return;

        if (isSkin && !isDodge) {
            // Скиновая атака: растягиваем по высоте аватара, ширина пропорциональна (600/480)
            const proportionalWidth = (600 / 480) * avatarHeight;
            imgElement.style.height = avatarHeight + 'px';
            imgElement.style.width = proportionalWidth + 'px';
            imgElement.style.objectFit = 'contain';
            imgElement.style.top = avatarTopOffset + 'px';
            if (target === 'hero') {
                imgElement.style.left = '0';
                imgElement.style.right = 'auto';
                imgElement.style.transform = 'scaleX(-1)';
            } else {
                imgElement.style.left = 'auto';
                imgElement.style.right = '0';
                imgElement.style.transform = 'none';
            }
        } else {
            // Обычная анимация или уклонение — центрируем, ограничиваем по высоте аватара
            imgElement.style.top = avatarTopOffset + 'px';
            imgElement.style.left = '50%';
            imgElement.style.transform = 'translateX(-50%)';
            imgElement.style.width = '100%';
            imgElement.style.height = 'auto';
            imgElement.style.maxHeight = avatarHeight + 'px';
            imgElement.style.objectFit = 'contain';
        }
    }

    async function playAnimation(target, animType, options = {}) {
        // Прерываем предыдущую анимацию, если она ещё идёт
        if (activeAnimations[target]) {
            console.log(`[AnimationManager] анимация на ${target} уже идёт, останавливаем и заменяем`);
            stopAnimation(target);
        }

        activeAnimations[target] = true;

        const container = document.getElementById(`${target}-animation`);
        if (!container) {
            console.warn(`[AnimationManager] Контейнер ${target}-animation не найден`);
            activeAnimations[target] = false;
            return;
        }

        const url = getAnimationUrl(animType, options);
        if (!url) {
            console.warn(`[AnimationManager] URL не определён для ${animType}`);
            activeAnimations[target] = false;
            return;
        }

        // Ждём загрузки изображения
        let img;
        try {
            img = await loadImage(url);
        } catch (err) {
            console.error(err);
            activeAnimations[target] = false;
            return;
        }

        // Клонируем загруженное изображение
        const animImg = img.cloneNode(true);
        animImg.style.position = 'absolute';
        animImg.style.pointerEvents = 'none';

        // Определяем позиционирование
        const parentCard = document.querySelector(`.${target}-card`);
        if (!parentCard) {
            console.warn(`[AnimationManager] Карточка .${target}-card не найдена`);
            container.innerHTML = '';
            container.appendChild(animImg);
            container.style.display = 'block';
            const duration = getAnimationDuration(animType, options.isSkinAttack, options.skinId);
            pendingTimeouts[target] = setTimeout(() => {
                container.style.display = 'none';
                container.innerHTML = '';
                activeAnimations[target] = false;
                pendingTimeouts[target] = null;
            }, duration);
            return;
        }

        const cardRect = parentCard.getBoundingClientRect();
        // Ищем элемент с классом avatar или первый div (лучше по классу)
        const avatarContainer = parentCard.querySelector('.avatar') || parentCard.querySelector('div:first-child');
        let avatarHeight = cardRect.height;
        let avatarTopOffset = 0;
        if (avatarContainer) {
            const avatarRect = avatarContainer.getBoundingClientRect();
            avatarHeight = avatarRect.height;
            avatarTopOffset = avatarRect.top - cardRect.top;
        }

        const isSkin = !!(options.isSkinAttack && options.skinId && skinAnimations[options.skinId]);
        const isDodge = (animType === 'dodge') || options.isDodge;
        positionAnimation(animImg, target, avatarTopOffset, avatarHeight, isSkin, isDodge);

        container.innerHTML = '';
        container.appendChild(animImg);
        container.style.display = 'block';

        const duration = getAnimationDuration(animType, options.isSkinAttack, options.skinId);
        pendingTimeouts[target] = setTimeout(() => {
            container.style.display = 'none';
            container.innerHTML = '';
            activeAnimations[target] = false;
            pendingTimeouts[target] = null;
        }, duration);
    }

    return {
        preloadAllAnimations,
        playAnimation,
        stopAnimation,
        hasSkinAnimation: (skinId) => !!skinAnimations[skinId]
    };
})();
