// task-up.js

// ==================== АДВЕНТ-КАЛЕНДАРЬ И ЗАДАНИЯ ====================

function renderAdventCalendarInContainer(data, container) {
    const { currentDay, daysInMonth, mask } = data;
    let firstUnclaimed = null;
    for (let d = 1; d <= currentDay; d++) {
        if (!(mask & (1 << (d-1)))) {
            firstUnclaimed = d;
            break;
        }
    }

    let html = '<div class="advent-grid">';
    for (let day = 1; day <= daysInMonth; day++) {
        const claimed = mask & (1 << (day-1));
        const available = (day === firstUnclaimed);
        let className = 'advent-day';
        if (claimed) className += ' claimed';
        else if (available) className += ' available';
        else className += ' locked';

        const reward = getAdventReward(day, daysInMonth);
        let iconHtml = '';
        if (reward.type === 'coins') {
            iconHtml = '<i class="fas fa-coins" style="color: white;"></i>'; // белый цвет
        } else if (reward.type === 'exp') {
            iconHtml = '<span style="font-weight:bold; color: white;">EXP</span>'; // белый цвет
        } else if (reward.type === 'item') {
            let color = '#aaa';
            if (reward.rarity === 'uncommon') color = '#2ecc71';
            else if (reward.rarity === 'rare') color = '#2e86de';
            else if (reward.rarity === 'epic') color = '#9b59b6';
            else if (reward.rarity === 'legendary') color = '#f1c40f';
            iconHtml = `<i class="fas fa-tshirt" style="color: ${color};"></i>`;
        }

        // Иконка сверху, номер снизу (размеры управляются CSS)
        html += `<div class="${className}" data-day="${day}">
            <div class="advent-icon">${iconHtml}</div>
            <div class="advent-day-number">${day}</div>
        </div>`;
    }
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.advent-day.available').forEach(div => {
        div.addEventListener('click', () => claimAdventDay(parseInt(div.dataset.day), daysInMonth));
    });
}

function renderReferral() {
    const referralDiv = document.createElement('div');
    referralDiv.className = 'task-card referral-card';
    referralDiv.style.display = 'flex';
    referralDiv.style.alignItems = 'center';
    referralDiv.style.justifyContent = 'space-between';
    referralDiv.style.width = '100%';
    referralDiv.style.marginBottom = '12px';
    referralDiv.style.padding = '12px';
    referralDiv.style.boxSizing = 'border-box';

    const referralLink = `https://t.me/${BOT_USERNAME}?start=${userData.referral_code || 'ref'}`;

    referralDiv.innerHTML = `
        <div style="flex: 2; min-width: 0;">
            <div style="font-size: 16px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Пригласить друга</div>
            <div style="font-size: 11px; color: #aaa; margin-top: 2px;">Пригласи друга и получи 100 монет</div>
        </div>
        <div style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 8px;">
            <span style="font-weight: bold; color: white; font-size: 14px;">100 <i class="fas fa-coins" style="color:white;"></i></span>
        </div>
        <div style="flex: 0 0 100px; display: flex; gap: 5px; justify-content: flex-end;">
            <button class="btn referral-copy-btn" style="padding: 8px 12px; font-size: 12px; width: 45px;" title="Копировать ссылку"><i class="fas fa-copy"></i></button>
            <button class="btn referral-share-btn" style="padding: 8px 12px; font-size: 12px; width: 45px;" title="Поделиться"><i class="fas fa-share-alt"></i></button>
        </div>
    `;

    referralDiv.querySelector('.referral-copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(referralLink).then(() => {
            alert('Ссылка скопирована!');
        }).catch(() => {
            alert('Ошибка копирования');
        });
    });

    referralDiv.querySelector('.referral-share-btn').addEventListener('click', () => {
        if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}`);
        } else {
            navigator.clipboard.writeText(referralLink).then(() => {
                alert('Ссылка скопирована! Вы можете отправить её другу.');
            });
        }
    });

    return referralDiv;
}

function renderTasks() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="tasks-container">
            <div class="task-card" style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 12px; padding: 12px; box-sizing: border-box;">
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
                    <button class="btn" id="showAdventBtn" style="padding: 8px 12px; font-size: 12px; width: 100%;"><i class="fas fa-eye"></i></button>
                </div>
            </div>
            <div id="referralPlaceholder"></div>
            <h3 style="text-align:center; margin:10px 0; font-size: 16px;">Ежедневные задания</h3>
            <div id="tasksList"></div>
        </div>
    `;

    const referralPlaceholder = document.getElementById('referralPlaceholder');
    if (referralPlaceholder) {
        referralPlaceholder.appendChild(renderReferral());
    }

    document.getElementById('showAdventBtn').addEventListener('click', () => {
        fetch(`https://fight-club-api-4och.onrender.com/tasks/advent?tg_id=${userData.tg_id}`)
            .then(res => res.json())
            .then(data => showAdventCalendar(data))
            .catch(err => {
                console.error('Error loading advent:', err);
                alert('Ошибка загрузки календаря');
            });
    });

    loadDailyTasks();
}


