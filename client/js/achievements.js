// achievements.js – система достижений (ачивок) с модальным окном

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
            showAchievementToast('Основатель', '/assets/icons/achievement_founder.png');
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

// Рендер вкладки "Достижения" в настройках (табличный вид)
async function renderAchievements(container) {
    if (!container) return;
    try {
        const [allRes, userRes] = await Promise.all([
            window.apiRequest('/achievements/list', { method: 'GET' }),
            window.apiRequest('/achievements/user', { method: 'GET' })
        ]);
        const allAchievements = allRes.ok ? await allRes.json() : [];
        const userAchievements = userRes.ok ? await userRes.json() : [];
        const userSet = new Set(userAchievements);

        let html = '<div class="achievements-list">';
        for (let i = 0; i < allAchievements.length; i++) {
            const ach = allAchievements[i];
            const earned = userSet.has(ach.id);
            // Иконка: путь /assets/achievement/название_файла (используем ach.icon или строим из name)
            let iconPath = ach.icon || `/assets/achievement/${ach.id}.png`;
            // Для достижения "Основатель" (id=1) используем founder.png
            if (ach.id === 1) iconPath = '/assets/achievement/founder.png';
            const rowClass = i % 2 === 0 ? 'achievement-row even' : 'achievement-row odd';
            const iconStyle = earned ? 'opacity: 1;' : 'opacity: 0.3;';
            const statusText = earned ? '✓ Получено' : '🔒 Не получено';
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
                        ${statusText}
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
