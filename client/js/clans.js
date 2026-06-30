// ========== МОДУЛЬ КЛАНОВ (ПОЛНАЯ ВЕРСИЯ С ПОДДЕРЖКОЙ i18n) ==========

// ========== ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ ПЕРЕВОДОВ ==========
const __ = window.__ || function(key, fallback) {
    if (window.i18next && typeof window.i18next.t === 'function') {
        return window.i18next.t(key);
    }
    return fallback || key;
};

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

// ------------------- ЗАПРЕЩЁННЫЕ СЛОВА -------------------
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

// ------------------- ПЕРЕВОД КЛАССА (через i18n) -------------------
function translateClass(classKey) {
    const key = `common:${classKey}`;
    const fallback = classKey === 'warrior' ? 'Воин' : (classKey === 'assassin' ? 'Ассасин' : (classKey === 'mage' ? 'Маг' : classKey));
    return __(key, fallback);
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
    content.innerHTML = `<div class="clans-loading" style="text-align:center; padding:40px; color:#aaa;"><i class="fas fa-spinner fa-pulse fa-2x"></i><br>${__('clans:loading', 'Загрузка кланов...')}</div>`;
    try {
        const res = await window.apiRequest('/clans/my');
        const data = await res.json();
        if (data.inClan) {
            renderMyClan(data.clan, data.members, data.userRole, data.checkedTodayList || []);
        } else {
            renderClansList();
        }
    } catch (err) {
        console.error(err);
        content.innerHTML = `<div style="text-align:center; padding:40px; color:#aaa;">${__('clans:error_loading', 'Ошибка загрузки. Попробуйте позже.')}</div>`;
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
                ${!myClanData ? `<button class="clans-create-btn" id="createClanBtn" style="flex:1;">+ ${__('clans:create_clan', 'Создать клан')}</button>` : ''}
                ${myClanData ? `<button class="clans-create-btn" id="myGuildBtn" style="flex:1;">${__('clans:my_guild', 'Моя гильдия')}</button>` : ''}
            </div>
            <div class="clans-title">${__('clans:list_title', 'Список кланов')}</div>
            <div class="clans-filters-panel">
                <div class="clans-filters-group">
                    <input type="text" id="clanSearchInput" placeholder="${__('clans:search_placeholder', 'Поиск по названию')}" value="${escapeHtml(clanListSearch)}" class="clans-filter-input">
                    <select id="clanTypeSelect" class="clans-filter-select">
                        <option value="all" ${clanListType === 'all' ? 'selected' : ''}>${__('clans:all', 'Все кланы')}</option>
                        <option value="open" ${clanListType === 'open' ? 'selected' : ''}>${__('clans:open', 'Открытые')}</option>
                        <option value="application" ${clanListType === 'application' ? 'selected' : ''}>${__('clans:application', 'По заявкам')}</option>
                        <option value="invite_only" ${clanListType === 'invite_only' ? 'selected' : ''}>${__('clans:invite_only', 'Закрытые')}</option>
                    </select>
                </div>
                <div class="clans-filters-actions">
                    <button id="clanResetFiltersBtn" class="clans-reset-btn">${__('clans:reset', 'Сброс')}</button>
                    <button id="clanApplyFiltersBtn" class="clans-apply-btn">${__('clans:apply', 'Применить')}</button>
                </div>
            </div>
            <table class="clans-table">
                <thead>
                    <tr><th style="width:50px;">${__('clans:number', '№')}</th><th style="width:60px;">${__('clans:icon', 'Значок')}</th><th>${__('clans:name_level', 'Название (Уровень)')}</th><th style="width:100px;">${__('clans:members', 'Участники')}</th><th style="width:100px;">${__('clans:action', 'Действие')}</th></tr></thead>
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
                    <td class="clans-name-cell"><div class="clan-name">${escapeHtml(clan.name)}</div><div class="clan-level">${clan.level} ${__('clans:level', 'уровень')}</div></td>
                    <td>${memberCount}/${maxMembers}</td>
                    <td><button class="clans-view-btn" data-clan-id="${clan.id}">${__('clans:view', 'Просмотр')}</button></td>
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

// ========== МОДАЛЬНОЕ ОКНО ПРОСМОТРА КЛАНА ==========
async function showClanDetailsModal(clanId) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal) return;
    modalTitle.innerText = __('clans:info', 'Инфо клана');
    modalBody.innerHTML = '<div style="text-align:center;"><i class="fas fa-spinner fa-pulse fa-2x"></i></div>';
    modal.style.display = 'flex';
    try {
        const res = await window.apiRequest(`/clans/${clanId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || __('clans:load_error', 'Ошибка загрузки'));
        const clan = data.clan;
        const members = data.members || [];
        const userMembership = data.userMembership;
        const userApplicationStatus = data.userApplicationStatus || null;
        const iconClass = ICON_MAP[clan.icon_id] || 'fa-users';
        const maxMembers = getMaxMembers(clan.level);
        const sortedMembers = [...members].sort((a,b) => {
            if (a.role === 'leader') return -1;
            if (b.role === 'leader') return 1;
            if (a.role === 'officer') return -1;
            if (b.role === 'officer') return 1;
            return b.power - a.power;
        });
        
        let membersHtml = '';
        if (sortedMembers.length > 0) {
            membersHtml = `<div style="margin-top: 20px;"><div class="clans-section-header">${__('clans:members', 'Участники')}</div><table class="clans-members-table" style="width:100%; border-collapse: collapse;">`;
            for (let i = 0; i < sortedMembers.length; i++) {
                const m = sortedMembers[i];
                const rowClass = i % 2 === 0 ? 'even' : 'odd';
                let roleText = m.role === 'leader' ? __('clans:leader', 'Лидер') : (m.role === 'officer' ? __('clans:officer', 'Офицер') : __('clans:member', 'Участник'));
                membersHtml += `
                    <tr class="${rowClass}" style="border-bottom: 1px solid #2a303c;">
                        <td style="padding: 8px 12px;">${escapeHtml(m.username)}</td>
                        <td style="padding: 8px 12px;"><span class="clans-role-badge ${m.role}">${roleText}</span></td>
                    </tr>
                `;
            }
            membersHtml += '</table></div>';
        } else {
            membersHtml = `<div style="margin-top: 20px;"><div class="clans-section-header">${__('clans:members', 'Участники')}</div><div style="padding: 12px; color:#aaa;">${__('clans:no_members', 'Нет участников')}</div></div>`;
        }
        
        let joinTypeText = '';
        if (clan.join_type === 'open') joinTypeText = __('clans:open_type', 'Открытый');
        else if (clan.join_type === 'application') joinTypeText = __('clans:application_type', 'По заявкам');
        else joinTypeText = __('clans:invite_only_type', 'Закрытый (по приглашениям)');
        
        let actionButtons = '';
        if (userMembership) {
            actionButtons = `<button id="clanLeaveBtn" class="btn btn-danger" style="background-color:#e74c3c; color:white; border:none; border-radius:30px; padding:8px 16px;">${__('clans:leave', 'Покинуть клан')}</button>`;
        } else if (clan.join_type === 'open') {
            actionButtons = `<button id="clanJoinBtn" class="btn btn-success" style="background-color:#2ecc71; color:white; border:none; border-radius:30px; padding:8px 16px;">${__('clans:join', 'Присоединиться')}</button>`;
        } else if (clan.join_type === 'application') {
            if (userApplicationStatus === 'pending') {
                actionButtons = `<button class="btn btn-disabled" disabled style="background-color:#555; color:#aaa; border:none; border-radius:30px; padding:8px 16px;">${__('clans:application_sent', 'Заявка отправлена')}</button>`;
            } else {
                actionButtons = `<button id="clanApplyBtn" class="btn btn-primary" style="background-color:#00aaff; color:white; border:none; border-radius:30px; padding:8px 16px;">${__('clans:apply_submit', 'Подать заявку')}</button>`;
            }
        } else {
            actionButtons = `<button class="btn btn-disabled" disabled style="background-color:#555; color:#aaa; border:none; border-radius:30px; padding:8px 16px;">${__('clans:closed', 'Закрыт')}</button>`;
        }
        
        modalBody.innerHTML = `
            <div class="clan-details">
                <div class="clan-details-header" style="display: flex; gap: 16px; margin-bottom: 20px;">
                    <div class="clan-details-icon" style="width: 64px; height: 64px; background-color: ${clan.icon_bg_color}; border: 3px solid ${clan.icon_border_color}; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas ${iconClass}" style="color: ${clan.icon_color}; font-size: 32px;"></i>
                    </div>
                    <div class="clan-details-info" style="flex:1;">
                        <h2 style="margin: 0 0 4px 0; font-size: 20px;">${escapeHtml(clan.name)}</h2>
                        <div style="font-size: 12px; color: #aaa;">${__('clans:level', 'Уровень')} ${clan.level} (${__('clans:exp', 'опыт')}: ${clan.exp})</div>
                    </div>
                </div>
                <div class="clan-details-stats" style="margin-bottom: 16px;">
                    <div class="clan-detail-row" style="margin-bottom: 8px;"><span style="color:#aaa;">${__('clans:members', 'Участников')}:</span> ${clan.member_count}/${maxMembers}</div>
                    <div class="clan-detail-row" style="margin-bottom: 8px;"><span style="color:#aaa;">${__('clans:join_type', 'Тип вступления')}:</span> ${joinTypeText}</div>
                    ${clan.description ? `<div class="clan-detail-row" style="margin-bottom: 8px;"><span style="color:#aaa;">${__('clans:description', 'Описание')}:</span> ${escapeHtml(clan.description)}</div>` : ''}
                </div>
                ${membersHtml}
                <div class="clan-details-actions" style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
                    ${actionButtons}
                    <button id="closeModalBtn" class="btn" style="background-color: #2f3542; color: #aaa; border: none; border-radius: 30px; padding: 8px 16px;">${__('clans:close', 'Закрыть')}</button>
                </div>
            </div>
        `;
        
        document.getElementById('closeModalBtn')?.addEventListener('click', () => modal.style.display = 'none');
        document.getElementById('clanJoinBtn')?.addEventListener('click', async () => {
            const res = await window.apiRequest('/clans/join', { method: 'POST', body: JSON.stringify({ clan_id: clanId }) });
            const data = await res.json();
            if (data.success) { showToast(__('clans:join_success', 'Вы вступили в клан!'),1500); modal.style.display='none'; renderClans(); }
            else showToast(data.error,1500);
        });
        document.getElementById('clanApplyBtn')?.addEventListener('click', async () => {
            const res = await window.apiRequest('/clans/apply', { method: 'POST', body: JSON.stringify({ clan_id: clanId }) });
            const data = await res.json();
            if (data.success) { showToast(__('clans:apply_success', 'Заявка отправлена!'),1500); modal.style.display='none'; renderClans(); }
            else showToast(data.error,1500);
        });
        document.getElementById('clanLeaveBtn')?.addEventListener('click', async () => {
            if (confirm(__('clans:leave_confirm', 'Вы уверены, что хотите покинуть клан?'))) {
                const res = await window.apiRequest('/clans/leave', { method: 'POST' });
                const data = await res.json();
                if (data.success) { showToast(__('clans:left', 'Вы покинули клан'),1500); modal.style.display='none'; renderClans(); }
                else showToast(data.error,1500);
            }
        });
    } catch(err) {
        console.error(err);
        modalBody.innerHTML = `<div style="text-align:center; color:#ff4444;">${__('clans:load_error', 'Ошибка загрузки')}: ${err.message}</div>`;
    }
}

// ------------------- МОДАЛЬНОЕ ОКНО СОЗДАНИЯ КЛАНА -------------------
function showCreateClanModal() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal) return;
    modalTitle.innerText = __('clans:create_title', 'Создание клана');
    modalBody.innerHTML = `
        <div class="clans-create-form">
            <div class="clans-form-group"><label>${__('clans:clan_name', 'Название клана')}</label><input type="text" id="clanName" maxlength="30" placeholder="${__('clans:name_placeholder', '3-30 символов')}"></div>
            <div class="clans-form-group">
                <label>${__('clans:icon_and_colors', 'Иконка и цвета')}</label>
                <div class="clans-icon-preview">
                    <div id="iconPreview" class="clans-icon-box" style="background-color:#2c3e50; border:3px solid #f1c40f;"><i id="previewIcon" class="fas fa-cat" style="color:white;"></i></div>
                    <div><div>${__('clans:icon_select', 'Выберите иконку:')}</div><select id="iconSelect">
                        <option value="1">${__('clans:cat', 'Кот')}</option><option value="2">${__('clans:dog', 'Пёс')}</option><option value="3">${__('clans:dragon', 'Дракон')}</option>
                        <option value="4">${__('clans:crown', 'Корона')}</option><option value="5">${__('clans:skull', 'Череп')}</option><option value="6">${__('clans:mask', 'Маска')}</option>
                        <option value="7">${__('clans:bolt', 'Молния')}</option><option value="8">${__('clans:feather', 'Перо')}</option>
                        <option value="9">${__('clans:paw', 'Лапа')}</option><option value="10">${__('clans:fist', 'Кулак')}</option>
                    </select></div>
                </div>
                <div style="margin:12px 0;">${__('clans:bg_color', 'Цвет фона:')}</div><div class="clans-color-palette" id="bgColorPalette"></div>
                <div style="margin:12px 0;">${__('clans:border_color', 'Цвет обводки:')}</div><div class="clans-color-palette" id="borderColorPalette"></div>
                <div style="margin:12px 0;">${__('clans:icon_color', 'Цвет иконки:')}</div><div class="clans-color-palette" id="iconColorPalette"></div>
            </div>
            <div class="clans-payment-method"><label><input type="radio" name="payment" value="coins" checked> ${__('clans:coins_2000', '2000 монет')}</label><label><input type="radio" name="payment" value="diamonds"> ${__('clans:diamonds_150', '150 алмазов')}</label></div>
            <button id="confirmCreateClan" class="clans-submit-btn">${__('clans:create', 'Создать')}</button>
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
        if (name.length < 3 || name.length > 30) { showToast(__('clans:name_length_error', 'Название должно быть 3-30 символов'),1500); return; }
        if (containsForbiddenWords(name)) { showToast(__('clans:forbidden_words', 'Название содержит запрещённые слова'),1500); return; }
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
        if (data.success) { showToast(__('clans:created', 'Клан создан!'),1500); modal.style.display='none'; renderClans(); }
        else showToast(data.error,1500);
    });
    modal.style.display = 'flex';
}

