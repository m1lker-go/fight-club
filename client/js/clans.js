// ========== МОДУЛЬ КЛАНОВ ==========
let currentClanTab = 'info';
let clanListSearch = '';
let clanListType = 'all';
let activeMenuUserId = null;

const ICON_MAP = {
    1: 'fa-cat', 2: 'fa-dog', 3: 'fa-dragon', 4: 'fa-crown', 5: 'fa-skull',
    6: 'fa-mask', 7: 'fa-bolt', 8: 'fa-feather', 9: 'fa-paw', 10: 'fa-fist-raised'
};

const COLOR_PALETTE = [
    '#1a1f2b', '#000000', '#ffffff', '#7f8c8d',
    '#3498db', '#9b59b6', '#f1c40f', '#e74c3c',
    '#e67e22', '#27ae60', '#8e44ad', '#1abc9c'
];

// ------------------- ЗАПРЕЩЁННЫЕ СЛОВА (ПОЛНЫЙ СПИСОК) -------------------
const FORBIDDEN_WORDS = [
    'мат', 'хуй', 'пизда', 'бля', 'ебать', 'писька', 'хер', 'залупа', 'мудак', 'говно','член',
    'редиска', 'лох', 'сука', 'пидор', 'гнида', 'тварь', 'шлюха', 'блядина', 'еблан', 'долбоеб',
    'хуесос', 'чмо', 'мразь', 'ублюдок', 'дебил', 'идиот', 'кретин', 'придурок', 'тупица',
    'скотина', 'сволочь', 'паскуда', 'выблядок', 'курва', 'бздюх', 'пердун', 'срака', 'жопа',
    'мудила', 'пиздюк', 'хуйло', 'ебальник', 'ебарь', 'заебать', 'выебать', 'отъебаться',
    'ебашь', 'нахуй', 'охуеть', 'пиздец', 'ебанутый', 'хрен', 'хреново', 'пропиздон', 'распиздяй',
    'манда', 'мандавошка', 'петух', 'гандон', 'пидорас', 'петушара', 'сучка', 'сучонок',
    'блядки', 'блядство', 'блядовать', 'блядун', 'блядюга', 'блядюшка', 'бля', 'блин',
    'жополиз', 'засранец', 'обосраться', 'опизденеть', 'отпиздить', 'пиздабол', 'разъебать', 'съебаться', 'уебок', 'хуйня',
    'мудило', 'мудозвон', 'срач', 'срун', 'очко', 'шмар',
    'fuck', 'shit', 'bitch', 'cunt', 'dick', 'asshole', 'bastard', 'damn', 'hell', 'piss', 'crap',
    'slut', 'whore', 'cock', 'pussy', 'twat', 'motherfucker', 'faggot', 'nigger', 'retard', 'wanker',
    'bloody', 'bugger', 'arse', 'arsehole', 'bollocks', 'cocksucker', 'dumbass', 'jackass', 'douchebag',
    'douche', 'dickhead', 'shithead', 'fuckhead', 'buttface', 'turd', 'scumbag', 'sonofabitch', 'goddamn',
    'goddammit', 'horseshit', 'bullshit', 'fuckshit', 'shitfuck', 'bitchass', 'dickwad',
    'fuckface', 'asswipe', 'asshat', 'shitstain', 'cum', 'cumshot', 'cumdump', 'jizz', 'semen', 'fap',
    'masturbate', 'screw', 'screwed', 'fucking', 'shitting', 'bitching', 'motherfucking', 'goddamned',
    'noob', 'n00b', 'nooblet', 'scrub', 'pleb', 'peasant', 'fail', 'loser', 'idiot', 'moron', 'imbecile',
    'cretin', 'dumb', 'stupid', 'retarded', 'mongoloid', 'spastic', 'spaz', 'lame', 'weak', 'sucker',
    'punk', 'pussy', 'dick', 'prick', 'jerk', 'dweeb', 'geek', 'nerd', 'weirdo', 'freak', 'psycho',
    'maniac', 'bastard', 'beast', 'pig', 'dog', 'rat', 'worm', 'snake', 'vermin', 'scum', 'garbage',
    'trash', 'rubbish', 'filth', 'dirt', 'slime', 'scourge', 'plague', 'cancer', 'tumor', 'virus',
    'wtf', 'stfu', 'gtfo', 'fml', 'fuk', 'fck', 'fvck', 'phuck', 'sh1t', 'sh*t', 'b1tch', 'b*tch',
    'c0ck', 'c*nt', 'd1ck', 'd*ck', 'p0rn', 'pr0n', 'p*rn', 'a55', 'a$$', 'a*s', 'a-hole', 'ass',
    'еб', 'еба', 'ебу', 'ебё', 'ебл', 'ебн', 'ёб', 'йоб', 'йоба', 'ёба', 'ёбн', 'ёбарь', 'йопта',
    'ёпта', 'ёкарный', 'ёклмн', 'ёксель', 'ёпрст', 'ёшкин', 'йод', 'ху', 'хую', 'хуя', 'хуюшки',
    'хреновина', 'хрень', 'пизд', 'пизде', 'пиздю', 'пиздя', 'пизж', 'пизжен', 'пиздатый',
    'пиздануть', 'пиздануться', 'пиздеть', 'пиздишь', 'пиздюк', 'пиздюля', 'пиздюшник', 'пиздопроёбина',
    'ёж', 'ёжкин', 'ёженька', 'ёпт', 'ёптить',
    'dipshit', 'dumbshit', 'fucktard', 'fucknugget', 'fuckwit', 'shitbag', 'shitbrick', 'shitcanoe',
    'shitdick', 'shitface', 'shitfuck', 'shitgibbon', 'shithouse', 'shitlord', 'shitmonger', 'shitpile',
    'shitsack', 'shitshow', 'shitsipper', 'shitspitter', 'shitstain', 'shittard', 'shitwad', 'shitweasel',
    'suckass', 'suckhole', 'suckwad', 'thundercunt', 'turdball', 'turdblossom', 'turdcutter', 'turdface',
    'turdfucker', 'turdhole', 'turdslinger', 'turdtwiddler', 'whorebag', 'whoreface', 'whorehound',
    'whorehouse', 'whorelord', 'whoremonger', 'whoreson', 'whorewhacker', 'wankstain', 'wankpuffin'
];

