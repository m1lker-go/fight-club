// achievements.js – система достижений (ачивок)

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

// Показать уведомление о получении достижения (тост, исчезает через 3 сек)
function showAchievementToast(achievementName, achievementIcon) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
        <div class="achievement-toast-content">
            <img src="${achievementIcon}" alt="achievement" class="achievement-toast-icon">
            <div>
                <div class="achievement-toast-title">🏆 Новое достижение!</div>
                <div class="achievement-toast-name">${escapeHtml(achievementName)}</div>
            </div>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
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
            // Если страница настроек открыта и активна вкладка достижений – обновляем её
            if (window.currentScreen === 'settings' && window.activeSettingsTab === 'achievements') {
                const container = document.getElementById('settingsContent');
                if (container && typeof renderAchievements === 'function') {
                    renderAchievements(container);
                }
            }
            // Обновляем бейджи (например, иконка новых достижений в меню)
            if (typeof updateMessagesBadge === 'function') updateMessagesBadge();
            return true;
        }
    } catch (err) {
        console.error('Error checking founder achievement:', err);
    }
    return false;
}

// Рендер вкладки "Достижения" в настройках
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

        let html = '<div class="achievements-grid">';
        for (const ach of allAchievements) {
            const earned = userSet.has(ach.id);
            const icon = ach.icon || '/assets/icons/achievement_default.png';
            html += `
                <div class="achievement-card ${earned ? 'earned' : 'locked'}">
                    <img src="${icon}" class="achievement-icon" alt="${escapeHtml(ach.name)}">
                    <div class="achievement-name">${escapeHtml(ach.name)}</div>
                    <div class="achievement-desc">${escapeHtml(ach.description)}</div>
                    <div class="achievement-status">${earned ? '✓ Получено' : '🔒 Не получено'}</div>
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
