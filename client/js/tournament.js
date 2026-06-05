// tournament.js – Турнирная система (32 участника, ежедневно в 20:00 МСК)
// с экраном ожидания на 10 минут после старта и корректным отображением счёта

let tournamentData = null;
let currentBracket = null;
let currentLeaders = null;
let refreshInterval = null;
let selectedTournamentClass = null;
let selectedTournamentSubclass = null;
let tournamentRefreshInterval = null;
let waitingTimerInterval = null;

async function renderTournament() {
    const content = document.getElementById('content');
    if (!content) return;

    content.innerHTML = `
        <div class="tournament-container">
            <div class="tournament-tabs">
                <button class="tournament-tab active" data-tab="tournament">Турнир</button>
                <button class="tournament-tab" data-tab="leaders">Лидеры</button>
            </div>
            <div id="tournamentContent" class="tournament-content"></div>
        </div>
    `;

    document.querySelectorAll('.tournament-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tournament-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            if (tab === 'tournament') renderTournamentTab();
            else renderLeadersTab();
        });
    });

    if (tournamentRefreshInterval) clearInterval(tournamentRefreshInterval);
    tournamentRefreshInterval = setInterval(() => {
        const activeTab = document.querySelector('.tournament-tab.active')?.dataset.tab;
        if (activeTab === 'tournament') {
            renderTournamentTab();
        } else if (activeTab === 'leaders') {
            renderLeadersTab();
        }
    }, 30000);

    await renderTournamentTab();
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        if (document.querySelector('.tournament-tab.active')?.dataset.tab === 'leaders') {
            renderLeadersTab();
        }
    }, 60000);
}

function getMoscowNow() {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
}

function getSecondsUntilTwentyTen() {
    const now = getMoscowNow();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const twentyTen = new Date(year, month, day, 20, 10, 0); // 20:10:00
    const diff = twentyTen - now;
    return diff > 0 ? Math.floor(diff / 1000) : 0;
}

async function renderTournamentTab() {
    const container = document.getElementById('tournamentContent');
    if (!container) return;

    try {
        const statusRes = await window.apiRequest('/tournament/status');
        const status = await statusRes.json();

        let canRegister = status.canRegister;
        const isRegistered = status.isRegistered;
        let tournamentActive = status.tournamentActive;
        const tournamentCompleted = status.tournamentCompleted;

        if (tournamentCompleted) {
            canRegister = false;
            tournamentActive = false;
        }

        if (!selectedTournamentClass && status.registeredClass) {
            selectedTournamentClass = status.registeredClass;
            selectedTournamentSubclass = status.registeredSubclass;
        }

        // ---------- НОВАЯ ЛОГИКА ОЖИДАНИЯ (20:00 – 20:10) ----------
        if (tournamentActive && !tournamentCompleted) {
            const secondsLeft = getSecondsUntilTwentyTen();
            if (secondsLeft > 0) {
                // Показываем экран ожидания с таймером
                showWaitingScreen(container, secondsLeft);
                return;
            } else {
                // Прошло 10 минут – показываем сетку результатов
                await renderBracket();
                return;
            }
        }

        // 2. Если турнир завершён – сразу показываем результаты (сетку)
        if (tournamentCompleted) {
            await renderBracket();
            return;
        }

        // 3. Если можно зарегистрироваться и турнир ещё не начался
        if (canRegister && !tournamentActive && !tournamentCompleted) {
            renderRegistrationScreen(container, isRegistered);
            return;
        }

        // 4. Иное (регистрация ещё не открыта)
        container.innerHTML = '<p style="color:#aaa; text-align:center;">Турнир ещё не начался. Загляните позже.</p>';
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:#aaa; text-align:center;">Ошибка загрузки данных турнира</p>';
    }
}

