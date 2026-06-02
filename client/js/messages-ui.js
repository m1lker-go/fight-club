// messages-ui.js – UI сообщений (почта) с поддержкой нескольких наград

let messagesList = [];
let unreadMessagesCount = 0;

if (typeof escapeHtml !== 'function') {
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

async function loadMessagesSilent() {
    console.log('loadMessagesSilent: начало загрузки');
    try {
        const res = await window.apiRequest('/user/messages', { method: 'GET' });
        const data = await res.json();
        messagesList = data.messages || [];
        console.log('loadMessagesSilent: загружено сообщений', messagesList.length);
        recalcUnprocessedCount();
    } catch (e) {
        console.error('Ошибка фоновой загрузки сообщений:', e);
    }
}

function recalcUnprocessedCount() {
    if (!messagesList) return;
    const unread = messagesList.filter(m => !m.is_read).length;
    const unclaimedRewards = messagesList.filter(m => !m.is_claimed && (
        m.reward_coins > 0 || m.reward_diamonds > 0 || m.reward_exp > 0 || m.reward_chest
    )).length;
    unreadMessagesCount = unread + unclaimedRewards;
    console.log('recalcUnprocessedCount: unread=', unread, 'unclaimed=', unclaimedRewards, 'total=', unreadMessagesCount);
    if (typeof updateMessagesBadge === 'function') updateMessagesBadge();
}

async function loadMessages() {
    try {
        const res = await window.apiRequest('/user/messages', { method: 'GET' });
        const data = await res.json();
        messagesList = data.messages || [];
        recalcUnprocessedCount();
        return messagesList;
    } catch (e) {
        console.error('Ошибка загрузки сообщений:', e);
        return [];
    }
}

function hasReward(msg) {
    return (msg.reward_coins > 0) || (msg.reward_diamonds > 0) || (msg.reward_exp > 0) || msg.reward_chest;
}

function formatRewardText(msg) {
    const parts = [];
    if (msg.reward_coins > 0) parts.push(`${msg.reward_coins} монет`);
    if (msg.reward_diamonds > 0) parts.push(`${msg.reward_diamonds} алмазов`);
    if (msg.reward_exp > 0) parts.push(`${msg.reward_exp} опыта (${msg.reward_exp_class})`);
    if (msg.reward_chest) {
        const chestName = { common: 'Обычный', uncommon: 'Необычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный' }[msg.reward_chest] || msg.reward_chest;
        const amount = msg.reward_chest_amount || 1;
        parts.push(`${chestName} сундук${amount > 1 ? 'ы' : ''}`);
    }
    return parts.join(', ');
}

async function renderMessages() {
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = `
        <div class="messages-container">
            <div class="messages-header"><i class="fas fa-envelope"></i> Сообщения</div>
            <div class="messages-list" id="messagesList"></div>
        </div>
    `;
    const listContainer = document.getElementById('messagesList');
    const messages = await loadMessages();
    if (!messages.length) {
        listContainer.innerHTML = '<div class="empty-messages">📭 ПУСТО</div>';
        return;
    }
    listContainer.innerHTML = '';
    messages.forEach(msg => {
        const row = document.createElement('div');
        row.className = `message-row ${msg.is_read ? 'read' : 'unread'}`;
        row.dataset.id = msg.id;
        
        const icon = document.createElement('div');
        icon.className = 'message-icon';
        icon.innerHTML = msg.is_read ? '<i class="far fa-envelope"></i>' : '<i class="fas fa-envelope" style="color:#00aaff;"></i>';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.style.backgroundImage = `url('/assets/${msg.sender_avatar || 'cat_heroweb.png'}')`;
        
        const info = document.createElement('div');
        info.className = 'message-info';
        const rewardIcon = (!msg.is_claimed && hasReward(msg)) ? 
            `<span class="reward-icon" style="margin-left: 8px;"><i class="fas fa-gift" style="color:#f1c40f;"></i></span>` : '';
        info.innerHTML = `
            <div class="message-sender">${escapeHtml(msg.from)}</div>
            <div class="message-preview">${escapeHtml(msg.subject)} ${rewardIcon}</div>
        `;
        
        const readBtn = document.createElement('button');
        readBtn.className = 'message-read-btn';
        readBtn.textContent = 'Читать';
        readBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            renderMessageDetail(msg.id);
        });
        
        row.appendChild(icon);
        row.appendChild(avatar);
        row.appendChild(info);
        row.appendChild(readBtn);
        listContainer.appendChild(row);
    });
}

