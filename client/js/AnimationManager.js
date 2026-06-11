// AnimationManager.js
window.AnimationManager = (function() {
    const imageCache = new Map();
    const activeAnimations = { hero: false, enemy: false };
    
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
    1: {
        victory: '/assets/skins/animations/win-skin1.gif',
        defeat: '/assets/skins/animations/lose-skin1.gif'
    },
    12: {
        attack: '/assets/skins/animations/attack_skin11.gif',
        dodge: '/assets/skins/animations/dodge_skin11.gif',
        victory: '/assets/skins/animations/win-skin11.gif',
        defeat: '/assets/skins/animations/lose-skin11.gif'
    },
    13: {
        attack: '/assets/skins/animations/attack_skin12.gif',
        dodge: '/assets/skins/animations/dodge_skin12.gif',
        victory: '/assets/skins/animations/win-skin12.gif',
        defeat: '/assets/skins/animations/lose-skin12.gif'
    },
    14: {
        attack: '/assets/skins/animations/attack_skin14.gif',
        dodge: '/assets/skins/animations/dodge_skin14.gif',
        victory: '/assets/skins/animations/win-skin14.gif',
        defeat: '/assets/skins/animations/lose-skin14.gif'
    },
    cybercat: {
        victory: '/assets/skins/animations/win-cybercat-skin.gif',
        defeat: '/assets/skins/animations/lose-cybercat-skin.gif'
    }
};
    
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
    
    function preloadAllAnimations() {
        const promises = [];
        for (const url of Object.values(commonAnimations)) {
            promises.push(preloadImage(url).catch(err => console.warn(err.message)));
        }
        for (const skin of Object.values(skinAnimations)) {
            for (const url of Object.values(skin)) {
                promises.push(preloadImage(url).catch(err => console.warn(err.message)));
            }
        }
        return Promise.all(promises);
    }
    
   function playAnimation(target, animType, options = {}) {
    const { isSkinAttack = false, skinId = null, isDodge = false } = options;
    return new Promise((resolve) => {
        if (activeAnimations[target]) {
            console.log(`[AnimationManager] анимация на ${target} уже идёт, пропуск`);
            resolve();
            return;
        }
        activeAnimations[target] = true;

        const container = document.getElementById(`${target}-animation`);
        if (!container) {
            console.warn(`[AnimationManager] Контейнер ${target}-animation не найден`);
            activeAnimations[target] = false;
            resolve();
            return;
        }

        let url = null;
        let isSkin = false;
        let skinSpecific = false;

        // Скиновая анимация
        if (skinId && skinAnimations[skinId]) {
            if (animType === 'dodge' && skinAnimations[skinId].dodge) {
                url = skinAnimations[skinId].dodge;
                isSkin = true;
                skinSpecific = true;
            } else if (animType === 'attack' && skinAnimations[skinId].attack) {
                url = skinAnimations[skinId].attack;
                isSkin = true;
                skinSpecific = true;
            } else if (animType === 'victory' && skinAnimations[skinId].victory) {
                url = skinAnimations[skinId].victory;
                isSkin = true;
                skinSpecific = true;
            } else if (animType === 'defeat' && skinAnimations[skinId].defeat) {
                url = skinAnimations[skinId].defeat;
                isSkin = true;
                skinSpecific = true;
            }
        }

        // Обычные анимации (если скиновая не найдена)
        if (!url) {
            if (animType === 'dodge') url = commonAnimations.dodge;
            else if (animType === 'fire_ult') url = commonAnimations.fire_ult;
            else if (animType === 'ice_ult') url = commonAnimations.ice_ult;
            else if (animType === 'poison_ult') url = commonAnimations.poison_ult;
            else if (animType === 'ultimate') url = commonAnimations.ultimate;
            else if (animType === 'heal') url = commonAnimations.heal;
            else if (animType === 'buff') url = commonAnimations.buff;
            else if (animType === 'frozen') url = commonAnimations.frozen;
            else url = commonAnimations.attack;
        }

        if (!url) {
            console.warn(`[AnimationManager] Неизвестный тип анимации: ${animType}`);
            activeAnimations[target] = false;
            resolve();
            return;
        }

        let img = imageCache.get(url);
        if (!img) {
            img = new Image();
            img.src = url;
            imageCache.set(url, img);
        }

        const animImg = img.cloneNode(true);
        animImg.style.position = 'absolute';
        animImg.style.pointerEvents = 'none';

        const parentCard = document.querySelector(`.${target}-card`);
        if (!parentCard) {
            console.warn(`[AnimationManager] Карточка .${target}-card не найдена`);
            container.innerHTML = '';
            container.appendChild(animImg);
            container.style.display = 'block';
            setTimeout(() => {
                container.style.display = 'none';
                container.innerHTML = '';
                activeAnimations[target] = false;
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

        // Позиционирование
        if (isSkin && skinSpecific) {
            if (animType === 'dodge') {
                animImg.style.top = avatarTopOffset + 'px';
                animImg.style.left = '50%';
                let transform = 'translateX(-50%)';
                if (target === 'hero') {
                    transform += ' scaleX(-1)';
                }
                animImg.style.transform = transform;
                animImg.style.width = '100%';
                animImg.style.height = 'auto';
                animImg.style.maxHeight = avatarHeight + 'px';
                animImg.style.objectFit = 'contain';
            } else if (animType === 'victory' || animType === 'defeat') {
                // ИСПРАВЛЕНО: анимация победы/поражения – ограничиваем областью аватара
                animImg.style.top = avatarTopOffset + 'px';
                animImg.style.left = '50%';
                let transform = 'translateX(-50%)';
                if (target === 'hero') {
                    transform += ' scaleX(-1)';
                }
                animImg.style.transform = transform;
                animImg.style.width = '100%';
                animImg.style.height = 'auto';
                animImg.style.maxHeight = avatarHeight + 'px';
                animImg.style.objectFit = 'contain';
            } else {
                // Скиновая атака – растягиваем по высоте аватара
                const proportionalWidth = (600 / 480) * avatarHeight;
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
            // Обычная анимация – центрируем по аватару
            animImg.style.top = avatarTopOffset + 'px';
            animImg.style.left = '50%';
            animImg.style.transform = 'translateX(-50%)';
            if (target === 'hero') {
                animImg.style.transform = 'translateX(-50%) scaleX(-1)';
            }
            animImg.style.width = '100%';
            animImg.style.height = 'auto';
            animImg.style.maxHeight = avatarHeight + 'px';
            animImg.style.objectFit = 'contain';
        }

        container.innerHTML = '';
        container.appendChild(animImg);
        container.style.display = 'block';

        // Длительность: скиновые атака/уворот – 2000 мс, победа/поражение – 2500 мс, остальные – 1000 мс
        let duration = 1000;
        if (isSkin && skinSpecific) {
            if (animType === 'victory' || animType === 'defeat') {
                duration = 2500;
            } else {
                duration = 2000;
            }
        }
        setTimeout(() => {
            container.style.display = 'none';
            container.innerHTML = '';
            activeAnimations[target] = false;
            resolve();
        }, duration);
    });
}
    
    return {
    preloadAllAnimations,
    playAnimation,
    hasSkinAnimation: function(skinId) {
        return !!skinAnimations[skinId];
    },
    skinAnimations: skinAnimations   // <-- добавить эту строку
};
})();