function showWaitingScreen(container, secondsLeft) {
    if (waitingTimerInterval) clearInterval(waitingTimerInterval);
    
    container.innerHTML = `
        <div class="tournament-waiting">
            <div class="tournament-waiting-icon">⚔️</div>
            <div class="tournament-waiting-title">Турнир "Золотой Коготь"</div>
            <div class="tournament-waiting-message">Турнир проводится. Ожидайте результатов...</div>
            <div class="tournament-timer" id="tournamentWaitTimer">${formatTime(secondsLeft)}</div>
            <div class="tournament-waiting-note">Страница обновится автоматически</div>
        </div>
    `;

    const timerElement = document.getElementById('tournamentWaitTimer');
    let remaining = secondsLeft;
    
    waitingTimerInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(waitingTimerInterval);
            window.location.reload(); // перезагружаем страницу, чтобы показать результаты
        } else {
            if (timerElement) timerElement.innerText = formatTime(remaining);
        }
    }, 1000);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function renderRegistrationScreen(container, isRegistered) {
    const classesHtml = `
        <div class="tournament-class-row">
            <div class="tournament-class-label">Класс</div>
            <div class="class-selector">
                <button class="class-btn ${selectedTournamentClass === 'warrior' ? 'active' : ''}" data-class="warrior">Воин</button>
                <button class="class-btn ${selectedTournamentClass === 'assassin' ? 'active' : ''}" data-class="assassin">Ассасин</button>
                <button class="class-btn ${selectedTournamentClass === 'mage' ? 'active' : ''}" data-class="mage">Маг</button>
            </div>
        </div>
    `;

    let subclassesHtml = '';
    if (selectedTournamentClass) {
        const subclasses = getSubclassesForClass(selectedTournamentClass);
        subclassesHtml = `
            <div class="tournament-role-row">
                <div class="tournament-role-label">Роль</div>
                <select id="tournamentSubclassSelect">
                    ${subclasses.map(sc => `<option value="${sc}" ${selectedTournamentSubclass === sc ? 'selected' : ''}>${getRoleNameRu(sc)}</option>`).join('')}
                </select>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="tournament-header">
            <div class="tournament-title">ТУРНИР "ЗОЛОТОЙ КОГОТЬ"</div>
            <i class="fas fa-question-circle tournament-help-icon" id="tournamentHelpBtn"></i>
        </div>
        <div class="tournament-registration">
            ${classesHtml}
            <div id="tournamentSubclassArea">${subclassesHtml}</div>
            <button id="tournamentRegisterBtn" class="tournament-action-btn" ${isRegistered ? 'disabled' : ''}>
                ${isRegistered ? 'Вы уже зарегистрированы' : 'Записаться'}
            </button>
            ${isRegistered ? `<button id="tournamentUnregisterBtn" class="tournament-action-btn secondary">Отменить запись</button>` : ''}
            <div class="tournament-info">Регистрация с 10:00 до 19:50. Снаряжение фиксируется при регистрации.</div>
        </div>
    `;

    document.getElementById('tournamentHelpBtn')?.addEventListener('click', showTournamentRulesModal);

    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const className = btn.dataset.class;
            if (className === selectedTournamentClass) return;
            selectedTournamentClass = className;
            const subclasses = getSubclassesForClass(className);
            selectedTournamentSubclass = subclasses[0];
            await window.apiRequest('/tournament/select-class', {
                method: 'POST',
                body: JSON.stringify({ class: className })
            });
            await window.apiRequest('/tournament/select-subclass', {
                method: 'POST',
                body: JSON.stringify({ subclass: selectedTournamentSubclass })
            });
            renderTournamentTab();
        });
    });

    const subclassSelect = document.getElementById('tournamentSubclassSelect');
    if (subclassSelect) {
        subclassSelect.addEventListener('change', async () => {
            const subclass = subclassSelect.value;
            selectedTournamentSubclass = subclass;
            await window.apiRequest('/tournament/select-subclass', {
                method: 'POST',
                body: JSON.stringify({ subclass })
            });
        });
    }

    const regBtn = document.getElementById('tournamentRegisterBtn');
    if (regBtn && !isRegistered) {
        regBtn.addEventListener('click', async () => {
            if (!selectedTournamentClass || !selectedTournamentSubclass) {
                showToast('Сначала выберите класс и роль', 1500);
                return;
            }
            const res = await window.apiRequest('/tournament/register', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('Вы записаны на турнир!', 1500);
                renderTournamentTab();
            } else {
                showToast(data.error || 'Ошибка регистрации', 1500);
            }
        });
    }

    const unregBtn = document.getElementById('tournamentUnregisterBtn');
    if (unregBtn) {
        unregBtn.addEventListener('click', async () => {
            const res = await window.apiRequest('/tournament/unregister', { method: 'POST' });
            if (res.ok) {
                showToast('Вы отменили запись', 1500);
                renderTournamentTab();
            } else {
                showToast('Ошибка отмены', 1500);
            }
        });
    }
}

