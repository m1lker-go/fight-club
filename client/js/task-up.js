// task-up.js – полностью исправленный (синтаксис, реферальная система, адвент в модалке) с полной локализацией

let countdownInterval = null;
let lastTasksData = null;

function hasUnclaimedTasks() {
    if (!lastTasksData) return false;
    return lastTasksData.some(task => !task.completed && task.progress >= task.target_value);
}
window.hasUnclaimedTasks = hasUnclaimedTasks;

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

    const isVK = window.isVKMiniApp === true;
    let referralLink = '';

    if (isVK) {
        const appId = 54599234;
        referralLink = `https://vk.com/app${appId}?ref=${userData.referral_code}`;
    } else {
        referralLink = 'https://t.me/' + (window.BOT_USERNAME || 'CatFightingBot') + '?start=' + (userData.referral_code || 'ref');
    }

    referralDiv.innerHTML =
        '<div style="flex: 2; min-width: 0;">' +
            `<div style="font-size: 16px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${window.$t('daily_tasks:Referral.name', 'Пригласить друга')}</div>` +
            `<div style="font-size: 11px; color: #aaa; margin-top: 2px;">${window.$t('daily_tasks:Referral.description', 'Пригласи друга и получи 100 монет')}</div>` +
        '</div>' +
        '<div style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 8px;">' +
            '<span style="font-weight: bold; color: white; font-size: 14px;">100 <i class="fas fa-coins" style="color:white;"></i></span>' +
        '</div>' +
        '<div style="flex: 0 0 100px; display: flex; gap: 5px; justify-content: flex-end;">' +
            `<button class="claim-task-btn referral-copy-btn" style="padding: 8px; width: 45px; font-size: 14px;" title="${window.$t('common:Копировать', 'Копировать ссылку')}"><i class="fas fa-copy"></i></button>` +
            `<button class="claim-task-btn referral-share-btn" style="padding: 8px; width: 45px; font-size: 14px;" title="${window.$t('common:Поделиться', 'Поделиться')}"><i class="fas fa-share-alt"></i></button>` +
        '</div>';

    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast(window.$t('common:Ссылка скопирована!', 'Ссылка скопирована!'), 1500);
        } catch (e) {
            showToast(window.$t('common:Не удалось скопировать. Попробуйте позже.', 'Не удалось скопировать. Попробуйте позже.'), 1500);
        }
        document.body.removeChild(textarea);
    }

    referralDiv.querySelector('.referral-copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(referralLink)
            .then(() => showToast(window.$t('common:Ссылка скопирована!', 'Ссылка скопирована!'), 1500))
            .catch(() => fallbackCopy(referralLink));
    });

    referralDiv.querySelector('.referral-share-btn').addEventListener('click', () => {
        if (isVK && typeof vkBridge !== 'undefined') {
            fallbackCopy(referralLink);
            showToast(window.$t('common:Ссылка скопирована! Отправь её другу в сообщении.', 'Ссылка скопирована! Отправь её другу в сообщении.'), 3000);
        } else if (window.Telegram?.WebApp?.shareURL) {
            window.Telegram.WebApp.shareURL(referralLink, window.$t('common:Присоединяйся к игре Cat Fighting!', 'Присоединяйся к игре Cat Fighting!'));
        } else if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(referralLink));
        } else {
            fallbackCopy(referralLink);
        }
    });

    return referralDiv;
}

function showAdventModal(data) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.innerHTML = window.$t('tasks:Адвент-календарь', 'Адвент-календарь');
    modalBody.innerHTML = '';

    const tempContainer = document.createElement('div');
    renderAdventCalendarInContainer(data, tempContainer);
    modalBody.appendChild(tempContainer);

    modal.style.display = 'flex';

    const closeBtn = modal.querySelector('.close');
    const closeModal = () => { modal.style.display = 'none'; };
    if (closeBtn) closeBtn.onclick = closeModal;
    window.onclick = (event) => { if (event.target === modal) closeModal(); };
}