function containsForbiddenWords(text) {
    const lower = text.toLowerCase();
    return FORBIDDEN_WORDS.some(word => lower.includes(word));
}

// ------------------- ФОРМУЛЫ -------------------
function getExpNeeded(level) {
    return Math.floor(1000 * Math.pow(level, 1.45) / 1000) * 1000;
}
function getMaxMembers(level) {
    return 10 + Math.floor((level - 1) / 5);
}

// ------------------- СТАТУС ОНЛАЙН -------------------
function getStatusColor(lastEnergy) {
    if (!lastEnergy) return '#aaa';
    const now = new Date();
    const lastDate = new Date(lastEnergy);
    const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '#2ecc71';
    if (diffDays === 1) return '#f1c40f';
    if (diffDays <= 7) return '#aaa';
    return '#e74c3c';
}

// ------------------- ИНИЦИАЛИЗАЦИЯ ЗАКРЫТИЯ МОДАЛОК -------------------
function initModalClose() {
    const modal = document.getElementById('roleModal');
    if (!modal) return;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
    const closeSpan = modal.querySelector('.close');
    if (closeSpan) closeSpan.onclick = () => modal.style.display = 'none';
}
initModalClose();

// ------------------- ГЛАВНАЯ ТОЧКА ВХОДА -------------------
async function renderClans() {
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = `<div class="clans-loading" style="text-align:center; padding:40px; color:#aaa;"><i class="fas fa-spinner fa-pulse fa-2x"></i><br>Загрузка кланов...</div>`;
    try {
        const res = await window.apiRequest('/clans/my');
        const data = await res.json();
        if (data.inClan) {
            renderMyClan(data.clan, data.members, data.userRole);
        } else {
            renderClansList();
        }
    } catch (err) {
        console.error(err);
        content.innerHTML = '<div style="text-align:center; padding:40px; color:#aaa;">Ошибка загрузки. Попробуйте позже.</div>';
    }
}