// ------------------- МОЙ КЛАН -------------------
function renderMyClan(clan, members, userRole, checkedTodayList = []) {
    const content = document.getElementById('content');
    const iconClass = ICON_MAP[clan.icon_id] || 'fa-users';
    const maxExp = getExpNeeded(clan.level);
    const expPercent = Math.min(100, (clan.exp / maxExp) * 100);
    
    content.innerHTML = `
        <div class="clans-container">
            <div class="clan-header">
                <div class="clan-header-icon" style="background-color: ${clan.icon_bg_color}; border: 2px solid ${clan.icon_border_color};">
                    <i class="fas ${iconClass}" style="color: ${clan.icon_color}; font-size: 28px;"></i>
                </div>
                <div class="clan-header-title">
                    <h2>${escapeHtml(clan.name)}</h2>
                    <div class="clan-header-level">${__('clans:clan_level', 'Уровень клана:')} ${clan.level}</div>
                    <div class="clan-header-exp">
                        <div>
                            <span class="exp-label">${__('clans:clan_exp', 'Опыт клана:')}</span>
                            <span class="exp-value">${clan.exp} / ${maxExp}</span>
                        </div>
                        <div class="exp-bar-bg"><div class="exp-bar-fill" style="width: ${expPercent}%;"></div></div>
                    </div>
                </div>
            </div>
            <div class="clans-tab-grid">
                <div class="clans-tab-row">
                    <button class="clans-tab-btn ${currentClanTab === 'info' ? 'active' : ''}" data-tab="info"><i class="fas fa-users"></i><span>${__('clans:comrades', 'Соратники')}</span></button>
                    <button class="clans-tab-btn ${currentClanTab === 'chat' ? 'active' : ''}" data-tab="chat"><i class="fas fa-comments"></i><span>${__('clans:chat', 'Чат')}</span></button>
                    <button class="clans-tab-btn ${currentClanTab === 'checkin' ? 'active' : ''}" data-tab="checkin"><i class="fas fa-calendar-check"></i><span>${__('clans:checkin', 'Отметка')}</span></button>
                </div>
                <div class="clans-tab-row">
                    <button class="clans-tab-btn ${currentClanTab === 'treasury' ? 'active' : ''}" data-tab="treasury"><i class="fas fa-coins"></i><span>${__('clans:treasury', 'Казна')}</span></button>
                    <button class="clans-tab-btn ${currentClanTab === 'talents' ? 'active' : ''}" data-tab="talents"><i class="fas fa-chart-line"></i><span>${__('clans:talents', 'Таланты')}</span></button>
                    ${userRole === 'leader' ? 
                        `<button class="clans-tab-btn ${currentClanTab === 'settings' ? 'active' : ''}" data-tab="settings"><i class="fas fa-cog"></i><span>${__('clans:management', 'Управление')}</span></button>
                         <button class="clans-tab-btn ${currentClanTab === 'applications' ? 'active' : ''}" data-tab="applications"><i class="fas fa-envelope"></i><span>${__('clans:applications_tab', 'Заявки')}</span></button>` : 
                        `<button class="clans-tab-btn disabled" disabled><i class="fas fa-lock"></i><span>${__('clans:management', 'Управление')}</span></button>`
                    }
                </div>
            </div>
            <div class="clans-tab-content" id="clanTabContent"></div>
            <div style="padding: 12px; display: flex; gap: 8px;">
                <button id="backToClanListBtn" class="clans-submit-btn" style="background-color:#2f3542; flex:1;">${__('clans:list', 'Список кланов')}</button>
                <button id="leaveClanBtn" class="clans-submit-btn" style="background-color:#e74c3c; flex:1;">${__('clans:leave', 'Покинуть клан')}</button>
            </div>
        </div>
    `;
    
    document.querySelectorAll('.clans-tab-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            currentClanTab = btn.dataset.tab;
            renderMyClan(clan, members, userRole, checkedTodayList);
        });
    });
    document.getElementById('backToClanListBtn')?.addEventListener('click', () => renderClansList());
    document.getElementById('leaveClanBtn')?.addEventListener('click', async () => {
        if (confirm(__('clans:leave_confirm', 'Вы уверены, что хотите покинуть клан?'))) {
            const res = await window.apiRequest('/clans/leave', { method: 'POST' });
            const data = await res.json();
            if (data.success) { showToast(__('clans:left', 'Вы покинули клан'),1500); renderClans(); }
            else showToast(data.error,1500);
        }
    });
    
    const tabContent = document.getElementById('clanTabContent');
    if (currentClanTab === 'info') renderClanInfo(tabContent, clan, members, userRole, checkedTodayList);
    else if (currentClanTab === 'chat') renderClanChat(tabContent, clan);
    else if (currentClanTab === 'checkin') renderClanCheckin(tabContent, clan);
    else if (currentClanTab === 'treasury') renderClanTreasury(tabContent, clan);
    else if (currentClanTab === 'talents') renderClanTalents(tabContent, clan);
    else if (currentClanTab === 'settings' && userRole === 'leader') renderClanSettings(tabContent, clan);
    else if (currentClanTab === 'applications' && userRole === 'leader') renderClanApplications(tabContent, clan);
}

