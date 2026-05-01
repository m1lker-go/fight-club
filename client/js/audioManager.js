// Audio Manager – музыка и звуковые эффекты
const AudioManager = (function() {
    // Музыкальные треки (меню)
    const menuTracks = [
        '/assets/music/musicgame_1.mp3',
        '/assets/music/musicgame_2.mp3',
        '/assets/music/musicgame_3.mp3',
        '/assets/music/musicgame_4.mp3'
    ];
    const fightTrack = '/assets/music/musicgame_fight.mp3';

    // Звуковые эффекты
    const sounds = {
        attack:   '/assets/music/voice/cat_attack.mp3',
        crit:     '/assets/music/voice/cat_crit.mp3',
        defend:   '/assets/music/voice/cat_def.mp3',     // когда бьют нас
        dodge:    '/assets/music/voice/cat_dodge.mp3',
        magic:    '/assets/music/voice/cat_magic.mp3',   // ультимейт/магия
        defeat:   '/assets/music/voice/cat_finish.mp3',
        victory:  '/assets/music/voice/cat_finish_win.mp3'
    };

    let currentMenuTrackIndex = 0;
    let currentMusic = null;          // HTMLAudioElement
    let isMusicEnabled = true;
    let isSfxEnabled = true;
    let currentMode = 'menu';         // 'menu' или 'fight'
    let menuTrackEndHandler = null;

    // Загрузка настроек из localStorage
    function loadSettings() {
        const musicSetting = localStorage.getItem('musicEnabled');
        const sfxSetting = localStorage.getItem('sfxEnabled');
        if (musicSetting !== null) isMusicEnabled = musicSetting === 'true';
        if (sfxSetting !== null) isSfxEnabled = sfxSetting === 'true';
    }

    // Сохранение настроек
    function saveSettings() {
        localStorage.setItem('musicEnabled', isMusicEnabled);
        localStorage.setItem('sfxEnabled', isSfxEnabled);
    }

    // Остановка текущей музыки
    function stopMusic() {
        if (currentMusic) {
            currentMusic.pause();
            currentMusic.currentTime = 0;
            if (menuTrackEndHandler) {
                currentMusic.removeEventListener('ended', menuTrackEndHandler);
                menuTrackEndHandler = null;
            }
            currentMusic = null;
        }
    }

    // Запуск музыки для меню (циклическое переключение треков)
    function startMenuMusic() {
        if (!isMusicEnabled) return;
        stopMusic();
        currentMode = 'menu';
        const track = menuTracks[currentMenuTrackIndex];
        currentMusic = new Audio(track);
        currentMusic.loop = false; // будем переключать вручную по окончании
        menuTrackEndHandler = function() {
            // переключаем на следующий трек по кругу
            currentMenuTrackIndex = (currentMenuTrackIndex + 1) % menuTracks.length;
            startMenuMusic(); // рекурсивно запустим следующий
        };
        currentMusic.addEventListener('ended', menuTrackEndHandler);
        currentMusic.volume = 0.6; // можно вынести в настройки позже
        currentMusic.play().catch(e => console.warn('Music play error:', e));
    }

    // Запуск боевой музыки
    function startFightMusic() {
        if (!isMusicEnabled) return;
        if (currentMode === 'fight' && currentMusic && currentMusic.src.includes(fightTrack)) return;
        stopMusic();
        currentMode = 'fight';
        currentMusic = new Audio(fightTrack);
        currentMusic.loop = true;
        currentMusic.volume = 0.6;
        currentMusic.play().catch(e => console.warn('Fight music error:', e));
    }

    // Воспроизведение звукового эффекта
    function playSound(soundKey) {
        if (!isSfxEnabled) return;
        const url = sounds[soundKey];
        if (!url) return;
        const sfx = new Audio(url);
        sfx.volume = 0.7;
        sfx.play().catch(e => console.warn(`Sound ${soundKey} error:`, e));
    }

    // Публичные методы
    function enableMusic(enabled) {
        isMusicEnabled = enabled;
        saveSettings();
        if (!enabled) {
            stopMusic();
        } else {
            // если текущий экран не бой - запустить меню, иначе бой
            if (document.querySelector('.battle-screen') === null) {
                startMenuMusic();
            } else {
                startFightMusic();
            }
        }
    }

    function enableSfx(enabled) {
        isSfxEnabled = enabled;
        saveSettings();
    }

    // Проверка, находится ли сейчас бой (используется для переключения)
    function onScreenChange() {
        const isBattle = document.querySelector('.battle-screen') !== null;
        if (isBattle) {
            if (currentMode !== 'fight') startFightMusic();
        } else {
            if (currentMode !== 'menu') startMenuMusic();
        }
    }

    // Инициализация
    function init() {
        loadSettings();
        // Наблюдаем за появлением/исчезновением экрана боя (MutationObserver – опционально)
        // Для простоты будем вызывать onScreenChange при каждом рендере экрана
        // Внедрим хуки в функции showScreen и renderBattle
        window.audioManager = { onScreenChange, enableMusic, enableSfx, playSound };
    }

    init();

    return {
        enableMusic,
        enableSfx,
        playSound,
        onScreenChange
    };
})();

// Глобальный доступ
window.AudioManager = AudioManager;
