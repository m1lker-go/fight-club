// task-up.js (исправленный) – с авто-исчезающими модалками наград

let countdownInterval = null;
let lastTasksData = null;  // храним последние данные заданий

// Функция для проверки наличия неполученных наград
function hasUnclaimedTasks() {
    if (!lastTasksData) return false;
    return lastTasksData.some(task => !task.completed && task.progress >= task.target_value);
}
window.hasUnclaimedTasks = hasUnclaimedTasks;

function renderAdventCalendarInContainer(data, container) {
    // Не используется
}

function renderReferral() {
    const referralDiv = document.createElement('div');
    referralDiv.className = 'task-card referral-card';
    referralDiv.style.display = 'flex';
    referralDiv.style.alignItems = 'center';
    referralDiv.style.justifyContent = 'space-between';
    referralDiv.style.width = '100%';
    referralDiv.style.marginBottom = '0';
    referralDiv.style.padding = '12px';
    referralDiv.style.boxSizing = 'border-box';
    referralDiv.style.backgroundColor = '#2a303c';

    const referralLink = `https://t.me/${window.BOT_USERNAME}?start=${userData.referral_code || 'ref'}`;

    referralDiv.innerHTML = `
        <div style="flex: 2; min-width: 0;">
            <div style="font-size: 16px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Пригласить друга</div>
            <div style="font-size: 11px; color: #aaa; margin-top: 2px;">Пригласи друга и получи 100 монет</div>
        </div>
        <div style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 8px;">
            <span style="font-weight: bold; color: white; font-size: 14px;">100 <i class="fas fa-coins" style="color:white;"></i></span>
        </div>
        <div style="flex: 0 0 100px; display: flex; gap: 5px; justify-content: flex-end;">
            <button class="claim-task-btn referral-copy-btn" style="padding: 8px; width: 45px; font-size: 14px;" title="Копировать ссылку"><i class="fas fa-copy"></i></button>
            <button class="claim-task-btn referral-share-btn" style="padding: 8px; width: 45px; font-size: 14px;" title="Поделиться"><i class="fas fa-share-alt"></i></button>
        </div>
    `;

    referralDiv.querySelector('.referral-copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(referralLink).then(() => {
            showToast('Ссылка скопирована!', 1500);
        }).catch(() => {
            showToast('Ошибка копирования', 1500)
        });
    });

    referralDiv.querySelector('.referral-share-btn').addEventListener('click', () => {
        if (window.Telegram?.WebApp?.shareURL) {
            window.Telegram.WebApp.shareURL(referralLink, 'Присоединяйся к игре Cat Fighting!');
        } else if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}`);
        } else {
            navigator.clipboard.writeText(referralLink).then(() => {
                showToast('Ссылка скопирована!', 1500);
            });
        }
    });

    return referralDiv;
}

// Автоматическое модальное окно награды (исчезает через 2 секунды)
function showAutoReward(title, iconClass = 'fa-coins', subtitle = '') {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const closeBtn = modal.querySelector('.close');
    
    // Прячем крестик на время показа
    if (closeBtn) closeBtn.style.display = 'none';
    modalTitle.innerHTML = '';  // убираем заголовок

    modalBody.innerHTML = `
        <div style="text-align:center; color:white;">
            <i class="fas ${iconClass}" style="font-size:36px; color:#f1c40f; margin-bottom:12px; display:block;"></i>
            <div style="font-size:18px; font-weight:bold;">${title}</div>
            ${subtitle ? `<div style="font-size:14px; color:#aaa; margin-top:6px;">${subtitle}</div>` : ''}
        </div>
    `;
    
    // Добавляем класс для анимации (использует существующие стили .modal)
    modal.classList.add('auto-reward-modal');
    modal.style.display = 'flex';
    
    // Плавно скрываем через 2 секунды
    setTimeout(() => {
        modal.classList.add('fade-out');
        modal.addEventListener('transitionend', function handler() {
            modal.removeEventListener('transitionend', handler);
            modal.style.display = 'none';
            modal.classList.remove('auto-reward-modal', 'fade-out');
            if (closeBtn) closeBtn.style.display = '';
        });
        // Fallback на случай отсутствия transitionend
        setTimeout(() => {
            if (modal.classList.contains('fade-out')) {
                modal.style.display = 'none';
                modal.classList.remove('auto-reward-modal', 'fade-out');
                if (closeBtn) closeBtn.style.display = '';
            }
        }, 500);
    }, 2000);

    // Закрытие по клику на затемнённый фон (опционально)
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.add('fade-out');
        }
    };
}

function renderTasks() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="tasks-container">
            <div class="task-card" style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 0; padding: 12px; box-sizing: border-box; background-color: #2a303c;">
                <div style="flex: 2; min-width: 0;">
                    <div style="font-size: 16px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Адвент-календарь</div>
                    <div style="font-size: 11px; color: #aaa; margin-top: 2px;">Ежедневные подарки каждый день декабря</div>
                </div>
                <div style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 8px; margin: 0 10px;">
                    <i class="fas fa-coins" style="color: white; font-size: 16px;"></i>
                    <span style="font-size: 12px; color: white;">EXP</span>
                    <i class="fas fa-tshirt" style="color: white; font-size: 16px;"></i>
                </div>
                <div style="flex: 0 0 100px; text-align: right;">
                    <button class="advent-eye-btn" id="showAdventBtn" style="padding: 8px; width: 100%; font-size: 14px;"><i class="fas fa-eye"></i></button>
                </div>
            </div>
            <div id="referralPlaceholder"></div>
            <div class="tasks-header">Ежедневные задания</div>
            <div id="tasksList"></div>
            <div id="countdownContainer" class="countdown-container" style="display: none;"></div>
        </div>
    `;

    const referralPlaceholder = document.getElementById('referralPlaceholder');
    if (referralPlaceholder) {
        referralPlaceholder.appendChild(renderReferral());
    }

    const showAdventBtn = document.getElementById('showAdventBtn');
    if (showAdventBtn) {
        showAdventBtn.onclick = () => {
            console.log('Opening advent calendar');
            showAdventCalendar();
        };
    }

    loadDailyTasks();
}