// ------------------- ВСПЛЫВАЮЩЕЕ МЕНЮ ДЛЯ УПРАВЛЕНИЯ УЧАСТНИКАМИ -------------------
let activeMenu = null;

function closeMemberMenus() {
    if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
    }
}

function showMemberMenu(userId, username, role, targetElement, currentUserRole) {
    closeMemberMenus();
    const rect = targetElement.getBoundingClientRect();
    const menuDiv = document.createElement('div');
    menuDiv.className = 'clan-member-menu';
    menuDiv.style.cssText = `
        position: fixed;
        top: ${rect.bottom + 5}px;
        left: ${rect.left}px;
        background: #2a303c;
        border: 1px solid #00aaff;
        border-radius: 8px;
        padding: 5px 0;
        z-index: 10000;
        min-width: 150px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    `;
    let actionsHtml = '';
    if (currentUserRole === 'leader') {
        if (role !== 'leader') {
            actionsHtml += `<div class="menu-item-action" data-user-id="${userId}" data-action="kick">${__('clans:kick', '🚫 Исключить из клана')}</div>`;
            if (role === 'member') {
                actionsHtml += `<div class="menu-item-action" data-user-id="${userId}" data-action="promote">${__('clans:promote_officer', '⭐ Назначить офицером')}</div>`;
            } else if (role === 'officer') {
                actionsHtml += `<div class="menu-item-action" data-user-id="${userId}" data-action="demote">${__('clans:demote_officer', '⬇️ Снять офицера')}</div>`;
            }
            actionsHtml += `<div class="menu-item-action" data-user-id="${userId}" data-action="transfer">${__('clans:transfer_leadership', '👑 Передать лидерство')}</div>`;
        }
    } else if (currentUserRole === 'officer') {
        if (role !== 'leader' && role !== 'officer') {
            actionsHtml += `<div class="menu-item-action" data-user-id="${userId}" data-action="kick">${__('clans:kick', '🚫 Исключить из клана')}</div>`;
        }
    }
    if (actionsHtml === '') {
        actionsHtml = `<div class="menu-item-action disabled">${__('clans:no_actions', 'Нет доступных действий')}</div>`;
    }
    menuDiv.innerHTML = actionsHtml;
    document.body.appendChild(menuDiv);
    activeMenu = menuDiv;
    
    const clickOutside = (e) => {
        if (!menuDiv.contains(e.target) && !targetElement.contains(e.target)) {
            closeMemberMenus();
            document.removeEventListener('click', clickOutside);
        }
    };
    setTimeout(() => document.addEventListener('click', clickOutside), 0);
    
    menuDiv.querySelectorAll('.menu-item-action[data-action]').forEach(item => {
        item.addEventListener('click', async (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            const targetUserId = item.dataset.userId;
            closeMemberMenus();
            if (action === 'kick') {
                const res = await window.apiRequest('/clans/kick', { method: 'POST', body: JSON.stringify({ target_user_id: targetUserId }) });
                const data = await res.json();
                if (data.success) { showToast(__('clans:kicked', 'Игрок исключён'), 1500); renderClans(); }
                else showToast(data.error, 1500);
            } else if (action === 'promote') {
                const res = await window.apiRequest('/clans/promote', { method: 'POST', body: JSON.stringify({ target_user_id: targetUserId, role: 'officer' }) });
                const data = await res.json();
                if (data.success) { showToast(__('clans:promoted', 'Назначен офицером'), 1500); renderClans(); }
                else showToast(data.error, 1500);
            } else if (action === 'demote') {
                const res = await window.apiRequest('/clans/promote', { method: 'POST', body: JSON.stringify({ target_user_id: targetUserId, role: 'member' }) });
                const data = await res.json();
                if (data.success) { showToast(__('clans:demoted', 'Офицер снят'), 1500); renderClans(); }
                else showToast(data.error, 1500);
            } else if (action === 'transfer') {
                if (confirm(__('clans:transfer_confirm', 'Передать лидерство игроку {username}?', { username }))) {
                    const res = await window.apiRequest('/clans/transfer', { method: 'POST', body: JSON.stringify({ target_user_id: targetUserId }) });
                    const data = await res.json();
                    if (data.success) { showToast(__('clans:leadership_transferred', 'Лидерство передано'), 1500); renderClans(); }
                    else showToast(data.error, 1500);
                }
            }
        });
    });
}