// ------------------- СПИСОК КЛАНОВ (ТАБЛИЦА) -------------------
async function renderClansList() {
    const content = document.getElementById('content');
    let myClanData = null;
    try {
        const myRes = await window.apiRequest('/clans/my');
        const myData = await myRes.json();
        if (myData.inClan) myClanData = myData;
    } catch(e) {}

    const res = await window.apiRequest('/clans/list');
    let clans = await res.json();
    
    let filtered = clans.filter(c => {
        if (clanListType !== 'all' && c.join_type !== clanListType) return false;
        if (clanListSearch && !c.name.toLowerCase().includes(clanListSearch.toLowerCase())) return false;
        return true;
    });
    filtered.sort((a, b) => b.level - a.level);
    
    const maxRows = 10;
    const rowsToShow = Math.max(filtered.length, maxRows);
    
    let html = `
        <div class="clans-container">
            <div style="display: flex; gap: 8px; padding: 12px;">
                ${!myClanData ? `<button class="clans-create-btn" id="createClanBtn" style="flex:1;">+ Создать клан</button>` : ''}
                ${myClanData ? `<button class="clans-create-btn" id="myGuildBtn" style="flex:1;">Моя гильдия</button>` : ''}
            </div>
            <div class="clans-title">Список кланов</div>
            <div class="clans-filters-panel">
                <div class="clans-filters-group">
                    <input type="text" id="clanSearchInput" placeholder="Поиск по названию" value="${escapeHtml(clanListSearch)}" class="clans-filter-input">
                    <select id="clanTypeSelect" class="clans-filter-select">
                        <option value="all" ${clanListType === 'all' ? 'selected' : ''}>Все кланы</option>
                        <option value="open" ${clanListType === 'open' ? 'selected' : ''}>Открытые</option>
                        <option value="application" ${clanListType === 'application' ? 'selected' : ''}>По заявкам</option>
                        <option value="invite_only" ${clanListType === 'invite_only' ? 'selected' : ''}>Закрытые</option>
                    </select>
                </div>
                <div class="clans-filters-actions">
                    <button id="clanResetFiltersBtn" class="clans-reset-btn">Сброс</button>
                    <button id="clanApplyFiltersBtn" class="clans-apply-btn">Применить</button>
                </div>
            </div>
            <table class="clans-table">
                <thead>
                    <tr><th style="width:50px;">№</th><th style="width:60px;">Значок</th><th>Название (Уровень)</th><th style="width:100px;">Участники</th><th style="width:100px;">Действие</th></tr></thead>
                <tbody>
    `;
    for (let i = 0; i < rowsToShow; i++) {
        const clan = filtered[i];
        if (clan) {
            const memberCount = clan.current_members || 0;
            const maxMembers = getMaxMembers(clan.level);
            const iconClass = ICON_MAP[clan.icon_id] || 'fa-users';
            html += `
                <tr class="clan-row" data-clan-id="${clan.id}">
                    <td>${i+1}</td>
                    <td class="clans-icon-cell"><div class="clan-icon-small" style="background-color: ${clan.icon_bg_color}; border: 2px solid ${clan.icon_border_color};"><i class="fas ${iconClass}" style="color: ${clan.icon_color}; font-size:20px;"></i></div></td>
                    <td class="clans-name-cell"><div class="clan-name">${escapeHtml(clan.name)}</div><div class="clan-level">${clan.level} уровень</div></td>
                    <td>${memberCount}/${maxMembers}</td>
                    <td><button class="clans-view-btn" data-clan-id="${clan.id}">Просмотр</button></td>
                </tr>
            `;
        } else {
            html += `<tr class="empty-row"><td colspan="5" style="text-align:center; color:#555;">—</td></tr>`;
        }
    }
    html += `</tbody></table></div>`;
    content.innerHTML = html;

    if (!myClanData) document.getElementById('createClanBtn')?.addEventListener('click', () => showCreateClanModal());
    document.getElementById('myGuildBtn')?.addEventListener('click', () => renderClans());
    document.getElementById('clanResetFiltersBtn')?.addEventListener('click', () => {
        clanListSearch = '';
        clanListType = 'all';
        renderClansList();
    });
    document.getElementById('clanApplyFiltersBtn')?.addEventListener('click', () => {
        clanListSearch = document.getElementById('clanSearchInput').value;
        clanListType = document.getElementById('clanTypeSelect').value;
        renderClansList();
    });
    document.querySelectorAll('.clans-view-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); showClanDetailsModal(btn.dataset.clanId); }));
    document.querySelectorAll('.clan-row').forEach(row => row.addEventListener('click', () => showClanDetailsModal(row.dataset.clanId)));
}

// ------------------- МОДАЛЬНОЕ ОКНО ПРОСМОТРА КЛАНА -------------------
async function showClanDetailsModal(clanId) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal) return;
    modalTitle.innerText = 'Загрузка...';
    modalBody.innerHTML = '<div style="text-align:center;"><i class="fas fa-spinner fa-pulse fa-2x"></i></div>';
    modal.style.display = 'flex';
    try {
        const res = await window.apiRequest(`/clans/${clanId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
        const clan = data.clan;
        const members = data.members || [];
        const userMembership = data.userMembership;
        const iconClass = ICON_MAP[clan.icon_id] || 'fa-users';
        const maxMembers = getMaxMembers(clan.level);
        const sortedMembers = [...members].sort((a,b) => {
            if (a.role === 'leader') return -1;
            if (b.role === 'leader') return 1;
            if (a.role === 'officer') return -1;
            if (b.role === 'officer') return 1;
            return b.power - a.power;
        });
        let membersHtml = '<div class="clan-details-members"><h4>Участники</h4><ul>';
        for (const m of sortedMembers.slice(0,20)) {
            membersHtml += `<li><span class="member-name">${escapeHtml(m.username)}</span><span class="member-role ${m.role}">${m.role === 'leader' ? 'Лидер' : (m.role === 'officer' ? 'Офицер' : 'Участник')}</span><span class="member-power">⚔️ ${m.power}</span></li>`;
        }
        if (sortedMembers.length > 20) membersHtml += `<li>... и ещё ${sortedMembers.length-20}</li>`;
        membersHtml += '</ul></div>';
        modalTitle.innerText = clan.name;
        modalBody.innerHTML = `
            <div class="clan-details">
                <div class="clan-details-header">
                    <div class="clan-details-icon" style="background-color: ${clan.icon_bg_color}; border: 3px solid ${clan.icon_border_color};"><i class="fas ${iconClass}" style="color: ${clan.icon_color}; font-size:48px;"></i></div>
                    <div class="clan-details-info">
                        <h2>${escapeHtml(clan.name)}</h2>
                        <p>Уровень ${clan.level} (опыт: ${clan.exp})</p>
                        <p>Участников: ${clan.member_count}/${maxMembers}</p>
                        <p>Тип вступления: ${clan.join_type === 'open' ? 'Открытый' : (clan.join_type === 'application' ? 'По заявкам' : 'Закрытый (по приглашениям)')}</p>
                        ${clan.description ? `<p>${escapeHtml(clan.description)}</p>` : ''}
                    </div>
                </div>
                ${membersHtml}
                <div class="clan-details-actions">
                    ${userMembership ? `<button id="clanLeaveBtn" class="btn btn-danger">Покинуть клан</button>` : (clan.join_type === 'open' ? `<button id="clanJoinBtn" class="btn btn-success">Присоединиться</button>` : (clan.join_type === 'application' ? `<button id="clanApplyBtn" class="btn btn-primary">Подать заявку</button>` : `<button class="btn btn-disabled" disabled>Закрыт</button>`))}
                    <button id="closeModalBtn" class="btn">Закрыть</button>
                </div>
            </div>
        `;
        document.getElementById('closeModalBtn')?.addEventListener('click', () => modal.style.display = 'none');
        document.getElementById('clanJoinBtn')?.addEventListener('click', async () => {
            const res = await window.apiRequest('/clans/join', { method: 'POST', body: JSON.stringify({ clan_id: clanId }) });
            const data = await res.json();
            if (data.success) { showToast('Вы вступили в клан!',1500); modal.style.display='none'; renderClans(); }
            else showToast(data.error,1500);
        });
        document.getElementById('clanLeaveBtn')?.addEventListener('click', async () => {
            if (confirm('Вы уверены, что хотите покинуть клан?')) {
                const res = await window.apiRequest('/clans/leave', { method: 'POST' });
                const data = await res.json();
                if (data.success) { showToast('Вы покинули клан',1500); modal.style.display='none'; renderClans(); }
                else showToast(data.error,1500);
            }
        });
    } catch(err) { console.error(err); modalBody.innerHTML = `<div style="text-align:center; color:#ff4444;">Ошибка: ${err.message}</div>`; }
}

// ------------------- МОДАЛЬНОЕ ОКНО СОЗДАНИЯ КЛАНА -------------------
function showCreateClanModal() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal) return;
    modalTitle.innerText = 'Создание клана';
    modalBody.innerHTML = `
        <div class="clans-create-form">
            <div class="clans-form-group"><label>Название клана</label><input type="text" id="clanName" maxlength="30" placeholder="3-30 символов"></div>
            <div class="clans-form-group">
                <label>Иконка и цвета</label>
                <div class="clans-icon-preview">
                    <div id="iconPreview" class="clans-icon-box" style="background-color:#2c3e50; border:3px solid #f1c40f;"><i id="previewIcon" class="fas fa-cat" style="color:white;"></i></div>
                    <div><div>Выберите иконку:</div><select id="iconSelect">
                        <option value="1">Кот</option><option value="2">Пёс</option><option value="3">Дракон</option><option value="4">Корона</option>
                        <option value="5">Череп</option><option value="6">Маска</option><option value="7">Молния</option><option value="8">Перо</option>
                        <option value="9">Лапа</option><option value="10">Кулак</option>
                    </select></div>
                </div>
                <div style="margin:12px 0;">Цвет фона:</div><div class="clans-color-palette" id="bgColorPalette"></div>
                <div style="margin:12px 0;">Цвет обводки:</div><div class="clans-color-palette" id="borderColorPalette"></div>
                <div style="margin:12px 0;">Цвет иконки:</div><div class="clans-color-palette" id="iconColorPalette"></div>
            </div>
            <div class="clans-payment-method"><label><input type="radio" name="payment" value="coins" checked> 2000 монет</label><label><input type="radio" name="payment" value="diamonds"> 150 алмазов</label></div>
            <button id="confirmCreateClan" class="clans-submit-btn">Создать</button>
        </div>
    `;
    function renderPalette(containerId, selectedColor, onChange) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        COLOR_PALETTE.forEach(c => {
            const div = document.createElement('div');
            div.className = 'clans-color-option';
            div.style.backgroundColor = c;
            if (c === selectedColor) div.classList.add('selected');
            div.addEventListener('click', () => {
                container.querySelectorAll('.clans-color-option').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                onChange(c);
            });
            container.appendChild(div);
        });
    }
    let bgColor = '#1a1f2b', borderColor = '#f1c40f', iconColor = '#ffffff';
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
        if (name.length < 3 || name.length > 30) { showToast('Название должно быть 3-30 символов',1500); return; }
        const iconId = parseInt(iconSelect.value);
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        const res = await window.apiRequest('/clans/create', {
            method: 'POST',
            body: JSON.stringify({
                name, icon_id: iconId,
                icon_bg_color: bgColor, icon_border_color: borderColor, icon_color: iconColor,
                payment_method: paymentMethod
            })
        });
        const data = await res.json();
        if (data.success) { showToast('Клан создан!',1500); modal.style.display='none'; renderClans(); }
        else showToast(data.error,1500);
    });
    modal.style.display = 'flex';
}

// ------------------- МОЙ КЛАН (ВКЛАДКИ) -------------------
function renderMyClan(clan, members, userRole) {
    const content = document.getElementById('content');
    const iconClass = ICON_MAP[clan.icon_id] || 'fa-users';
    const maxExp = getExpNeeded(clan.level);
    const expPercent = Math.min(100, (clan.exp / maxExp) * 100);
    content.innerHTML = `
        <div class="clans-container">
            <div style="background-color: #1a1f2b; padding: 12px; text-align: center; border-bottom: 1px solid #00aaff;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                    <div style="width: 48px; height: 48px; background-color: ${clan.icon_bg_color}; border: 2px solid ${clan.icon_border_color}; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas ${iconClass}" style="color: ${clan.icon_color}; font-size: 28px;"></i>
                    </div>
                    <div>
                        <h2 style="margin:0;">${escapeHtml(clan.name)}</h2>
                        <div style="font-size: 12px; color: #aaa;">Уровень клана: ${clan.level}</div>
                        <div style="margin-top: 8px;">
                            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px;">
                                <span style="color: white;">Опыт клана:</span>
                                <span style="color: #00aaff;">${clan.exp} / ${maxExp}</span>
                            </div>
                            <div style="background-color: #2f3542; height: 8px; border-radius: 4px; overflow: hidden;">
                                <div style="background-color: #00aaff; width: ${expPercent}%; height: 100%; border-radius: 4px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="clans-tab-grid">
                <div class="clans-tab-row">
                    <button class="clans-tab-btn ${currentClanTab === 'info' ? 'active' : ''}" data-tab="info"><i class="fas fa-users"></i><span>Соратники</span></button>
                    <button class="clans-tab-btn ${currentClanTab === 'chat' ? 'active' : ''}" data-tab="chat"><i class="fas fa-comments"></i><span>Чат</span></button>
                    <button class="clans-tab-btn ${currentClanTab === 'checkin' ? 'active' : ''}" data-tab="checkin"><i class="fas fa-calendar-check"></i><span>Отметка</span></button>
                </div>
                <div class="clans-tab-row">
                    <button class="clans-tab-btn ${currentClanTab === 'treasury' ? 'active' : ''}" data-tab="treasury"><i class="fas fa-coins"></i><span>Казна</span></button>
                    <button class="clans-tab-btn ${currentClanTab === 'talents' ? 'active' : ''}" data-tab="talents"><i class="fas fa-chart-line"></i><span>Таланты</span></button>
                    ${userRole === 'leader' ? 
                        `<button class="clans-tab-btn ${currentClanTab === 'settings' ? 'active' : ''}" data-tab="settings"><i class="fas fa-cog"></i><span>Управление</span></button>` : 
                        `<button class="clans-tab-btn disabled" disabled><i class="fas fa-lock"></i><span>Управление</span></button>`
                    }
                </div>
            </div>
            <div class="clans-tab-content" id="clanTabContent"></div>
            <div style="padding: 12px; display: flex; gap: 8px;">
                <button id="backToClanListBtn" class="clans-submit-btn" style="background-color:#2f3542; flex:1;">Список кланов</button>
                <button id="leaveClanBtn" class="clans-submit-btn" style="background-color:#e74c3c; flex:1;">Покинуть клан</button>
            </div>
        </div>
    `;
    document.querySelectorAll('.clans-tab-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            currentClanTab = btn.dataset.tab;
            renderMyClan(clan, members, userRole);
        });
    });
    document.getElementById('backToClanListBtn')?.addEventListener('click', () => renderClansList());
    document.getElementById('leaveClanBtn')?.addEventListener('click', async () => {
        if (confirm('Вы уверены, что хотите покинуть клан?')) {
            const res = await window.apiRequest('/clans/leave', { method: 'POST' });
            const data = await res.json();
            if (data.success) { showToast('Вы покинули клан',1500); renderClans(); }
            else showToast(data.error,1500);
        }
    });
    const tabContent = document.getElementById('clanTabContent');
    if (currentClanTab === 'info') renderClanInfo(tabContent, clan, members, userRole);
    else if (currentClanTab === 'chat') renderClanChat(tabContent, clan);
    else if (currentClanTab === 'checkin') renderClanCheckin(tabContent, clan);
    else if (currentClanTab === 'treasury') renderClanTreasury(tabContent, clan);
    else if (currentClanTab === 'talents') renderClanTalents(tabContent, clan);
    else if (currentClanTab === 'settings' && userRole === 'leader') renderClanSettings(tabContent, clan);
}

// ------------------- ТАБЛИЦА СОРАТНИКОВ (ИСПРАВЛЕННАЯ) -------------------
function renderClanInfo(container, clan, members, userRole) {
    const today = new Date().toLocaleDateString('ru-RU');
    const userCheckinStatus = localStorage.getItem(`clan_checkin_${clan.id}_${userData.id}`) === today;
    
    let html = `<table class="clans-members-table" style="width:100%; table-layout:fixed; font-size:13px; border-collapse:collapse;">
        <thead>
            <tr style="background-color:#1a1f2b;">
                <th style="color:white; width:35%; padding:8px 4px; font-size:12px;">Игрок</th>
                <th style="color:white; width:15%; padding:8px 4px; font-size:12px;">Роль</th>
                <th style="color:white; width:15%; padding:8px 4px; font-size:12px;">Статус</th>
                <th style="color:white; width:15%; padding:8px 4px; font-size:12px;">Отметка</th>
                <th style="width:20%;"></th>
            </tr>
        </thead>
        <tbody>`;
    
    for (const m of members) {
        const statusColor = getStatusColor(m.last_energy);
        const statusIcon = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${statusColor}; margin:0 auto;"></span>`;
        
        let checkinIcon = '';
        if (m.id === userData.id) {
            checkinIcon = userCheckinStatus ? '<i class="fas fa-check-circle" style="color:#2ecc71;"></i>' : '<i class="fas fa-times-circle" style="color:#aaa;"></i>';
        } else {
            // Для других участников пока заглушка, позже можно брать из серверного поля checkedTodayList
            checkinIcon = '<span style="color:#555;">—</span>';
        }
        
        const displayName = m.username.length > 20 ? m.username.substring(0,18)+'…' : m.username;
        
        html += `
            <tr style="border-bottom:1px solid #2a303c;">
                <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding:6px 4px;">${escapeHtml(displayName)}</td>
                <td style="padding:6px 4px;"><span class="clans-role-badge ${m.role}">${m.role === 'leader' ? 'Лидер' : (m.role === 'officer' ? 'Офицер' : 'Участник')}</span></td>
                <td style="text-align:center; padding:6px 4px;">${statusIcon}</td>
                <td style="text-align:center; padding:6px 4px;">${checkinIcon}</td>
                <td style="text-align:right; padding:6px 4px;">
                    ${userRole === 'leader' && m.role !== 'leader' ? `<button class="clans-action-btn" data-user-id="${m.id}" data-action="kick" style="font-size:11px; padding:2px 8px;">Исключить</button>` : ''}
                    ${userRole === 'leader' && m.role === 'member' ? `<button class="clans-action-btn" data-user-id="${m.id}" data-action="promote" style="font-size:11px; padding:2px 8px;">Назначить</button>` : ''}
                    ${userRole === 'leader' && m.role === 'officer' ? `<button class="clans-action-btn" data-user-id="${m.id}" data-action="demote" style="font-size:11px; padding:2px 8px;">Снять</button>` : ''}
                    ${userRole === 'leader' && m.role !== 'leader' ? `<button class="clans-action-btn" data-user-id="${m.id}" data-action="transfer" style="font-size:11px; padding:2px 8px;">Передать</button>` : ''}
                </td>
            </tr>
        `;
    }
    
    html += `</tbody></table>`;
    container.innerHTML = html;
    
    // Обработчики кнопок
    container.querySelectorAll('[data-action="kick"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const res = await window.apiRequest('/clans/kick', { method: 'POST', body: JSON.stringify({ target_user_id: userId }) });
            const data = await res.json();
            if (data.success) { showToast('Игрок исключён', 1500); renderClans(); }
            else showToast(data.error, 1500);
        });
    });
    container.querySelectorAll('[data-action="promote"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const res = await window.apiRequest('/clans/promote', { method: 'POST', body: JSON.stringify({ target_user_id: userId }) });
            const data = await res.json();
            if (data.success) { showToast('Назначен офицером', 1500); renderClans(); }
            else showToast(data.error, 1500);
        });
    });
    container.querySelectorAll('[data-action="demote"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const res = await window.apiRequest('/clans/promote', { method: 'POST', body: JSON.stringify({ target_user_id: userId, role: 'member' }) });
            const data = await res.json();
            if (data.success) { showToast('Офицер снят', 1500); renderClans(); }
            else showToast(data.error, 1500);
        });
    });
    container.querySelectorAll('[data-action="transfer"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Передать лидерство этому игроку?')) {
                const userId = btn.dataset.userId;
                const res = await window.apiRequest('/clans/transfer', { method: 'POST', body: JSON.stringify({ target_user_id: userId }) });
                const data = await res.json();
                if (data.success) { showToast('Лидерство передано', 1500); renderClans(); }
                else showToast(data.error, 1500);
            }
        });
    });
}