async function renderBracket() {
    const container = document.getElementById('tournamentContent');
    if (!container) return;
    try {
        const bracketRes = await window.apiRequest('/tournament/bracket');
        const bracket = await bracketRes.json();
        if (!bracket.matches || bracket.matches.length === 0) {
            container.innerHTML = `
                <p style="color:#aaa; text-align:center;">Матчи турнира ещё не загружены. Попробуйте обновить позже.</p>
                <div style="text-align:center; margin-top:20px;">
                    <button id="refreshBracketBtn" class="tournament-action-btn">Обновить</button>
                </div>
            `;
            document.getElementById('refreshBracketBtn')?.addEventListener('click', () => renderTournamentTab());
            return;
        }

        // Группируем матчи по раундам
        const rounds = {};
        bracket.matches.forEach(m => {
            if (!rounds[m.round]) rounds[m.round] = [];
            rounds[m.round].push(m);
        });

        let html = '<div class="tournament-bracket">';
        
        // Раунды с 1 по 4 (до полуфиналов)
        for (let roundNum = 1; roundNum <= 4; roundNum++) {
            const roundMatches = rounds[roundNum] || [];
            if (roundMatches.length === 0 && roundNum === 4) break;
            html += `<div class="tournament-round"><div class="tournament-round-title">${getRoundName(roundNum)}</div>`;
            roundMatches.forEach(match => {
                html += renderMatchRow(match);
            });
            html += `</div>`;
        }
        
        // Раунд 5: сначала матч за 3-е место (match_index = 2), потом финал (match_index = 1)
        const round5Matches = rounds[5] || [];
        const thirdPlaceMatch = round5Matches.find(m => m.match_index === 2);
        const finalMatch = round5Matches.find(m => m.match_index === 1);
        
        if (thirdPlaceMatch) {
            html += `<div class="tournament-round"><div class="tournament-round-title">Матч за 3-е место</div>`;
            html += renderMatchRow(thirdPlaceMatch);
            html += `</div>`;
        }
        if (finalMatch) {
            html += `<div class="tournament-round"><div class="tournament-round-title">Финал</div>`;
            html += renderMatchRow(finalMatch);
            html += `</div>`;
        }
        
        html += '</div><button id="closeBracketBtn" class="tournament-close-btn">Закрыть</button>';
        container.innerHTML = html;

        document.querySelectorAll('.tournament-replay-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const matchId = btn.dataset.matchId;
                const matchRes = await window.apiRequest(`/tournament/match/${matchId}`);
                const matchData = await matchRes.json();
                if (matchData.log) {
                    showReplayModal(matchData.log);
                } else {
                    showToast('Лог боя не найден', 1500);
                }
            });
        });
        document.getElementById('closeBracketBtn')?.addEventListener('click', () => showScreen('main'));
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:#aaa;">Ошибка загрузки сетки турнира</p>';
    }
}

function renderMatchRow(match) {
    const isUserMatch = (match.player1_id === userData.id || match.player2_id === userData.id);
    const hasReplay = !!match.match_log;
    const player1Wins = match.player1_wins !== undefined ? match.player1_wins : null;
    const player2Wins = match.player2_wins !== undefined ? match.player2_wins : null;
    let scoreText = 'VS';
    if (player1Wins !== null && player2Wins !== null) {
        scoreText = `${player1Wins}:${player2Wins}`;
    }
    return `
        <div class="tournament-match">
            <div class="tournament-player ${match.winner_id === match.player1_id ? 'winner' : ''}">${escapeHtml(match.player1_name || '—')}</div>
            <div class="tournament-score">${scoreText}</div>
            <div class="tournament-player ${match.winner_id === match.player2_id ? 'winner' : ''}">${escapeHtml(match.player2_name || '—')}</div>
            ${isUserMatch && hasReplay ? `<button class="tournament-replay-btn" data-match-id="${match.id}"><i class="fas fa-play"></i></button>` : ''}
        </div>
    `;
}

