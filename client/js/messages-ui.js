// messages-ui.js – UI сообщений (почта)

let messagesList = [];
let unreadMessagesCount = 0;

// Экранирование HTML (должно быть определено глобально, но продублируем для независимости)
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
        const token = localStorage.getItem('sessionToken');
        const res = await window.apiRequest('/auth/messages', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
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
    const unclaimedRewards = messagesList.filter(m => !m.is_claimed && m.reward_type && m.reward_amount).length;
    unreadMessagesCount = unread + unclaimedRewards;
    console.log('recalcUnprocessedCount: unread=', unread, 'unclaimed=', unclaimedRewards, 'total=', unreadMessagesCount);
    if (typeof updateMessagesBadge === 'function') updateMessagesBadge();
}

async function loadMessages() {
    try {
        const token = localStorage.getItem('sessionToken');
        const res = await window.apiRequest('/auth/messages', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        messagesList = data.messages || [];
        recalcUnprocessedCount();
        return messagesList;
    } catch (e) {
        console.error('Ошибка загрузки сообщений:', e);
        return [];
    }
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
        const rewardIcon = (!msg.is_claimed && msg.reward_type && msg.reward_amount) ? 
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
    
    const token = localStorage.getItem('sessionToken');
    if (!token) {
        showToast('Ошибка: сессия не найдена', 1500);
        return;
    }
    
    if (!msg.is_read) {
        msg.is_read = true;
        await window.apiRequest('/auth/messages/read', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message_id: messageId })
        });
        recalcUnprocessedCount();
    }
    
    let rewardDisplay = '';
    if (!msg.is_claimed && msg.reward_type && msg.reward_amount) {
        let rewardText = '';
        if (msg.reward_type === 'coins') rewardText = `${msg.reward_amount} монет`;
        else if (msg.reward_type === 'diamonds') rewardText = `${msg.reward_amount} алмазов`;
        else if (msg.reward_type === 'exp') rewardText = `${msg.reward_amount} опыта`;
        else rewardText = `${msg.reward_amount} ${msg.reward_type}`;
        rewardDisplay = `
            <div class="message-reward-info">
                <i class="fas fa-gift"></i> Награда: ${rewardText}
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
                ${!msg.is_claimed && msg.reward_type === 'skill_points_choice' ? `
                    <div class="class-choice-buttons">
                        <button class="class-choice-btn" data-class="warrior">Воин</button>
                        <button class="class-choice-btn" data-class="assassin">Ассасин</button>
                        <button class="class-choice-btn" data-class="mage">Маг</button>
                    </div>
                ` : (!msg.is_claimed && msg.reward_type && msg.reward_amount ? `<button class="claim-btn" id="claimRewardBtn">Забрать награду</button>` : '')}
            </div>
        </div>
    `;
    
    document.getElementById('backToMessagesBtn').addEventListener('click', () => renderMessages());
    document.getElementById('deleteMessageBtn').addEventListener('click', async () => {
        if (confirm('Удалить сообщение?')) {
            await window.apiRequest('/auth/messages/delete', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
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
    
    const classChoiceBtns = document.querySelectorAll('.class-choice-btn');
    if (classChoiceBtns.length) {
        classChoiceBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const chosenClass = btn.dataset.class;
                try {
                    const res = await window.apiRequest('/auth/claim-class-reward', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ message_id: messageId, chosen_class: chosenClass })
                    });
                    const data = await res.json();
                    if (data.success) {
                        if (typeof AudioManager !== 'undefined') {
                            AudioManager.playSound('reward');
                        }
                        const classNameRu = chosenClass === 'warrior' ? 'Воин' : (chosenClass === 'assassin' ? 'Ассасин' : 'Маг');
                        showToast(`Вы выбрали класс ${classNameRu} и получили 5 очков навыков!`, 2000);
                        msg.is_claimed = true;
                        await refreshData();
                        recalcUnprocessedCount();
                        renderMessageDetail(messageId);
                    } else {
                        showToast('Ошибка: ' + (data.error || 'Неизвестная ошибка'), 1500);
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Ошибка соединения', 1500);
                }
            });
        });
    }
    
    const claimBtn = document.getElementById('claimRewardBtn');
    if (claimBtn) {
        claimBtn.addEventListener('click', async () => {
            const res = await window.apiRequest('/auth/messages/claim', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message_id: messageId })
            });
            const data = await res.json();
            if (data.success) {
                if (typeof AudioManager !== 'undefined') {
                    AudioManager.playSound('reward');
                }
                let icon = '';
                if (msg.reward_type === 'coins') icon = '<i class="fas fa-coins"></i> ';
                else if (msg.reward_type === 'diamonds') icon = '<i class="fas fa-gem"></i> ';
                else icon = '<i class="fas fa-gift"></i> ';
                showToast(`${icon}Вы получили: ${data.reward_text}`, 2000);
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

// Экспорт в глобальную область
window.loadMessagesSilent = loadMessagesSilent;
window.renderMessages = renderMessages;
window.renderMessageDetail = renderMessageDetail;
window.loadMessages = loadMessages;
window.messagesList = messagesList;
window.unreadMessagesCount = unreadMessagesCount;
window.recalcUnprocessedCount = recalcUnprocessedCount;
