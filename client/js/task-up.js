// task-up.js (Исправленный: строгие классы, без inline-стилей, правильные размеры кнопок)

let countdownInterval = null;
let lastTasksData = null;

function hasUnclaimedTasks() {
    if (!lastTasksData) return false;
    return lastTasksData.some(task => !task.completed && task.progress >= task.target_value);
}
window.hasUnclaimedTasks = hasUnclaimedTasks;

function renderReferral() {
    const referralDiv = document.createElement('div');
    // Классы для четности/нечетности не нужны для реферала, он один, но добавим базовый стиль карточки
    referralDiv.className = 'task-card'; 
    
    const referralLink = `https://t.me/${window.BOT_USERNAME}?start=${userData.referral_code || 'ref'}`;

    referralDiv.innerHTML = `
        <div class="task-info">
            <div class="task-title">Пригласить друга</div>
            <div class="task-desc">Пригласи друга и получи 100 монет</div>
        </div>
        <div class="task-reward">
            <span>100 <i class="fas fa-coins"></i></span>
        </div>
        <div class="task-actions-small">
            <button class="action-btn-sm referral-copy-btn" title="Копировать"><i class="fas fa-copy"></i></button>
            <button class="action-btn-sm referral-share-btn" title="Поделиться"><i class="fas fa-share-alt"></i></button>
        </div>
    `;

    referralDiv.querySelector('.referral-copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(referralLink).then(() => {
            showToast('Ссылка скопирована!', 1500);
        }).catch(() => {
            showToast('Ошибка копирования', 1500);
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

function renderTasks() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="tasks-container">
            <!-- Карточка Адвента -->
            <div class="task-card">
                <div class="task-info">
                    <div class="task-title">Адвент-календарь</div>
                    <div class="task-desc">Ежедневные подарки каждый день декабря</div>
                </div>
                <div class="task-reward">
                    <i class="fas fa-coins"></i>
                    <span>EXP</span>
                    <i class="fas fa-tshirt"></i>
                </div>
                <div class="task-actions">
                    <button class="action-btn-lg" id="showAdventBtn"><i class="fas fa-eye"></i></button>
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
        showAdventBtn.onclick = () => showAdventCalendar();
    }

    loadDailyTasks();
}