// ------------------- ТАБЛИЦА СОРАТНИКОВ -------------------
function renderClanInfo(container, clan, members, userRole, checkedTodayList) {
    const today = window.getMoscowDate();
    const userCheckinStatus = checkedTodayList.includes(userData.id);
    
    let html = `<table class="clans-members-table" style="width:100%; table-layout:fixed; font-size:13px; border-collapse:collapse;">
        <thead>
            <tr style="background-color:#1a1f2b;">
                <th style="color:white; width:40%; padding:8px 4px;">${__('clans:player', 'Игрок')}</th>
                <th style="color:white; width:20%; padding:8px 4px;">${__('clans:role', 'Роль')}</th>
                <th style="color:white; width:15%; padding:8px 4px;">${__('clans:status', 'Статус')}</th>
                <th style="color:white; width:15%; padding:8px 4px;">${__('clans:checkmark', 'Отметка')}</th>
            </tr>
        </thead>
        <tbody>`;
    
    for (const m of members) {
        const statusColor = getStatusColor(m.last_energy);
        const statusIcon = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${statusColor};"></span>`;
        
        let checkinIcon = '';
        if (m.id === userData.id) {
            checkinIcon = userCheckinStatus ? '<i class="fas fa-check-circle" style="color:#2ecc71;"></i>' : '<i class="fas fa-times-circle" style="color:#aaa;"></i>';
        } else {
            checkinIcon = checkedTodayList.includes(m.id) ? '<i class="fas fa-check-circle" style="color:#2ecc71;"></i>' : '<i class="fas fa-times-circle" style="color:#aaa;"></i>';
        }
        
        const displayName = m.username.length > 20 ? m.username.substring(0,18)+'…' : m.username;
        const hasActions = (userRole === 'leader' && m.role !== 'leader') || (userRole === 'officer' && m.role === 'member');
        const menuTrigger = hasActions ? `<i class="fas fa-chevron-down clan-menu-trigger" data-user-id="${m.id}" data-username="${escapeHtml(m.username)}" data-role="${m.role}" style="color:#00aaff; cursor:pointer; margin-left:6px;"></i>` : '';
        let roleText = m.role === 'leader' ? __('clans:leader', 'Лидер') : (m.role === 'officer' ? __('clans:officer', 'Офицер') : __('clans:member', 'Участник'));
        html += `
            <tr style="border-bottom:1px solid #2a303c;">
                <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding:6px 4px;">
                    ${escapeHtml(displayName)}${menuTrigger}
                </td>
                <td style="padding:6px 4px;"><span class="clans-role-badge ${m.role}">${roleText}</span></td>
                <td style="text-align:center; padding:6px 4px;">${statusIcon}</td>
                <td style="text-align:center; padding:6px 4px;">${checkinIcon}</td>
            </tr>
        `;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
    
    document.querySelectorAll('.clan-menu-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const userId = parseInt(trigger.dataset.userId);
            const username = trigger.dataset.username;
            const role = trigger.dataset.role;
            showMemberMenu(userId, username, role, trigger, userRole);
        });
    });
}

