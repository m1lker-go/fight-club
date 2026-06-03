// ========== МОДУЛЬ КЛАНОВ ==========
let currentClanTab = 'info'; // info, chat, checkin, treasury, talents, settings

// Маппинг icon_id (1-10) → класс Font Awesome
const ICON_MAP = {
    1: 'fa-cat',                    // Кот
    2: 'fa-dog',                    // Пёс
    3: 'arrow-archery',             // вместо меча
    4: 'axe-battle',                // топор
    5: 'shield-cat',                // щит
    6: 'fa-skull',                  // череп
    7: 'wolf-pack-battalion',       // вместо маски
    8: 'fa-crown',                  // корона
    9: 'fa-bolt',                   // молния
    10: 'fa-dragon'                 // дракон
};

// Главная точка входа
async function renderClans() {
    const content = document.getElementById('content');
    if (!content) return;
    
    const res = await window.apiRequest('/clans/my');
    const data = await res.json();
    
    if (data.inClan) {
        renderMyClan(data.clan, data.members, data.userRole);
    } else {
        renderClansList();
    }
}

// ========== СПИСОК КЛАНОВ ==========
async function renderClansList() {
    const content = document.getElementById('content');
    const res = await window.apiRequest('/clans/list');
    const clans = await res.json();
    
    let html = `
        <div class="clans-container">
            <div style="padding: 12px;">
                <button class="clans-submit-btn" id="createClanBtn">+ Создать клан</button>
            </div>
            <div class="clans-list">
    `;
    
    for (const clan of clans) {
        const memberCount = clan.current_members || 0;
        const maxMembers = 10 + (clan.level - 1);
        const iconClass = ICON_MAP[clan.icon_id] || 'fa-users';
        html += `
            <div class="clan-card" data-clan-id="${clan.id}">
                <div class="clan-icon" style="background-color: ${clan.icon_bg_color}; border: 2px solid ${clan.icon_border_color}; display: flex; align-items: center; justify-content: center;">
                    <i class="fas ${iconClass}" style="color: ${clan.icon_color}; font-size: 24px;"></i>
                </div>
                <div class="clan-info">
                    <div class="clan-name">${escapeHtml(clan.name)}</div>
                    <div class="clan-stats">Уровень ${clan.level}</div>
                    <div class="clan-members">${memberCount}/${maxMembers}</div>
                </div>
                <button class="clan-join-btn" data-clan-id="${clan.id}">Вступить</button>
            </div>
        `;
    }
    
    html += `</div></div>`;
    content.innerHTML = html;
    
    document.getElementById('createClanBtn')?.addEventListener('click', () => showCreateClanModal());
    document.querySelectorAll('.clan-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('clan-join-btn')) return;
            const clanId = card.dataset.clanId;
            showClanInfoModal(clanId);
        });
    });
    document.querySelectorAll('.clan-join-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const clanId = btn.dataset.clanId;
            const res = await window.apiRequest('/clans/join', {
                method: 'POST',
                body: JSON.stringify({ clan_id: clanId })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Вы вступили в клан!', 1500);
                renderClans();
            } else {
                showToast(data.error, 1500);
            }
        });
    });
}

// ========== МОЙ КЛАН (ВКЛАДКИ) ==========
function renderMyClan(clan, members, userRole) {
    const content = document.getElementById('content');
    const iconClass = ICON_MAP[clan.icon_id] || 'fa-users';
    content.innerHTML = `
        <div class="clans-container">
            <!-- Шапка -->
            <div style="background-color: #1a1f2b; padding: 12px; text-align: center; border-bottom: 1px solid #00aaff;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                    <div style="width: 48px; height: 48px; background-color: ${clan.icon_bg_color}; border: 2px solid ${clan.icon_border_color}; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas ${iconClass}" style="color: ${clan.icon_color}; font-size: 28px;"></i>
                    </div>
                    <div>
                        <h2 style="margin:0;">${escapeHtml(clan.name)}</h2>
                        <div>Уровень ${clan.level} (опыт: ${clan.exp})</div>
                    </div>
                </div>
            </div>
            <!-- Вкладки -->
            <div class="clans-tabs">
                <button class="clans-tab ${currentClanTab === 'info' ? 'active' : ''}" data-tab="info">Соратники</button>
                <button class="clans-tab ${currentClanTab === 'chat' ? 'active' : ''}" data-tab="chat">Чат</button>
                <button class="clans-tab ${currentClanTab === 'checkin' ? 'active' : ''}" data-tab="checkin">Отметка</button>
                <button class="clans-tab ${currentClanTab === 'treasury' ? 'active' : ''}" data-tab="treasury">Казна</button>
                <button class="clans-tab ${currentClanTab === 'talents' ? 'active' : ''}" data-tab="talents">Таланты</button>
                ${userRole === 'leader' ? `<button class="clans-tab ${currentClanTab === 'settings' ? 'active' : ''}" data-tab="settings">Управление</button>` : ''}
            </div>
            <div class="clans-tab-content" id="clanTabContent"></div>
        </div>
    `;
    
    document.querySelectorAll('.clans-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentClanTab = tab.dataset.tab;
            renderMyClan(clan, members, userRole);
        });
    });
    
    const tabContent = document.getElementById('clanTabContent');
    if (currentClanTab === 'info') renderClanInfo(tabContent, clan, members, userRole);
    else if (currentClanTab === 'chat') renderClanChat(tabContent, clan);
    else if (currentClanTab === 'checkin') renderClanCheckin(tabContent, clan);
    else if (currentClanTab === 'treasury') renderClanTreasury(tabContent, clan);
    else if (currentClanTab === 'talents') renderClanTalents(tabContent, clan);
    else if (currentClanTab === 'settings' && userRole === 'leader') renderClanSettings(tabContent, clan);
}