async function renderLeadersTab() {
    const container = document.getElementById('tournamentContent');
    if (!container) return;

    container.innerHTML = `
        <div class="leaders-header">Таблица лидеров</div>
        <div id="leadersTableContainer"></div>
    `;
    const tableContainer = document.getElementById('leadersTableContainer');

    try {
        const leadersRes = await window.apiRequest('/tournament/leaders');
        const leaders = await leadersRes.json();

        if (!leaders.length) {
            tableContainer.innerHTML = `
                <table class="tournament-leaders-table">
                    <thead>
                        <tr><th>Место</th><th>Игрок</th><th>Очки</th></tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="3" style="text-align:center; padding: 20px; color: #aaa;">Нет данных</td></tr>
                    </tbody>
                </table>
            `;
            return;
        }

        let html = '<table class="tournament-leaders-table"><thead><tr><th>Место</th><th>Игрок</th><th>Очки</th></tr></thead><tbody>';
        leaders.forEach((item, idx) => {
            html += `<tr><td style="text-align:center;">${idx+1}</td><td>${escapeHtml(item.username)}</td><td style="text-align:center;">${item.tournament_points}</td></tr>`;
        });
        html += '</tbody></table>';
        tableContainer.innerHTML = html;
    } catch (err) {
        console.error(err);
        tableContainer.innerHTML = '<p style="color:#aaa; text-align:center;">Ошибка загрузки лидеров</p>';
    }
}

function showReplayModal(log) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Просмотр боя';
    modalBody.innerHTML = `<div id="replayLog" class="battle-log" style="height: 300px; overflow-y: auto;"></div>`;
    modal.style.display = 'flex';

    const replayContainer = document.getElementById('replayLog');
    if (replayContainer && log.messages) {
        log.messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.innerHTML = msg.text;
            replayContainer.appendChild(div);
        });
        replayContainer.scrollTop = replayContainer.scrollHeight;
    } else {
        modalBody.innerHTML = '<p style="color:#aaa;">Лог боя не может быть отображён</p>';
    }

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}

function showTournamentRulesModal() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerHTML = '<i class="fas fa-trophy" style="margin-right: 8px;"></i> Турнир "Золотой Коготь"';
    modalBody.innerHTML = `
        <div style="padding: 5px 10px;">
            <p><i class="fas fa-calendar-alt" style="color:#00aaff; width: 24px;"></i> <strong>Ежедневный турнир</strong> – начало в 20:00 МСК. Участвуют 32 игрока.</p>
            <p><i class="fas fa-users" style="color:#00aaff; width: 24px;"></i> <strong>Регистрация</strong> – с 10:00 до 19:50. Выберите класс и роль, снаряжение фиксируется.</p>
            <p><i class="fas fa-chart-line" style="color:#00aaff; width: 24px;"></i> <strong>Турнирные очки (ТО)</strong> – начисляются за каждое занятое место. Чем выше место, тем больше ТО.</p>
            <p><i class="fas fa-gem" style="color:#00aaff; width: 24px;"></i> <strong>Награды за турнир</strong> – монеты, алмазы, опыт и сундуки согласно занятому месту.</p>
            <p><i class="fas fa-crown" style="color:#00aaff; width: 24px;"></i> <strong>Ежемесячный бонус</strong> – игроки, занявшие 1-3 места в итоговом рейтинге сезона, получают VIP Silver подписку на 30 дней.</p>
            <p><i class="fas fa-chart-simple" style="color:#00aaff; width: 24px;"></i> <strong>Лиги</strong> – по итогам сезона лучшие игроки переходят в следующую лигу (бронза → серебро → золото → платина → алмаз).</p>
            <p style="margin-top: 16px; font-size: 13px; color:#aaa;">Просматривайте свои бои, анализируйте тактику и поднимайтесь в рейтинге!</p>
        </div>
    `;
    modal.style.display = 'flex';
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
}

function getSubclassesForClass(className) {
    const map = {
        warrior: ['guardian', 'berserker', 'knight'],
        assassin: ['assassin', 'venom_blade', 'blood_hunter'],
        mage: ['pyromancer', 'cryomancer', 'illusionist']
    };
    return map[className] || [];
}

function getRoundName(roundNum) {
    const names = {
        1: '1/16 финала',
        2: '1/8 финала',
        3: '1/4 финала',
        4: '1/2 финала'
    };
    return names[roundNum] || `Раунд ${roundNum}`;
}

window.renderTournament = renderTournament;