// ------------------- ЧАТ -------------------
async function renderClanChat(container, clan) {
    const res = await window.apiRequest('/clans/chat');
    const messages = await res.json();
    let html = `<div class="clans-chat"><div class="clans-chat-messages" id="clanChatMessages">`;
    for (const msg of messages) {
        html += `<div class="clans-chat-message"><strong>${escapeHtml(msg.username)}</strong>: ${escapeHtml(msg.message)} <small style="color:#aaa;">${new Date(msg.created_at).toLocaleTimeString()}</small></div>`;
    }
    html += `</div><div class="clans-chat-input"><input type="text" id="clanChatInput" placeholder="${__('clans:enter_message', 'Введите сообщение...')}"><button id="clanChatSend">${__('clans:send', 'Отправить')}</button></div></div>`;
    container.innerHTML = html;
    const input = document.getElementById('clanChatInput');
    const sendBtn = document.getElementById('clanChatSend');
    sendBtn.addEventListener('click', async () => {
        let msg = input.value.trim();
        if (!msg) return;
        if (containsForbiddenWords(msg)) {
            showToast(__('clans:no_profanity', 'Не ругайся!'), 2000);
            return;
        }
        const res = await window.apiRequest('/clans/chat/send', { method: 'POST', body: JSON.stringify({ message: msg }) });
        if (res.ok) {
            input.value = '';
            renderClanChat(container, clan);
        } else {
            showToast(__('clans:send_error', 'Ошибка отправки'), 1500);
        }
    });
}

