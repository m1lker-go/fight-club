// achievements.js – система достижений (ачивок) с табличным отображением и прогрессом

if (typeof escapeHtml === 'undefined') {
    window.escapeHtml = function(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    };
}
var escapeHtml = window.escapeHtml;

// Показать модальное окно достижения (автоматически исчезает через 3 секунды)
function showAchievementToast(achievementName, achievementIcon) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.innerText = '🏆 Новое достижение!';
    modalBody.innerHTML = `
        <div style="text-align: center; padding: 10px;">
            <img src="${escapeHtml(achievementIcon)}" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px;" onerror="this.src='/assets/icons/icon-new.png'">
            <div style="font-size: 18px; font-weight: bold; color: #f1c40f; margin-bottom: 8px;">${escapeHtml(achievementName)}</div>
            <div style="font-size: 14px; color: #ddd;">Вы получили новое достижение!</div>
        </div>
    `;
    modal.style.display = 'flex';

    setTimeout(() => {
        modal.style.display = 'none';
    }, 3000);
}

// Проверить и выдать достижение "Основатель" (вызывается после авторизации)
async function checkFounderAchievement() {
    if (!userData || !userData.id) return false;
    try {
        const res = await window.apiRequest('/achievements/check-founder', { method: 'POST' });
        const data = await res.json();
        if (data.awarded) {
            showAchievementToast('Основатель', '/assets/achievement/founder.png');
            if (window.currentScreen === 'settings' && window.activeSettingsTab === 'achievements') {
                const container = document.getElementById('settingsContent');
                if (container && typeof renderAchievements === 'function') {
                    renderAchievements(container);
                }
            }
            if (typeof updateMessagesBadge === 'function') updateMessagesBadge();
            return true;
        }
    } catch (err) {
        console.error('Error checking founder achievement:', err);
    }
    return false;
}

// Рендер вкладки "Достижения" в настройках (табличный вид с прогрессом)
async function renderAchievements(container) {
    if (!container) return;
    try {
        const res = await window.apiRequest('/achievements/user-progress', { method: 'GET' });
        const achievements = res.ok ? await res.json() : [];
        let html = '<div class="achievements-list">';
        for (let i = 0; i < achievements.length; i++) {
            const ach = achievements[i];
            const earned = ach.earned;
            let iconPath = ach.icon || '/assets/icons/icon-new.png';
            // Для основателя (id=1) если icon не задан, используем founder.png
            if (ach.id === 1 && !ach.icon) iconPath = '/assets/achievement/founder.png';
            const iconStyle = earned ? 'opacity: 1;' : 'opacity: 0.3;';
            let statusText = '';
            if (earned) {
                statusText = '✓ Получено';
            } else if (ach.progress) {
                statusText = `${ach.progress.current}/${ach.progress.required}`;
            } else {
                statusText = '🔒 Не получено';
            }
            const rowClass = i % 2 === 0 ? 'achievement-row even' : 'achievement-row odd';
            html += `
                <div class="${rowClass}">
                    <div class="achievement-icon-col">
                        <img src="${escapeHtml(iconPath)}" class="achievement-list-icon" style="${iconStyle}" onerror="this.src='/assets/icons/icon-new.png'">
                    </div>
                    <div class="achievement-info-col">
                        <div class="achievement-list-name">${escapeHtml(ach.name)}</div>
                        <div class="achievement-list-desc">${escapeHtml(ach.description)}</div>
                    </div>
                    <div class="achievement-status-col">
                        ${escapeHtml(statusText)}
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        console.error('Error loading achievements:', err);
        container.innerHTML = '<p style="color:#aaa;">Ошибка загрузки достижений</p>';
    }
}

// Экспорт глобально
window.showAchievementToast = showAchievementToast;
window.checkFounderAchievement = checkFounderAchievement;
window.renderAchievements = renderAchievements;