// ------------------- ЧАТ С ПРОВЕРКОЙ МАТА -------------------
async function renderClanChat(container, clan) {
    const res = await window.apiRequest('/clans/chat');
    const messages = await res.json();
    let html = `<div class="clans-chat"><div class="clans-chat-messages" id="clanChatMessages">`;
    for (const msg of messages) {
        html += `<div class="clans-chat-message"><strong>${escapeHtml(msg.username)}</strong>: ${escapeHtml(msg.message)} <small style="color:#aaa;">${new Date(msg.created_at).toLocaleTimeString()}</small></div>`;
    }
    html += `</div><div class="clans-chat-input"><input type="text" id="clanChatInput" placeholder="Введите сообщение..."><button id="clanChatSend">Отправить</button></div></div>`;
    container.innerHTML = html;
    const input = document.getElementById('clanChatInput');
    const sendBtn = document.getElementById('clanChatSend');
    sendBtn.addEventListener('click', async () => {
        let msg = input.value.trim();
        if (!msg) return;
        if (containsForbiddenWords(msg)) {
            showToast('Не ругайся!', 2000);
            return;
        }
        const res = await window.apiRequest('/clans/chat/send', { method: 'POST', body: JSON.stringify({ message: msg }) });
        if (res.ok) {
            input.value = '';
            renderClanChat(container, clan);
        } else {
            showToast('Ошибка отправки', 1500);
        }
    });
}