// ------------------- ОТМЕТКА -------------------
async function renderClanCheckin(container, clan) {
    let alreadyChecked = false;
    try {
        const statusRes = await window.apiRequest(`/clans/checkin/status?_t=${Date.now()}`);
        const statusData = await statusRes.json();
        alreadyChecked = statusData.already_checked;
    } catch(e) {
        console.error('Ошибка получения статуса отметки', e);
    }

    container.innerHTML = `
        <div style="text-align:center;">
            <button id="checkinBtn" class="clans-submit-btn" 
                ${alreadyChecked ? 'disabled style="background-color:#555; cursor:not-allowed;"' : ''}>
                ${alreadyChecked ? __('clans:already_checked', '✅ Вы уже отметились сегодня!') : __('clans:checkin_button', 'Отметиться')}
            </button>
            <div style="font-size:11px; color:#aaa; margin-top:12px; line-height:1.4;">
                ${__('clans:checkin_reward_info', 'За отметку: +50 монет, +5 угля, +10 опыта клану')}<br>
                ${__('clans:checkin_bonus', 'Если отметятся 10 соратников: +250 опыта клану')}
            </div>
        </div>
    `;

    const btn = document.getElementById('checkinBtn');
    if (btn && !alreadyChecked) {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.innerText = '⏳';
            try {
                const res = await window.apiRequest('/clans/checkin', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    renderClanCheckin(container, clan);
                    const myRes = await window.apiRequest('/clans/my');
                    const myData = await myRes.json();
                    if (myData.inClan) {
                        const savedTab = currentClanTab;
                        renderMyClan(myData.clan, myData.members, myData.userRole, myData.checkedTodayList || []);
                        currentClanTab = savedTab;
                        if (currentClanTab === 'checkin') {
                            const tabContent = document.getElementById('clanTabContent');
                            if (tabContent) renderClanCheckin(tabContent, myData.clan);
                        }
                    }
                    showToast(__('clans:checkin_received', 'Вы получили {coins} монет и {coal} угля!', { coins: data.coins, coal: data.coal }), 2000);
                } else {
                    showToast(data.error, 1500);
                    btn.disabled = false;
                    btn.innerText = __('clans:checkin_button', 'Отметиться');
                }
            } catch (err) {
                showToast(__('clans:network_error', 'Ошибка сети'), 1500);
                btn.disabled = false;
                btn.innerText = __('clans:checkin_button', 'Отметиться');
            }
        });
    }
}

// ------------------- КАЗНА + ПОКУПКА ОЧКОВ НАВЫКОВ -------------------
async function renderClanTreasury(container, clan) {
    const treasuryRes = await window.apiRequest('/clans/treasury');
    const treasury = await treasuryRes.json();
    const bonusesRes = await window.apiRequest('/clans/bonuses');
    const bonuses = await bonusesRes.json();
    const totalPoints = bonuses.total_points;
    const maxPoints = clan.level * 5;
    
    let cost = 2000;
    if (totalPoints >= 5 && totalPoints < 10) cost = 3000;
    else if (totalPoints >= 10 && totalPoints < 20) cost = 4500;
    else if (totalPoints >= 20) cost = 6000;
    
    let html = `
        <div class="clans-treasury-balance">${__('clans:treasury_balance', '💰 {coins} монет в казне', { coins: treasury.coins })}</div>
        <div class="clans-donate-form">
            <input type="number" id="donateAmount" placeholder="${__('clans:amount', 'Сумма')}" min="1">
            <button id="donateBtn">${__('clans:donate', 'Пожертвовать')}</button>
        </div>
        <div style="font-size:12px; color:#aaa; margin-bottom:20px;">${__('clans:donate_info', 'За каждые 100 пожертвованных монет клан получает +10 опыт.')}</div>
        <div style="margin-top:16px; padding-top:12px; border-top:1px solid #3a4050;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${__('clans:clan_skills', 'Клановые навыки')}</strong><br>
                    <span style="font-size:12px;">${__('clans:points_bought', 'Куплено очков:')} ${totalPoints} / ${maxPoints}</span>
                </div>
                <button id="buySkillBtn" class="clans-submit-btn" style="width:auto; padding:6px 16px;">
                    <i class="fas fa-coins"></i> ${cost} ${__('clans:coins', 'монет')}
                </button>
            </div>
            <div style="font-size:11px; color:#aaa; margin-top:6px;">${__('clans:skill_points_info', 'Покупка очка увеличивает бонусы для всех участников в клановых битвах')}</div>
        </div>
    `;
    container.innerHTML = html;
    
    document.getElementById('donateBtn')?.addEventListener('click', async () => {
        const amount = parseInt(document.getElementById('donateAmount').value);
        if (isNaN(amount) || amount <= 0) { showToast(__('clans:enter_valid_amount', 'Введите корректную сумму'), 1500); return; }
        const res = await window.apiRequest('/clans/donate', { method: 'POST', body: JSON.stringify({ amount }) });
        const data = await res.json();
        if (data.success) { showToast(__('clans:donated', 'Вы пожертвовали {amount} монет!', { amount }), 1500); renderClanTreasury(container, clan); if (typeof refreshData === 'function') refreshData(); }
        else showToast(data.error, 1500);
    });
    
    document.getElementById('buySkillBtn')?.addEventListener('click', async () => {
        const res = await window.apiRequest('/clans/buy-point', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast(__('clans:skill_bought', 'Очко навыка куплено за {cost} монет!', { cost: data.cost }), 1500);
            renderClanTreasury(container, clan);
            if (typeof refreshData === 'function') refreshData();
        } else {
            showToast(data.error, 1500);
        }
    });
}

