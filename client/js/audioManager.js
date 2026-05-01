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
        defend:   '/assets/music/voice/cat_def.mp3',
        dodge:    '/assets/music/voice/cat_dodge.mp3',
        magic:    '/assets/music/voice/cat_magic.mp3',
        defeat:   '/assets/music/voice/cat_finish.mp3',
        victory:  '/assets/music/voice/cat_finish_win.mp3',
        reward:   '/assets/music/voice/voice_yes.mp3',  
        forge:    '/assets/music/voice/voice_kuz.mp3'  
    };

    let currentMenuTrackIndex = 0;
    let currentMusic = null;
    let isMusicEnabled = true;      // включена ли музыка вообще
    let isSfxEnabled = true;        // включены ли звуки вообще
    let musicVolume = 0.6;          // 0..1, начальное 60%
    let sfxVolume = 0.7;            // 0..1, начальное 70%
    let currentMode = 'menu';
    let menuTrackEndHandler = null;

    // Загрузка настроек из localStorage
function loadSettings() {
    const musicSetting = localStorage.getItem('musicEnabled');
    const sfxSetting = localStorage.getItem('sfxEnabled');
    if (musicSetting !== null) isMusicEnabled = musicSetting === 'true';
    if (sfxSetting !== null) isSfxEnabled = sfxSetting === 'true';
    
    const musicVol = localStorage.getItem('musicVolume');
    if (musicVol !== null) musicVolume = parseFloat(musicVol);
    const sfxVol = localStorage.getItem('sfxVolume');
    if (sfxVol !== null) sfxVolume = parseFloat(sfxVol);

    // +++ Автоматически включаем музыку, если громкость > 0 +++
    if (musicVolume > 0 && !isMusicEnabled) {
        isMusicEnabled = true;
        saveSettings(); // сохраняем исправленный флаг
    } else if (musicVolume === 0 && isMusicEnabled) {
        isMusicEnabled = false;
        saveSettings();
    }
}

    // Сохранение настроек
    function saveSettings() {
        localStorage.setItem('musicEnabled', isMusicEnabled);
        localStorage.setItem('sfxEnabled', isSfxEnabled);
        localStorage.setItem('musicVolume', musicVolume);
        localStorage.setItem('sfxVolume', sfxVolume);
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

    // Запуск музыки для меню
    function startMenuMusic() {
        if (!isMusicEnabled) return;
        stopMusic();
        currentMode = 'menu';
        const track = menuTracks[currentMenuTrackIndex];
        currentMusic = new Audio(track);
        currentMusic.loop = false;
        currentMusic.volume = musicVolume;
        menuTrackEndHandler = function() {
            currentMenuTrackIndex = (currentMenuTrackIndex + 1) % menuTracks.length;
            startMenuMusic();
        };
        currentMusic.addEventListener('ended', menuTrackEndHandler);
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
        currentMusic.volume = musicVolume;
        currentMusic.play().catch(e => console.warn('Fight music error:', e));
    }

    // Воспроизведение звукового эффекта
    function playSound(soundKey) {
        if (!isSfxEnabled) return;
        const url = sounds[soundKey];
        if (!url) return;
        const sfx = new Audio(url);
        sfx.volume = sfxVolume;
        sfx.play().catch(e => console.warn(`Sound ${soundKey} error:`, e));
    }

   // Установка громкости музыки (0..1)
function setMusicVolume(volume) {
    musicVolume = Math.min(1, Math.max(0, volume));
    // Если громкость стала > 0 и музыка была выключена – включаем
    if (musicVolume > 0 && !isMusicEnabled) {
        enableMusic(true);
    }
    // Если громкость стала 0 и музыка была включена – выключаем
    else if (musicVolume === 0 && isMusicEnabled) {
        enableMusic(false);
    }
    // Иначе просто меняем громкость текущего трека
    else if (currentMusic) {
        currentMusic.volume = musicVolume;
    }
    saveSettings();
}

    // Установка громкости звуков (0..1)
    function setSfxVolume(volume) {
        sfxVolume = Math.min(1, Math.max(0, volume));
        saveSettings();
    }

    // Включение/выключение музыки
    function enableMusic(enabled) {
        isMusicEnabled = enabled;
        saveSettings();
        if (!enabled) {
            stopMusic();
        } else {
            if (document.querySelector('.battle-screen') === null) {
                startMenuMusic();
            } else {
                startFightMusic();
            }
        }
    }

    // Включение/выключение звуков
    function enableSfx(enabled) {
        isSfxEnabled = enabled;
        saveSettings();
    }

    // Проверка экрана (для автоматического переключения)
    function onScreenChange() {
        const isBattle = document.querySelector('.battle-screen') !== null;
        if (isBattle) {
            if (currentMode !== 'fight') startFightMusic();
        } else {
            if (currentMode !== 'menu') startMenuMusic();
        }
    }

    // Получение текущей громкости (для отображения в настройках)
    function getMusicVolume() { return musicVolume; }
    function getSfxVolume() { return sfxVolume; }
    function getMusicEnabled() { return isMusicEnabled; }
    function getSfxEnabled() { return isSfxEnabled; }

    // Инициализация
    function init() {
    loadSettings();
    // Если музыка включена и громкость > 0 – запускаем музыку меню
    if (isMusicEnabled && musicVolume > 0) {
        // Небольшая задержка, чтобы DOM успел отрисовать главный экран
        setTimeout(() => {
            if (document.querySelector('.battle-screen') === null) {
                startMenuMusic();
            } else {
                startFightMusic();
            }
        }, 100);
    }
}
    init();

    return {
        enableMusic,
        enableSfx,
        playSound,
        onScreenChange,
        startFightMusic,
        startMenuMusic,
        setMusicVolume,
        setSfxVolume,
        getMusicVolume,
        getSfxVolume,
        getMusicEnabled,
        getSfxEnabled
    };
})();

window.AudioManager = AudioManager;