async function renderMessageDetail(messageId) {
    const msg = messagesList.find(m => m.id == messageId);
    if (!msg) return;
    
    if (!msg.is_read) {
        msg.is_read = true;
        await window.apiRequest('/user/messages/read', {
            method: 'POST',
            body: JSON.stringify({ message_id: messageId })
        });
        recalcUnprocessedCount();
    }
    
    let rewardDisplay = '';
    if (!msg.is_claimed && hasReward(msg)) {
        rewardDisplay = `
            <div class="message-reward-info">
                <i class="fas fa-gift"></i> Награда: ${formatRewardText(msg)}
            </div>
        `;
    }
    
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="message-detail-container">
            <div class="message-detail-header">
                <button class="back-btn" id="backToMessagesBtn"><i class="fas fa-arrow-left"></i> Назад</button>
                <button class="delete-btn" id="deleteMessageBtn"><i class="fas fa-trash-alt"></i> Удалить</button>
            </div>
            <div class="message-detail-sender">
                <div class="sender-avatar" style="background-image: url('/assets/${msg.sender_avatar || 'cat_heroweb.png'}')"></div>
                <div class="sender-name">${escapeHtml(msg.from)}</div>
                <div class="message-date">${new Date(msg.created_at).toLocaleString()}</div>
            </div>
            <div class="message-detail-subject">${escapeHtml(msg.subject)}</div>
            <div class="message-detail-body">${escapeHtml(msg.body).replace(/\n/g, '<br>')}</div>
            ${rewardDisplay}
            <div class="message-detail-actions">
                <button class="reply-btn" id="replyBtn">Ответить</button>
                ${!msg.is_claimed && hasReward(msg) ? `<button class="claim-btn" id="claimRewardBtn">Забрать награду</button>` : ''}
            </div>
        </div>
    `;
    
    document.getElementById('backToMessagesBtn').addEventListener('click', () => renderMessages());
    document.getElementById('deleteMessageBtn').addEventListener('click', async () => {
        if (confirm('Удалить сообщение?')) {
            await window.apiRequest('/user/messages/delete', {
                method: 'POST',
                body: JSON.stringify({ message_id: messageId })
            });
            messagesList = messagesList.filter(m => m.id != messageId);
            recalcUnprocessedCount();
            renderMessages();
        }
    });
    
    if (document.getElementById('replyBtn')) {
        document.getElementById('replyBtn').addEventListener('click', () => {
            showToast('Функция ответа в разработке', 1500);
        });
    }
    
    const claimBtn = document.getElementById('claimRewardBtn');
    if (claimBtn) {
        claimBtn.addEventListener('click', async () => {
            const res = await window.apiRequest('/user/messages/claim', {
                method: 'POST',
                body: JSON.stringify({ message_id: messageId })
            });
            const data = await res.json();
            if (data.success) {
                if (typeof AudioManager !== 'undefined') {
                    AudioManager.playSound('reward');
                }
                showToast(`Вы получили: ${data.reward_text}`, 2000);
                msg.is_claimed = true;
                await refreshData();
                recalcUnprocessedCount();
                renderMessageDetail(messageId);
            } else {
                showToast('Ошибка: ' + data.error, 1500);
            }
        });
    }
}

window.loadMessagesSilent = loadMessagesSilent;
window.renderMessages = renderMessages;
window.renderMessageDetail = renderMessageDetail;
window.loadMessages = loadMessages;
window.messagesList = messagesList;
window.unreadMessagesCount = unreadMessagesCount;
window.recalcUnprocessedCount = recalcUnprocessedCount;