function renderAdventCalendarInContainer(data, container) {
    const currentDay = data.currentDay;
    const daysInMonth = data.daysInMonth;
    const nextAvailable = data.nextAvailable;
    const lastClaimed = data.lastClaimed;

    let html = '<div class="advent-grid">';
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
            iconHtml = '<i class="fas fa-tshirt" style="color: ' + color + ';"></i>';
        }

        html += `<div class="${className}" data-day="${day}"><div class="advent-icon">${iconHtml}</div><div class="advent-day-number">${day}</div></div>`;
    }
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.advent-day.available').forEach(div => {
        div.addEventListener('click', () => {
            const day = parseInt(div.dataset.day);
            claimAdventDay(day, daysInMonth);
        });
    });
}

window.showAdventModal = showAdventModal;

function showRewardToast(title, iconClass, subtitle) {
    iconClass = iconClass || 'fa-coins';
    subtitle = subtitle || '';
    const toast = document.createElement('div');
    toast.className = 'reward-toast';
    let inner = '<div class="reward-toast-content"><i class="fas ' + iconClass + '" style="font-size:20px;"></i><div><div class="reward-toast-title">' + title + '</div>';
    if (subtitle) {
        inner += '<div class="reward-toast-sub">' + subtitle + '</div>';
    }
    inner += '</div></div>';
    toast.innerHTML = inner;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 400);
        }, 2000);
    });
}