// ------------------- ТАЛАНТЫ (КНОПКИ [+|-]) -------------------
async function renderClanTalents(container, clan) {
    const res = await window.apiRequest('/clans/bonuses');
    const bonuses = await res.json();
    const totalPoints = bonuses.total_points;
    const maxPoints = clan.level * 5;
    
    const distributed = (bonuses.bonus_hp || 0) + (bonuses.bonus_attack || 0) + (bonuses.bonus_defense || 0) +
                        (bonuses.bonus_agility || 0) + (bonuses.bonus_crit_damage || 0) + (bonuses.bonus_vampirism || 0);
    const available = totalPoints - distributed;
    
    let html = `<div style="margin-bottom:12px;">
                    ${__('clans:points_bought', 'Куплено очков:')} ${totalPoints} / ${maxPoints}<br>
                    ${__('clans:available_points', 'Доступно для распределения:')} ${available}
                </div>
                <div class="clans-talents-list">`;
    html += renderTalentRow(__('clans:health', 'Здоровье'), bonuses.bonus_hp, 'hp');
    html += renderTalentRow(__('clans:attack', 'Атака'), bonuses.bonus_attack, 'attack');
    html += renderTalentRow(__('clans:defense', 'Защита'), bonuses.bonus_defense, 'defense');
    html += renderTalentRow(__('clans:agility', 'Ловкость'), bonuses.bonus_agility, 'agility');
    html += renderTalentRow(__('clans:crit_damage', 'Крит. урон'), bonuses.bonus_crit_damage, 'crit_damage');
    html += renderTalentRow(__('clans:vampirism', 'Вампиризм'), bonuses.bonus_vampirism, 'vampirism');
    html += `</div>`;
    container.innerHTML = html;
    
    container.querySelectorAll('.talent-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const stat = btn.dataset.stat;
            const op = btn.dataset.op;
            const delta = op === 'incr' ? 1 : -1;
            
            btn.disabled = true;
            try {
                const adjustRes = await window.apiRequest('/clans/adjust-talent', {
                    method: 'POST',
                    body: JSON.stringify({ stat, delta })
                });
                const data = await adjustRes.json();
                if (data.success) {
                    const row = btn.closest('.clans-talent-row');
                    const valueSpan = row.querySelector('.clans-talent-value');
                    let currentVal = parseInt(valueSpan.innerText.replace('+', ''));
                    valueSpan.innerText = `+${currentVal + delta}`;
                    
                    const infoDiv = container.querySelector('div[style*="margin-bottom:12px"]');
                    if (infoDiv) {
                        const allValues = [...container.querySelectorAll('.clans-talent-value')].map(span => parseInt(span.innerText.replace('+', '')));
                        const newDistributed = allValues.reduce((sum, v) => sum + v, 0);
                        const newAvailable = totalPoints - newDistributed;
                        infoDiv.innerHTML = `${__('clans:points_bought', 'Куплено очков:')} ${totalPoints} / ${maxPoints}<br>${__('clans:available_points', 'Доступно для распределения:')} ${newAvailable}`;
                    }
                    
                    showToast(__('clans:talents_updated', 'Распределение обновлено'), 1000);
                } else {
                    showToast(data.error, 1500);
                }
            } catch (err) {
                showToast(__('clans:network_error', 'Ошибка сети'), 1500);
            } finally {
                btn.disabled = false;
            }
        });
    });
}

function renderTalentRow(name, value, key) {
    return `
        <div class="clans-talent-row">
            <span class="clans-talent-name">${name}</span>
            <span class="clans-talent-value">+${value}</span>
            <div class="clans-talent-controls-group">
                <button class="talent-btn talent-minus" data-stat="${key}" data-op="decr"><i class="fas fa-minus"></i></button>
                <button class="talent-btn talent-plus" data-stat="${key}" data-op="incr"><i class="fas fa-plus"></i></button>
            </div>
        </div>
    `;
}