// ------------------- ОТМЕТКА (БЕЗ ОТОБРАЖЕНИЯ СТАТИСТИКИ) -------------------
async function renderClanCheckin(container, clan) {
    const today = new Date().toLocaleDateString('ru-RU');
    const lastCheckin = localStorage.getItem(`clan_checkin_${clan.id}_${userData.id}`);
    const alreadyCheckedLocally = (lastCheckin === today);
    
    let html = `<div style="text-align:center;">`;
    if (!alreadyCheckedLocally) {
        html += `<button id="checkinBtn" class="clans-submit-btn">Отметиться</button>`;
    } else {
        html += `<p>✅ Вы уже отметились сегодня!</p>`;
    }
    html += `<div class="clan-stats" style="margin-top:12px;">За отметку: +50 монет, +5 угля, +10 опыта клану</div>
             <div class="clan-stats">Если все отметятся: +100 опыта клану</div></div>`;
    container.innerHTML = html;
    
    const checkinBtn = document.getElementById('checkinBtn');
    if (checkinBtn) {
        let isProcessing = false;
        checkinBtn.addEventListener('click', async () => {
            if (isProcessing) return;
            isProcessing = true;
            const btn = checkinBtn;
            const originalText = btn.innerText;
            btn.innerText = '⏳';
            btn.disabled = true;
            try {
                const res = await window.apiRequest('/clans/checkin', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem(`clan_checkin_${clan.id}_${userData.id}`, today);
                    showToast(`Вы получили ${data.coins} монет и ${data.coal} угля!`, 2000);
                    renderClanCheckin(container, clan);
                    if (typeof refreshData === 'function') refreshData();
                } else {
                    showToast(data.error, 1500);
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            } catch (err) {
                showToast('Ошибка сети', 1500);
                btn.innerText = originalText;
                btn.disabled = false;
            } finally {
                isProcessing = false;
            }
        });
    }
}

// ------------------- ОСТАЛЬНЫЕ ФУНКЦИИ (КАЗНА, ТАЛАНТЫ, УПРАВЛЕНИЕ) -------------------
async function renderClanTreasury(container, clan) {
    const res = await window.apiRequest('/clans/treasury');
    const treasury = await res.json();
    let html = `<div class="clans-treasury-balance">💰 ${treasury.coins} монет в казне</div><div class="clans-donate-form"><input type="number" id="donateAmount" placeholder="Сумма" min="1"><button id="donateBtn">Пожертвовать</button></div><div style="font-size:12px; color:#aaa;">За каждые 100 пожертвованных монет клан получает +1 опыт.</div>`;
    container.innerHTML = html;
    document.getElementById('donateBtn')?.addEventListener('click', async () => {
        const amount = parseInt(document.getElementById('donateAmount').value);
        if (isNaN(amount) || amount <= 0) { showToast('Введите корректную сумму', 1500); return; }
        const res = await window.apiRequest('/clans/donate', { method: 'POST', body: JSON.stringify({ amount }) });
        const data = await res.json();
        if (data.success) { showToast(`Вы пожертвовали ${amount} монет!`, 1500); renderClanTreasury(container, clan); if (typeof refreshData === 'function') refreshData(); }
        else showToast(data.error, 1500);
    });
}

async function renderClanTalents(container, clan) {
    const res = await window.apiRequest('/clans/bonuses');
    const bonuses = await res.json();
    const totalPoints = bonuses.total_points;
    const maxPoints = clan.level * 5;
    let html = `<div style="margin-bottom:12px;">Куплено очков: ${totalPoints} / ${maxPoints}</div><div class="clans-talents-list">${renderTalentRow('Здоровье', bonuses.bonus_hp, 'hp')}${renderTalentRow('Атака', bonuses.bonus_attack, 'attack')}${renderTalentRow('Защита', bonuses.bonus_defense, 'defense')}${renderTalentRow('Ловкость', bonuses.bonus_agility, 'agility')}${renderTalentRow('Крит. урон', bonuses.bonus_crit_damage, 'crit_damage')}${renderTalentRow('Вампиризм', bonuses.bonus_vampirism, 'vampirism')}</div>`;
    container.innerHTML = html;
}

function renderTalentRow(name, value, key) {
    return `<div class="clans-talent-row"><span class="clans-talent-name">${name}</span><span class="clans-talent-value">+${value}</span><div class="clans-talent-controls"><button data-stat="${key}" data-op="decr">-</button><span>0</span><button data-stat="${key}" data-op="incr">+</button></div></div>`;
}

function renderClanSettings(container, clan) {
    let currentIconId = clan.icon_id;
    let currentBgColor = clan.icon_bg_color;
    let currentBorderColor = clan.icon_border_color;
    let currentIconColor = clan.icon_color;
    container.innerHTML = `
        <div style="padding: 12px;">
            <div class="clans-form-group"><label>Название клана</label><input type="text" id="editClanName" value="${escapeHtml(clan.name)}" maxlength="30"></div>
            <div class="clans-form-group"><label>Описание клана</label><textarea id="editClanDescription" rows="3" placeholder="Описание">${escapeHtml(clan.description || '')}</textarea></div>
            <div class="clans-form-group">
                <label>Иконка и цвета</label>
                <div class="clans-icon-preview">
                    <div id="editIconPreview" class="clans-icon-box" style="background-color: ${currentBgColor}; border: 3px solid ${currentBorderColor};"><i id="editPreviewIcon" class="fas ${ICON_MAP[currentIconId] || 'fa-cat'}" style="color: ${currentIconColor}; font-size:32px;"></i></div>
                    <div><div>Выберите иконку:</div><select id="editIconSelect">
                        <option value="1" ${currentIconId===1?'selected':''}>Кот</option><option value="2" ${currentIconId===2?'selected':''}>Пёс</option><option value="3" ${currentIconId===3?'selected':''}>Дракон</option>
                        <option value="4" ${currentIconId===4?'selected':''}>Корона</option><option value="5" ${currentIconId===5?'selected':''}>Череп</option><option value="6" ${currentIconId===6?'selected':''}>Маска</option>
                        <option value="7" ${currentIconId===7?'selected':''}>Молния</option><option value="8" ${currentIconId===8?'selected':''}>Перо</option><option value="9" ${currentIconId===9?'selected':''}>Лапа</option><option value="10" ${currentIconId===10?'selected':''}>Кулак</option>
                    </select></div>
                </div>
                <div style="margin:12px 0;">Цвет фона:</div><div class="clans-color-palette" id="editBgColorPalette"></div>
                <div style="margin:12px 0;">Цвет обводки:</div><div class="clans-color-palette" id="editBorderColorPalette"></div>
                <div style="margin:12px 0;">Цвет иконки:</div><div class="clans-color-palette" id="editIconColorPalette"></div>
            </div>
            <button id="saveClanSettingsBtn" class="clans-submit-btn">Сохранить изменения</button>
            <hr style="margin:20px 0;"><button id="disbandClanBtn" class="clans-submit-btn" style="background-color:#e74c3c;">⚠️ Расформировать клан</button>
        </div>
    `;
    function renderEditPalette(containerId, selectedColor, onChange) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        COLOR_PALETTE.forEach(c => {
            const div = document.createElement('div');
            div.className = 'clans-color-option';
            div.style.backgroundColor = c;
            if (c === selectedColor) div.classList.add('selected');
            div.addEventListener('click', () => {
                container.querySelectorAll('.clans-color-option').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                onChange(c);
            });
            container.appendChild(div);
        });
    }
    let newBgColor = currentBgColor, newBorderColor = currentBorderColor, newIconColor = currentIconColor, newIconId = currentIconId;
    renderEditPalette('editBgColorPalette', newBgColor, (c) => { newBgColor = c; updateEditPreview(); });
    renderEditPalette('editBorderColorPalette', newBorderColor, (c) => { newBorderColor = c; updateEditPreview(); });
    renderEditPalette('editIconColorPalette', newIconColor, (c) => { newIconColor = c; updateEditPreview(); });
    const editIconSelect = document.getElementById('editIconSelect');
    const editPreviewIcon = document.getElementById('editPreviewIcon');
    const editPreviewBox = document.getElementById('editIconPreview');
    function updateEditPreview() {
        newIconId = parseInt(editIconSelect.value);
        const iconClass = ICON_MAP[newIconId] || 'fa-cat';
        editPreviewIcon.className = `fas ${iconClass}`;
        editPreviewIcon.style.color = newIconColor;
        editPreviewBox.style.backgroundColor = newBgColor;
        editPreviewBox.style.borderColor = newBorderColor;
    }
    editIconSelect.addEventListener('change', updateEditPreview);
    updateEditPreview();
    document.getElementById('saveClanSettingsBtn')?.addEventListener('click', async () => {
        const newName = document.getElementById('editClanName').value.trim();
        if (newName.length < 3 || newName.length > 30) { showToast('Название должно быть 3-30 символов',1500); return; }
        const newDesc = document.getElementById('editClanDescription').value;
        const updateData = { name: newName, description: newDesc, icon_id: newIconId, icon_bg_color: newBgColor, icon_border_color: newBorderColor, icon_color: newIconColor };
        const res = await window.apiRequest(`/clans/${clan.id}/settings`, { method: 'PUT', body: JSON.stringify(updateData) });
        const data = await res.json();
        if (data.success) { showToast('Настройки клана сохранены!',1500); renderClans(); }
        else showToast(data.error,1500);
    });
    document.getElementById('disbandClanBtn')?.addEventListener('click', async () => {
        if (confirm('ВНИМАНИЕ! Расформирование клана удалит всех участников и сам клан. Отменить нельзя. Продолжить?')) {
            const res = await window.apiRequest(`/clans/${clan.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) { showToast('Клан расформирован',1500); renderClans(); }
            else showToast(data.error,1500);
        }
    });
}

// ------------------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ -------------------
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => m==='&'?'&amp;': m==='<'?'&lt;': m==='>'?'&gt;': m);
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

window.renderClans = renderClans;
