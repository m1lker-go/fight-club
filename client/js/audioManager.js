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
    let isMusicEnabled = true;
    let isSfxEnabled = true;
    let musicVolume = 0.6;
    let sfxVolume = 0.7;
    let currentMode = 'menu';
    let menuTrackEndHandler = null;
    let pendingResume = null;
    let audioUnlocked = false;

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

        if (musicVolume > 0 && !isMusicEnabled) {
            isMusicEnabled = true;
            saveSettings();
        } else if (musicVolume === 0 && isMusicEnabled) {
            isMusicEnabled = false;
            saveSettings();
        }
    }

    function saveSettings() {
        localStorage.setItem('musicEnabled', isMusicEnabled);
        localStorage.setItem('sfxEnabled', isSfxEnabled);
        localStorage.setItem('musicVolume', musicVolume);
        localStorage.setItem('sfxVolume', sfxVolume);
    }

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

   function startMenuMusic() {
    if (!isMusicEnabled) return;
    unlockAudio().then(() => {
        // Если уже играет меню-трек и режим меню – не перезапускаем
        if (currentMode === 'menu' && currentMusic && menuTracks.includes(currentMusic.src)) return;
        // Останавливаем всё, что играет, и сбрасываем режим
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
    });
}

    function startFightMusic() {
        if (!isMusicEnabled) return;
        // Разблокируем аудиоконтекст перед запуском
        unlockAudio().then(() => {
            if (currentMode === 'fight' && currentMusic && currentMusic.src.includes(fightTrack)) return;
            stopMusic();
            currentMode = 'fight';
            currentMusic = new Audio(fightTrack);
            currentMusic.loop = true;
            currentMusic.volume = musicVolume;
            currentMusic.play().catch(e => console.warn('Fight music error:', e));
        });
    }

    function playSound(soundKey) {
        if (!isSfxEnabled) return;
        const url = sounds[soundKey];
        if (!url) return;
        // Разблокировка перед воспроизведением звука
        unlockAudio().then(() => {
            const sfx = new Audio(url);
            sfx.volume = sfxVolume;
            sfx.play().catch(e => console.warn(`Sound ${soundKey} error:`, e));
        });
    }

    function unlockAudio() {
        if (audioUnlocked) return Promise.resolve();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = audioCtx.createBuffer(1, 1, 22050);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        
        if (audioCtx.state === 'suspended') {
            if (pendingResume) return pendingResume;
            pendingResume = audioCtx.resume().then(() => {
                console.log('[AudioManager] AudioContext разблокирован');
                audioUnlocked = true;
                pendingResume = null;
                // После разблокировки – запускаем музыку в зависимости от экрана
                if (document.querySelector('.battle-screen') === null) {
                    if (currentMode !== 'menu') startMenuMusic();
                } else {
                    if (currentMode !== 'fight') startFightMusic();
                }
            }).catch(e => console.warn('AudioContext resume failed:', e));
            return pendingResume;
        } else {
            audioUnlocked = true;
            return Promise.resolve();
        }
    }

    function setMusicVolume(volume) {
        musicVolume = Math.min(1, Math.max(0, volume));
        if (musicVolume > 0 && !isMusicEnabled) {
            enableMusic(true);
        } else if (musicVolume === 0 && isMusicEnabled) {
            enableMusic(false);
        } else if (currentMusic) {
            currentMusic.volume = musicVolume;
        }
        saveSettings();
    }

    function setSfxVolume(volume) {
        sfxVolume = Math.min(1, Math.max(0, volume));
        saveSettings();
    }

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

    function enableSfx(enabled) {
        isSfxEnabled = enabled;
        saveSettings();
    }

    function onScreenChange() {
        const isBattle = document.querySelector('.battle-screen') !== null;
        if (isBattle) {
            if (currentMode !== 'fight') startFightMusic();
        } else {
            if (currentMode !== 'menu') startMenuMusic();
        }
    }

    function getMusicVolume() { return musicVolume; }
    function getSfxVolume() { return sfxVolume; }
    function getMusicEnabled() { return isMusicEnabled; }
    function getSfxEnabled() { return isSfxEnabled; }

    function init() {
        loadSettings();
        if (isMusicEnabled && musicVolume > 0) {
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
        unlockAudio,
        getSfxEnabled
    };
})();

window.AudioManager = AudioManager;