async function loadDailyTasks() {
    if (currentScreen !== 'tasks') return;
    const tasksList = document.getElementById('tasksList');
    const countdownContainer = document.getElementById('countdownContainer');
    if (!tasksList) return;

    try {
        const res = await window.apiRequest('/tasks/daily/list', { method: 'GET' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        const tasksData = data.tasks;
        const dailyWinStreak = data.dailyWinStreak || 0;
        const totalTasksCount = data.totalTasksCount || 0;
        const completedTasksCount = data.completedTasksCount || 0;

        if (!Array.isArray(tasksData)) return;

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
                ? `${task.reward_amount} <i class="fas fa-coins"></i>` 
                : `${task.reward_amount} EXP`;

            const translated = dailyTaskTranslations[task.name] || {};
            const displayName = translated.name || task.name;
            const displayDesc = translated.description || task.description;

            let altDesc = '';
            let altProgressHtml = '';
            // Доп. прогресс бар для побед
            if (task.id === 1 || task.id === 2 || task.id === 3) {
                altDesc = '<div class="task-alt-desc">ИЛИ выиграть 10 боёв подряд</div>';
                const streakProgress = Math.min(dailyWinStreak, 10);
                const streakPercent = (streakProgress / 10) * 100;
                altProgressHtml = `
                    <div class="task-progress-row mini-margin">
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${streakPercent}%"></div>
                        </div>
                        <div class="progress-text">${streakProgress}/10</div>
                    </div>
                `;
            }

            let progressHtml = `
                <div class="task-progress-row">
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="progress-text">${clampedProgress}/${task.target_value}</div>
                </div>
            `;

            let isReadyToClaim = false;
            if (task.id === 9) {
                const championPercent = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
                progressHtml = `
                    <div class="task-progress-row">
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${championPercent}%"></div>
                        </div>
                        <div class="progress-text">${completedTasksCount}/${totalTasksCount}</div>
                    </div>
                `;
                isReadyToClaim = completedTasksCount >= totalTasksCount;
            } else {
                isReadyToClaim = task.progress >= task.target_value;
            }

            const taskCard = document.createElement('div');
            // Чередование классов для цветов фона
            taskCard.className = `task-card ${index % 2 === 0 ? 'task-card-even' : 'task-card-odd'}`;

            taskCard.innerHTML = `
                <div class="task-info">
                    <div class="task-title">${displayName}</div>
                    <div class="task-desc">${displayDesc}</div>
                    ${altDesc}
                    ${progressHtml}
                    ${altProgressHtml}
                </div>
                <div class="task-reward">
                    <span>${rewardText}</span>
                </div>
                <div class="task-actions">
                    <button class="action-btn-lg claim-task-btn ${isReadyToClaim ? 'active' : ''}" 
                            data-task-id="${task.id}"
                            data-reward-type="${task.reward_type}"
                            data-reward-amount="${task.reward_amount}">
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
                        showCoinsModal(rewardAmount);
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

        lastTasksData = tasksData;
        if (window.updateMainMenuNewIcons) window.updateMainMenuNewIcons();

    } catch (e) {
        console.error('Error loading daily tasks:', e);
    }
}

// ... (Остальные функции getRemainingTime, updateCountdownDisplay, startCountdownTimer, stopCountdownTimer без изменений)
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
    countdownInterval = setInterval(() => updateCountdownDisplay(), 60000);
}

function stopCountdownTimer() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

function showCoinsModal(amount) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Награда';
    modalBody.innerHTML = `
        <div class="reward-content">
            <div class="reward-icon-row">
                <span class="reward-amount">${amount}</span>
                <i class="fas fa-coins reward-icon"></i>
            </div>
            <div class="reward-text">монет получено!</div>
        </div>
    `;
    modal.style.display = 'block';
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
}

function showExpModal(amount, className) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Награда';
    modalBody.innerHTML = `
        <div class="reward-content">
            <div class="reward-icon-row">
                <span class="reward-amount">+${amount}</span>
                <i class="fas fa-star reward-icon"></i>
            </div>
            <div class="reward-text">для класса <strong>${getClassNameRu(className)}</strong></div>
        </div>
    `;
    modal.style.display = 'block';
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
}

function showAdventCalendar() {
    window.apiRequest('/tasks/advent', { method: 'GET' })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
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

    let html = '<h3 class="advent-title">Адвент-календарь</h3><div class="advent-grid">';
    for (let day = 1; day <= daysInMonth; day++) {
        let className = 'advent-day';
        if (day <= lastClaimed) className += ' claimed';
        else if (day === nextAvailable && nextAvailable !== null) className += ' available';
        else className += ' locked';

        const reward = getAdventReward(day, daysInMonth);
        let iconHtml = '';
        if (reward.type === 'coins') iconHtml = '<i class="fas fa-coins"></i>';
        else if (reward.type === 'exp') iconHtml = '<span class="exp-icon">EXP</span>';
        else if (reward.type === 'item') {
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
        div.addEventListener('click', () => claimAdventDay(parseInt(div.dataset.day), daysInMonth));
    });
    document.getElementById('backFromAdvent').addEventListener('click', () => renderTasks());
}

let isClaiming = false;
let reloadTimeout = null;

function claimAdventDay(day, daysInMonth) {
    if (isClaiming) return;
    const reward = getAdventReward(day, daysInMonth);
    isClaiming = true;

    if (reward.type === 'exp') {
        showClassChoiceModalForAdvent(reward.amount);
        isClaiming = false;
        return;
    }

    window.apiRequest('/tasks/advent/claim', { method: 'POST', body: JSON.stringify({}) })
    .then(res => res.json())
    .then(data => {
        if (data.error) showToast(data.error, 1500);
        else {
            if (reward.type === 'coins') showCoinsModal(reward.amount);
            else if (reward.type === 'item' && data.item) showChestResult(data.item);
            else showToast('Вы получили: ' + data.reward, 2000);
            
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
        <div class="class-choice-container">
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
            const res = await window.apiRequest('/tasks/advent/claim', {
                method: 'POST', body: JSON.stringify({ classChoice })
            });
            const data = await res.json();
            if (data.error) showToast(data.error, 1500);
            else {
                showExpModal(expAmount, classChoice);
                await refreshData();
                if (data.leveledUp) showLevelUpModal(classChoice);
                setTimeout(() => showAdventCalendar(), 500);
            }
        });
    });
    modal.querySelector('.close').onclick = () => modal.style.display = 'none';
}

function claimDailyExp(taskId, expAmount) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Выберите класс';
    modalBody.innerHTML = `
        <p>Вы получили ${expAmount} опыта. Какому классу хотите его вручить?</p>
        <div class="class-choice-container">
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
                method: 'POST', body: JSON.stringify({ task_id: taskId, class_choice: classChoice })
            });
            const data = await res.json();
            if (data.error) showToast(data.error, 1500);
            else {
                showExpModal(expAmount, classChoice);
                await refreshData();
                if (data.leveledUp) showLevelUpModal(classChoice);
                renderTasks();
            }
        });
    });
    modal.querySelector('.close').onclick = () => modal.style.display = 'none';
}

// Вспомогательные функции заглушки, если они не определены в других файлах
function getAdventReward(day, total) {
    // Логика получения награды (заглушка, должна быть у вас в коде)
    if (day === total) return { type: 'item', rarity: 'legendary' };
    if (day % 5 === 0) return { type: 'exp', amount: 50 };
    return { type: 'coins', amount: 100 };
}
function showChestResult(item) { /* Реализация в другом файле */ }
function showLevelUpModal(cls) { /* Реализация в другом файле */ }
function refreshData() { /* Реализация в app.js */ }
function getClassNameRu(cls) { 
    const map = { warrior: 'Воин', assassin: 'Ассасин', mage: 'Маг' }; 
    return map[cls] || cls; 
}
function showToast(msg, time) { /* Реализация в helpers.js */ }