function renderTasks() {
    if (!userData) {
        console.warn('renderTasks: userData not ready, skipping');
        return;
    }
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="tasks-container">
            <div class="task-card" style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 0; padding: 12px; box-sizing: border-box; background-color: #2a303c;">
                <div style="flex: 2; min-width: 0;">
                    <div style="font-size: 16px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${window.$t('tasks:Адвент-календарь', 'Адвент-календарь')}</div>
                    <div style="font-size: 11px; color: #aaa; margin-top: 2px;">${window.$t('tasks:Ежедневные подарки каждый день декабря', 'Ежедневные подарки каждый день декабря')}</div>
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
            <div class="tasks-header">${window.$t('tasks:Ежедневные задания', 'Ежедневные задания')}</div>
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
    const tasksList = document.getElementById('tasksList');
    const countdownContainer = document.getElementById('countdownContainer');
    if (!tasksList) return;

    try {
        const res = await window.apiRequest(`/tasks/daily/list?_t=${Date.now()}`, { method: 'GET' });
        if (!res.ok) throw new Error('HTTP error! status: ' + res.status);
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

            let rewardHtml = '';
            if (task.reward_type === 'coins') {
                rewardHtml = task.reward_amount + ' <i class="fas fa-coins" style="color:white;"></i>';
            } else if (task.reward_type === 'coal') {
                rewardHtml = task.reward_amount + ' <i class="fas fa-cube" style="color:white;"></i>';
            } else if (task.reward_type === 'diamonds') {
                rewardHtml = task.reward_amount + ' <i class="fas fa-gem" style="color:white;"></i>';
            } else {
                rewardHtml = task.reward_amount + ' EXP';
            }

            const localized = window.$t(`daily_tasks:${task.name}`, { name: task.name, description: task.description });
            const displayName = localized?.name || task.name;
            const displayDesc = localized?.description || task.description;

            let altDesc = '';
            let altProgressHtml = '';
            if (task.id === 1 || task.id === 2 || task.id === 3) {
                altDesc = `<div style="font-size: 10px; color: #88ff88;">${window.$t('tasks:ИЛИ выиграть 10 боёв подряд', 'ИЛИ выиграть 10 боёв подряд')}</div>`;
                const streakProgress = Math.min(dailyWinStreak, 10);
                const streakPercent = (streakProgress / 10) * 100;
                altProgressHtml = 
                    '<div style="margin-top: 2px; display: flex; align-items: center; gap: 10px;">' +
                        '<div style="flex: 1; background-color: #2f3542; height: 6px; border-radius: 3px;">' +
                            '<div style="background-color: #00aaff; width: ' + streakPercent + '%; height: 100%; border-radius: 3px;"></div>' +
                        '</div>' +
                        '<div style="font-size: 10px; color: #aaa; min-width: 35px;">' + streakProgress + '/10</div>' +
                    '</div>';
            }

            let progressHtml = 
                '<div style="margin-top: 8px; display: flex; align-items: center; gap: 10px;">' +
                    '<div style="flex: 1; background-color: #2f3542; height: 6px; border-radius: 3px;">' +
                        '<div style="background-color: #00aaff; width: ' + progressPercent + '%; height: 100%; border-radius: 3px;"></div>' +
                    '</div>' +
                    '<div style="font-size: 10px; color: #aaa; min-width: 35px;">' + clampedProgress + '/' + task.target_value + '</div>' +
                '</div>';

           let isReadyToClaim = false;

if (!task.completed) {
    if (task.id !== 9) {
        isReadyToClaim = (task.progress >= task.target_value);
    }
    if (task.id === 9) {
        const championTarget = 10;
        const championProgress = completedTasksCount;
        const championPercent = Math.min(100, (championProgress / championTarget) * 100);
        progressHtml = 
            '<div style="margin-top: 8px; display: flex; align-items: center; gap: 10px;">' +
                '<div style="flex: 1; background-color: #2f3542; height: 6px; border-radius: 3px;">' +
                    '<div style="background-color: #00aaff; width: ' + championPercent + '%; height: 100%; border-radius: 3px;"></div>' +
                '</div>' +
                '<div style="font-size: 10px; color: #aaa; min-width: 35px;">' + championProgress + '/' + championTarget + '</div>' +
            '</div>';
        isReadyToClaim = championProgress >= championTarget;
    }
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

           taskCard.innerHTML = 
    '<div style="flex: 2; min-width: 0;">' +
        '<div style="font-size: 16px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + displayName + '</div>' +
        '<div style="font-size: 11px; color: #aaa; margin-top: 2px;">' + displayDesc + '</div>' +
        altDesc +
        progressHtml +
        altProgressHtml +
    '</div>' +
    '<div style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 5px; margin: 0 10px;">' +
        '<span style="font-weight: bold; color: white; font-size: 14px; white-space: nowrap;">' + rewardHtml + '</span>' +
    '</div>' +
    '<div style="flex: 0 0 50px; text-align: right;">' +
        '<button class="claim-task-btn ' + (isReadyToClaim ? 'active' : '') + '" ' +
                'data-task-id="' + task.id + '" ' +
                'data-reward-type="' + task.reward_type + '" ' +
                'data-reward-amount="' + task.reward_amount + '" ' +
                (task.completed ? 'disabled' : '') + ' ' +
                'style="padding: 8px; width: 100%; font-size: 14px;">' +
                '<i class="fas ' + (task.completed ? 'fa-check' : (isReadyToClaim ? 'fa-check' : (task.id === 11 || task.id === 12 ? 'fa-play' : 'fa-times'))) + '"></i>' +
        '</button>' +
    '</div>';
            tasksList.appendChild(taskCard);
        });

document.querySelectorAll('.task-card .claim-task-btn').forEach(btn => {
    if (!btn.dataset.taskId) return;

    btn.addEventListener('click', async (e) => {
        if (btn.disabled) return;
        btn.disabled = true;

        const taskId = parseInt(btn.dataset.taskId);
        const rewardType = btn.dataset.rewardType;
        const rewardAmount = parseInt(btn.dataset.rewardAmount);

        const currentTask = activeTasks.find(t => t.id === taskId);
        const isReady = currentTask ? currentTask.progress >= currentTask.target_value : false;

        if ((taskId === 11 || taskId === 12) && !isReady) {
            const ready = await checkAdsReady();
            if (!ready) {
                showToast(window.$t('tasks:Реклама пока недоступна. Попробуйте позже.', 'Реклама пока недоступна. Попробуйте позже.'), 2000);
                btn.disabled = false;
                return;
            }
            const watched = await showRewardedAd();
            if (watched) {
                try {
                    const updRes = await window.apiRequest('/tasks/daily/update/ads', {
                        method: 'POST',
                        body: JSON.stringify({ task_id: taskId })
                    });
                    const updData = await updRes.json();
                    if (updData.success) {
                        if (updData.autoCompleted) {
                            showToast(window.$t('tasks:Награда за рекламу получена!', 'Награда за рекламу получена!'), 1500);
                        } else {
                            showToast(window.$t('tasks:Прогресс рекламы обновлён!', 'Прогресс рекламы обновлён!'), 1500);
                        }
                        if (typeof loadDailyTasks === 'function') loadDailyTasks();
                        if (typeof refreshData === 'function') refreshData();
                    } else {
                        showToast(window.$t('common:Ошибка: ') + updData.error, 1500);
                    }
                } catch (err) {
                    console.error('[VK-Ads] Ошибка запроса обновления рекламного задания:', err);
                    showToast(window.$t('common:Ошибка соединения', 'Ошибка соединения'), 1500);
                }
            } else {
                showToast(window.$t('tasks:Вы не досмотрели рекламу до конца.', 'Вы не досмотрели рекламу до конца.'), 2000);
            }
            btn.disabled = false;
            return;
        }

        if (rewardType === 'exp') {
            await claimDailyExp(taskId, rewardAmount);
        } else {
            const res = await window.apiRequest('/tasks/daily/claim', {
                method: 'POST',
                body: JSON.stringify({ task_id: taskId })
            });
            const data = await res.json();
            if (data.error) {
                showToast(data.error, 1500);
            } else {
                if (typeof AudioManager !== 'undefined') AudioManager.playSound('reward');
                if (rewardType === 'coal') {
                    showRewardToast('+' + rewardAmount + ' ' + window.$t('common:Уголь', 'угля'), 'fa-cube');
                } else {
                    showRewardToast('+' + rewardAmount + ' ' + window.$t('common:Монеты', 'монет'), 'fa-coins');
                }
                loadDailyTasks();
                refreshData();
            }
        }
        btn.disabled = false;
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

        lastTasksData = tasksData;
        if (window.updateMainMenuNewIcons) window.updateMainMenuNewIcons();

    } catch (e) {
        console.error('Error loading daily tasks:', e);
    }
}

async function refreshTasksData() {
    if (!userData || !userData.id) return;
    try {
        const res = await window.apiRequest(`/tasks/daily/list?_t=${Date.now()}`, { method: 'GET' });
        const data = await res.json();
        if (data.tasks) {
            lastTasksData = data.tasks;
            if (window.updateMainMenuNewIcons) window.updateMainMenuNewIcons();
            if (typeof loadDailyTasks === 'function') loadDailyTasks();
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
    const time = getRemainingTime();
    const hoursStr = time.hours.toString().padStart(2, '0');
    const minutesStr = time.minutes.toString().padStart(2, '0');
    container.innerHTML = 
        '<div class="countdown-card">' +
            `<div class="countdown-message">${window.$t('tasks:Вы выполнили ВСЕ задания!', 'Вы выполнили ВСЕ задания!')}</div>` +
            '<div class="countdown-timer-wrapper">' +
                `<div class="countdown-label">${window.$t('tasks:Новые задания появятся через:', 'Новые задания появятся через:')}</div>` +
                '<div class="countdown-digits">' +
                    `<div class="digit-box"><div class="digit-value">${hoursStr}</div><div class="digit-unit">${window.$t('common:часов', 'часов')}</div></div>` +
                    '<div class="colon">:</div>' +
                    `<div class="digit-box"><div class="digit-value">${minutesStr}</div><div class="digit-unit">${window.$t('common:минут', 'минут')}</div></div>` +
                '</div>' +
            '</div>' +
        '</div>';
}

function startCountdownTimer() {
    if (countdownInterval) clearInterval(countdownInterval);
    updateCountdownDisplay();
    countdownInterval = setInterval(updateCountdownDisplay, 60000);
}

function stopCountdownTimer() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

// Новая версия showAdventCalendar (открывает в модалке)
function showAdventCalendar() {
    window.apiRequest('/tasks/advent', { method: 'GET' })
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(data => {
            console.log('[showAdventCalendar] data received', data);
            if (data.error) throw new Error(data.error);
            showAdventModal(data);
        })
        .catch(err => {
            console.error('Advent error:', err);
            showToast(window.$t('common:Ошибка: ') + err.message, 2000);
        });
}

let isClaiming = false;

// Исправленная claimAdventDay (без вызова renderAdventCalendar)
function claimAdventDay(day, daysInMonth) {
    if (isClaiming) {
        console.log('[ADVENT] Already claiming, ignoring');
        return;
    }
    const reward = getAdventReward(day, daysInMonth);

    isClaiming = true;
    const body = {};

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
            isClaiming = false;
        } else {
            if (typeof AudioManager !== 'undefined') AudioManager.playSound('reward');
            if (reward.type === 'coins') {
                showRewardToast('+' + reward.amount + ' ' + window.$t('common:Монеты', 'монет'), 'fa-coins');
            } else if (reward.type === 'item' && data.item) {
                showChestResult(data.item);
            } else {
                showToast(window.$t('common:Вы получили: ') + data.reward, 2000);
            }
            if (typeof refreshData === 'function') refreshData();
            if (typeof loadDailyTasks === 'function') loadDailyTasks();
            
            // Обновляем модальное окно, если оно открыто
            const modal = document.getElementById('roleModal');
            if (modal && modal.style.display === 'flex') {
                window.apiRequest('/tasks/advent', { method: 'GET' })
                    .then(res => res.json())
                    .then(updatedData => {
                        const modalBody = document.getElementById('modalBody');
                        if (modalBody) {
                            modalBody.innerHTML = '';
                            renderAdventCalendarInContainer(updatedData, modalBody);
                        }
                    })
                    .catch(err => console.error('Error refreshing advent modal:', err));
            }
            isClaiming = false;
        }
    })
    .catch(err => {
        console.error(err);
        showToast(window.$t('common:Ошибка соединения', 'Ошибка соединения'), 1500);
        isClaiming = false;
    });
}

function showClassChoiceModalForAdvent(expAmount) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = window.$t('common:Выберите класс', 'Выберите класс');
    modalBody.innerHTML = 
        `<p>${window.$t('tasks:Вы получили {amount} опыта. Какому классу хотите его вручить?', 'Вы получили {amount} опыта. Какому классу хотите его вручить?', { amount: expAmount })}</p>` +
        '<div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">' +
            `<button class="btn class-choice" data-class="warrior">${window.$t('common:Воин', 'Воин')}</button>` +
            `<button class="btn class-choice" data-class="assassin">${window.$t('common:Ассасин', 'Ассасин')}</button>` +
            `<button class="btn class-choice" data-class="mage">${window.$t('common:Маг', 'Маг')}</button>` +
        '</div>';

    modal.style.display = 'block';

    const classButtons = modalBody.querySelectorAll('.class-choice');
    classButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const classChoice = e.target.dataset.class;
            modal.style.display = 'none';

            const body = { classChoice: classChoice };
            const res = await window.apiRequest('/tasks/advent/claim', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.error) {
                showToast(data.error, 1500);
            } else {
                if (typeof AudioManager !== 'undefined') AudioManager.playSound('reward');
                showRewardToast('+' + expAmount + ' ' + window.$t('common:Опыт', 'опыта'), 'fa-star', window.$t('common:для класса ') + getClassNameRu(classChoice));
                await refreshData();
                if (data.leveledUp) showLevelUpModal(classChoice);
                // Обновляем модальное окно календаря, если оно открыто
                const modal = document.getElementById('roleModal');
                if (modal && modal.style.display === 'flex') {
                    const updatedData = await window.apiRequest('/tasks/advent', { method: 'GET' }).then(r => r.json());
                    const modalBody = document.getElementById('modalBody');
                    if (modalBody) {
                        modalBody.innerHTML = '';
                        renderAdventCalendarInContainer(updatedData, modalBody);
                    }
                } else {
                    if (typeof loadDailyTasks === 'function') loadDailyTasks();
                }
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

    modalTitle.innerText = window.$t('common:Выберите класс', 'Выберите класс');
    modalBody.innerHTML = 
        `<p>${window.$t('tasks:Вы получили {amount} опыта. Какому классу хотите его вручить?', 'Вы получили {amount} опыта. Какому классу хотите его вручить?', { amount: expAmount })}</p>` +
        '<div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">' +
            `<button class="btn class-choice" data-class="warrior">${window.$t('common:Воин', 'Воин')}</button>` +
            `<button class="btn class-choice" data-class="assassin">${window.$t('common:Ассасин', 'Ассасин')}</button>` +
            `<button class="btn class-choice" data-class="mage">${window.$t('common:Маг', 'Маг')}</button>` +
        '</div>';

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
                if (typeof AudioManager !== 'undefined') AudioManager.playSound('reward');
                showRewardToast('+' + expAmount + ' ' + window.$t('common:Опыт', 'опыта'), 'fa-star', window.$t('common:для класса ') + getClassNameRu(classChoice));
                await refreshData();
                if (data.leveledUp) showLevelUpModal(classChoice);
                renderTasks();
            }
        });
    });

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}

window.renderTasks = renderTasks;
window.showAdventCalendar = showAdventCalendar;