// Вкладка "Соратники"
function renderClanInfo(container, clan, members, userRole) {
    let html = `
        <table class="clans-members-table">
            <thead><tr><th>Игрок</th><th>Роль</th><th>Статус</th><th></th></tr></thead>
            <tbody>
    `;
    for (const m of members) {
        const isOnline = false; // TODO: позже добавить online статус
        html += `
            <tr>
                <td>${escapeHtml(m.username)}</td>
                <td><span class="clans-role-badge ${m.role}">${m.role === 'leader' ? 'Лидер' : (m.role === 'officer' ? 'Офицер' : 'Участник')}</span></td>
                <td>${isOnline ? '🟢 Онлайн' : '⚫ Офлайн'}</td>
                <td>
                    ${userRole === 'leader' && m.role !== 'leader' ? `<button class="clans-action-btn" data-user-id="${m.id}" data-action="kick">Исключить</button>` : ''}
                    ${userRole === 'leader' && m.role === 'member' ? `<button class="clans-action-btn" data-user-id="${m.id}" data-action="promote">Назначить офицером</button>` : ''}
                    ${userRole === 'leader' && m.role === 'officer' ? `<button class="clans-action-btn" data-user-id="${m.id}" data-action="demote">Снять офицера</button>` : ''}
                    ${userRole === 'leader' && m.role !== 'leader' ? `<button class="clans-action-btn" data-user-id="${m.id}" data-action="transfer">Передать лидерство</button>` : ''}
                 </td>
            </tr>
        `;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
    
    container.querySelectorAll('[data-action="kick"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const res = await window.apiRequest('/clans/kick', {
                method: 'POST',
                body: JSON.stringify({ target_user_id: userId })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Игрок исключён', 1500);
                renderClans();
            } else {
                showToast(data.error, 1500);
            }
        });
    });
    container.querySelectorAll('[data-action="promote"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const res = await window.apiRequest('/clans/promote', {
                method: 'POST',
                body: JSON.stringify({ target_user_id: userId })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Назначен офицером', 1500);
                renderClans();
            } else {
                showToast(data.error, 1500);
            }
        });
    });
    container.querySelectorAll('[data-action="transfer"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Передать лидерство этому игроку?')) {
                const userId = btn.dataset.userId;
                const res = await window.apiRequest('/clans/transfer', {
                    method: 'POST',
                    body: JSON.stringify({ target_user_id: userId })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Лидерство передано', 1500);
                    renderClans();
                } else {
                    showToast(data.error, 1500);
                }
            }
        });
    });
}

// Вкладка "Чат"
async function renderClanChat(container, clan) {
    const res = await window.apiRequest('/clans/chat');
    const messages = await res.json();
    
    let html = `
        <div class="clans-chat">
            <div class="clans-chat-messages" id="clanChatMessages">
    `;
    for (const msg of messages) {
        html += `
            <div class="clans-chat-message">
                <strong>${escapeHtml(msg.username)}</strong>: ${escapeHtml(msg.message)}
                <small style="color:#aaa; font-size:10px;">${new Date(msg.created_at).toLocaleTimeString()}</small>
            </div>
        `;
    }
    html += `
            </div>
            <div class="clans-chat-input">
                <input type="text" id="clanChatInput" placeholder="Введите сообщение...">
                <button id="clanChatSend">Отправить</button>
            </div>
        </div>
    `;
    container.innerHTML = html;
    
    const input = document.getElementById('clanChatInput');
    const sendBtn = document.getElementById('clanChatSend');
    sendBtn.addEventListener('click', async () => {
        const msg = input.value.trim();
        if (!msg) return;
        const res = await window.apiRequest('/clans/chat/send', {
            method: 'POST',
            body: JSON.stringify({ message: msg })
        });
        if (res.ok) {
            input.value = '';
            renderClanChat(container, clan);
        } else {
            showToast('Ошибка отправки', 1500);
        }
    });
}