async function loadDailyTasks() {
    if (currentScreen !== 'tasks') return;
    const tasksList = document.getElementById('tasksList');
    const countdownContainer = document.getElementById('countdownContainer');
    if (!tasksList) return;

    try {
        // Используем apiRequest, user_id добавится автоматически
        const res = await window.apiRequest('/tasks/daily/list', { method: 'GET' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        const tasksData = data.tasks;
        const dailyWinStreak = data.dailyWinStreak || 0;
        const totalTasksCount = data.totalTasksCount || 0;
        const completedTasksCount = data.completedTasksCount || 0;

        if (!Array.isArray(tasksData)) {
            console.error('Ответ не является массивом:', tasksData);
            return;
        }

        const activeTasks = tasksData.filter(task => !task.completed);
        activeTasks.sort((a, b) => {
            const aReady = a.progress >= a.target_value;
            const bReady = b.progress >= b.target_value;
            if (aReady && !bReady) return -1;
            if (!aReady && bReady) return 1;
            return 0;
        });

        tasksList.innerHTML = '';

        activeTasks.forEach((task, index) => {
            const clampedProgress = Math.min(task.progress, task.target_value);
            const progressPercent = (clampedProgress / task.target_value) * 100;
            const rewardText = task.reward_type === 'coins' 
                ? `${task.reward_amount} <i class="fas fa-coins" style="color:white;"></i>` 
                : `${task.reward_amount} EXP`;

            const translated = dailyTaskTranslations[task.name] || {};
            const displayName = translated.name || task.name;
            const displayDesc = translated.description || task.description;

            let altDesc = '';
            let altProgressHtml = '';
            if (task.id === 1 || task.id === 2 || task.id === 3) {
                altDesc = '<div style="font-size: 10px; color: #88ff88;">ИЛИ выиграть 10 боёв подряд</div>';
                const streakProgress = Math.min(dailyWinStreak, 10);
                const streakPercent = (streakProgress / 10) * 100;
                altProgressHtml = `
                    <div style="margin-top: 2px; display: flex; align-items: center; gap: 10px;">
                        <div style="flex: 1; background-color: #2f3542; height: 6px; border-radius: 3px;">
                            <div style="background-color: #00aaff; width: ${streakPercent}%; height: 100%; border-radius: 3px;"></div>
                        </div>
                        <div style="font-size: 10px; color: #aaa; min-width: 35px;">${streakProgress}/10</div>
                    </div>
                `;
            }

            let progressHtml = `
                <div style="margin-top: 8px; display: flex; align-items: center; gap: 10px;">
                    <div style="flex: 1; background-color: #2f3542; height: 6px; border-radius: 3px;">
                        <div style="background-color: #00aaff; width: ${progressPercent}%; height: 100%; border-radius: 3px;"></div>
                    </div>
                    <div style="font-size: 10px; color: #aaa; min-width: 35px;">${clampedProgress}/${task.target_value}</div>
                </div>
            `;

            let isReadyToClaim = false;
            if (task.id === 9) {
                const championPercent = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
                progressHtml = `
                    <div style="margin-top: 8px; display: flex; align-items: center; gap: 10px;">
                        <div style="flex: 1; background-color: #2f3542; height: 6px; border-radius: 3px;">
                            <div style="background-color: #00aaff; width: ${championPercent}%; height: 100%; border-radius: 3px;"></div>
                        </div>
                        <div style="font-size: 10px; color: #aaa; min-width: 35px;">${completedTasksCount}/${totalTasksCount}</div>
                    </div>
                `;
                isReadyToClaim = completedTasksCount >= totalTasksCount;
            } else {
                isReadyToClaim = task.progress >= task.target_value;
            }

            const taskCard = document.createElement('div');
            taskCard.className = 'task-card';
            taskCard.style.display = 'flex';
            taskCard.style.alignItems = 'center';
            taskCard.style.justifyContent = 'space-between';
            taskCard.style.width = '100%';
            taskCard.style.marginBottom = '0';
            taskCard.style.padding = '12px';
            taskCard.style.boxSizing = 'border-box';
            taskCard.style.backgroundColor = index % 2 === 0 ? '#2a303c' : '#232833';

            taskCard.innerHTML = `
                <div style="flex: 2; min-width: 0;">
                    <div style="font-size: 16px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayName}</div>
                    <div style="font-size: 11px; color: #aaa; margin-top: 2px;">${displayDesc}</div>
                    ${altDesc}
                    ${progressHtml}
                    ${altProgressHtml}
                </div>
                <div style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 5px; margin: 0 10px;">
                    <span style="font-weight: bold; color: white; font-size: 14px; white-space: nowrap;">${rewardText}</span>
                </div>
                <div style="flex: 0 0 50px; text-align: right;">
                    <button class="claim-task-btn ${isReadyToClaim ? 'active' : ''}" 
                            data-task-id="${task.id}"
                            data-reward-type="${task.reward_type}"
                            data-reward-amount="${task.reward_amount}"
                            style="padding: 8px; width: 100%; font-size: 14px;">
                        <i class="fas ${isReadyToClaim ? 'fa-check' : 'fa-times'}"></i>
                    </button>
                </div>
            `;
            tasksList.appendChild(taskCard);
        });

        document.querySelectorAll('.task-card .claim-task-btn').forEach(btn => {
            if (!btn.dataset.taskId) return;

            btn.addEventListener('click', async (e) => {
                const taskId = parseInt(btn.dataset.taskId);
                const rewardType = btn.dataset.rewardType;
                const rewardAmount = parseInt(btn.dataset.rewardAmount);

                if (rewardType === 'exp') {
                    claimDailyExp(taskId, rewardAmount);
                } else {
                    const res = await window.apiRequest('/tasks/daily/claim', {
                        method: 'POST',
                        body: JSON.stringify({ task_id: taskId })
                    });
                    const data = await res.json();
                    if (data.error) {
                       showToast(data.error, 1500);
                    } else {
                        showAutoReward(`+${rewardAmount} монет`, 'fa-coins');
                        loadDailyTasks();
                        refreshData();
                    }
                }
            });
        });

        const allCompleted = completedTasksCount >= totalTasksCount;
        if (countdownContainer) {
            if (allCompleted) {
                countdownContainer.style.display = 'block';
                startCountdownTimer();
            } else {
                countdownContainer.style.display = 'none';
                stopCountdownTimer();
            }
        }

        // Сохраняем данные заданий для проверки наличия неполученных наград
        lastTasksData = tasksData;
        if (window.updateMainMenuNewIcons) {
            window.updateMainMenuNewIcons();
        }

    } catch (e) {
        console.error('Error loading daily tasks:', e);
    }
}

// Функция для фоновой загрузки данных заданий без рендера
async function refreshTasksData() {
    if (!userData || !userData.id) return;
    try {
        const res = await window.apiRequest('/tasks/daily/list', { method: 'GET' });
        const data = await res.json();
        if (data.tasks) {
            lastTasksData = data.tasks;
            if (window.updateMainMenuNewIcons) window.updateMainMenuNewIcons();
        }
    } catch (e) {
        console.error('Failed to refresh tasks data', e);
    }
}
window.refreshTasksData = refreshTasksData;
window.loadDailyTasks = loadDailyTasks;

function getRemainingTime() {
    const now = new Date();
    const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    const nextDay = new Date(moscowTime);
    nextDay.setDate(moscowTime.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    const diffMs = nextDay - moscowTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
}

function updateCountdownDisplay() {
    const container = document.getElementById('countdownContainer');
    if (!container) return;
    const { hours, minutes } = getRemainingTime();
    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    container.innerHTML = `
        <div class="countdown-card">
            <div class="countdown-message">Вы выполнили ВСЕ задания!</div>
            <div class="countdown-timer-wrapper">
                <div class="countdown-label">Новые задания появятся через:</div>
                <div class="countdown-digits">
                    <div class="digit-box">
                        <div class="digit-value">${hoursStr}</div>
                        <div class="digit-unit">часов</div>
                    </div>
                    <div class="colon">:</div>
                    <div class="digit-box">
                        <div class="digit-value">${minutesStr}</div>
                        <div class="digit-unit">минут</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function startCountdownTimer() {
    if (countdownInterval) clearInterval(countdownInterval);
    updateCountdownDisplay();
    countdownInterval = setInterval(() => {
        updateCountdownDisplay();
    }, 60000);
}

function stopCountdownTimer() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

function showAdventCalendar() {
    window.apiRequest('/tasks/advent', { method: 'GET' })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log('[showAdventCalendar] data received', data);
            if (data.error) throw new Error(data.error);
            renderAdventCalendar(data);
        })
        .catch(err => {
            console.error('Advent error:', err);
            showToast('Ошибка загрузки календаря: ' + err.message, 2000);
        });
}

function renderAdventCalendar(data) {
    const { currentDay, daysInMonth, nextAvailable, lastClaimed, lastClaimDate } = data;
    const content = document.getElementById('content');

    let html = '<h3 style="text-align:center;">Адвент-календарь</h3><div class="advent-grid">';
    for (let day = 1; day <= daysInMonth; day++) {
        let className = 'advent-day';
        if (day <= lastClaimed) {
            className += ' claimed';
        } else if (day === nextAvailable && nextAvailable !== null) {
            className += ' available';
        } else {
            className += ' locked';
        }

        const reward = getAdventReward(day, daysInMonth);
        let iconHtml = '';
        if (reward.type === 'coins') {
            iconHtml = '<i class="fas fa-coins" style="color: white;"></i>';
        } else if (reward.type === 'exp') {
            iconHtml = '<span style="font-weight:bold; color: white;">EXP</span>';
        } else if (reward.type === 'item') {
            let color = '#aaa';
            if (reward.rarity === 'uncommon') color = '#2ecc71';
            else if (reward.rarity === 'rare') color = '#2e86de';
            else if (reward.rarity === 'epic') color = '#9b59b6';
            else if (reward.rarity === 'legendary') color = '#f1c40f';
            iconHtml = `<i class="fas fa-tshirt" style="color: ${color};"></i>`;
        }

        html += `<div class="${className}" data-day="${day}">
            <div class="advent-icon">${iconHtml}</div>
            <div class="advent-day-number">${day}</div>
        </div>`;
    }
    html += '</div><button class="btn" id="backFromAdvent">Назад</button>';
    content.innerHTML = html;

    document.querySelectorAll('.advent-day.available').forEach(div => {
        div.addEventListener('click', () => {
            const day = parseInt(div.dataset.day);
            claimAdventDay(day, daysInMonth);
        });
    });

    document.getElementById('backFromAdvent').addEventListener('click', () => renderTasks());
}

let isClaiming = false;
let reloadTimeout = null;

function claimAdventDay(day, daysInMonth) {
    if (isClaiming) {
        console.log('[ADVENT] Already claiming, ignoring');
        return;
    }
    const reward = getAdventReward(day, daysInMonth);

    isClaiming = true;
    const body = {}; // не нужно явно передавать tg_id или user_id

    if (reward.type === 'exp') {
        showClassChoiceModalForAdvent(reward.amount);
        isClaiming = false;
        return;
    }

    window.apiRequest('/tasks/advent/claim', {
        method: 'POST',
        body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showToast(data.error, 1500);
        } else {
            if (reward.type === 'coins') {
                showAutoReward(`+${reward.amount} монет`, 'fa-coins');
            } else if (reward.type === 'item' && data.item) {
                showChestResult(data.item);
            } else {
                showToast('Вы получили: ' + data.reward, 2000);
            }
            if (reloadTimeout) clearTimeout(reloadTimeout);
            reloadTimeout = setTimeout(() => {
                showAdventCalendar();
                refreshData();
                isClaiming = false;
                reloadTimeout = null;
            }, 1500);
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Ошибка соединения', 1500);
        isClaiming = false;
    });
}

function showClassChoiceModalForAdvent(expAmount) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = 'Выберите класс';
    modalBody.innerHTML = `
        <p>Вы получили ${expAmount} опыта. Какому классу хотите его вручить?</p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
            <button class="btn class-choice" data-class="warrior">Воин</button>
            <button class="btn class-choice" data-class="assassin">Ассасин</button>
            <button class="btn class-choice" data-class="mage">Маг</button>
        </div>
    `;

    modal.style.display = 'block';

    const classButtons = modalBody.querySelectorAll('.class-choice');
    classButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const classChoice = e.target.dataset.class;
            modal.style.display = 'none';

            const body = { classChoice };
            const res = await window.apiRequest('/tasks/advent/claim', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.error) {
                showToast(data.error, 1500);
            } else {
                showAutoReward(`+${expAmount} опыта`, 'fa-star', `для класса ${getClassNameRu(classChoice)}`);
                await refreshData();
                if (data.leveledUp) {
                    showLevelUpModal(classChoice);
                }
                setTimeout(() => {
                    showAdventCalendar();
                }, 500);
            }
        });
    });

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}

function claimDailyExp(taskId, expAmount) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = 'Выберите класс';
    modalBody.innerHTML = `
        <p>Вы получили ${expAmount} опыта. Какому классу хотите его вручить?</p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
            <button class="btn class-choice" data-class="warrior">Воин</button>
            <button class="btn class-choice" data-class="assassin">Ассасин</button>
            <button class="btn class-choice" data-class="mage">Маг</button>
        </div>
    `;

    modal.style.display = 'block';

    const classButtons = modalBody.querySelectorAll('.class-choice');
    classButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const classChoice = e.target.dataset.class;
            modal.style.display = 'none';

            const res = await window.apiRequest('/tasks/daily/claim', {
                method: 'POST',
                body: JSON.stringify({ 
                    task_id: taskId, 
                    class_choice: classChoice 
                })
            });
            const data = await res.json();
            if (data.error) {
                showToast(data.error, 1500);
            } else {
                showAutoReward(`+${expAmount} опыта`, 'fa-star', `для класса ${getClassNameRu(classChoice)}`);
                await refreshData();
                if (data.leveledUp) {
                    showLevelUpModal(classChoice);
                }
                renderTasks();
            }
        });
    });

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}