// ------------------- УПРАВЛЕНИЕ (НАСТРОЙКИ) -------------------
function renderClanSettings(container, clan) {
    let currentIconId = clan.icon_id;
    let currentBgColor = clan.icon_bg_color;
    let currentBorderColor = clan.icon_border_color;
    let currentIconColor = clan.icon_color;
    let currentJoinType = clan.join_type || 'open';
    
    container.innerHTML = `
        <div style="padding: 12px;">
            <div class="clans-form-group"><label>${__('clans:clan_name', 'Название клана')}</label><input type="text" id="editClanName" value="${escapeHtml(clan.name)}" maxlength="30"></div>
            <div class="clans-form-group"><label>${__('clans:clan_description', 'Описание клана')}</label><textarea id="editClanDescription" rows="3" maxlength="150" style="resize: none;" placeholder="${__('clans:description_placeholder', 'Описание')}">${escapeHtml(clan.description || '')}</textarea></div>
            <div class="clans-form-group">
                <label>${__('clans:join_type', 'Вход в гильдию')}</label>
                <select id="editJoinType">
                    <option value="open" ${currentJoinType === 'open' ? 'selected' : ''}>${__('clans:open_description', 'Открытый (вступление без подтверждения)')}</option>
                    <option value="application" ${currentJoinType === 'application' ? 'selected' : ''}>${__('clans:application_description', 'По заявкам (требуется одобрение)')}</option>
                    <option value="invite_only" ${currentJoinType === 'invite_only' ? 'selected' : ''}>${__('clans:invite_only_description', 'Закрытый (только по приглашениям)')}</option>
                </select>
            </div>
            <div class="clans-form-group">
                <label>${__('clans:icon_and_colors', 'Иконка и цвета')}</label>
                <div class="clans-icon-preview">
                    <div id="editIconPreview" class="clans-icon-box" style="background-color: ${currentBgColor}; border: 3px solid ${currentBorderColor};"><i id="editPreviewIcon" class="fas ${ICON_MAP[currentIconId] || 'fa-cat'}" style="color: ${currentIconColor}; font-size:32px;"></i></div>
                    <div><div>${__('clans:icon_select', 'Выберите иконку:')}</div><select id="editIconSelect">
                        <option value="1" ${currentIconId===1?'selected':''}>${__('clans:cat', 'Кот')}</option><option value="2" ${currentIconId===2?'selected':''}>${__('clans:dog', 'Пёс')}</option><option value="3" ${currentIconId===3?'selected':''}>${__('clans:dragon', 'Дракон')}</option>
                        <option value="4" ${currentIconId===4?'selected':''}>${__('clans:crown', 'Корона')}</option><option value="5" ${currentIconId===5?'selected':''}>${__('clans:skull', 'Череп')}</option><option value="6" ${currentIconId===6?'selected':''}>${__('clans:mask', 'Маска')}</option>
                        <option value="7" ${currentIconId===7?'selected':''}>${__('clans:bolt', 'Молния')}</option><option value="8" ${currentIconId===8?'selected':''}>${__('clans:feather', 'Перо')}</option>
                        <option value="9" ${currentIconId===9?'selected':''}>${__('clans:paw', 'Лапа')}</option><option value="10" ${currentIconId===10?'selected':''}>${__('clans:fist', 'Кулак')}</option>
                    </select></div>
                </div>
                <div style="margin:12px 0;">${__('clans:bg_color', 'Цвет фона:')}</div><div class="clans-color-palette" id="editBgColorPalette"></div>
                <div style="margin:12px 0;">${__('clans:border_color', 'Цвет обводки:')}</div><div class="clans-color-palette" id="editBorderColorPalette"></div>
                <div style="margin:12px 0;">${__('clans:icon_color', 'Цвет иконки:')}</div><div class="clans-color-palette" id="editIconColorPalette"></div>
            </div>
            <button id="saveClanSettingsBtn" class="clans-submit-btn">${__('clans:settings_save', 'Сохранить изменения')}</button>
            <hr style="margin:20px 0;"><button id="disbandClanBtn" class="clans-submit-btn" style="background-color:#e74c3c;">${__('clans:disband', '⚠️ Расформировать клан')}</button>
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
        if (newName.length < 3 || newName.length > 30) { showToast(__('clans:name_length_error', 'Название должно быть 3-30 символов'),1500); return; }
        if (containsForbiddenWords(newName)) { showToast(__('clans:forbidden_words', 'Название содержит запрещённые слова'),1500); return; }
        const newDesc = document.getElementById('editClanDescription').value;
        const newJoinType = document.getElementById('editJoinType').value;
        const updateData = {
            name: newName, description: newDesc, join_type: newJoinType,
            icon_id: newIconId, icon_bg_color: newBgColor,
            icon_border_color: newBorderColor, icon_color: newIconColor
        };
        const res = await window.apiRequest(`/clans/${clan.id}/settings`, { method: 'PUT', body: JSON.stringify(updateData) });
        const data = await res.json();
        if (data.success) { showToast(__('clans:settings_saved', 'Настройки сохранены!'),1500); renderClans(); }
        else showToast(data.error,1500);
    });
    
    document.getElementById('disbandClanBtn')?.addEventListener('click', async () => {
        if (confirm(__('clans:disband_confirm', 'ВНИМАНИЕ! Расформирование клана удалит всех участников и сам клан. Отменить нельзя. Продолжить?'))) {
            const res = await window.apiRequest(`/clans/${clan.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) { showToast(__('clans:disbanded', 'Клан расформирован'),1500); renderClans(); }
            else showToast(data.error,1500);
        }
    });
}

// ------------------- ЗАЯВКИ (ДЛЯ ЛИДЕРА) -------------------
async function renderClanApplications(container, clan) {
    const res = await window.apiRequest('/clans/applications');
    const applications = await res.json();
    if (applications.error) {
        container.innerHTML = `<div style="color:#aaa; text-align:center;">${applications.error}</div>`;
        return;
    }
    if (applications.length === 0) {
        container.innerHTML = `<div style="color:#aaa; text-align:center;">${__('clans:no_applications', 'Нет заявок на вступление')}</div>`;
        return;
    }
    let html = `
        <table class="clans-members-table" style="width:100%; font-size:13px;">
            <thead>
                <tr>
                    <th>${__('clans:player', 'Игрок')}</th>
                    <th>${__('clans:level', 'Уровень')}</th>
                    <th>${__('clans:class', 'Класс')}</th>
                    <th>${__('clans:power', 'Сила')}</th>
                    <th>${__('clans:actions', 'Действия')}</th>
                </tr>
            </thead>
            <tbody>
    `;
    for (const app of applications) {
        const level = app.hero_level || 1;
        const heroClass = translateClass(app.hero_class);
        const power = app.power || 0;
        const date = new Date(app.created_at).toLocaleString();
        html += `
            <tr>
                <td><strong>${escapeHtml(app.username)}</strong><br><span style="font-size:10px; color:#aaa;">${date}</span></td>
                <td>${level}</td>
                <td>${heroClass}</td>
                <td>${power}</td>
                <td>
                    <button class="clans-action-btn accept-app" data-id="${app.id}" style="background-color:#2ecc71; color:white;"><i class="fas fa-check"></i></button>
                    <button class="clans-action-btn reject-app" data-id="${app.id}" style="background-color:#e74c3c; color:white;"><i class="fas fa-times"></i></button>
                </td>
            </tr>
        `;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
    
    document.querySelectorAll('.accept-app').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const res = await window.apiRequest('/clans/accept-application', { method: 'POST', body: JSON.stringify({ application_id: id }) });
            const data = await res.json();
            if (data.success) {
                showToast(__('clans:application_accepted', 'Заявка принята'), 1000);
                renderClanApplications(container, clan);
                renderClans();
            } else showToast(data.error, 1500);
        });
    });
    document.querySelectorAll('.reject-app').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const res = await window.apiRequest('/clans/reject-application', { method: 'POST', body: JSON.stringify({ application_id: id }) });
            const data = await res.json();
            if (data.success) {
                showToast(__('clans:application_rejected', 'Заявка отклонена'), 1000);
                renderClanApplications(container, clan);
            } else showToast(data.error, 1500);
        });
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