async function loadDailyTasks() {
    if (currentScreen !== 'tasks') return;
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;

    try {
        const res = await fetch(`https://fight-club-api-4och.onrender.com/tasks/daily/list?tg_id=${userData.tg_id}&_=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const tasksData = await res.json();
        if (!Array.isArray(tasksData)) {
            console.error('Ответ не является массивом:', tasksData);
            return;
        }
        tasksList.innerHTML = '';

        tasksData.forEach((task, index) => {
            const isCompleted = task.completed;
            const clampedProgress = Math.min(task.progress, task.target_value);
            const progressPercent = (clampedProgress / task.target_value) * 100;
            const rewardText = task.reward_type === 'coins' 
                ? `${task.reward_amount} <i class="fas fa-coins" style="color:white;"></i>` 
                : `${task.reward_amount} EXP`;

            const translated = dailyTaskTranslations[task.name] || {};
            const displayName = translated.name || task.name;
            const displayDesc = translated.description || task.description;

            // Альтернативное описание для классовых заданий (выигрыш 10 подряд)
            let altDesc = '';
            if (task.id === 1 || task.id === 2 || task.id === 3) {
                altDesc = '<div style="font-size: 10px; color: #88ff88;">ИЛИ выиграть 10 боёв подряд</div>';
            }

            const taskCard = document.createElement('div');
            taskCard.className = 'task-card';
            taskCard.style.display = 'flex';
            taskCard.style.alignItems = 'center';
            taskCard.style.justifyContent = 'space-between';
            taskCard.style.width = '100%';
            taskCard.style.marginBottom = '12px';
            taskCard.style.padding = '12px';
            taskCard.style.boxSizing = 'border-box';
            taskCard.style.backgroundColor = index % 2 === 0 ? '#2a303c' : '#232833'; // чередование

            taskCard.innerHTML = `
                <div style="flex: 2; min-width: 0;">
                    <div style="font-size: 16px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayName}</div>
                    <div style="font-size: 11px; color: #aaa; margin-top: 2px;">${displayDesc}</div>
                    ${altDesc}
                    <div style="margin-top: 8px; display: flex; align-items: center; gap: 10px;">
                        <div style="flex: 1; background-color: #2f3542; height: 6px; border-radius: 3px;">
                            <div style="background-color: #00aaff; width: ${progressPercent}%; height: 100%; border-radius: 3px;"></div>
                        </div>
                        <div style="font-size: 10px; color: #aaa; min-width: 35px;">${clampedProgress}/${task.target_value}</div>
                    </div>
                </div>
                <div style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 5px; margin: 0 10px;">
                    <span style="font-weight: bold; color: white; font-size: 14px; white-space: nowrap;">${rewardText}</span>
                </div>
                <div style="flex: 0 0 50px; text-align: right;">
                    <button class="claim-task-btn ${isCompleted ? 'active' : ''}" data-task-id="${task.id}" ${isCompleted ? 'disabled' : ''} style="padding: 8px; width: 100%; font-size: 14px;">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            `;
            tasksList.appendChild(taskCard);
        });

        document.querySelectorAll('.claim-task-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const taskId = btn.dataset.taskId;
                const res = await fetch('https://fight-club-api-4och.onrender.com/tasks/daily/claim', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tg_id: userData.tg_id, task_id: taskId })
                });
                const data = await res.json();
                if (data.error) {
                    alert(data.error);
                } else {
                    alert('Награда получена!');
                    loadDailyTasks();
                    refreshData();
                }
            });
        });

    } catch (e) {
        console.error('Error loading daily tasks:', e);
    }
}

function showAdventCalendar() {
    fetch(`https://fight-club-api-4och.onrender.com/tasks/advent?tg_id=${userData.tg_id}`)
        .then(res => res.json())
        .then(data => {
            renderAdventCalendar(data);
        })
        .catch(err => {
            console.error(err);
            alert('Ошибка загрузки календаря');
        });
}

function renderAdventCalendar(data) {
    const { currentDay, daysInMonth, mask } = data;
    const content = document.getElementById('content');

    let firstUnclaimed = null;
    for (let d = 1; d <= currentDay; d++) {
        if (!(mask & (1 << (d-1)))) {
            firstUnclaimed = d;
            break;
        }
    }

    let html = '<h3 style="text-align:center;">Адвент-календарь</h3><div class="advent-grid">';
    for (let day = 1; day <= daysInMonth; day++) {
        const claimed = mask & (1 << (day-1));
        const available = (day === firstUnclaimed);
        let className = 'advent-day';
        if (claimed) className += ' claimed';
        else if (available) className += ' available';
        else className += ' locked';

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
        div.addEventListener('click', () => claimAdventDay(parseInt(div.dataset.day), daysInMonth));
    });

    document.getElementById('backFromAdvent').addEventListener('click', () => renderTasks());
}

function claimAdventDay(day, daysInMonth) {
    const reward = getAdventReward(day, daysInMonth);

    if (reward.type === 'exp') {
        showClassChoiceModal(day, reward.amount);
    } else {
        fetch('https://fight-club-api-4och.onrender.com/tasks/advent/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id, day })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) alert(data.error);
            else {
                alert(`Вы получили: ${data.reward}`);
                showAdventCalendar();
                refreshData();
            }
        })
        .catch(err => alert('Ошибка: ' + err));
    }
}

function showClassChoiceModal(day, expAmount) {
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

            const res = await fetch('https://fight-club-api-4och.onrender.com/tasks/advent/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, day, classChoice })
            });
            const data = await res.json();
            if (data.error) alert(data.error);
            else {
                alert(`Вы получили: ${data.reward}`);
                showAdventCalendar();
                refreshData();
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

            const res = await fetch('https://fight-club-api-4och.onrender.com/tasks/daily/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tg_id: userData.tg_id, 
                    task_id: taskId, 
                    class_choice: classChoice 
                })
            });
            const data = await res.json();
            if (data.error) {
                alert(data.error);
            } else {
                alert(`Вы получили ${expAmount} опыта для класса ${classChoice}!`);
                renderTasks();
                refreshData();
            }
        });
    });

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}