// Вкладка "Отметка"
async function renderClanCheckin(container, clan) {
    const res = await window.apiRequest('/clans/checkin/status');
    const status = await res.json();
    
    let html = `
        <div style="text-align: center;">
            <p>Сегодня отметилось: ${status.checked_today} / ${status.total_members}</p>
            ${!status.already_checked ? '<button id="checkinBtn" class="clans-submit-btn">Отметиться</button>' : '<p>Вы уже отметились сегодня!</p>'}
            <div class="clan-stats" style="margin-top: 12px;">За отметку: +50 монет, +5 угля, +10 опыта клану</div>
            <div class="clan-stats">Если все отметятся: +100 опыта клану</div>
        </div>
    `;
    container.innerHTML = html;
    
    const checkinBtn = document.getElementById('checkinBtn');
    checkinBtn?.addEventListener('click', async () => {
        const res = await window.apiRequest('/clans/checkin', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast(`Вы получили ${data.coins} монет и ${data.coal} угля!`, 2000);
            renderClanCheckin(container, clan);
            if (typeof refreshData === 'function') refreshData();
        } else {
            showToast(data.error, 1500);
        }
    });
}

// Вкладка "Казна"
async function renderClanTreasury(container, clan) {
    const res = await window.apiRequest('/clans/treasury');
    const treasury = await res.json();
    
    let html = `
        <div class="clans-treasury-balance">💰 ${treasury.coins} монет в казне</div>
        <div class="clans-donate-form">
            <input type="number" id="donateAmount" placeholder="Сумма" min="1">
            <button id="donateBtn">Пожертвовать</button>
        </div>
        <div style="font-size:12px; color:#aaa;">За каждые 100 пожертвованных монет клан получает +1 опыт.</div>
    `;
    container.innerHTML = html;
    
    document.getElementById('donateBtn')?.addEventListener('click', async () => {
        const amount = parseInt(document.getElementById('donateAmount').value);
        if (isNaN(amount) || amount <= 0) {
            showToast('Введите корректную сумму', 1500);
            return;
        }
        const res = await window.apiRequest('/clans/donate', {
            method: 'POST',
            body: JSON.stringify({ amount })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Вы пожертвовали ${amount} монет!`, 1500);
            renderClanTreasury(container, clan);
            if (typeof refreshData === 'function') refreshData();
        } else {
            showToast(data.error, 1500);
        }
    });
}

// Вкладка "Таланты"
async function renderClanTalents(container, clan) {
    const res = await window.apiRequest('/clans/bonuses');
    const bonuses = await res.json();
    const totalPoints = bonuses.total_points;
    const maxPoints = clan.level * 5;
    
    let html = `
        <div style="margin-bottom: 12px;">Куплено очков: ${totalPoints} / ${maxPoints}</div>
        <div class="clans-talents-list">
            ${renderTalentRow('Здоровье', bonuses.bonus_hp, 'hp')}
            ${renderTalentRow('Атака', bonuses.bonus_attack, 'attack')}
            ${renderTalentRow('Защита', bonuses.bonus_defense, 'defense')}
            ${renderTalentRow('Ловкость', bonuses.bonus_agility, 'agility')}
            ${renderTalentRow('Крит. урон', bonuses.bonus_crit_damage, 'crit_damage')}
            ${renderTalentRow('Вампиризм', bonuses.bonus_vampirism, 'vampirism')}
        </div>
    `;
    container.innerHTML = html;
    // TODO: добавить кнопки покупки и распределения для лидера
}

function renderTalentRow(name, value, key) {
    return `
        <div class="clans-talent-row">
            <span class="clans-talent-name">${name}</span>
            <span class="clans-talent-value">+${value}</span>
            <div class="clans-talent-controls">
                <button data-stat="${key}" data-op="decr">-</button>
                <span>0</span>
                <button data-stat="${key}" data-op="incr">+</button>
            </div>
        </div>
    `;
}

// Модальное окно создания клана
function showCreateClanModal() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal) return;
    
    modalTitle.innerText = 'Создание клана';
    modalBody.innerHTML = `
        <div class="clans-create-form">
            <div class="clans-form-group">
                <label>Название клана</label>
                <input type="text" id="clanName" maxlength="30" placeholder="3-30 символов">
            </div>
            <div class="clans-form-group">
                <label>Иконка и цвета</label>
                <div class="clans-icon-preview">
                    <div id="iconPreview" class="clans-icon-box" style="background-color: #2c3e50; border-color: #f1c40f;">
                        <i id="previewIcon" class="fas fa-cat" style="color: white;"></i>
                    </div>
                    <div>
                        <div>Выберите иконку:</div>
                      <select id="iconSelect">
    <option value="1">Кот</option>
    <option value="2">Пёс</option>
    <option value="3">Лук (стрела)</option>
    <option value="4">Боевой топор</option>
    <option value="5">Щит-кот</option>
    <option value="6">Череп</option>
    <option value="7">Волчья стая</option>
    <option value="8">Корона</option>
    <option value="9">Молния</option>
    <option value="10">Дракон</option>
</select>
                    </div>
                </div>
                <div style="margin: 12px 0;">Цвет фона:</div>
                <div class="clans-color-palette" id="bgColorPalette"></div>
                <div style="margin: 12px 0;">Цвет обводки:</div>
                <div class="clans-color-palette" id="borderColorPalette"></div>
                <div style="margin: 12px 0;">Цвет иконки:</div>
                <div class="clans-color-palette" id="iconColorPalette"></div>
            </div>
            <div class="clans-payment-method">
                <label><input type="radio" name="payment" value="coins" checked> 2000 монет</label>
                <label><input type="radio" name="payment" value="diamonds"> 150 алмазов</label>
            </div>
            <button id="confirmCreateClan" class="clans-submit-btn">Создать</button>
        </div>
    `;
    
    const colors = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#e67e22','#1abc9c','#e84393','#7f8c8d','#2c3e50','#95a5a6','#34495e'];
    function renderPalette(containerId, selectedColor, onChange) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        colors.forEach(c => {
            const div = document.createElement('div');
            div.className = 'clans-color-option';
            div.style.backgroundColor = c;
            if (c === selectedColor) div.classList.add('selected');
            div.addEventListener('click', () => {
                document.querySelectorAll(`#${containerId} .clans-color-option`).forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                onChange(c);
            });
            container.appendChild(div);
        });
    }
    
    let bgColor = '#2c3e50', borderColor = '#f1c40f', iconColor = '#ffffff';
    renderPalette('bgColorPalette', bgColor, (c) => { bgColor = c; updatePreview(); });
    renderPalette('borderColorPalette', borderColor, (c) => { borderColor = c; updatePreview(); });
    renderPalette('iconColorPalette', iconColor, (c) => { iconColor = c; updatePreview(); });
    
    const iconSelect = document.getElementById('iconSelect');
    const previewIcon = document.getElementById('previewIcon');
    const previewBox = document.getElementById('iconPreview');
    function updatePreview() {
        const selectedId = parseInt(iconSelect.value);
        const iconClass = ICON_MAP[selectedId] || 'fa-cat';
        previewIcon.className = `fas ${iconClass}`;
        previewIcon.style.color = iconColor;
        previewBox.style.backgroundColor = bgColor;
        previewBox.style.borderColor = borderColor;
    }
    iconSelect.addEventListener('change', updatePreview);
    updatePreview();
    
    document.getElementById('confirmCreateClan').addEventListener('click', async () => {
        const name = document.getElementById('clanName').value.trim();
        if (name.length < 3 || name.length > 30) {
            showToast('Название должно быть 3-30 символов', 1500);
            return;
        }
        const iconId = parseInt(iconSelect.value);
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        const res = await window.apiRequest('/clans/create', {
            method: 'POST',
            body: JSON.stringify({
                name,
                icon_id: iconId,
                icon_bg_color: bgColor,
                icon_border_color: borderColor,
                icon_color: iconColor,
                payment_method: paymentMethod
            })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Клан создан!', 1500);
            modal.style.display = 'none';
            renderClans();
        } else {
            showToast(data.error, 1500);
        }
    });
    
    modal.style.display = 'flex';
}

// Заглушка для просмотра информации о клане (необязательно)
function showClanInfoModal(clanId) {
    showToast(`Просмотр клана ID: ${clanId} (будет позже)`, 1500);
}

// Вспомогательные функции
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showToast(msg, duration) {
    const toast = document.createElement('div');
    toast.className = 'market-toast';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Экспорт в глобальную область
window.renderClans = renderClans;
