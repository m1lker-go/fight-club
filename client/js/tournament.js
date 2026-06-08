// tournament.js – Турнирная система (32 участника, ежедневно в 20:00 МСК)
// 3 стадии: регистрация (10:00–19:49), ожидание начала (19:50–19:59), активный бой (20:00–20:09), результаты (после 20:10)

let tournamentRefreshInterval = null;
let waitingTimerInterval = null;
let selectedTournamentClass = null;
let selectedTournamentSubclass = null;

// --- Вспомогательные функции для времени ---
function getMoscowNow() {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
}

function getSecondsUntil(hour, minute) {
    const now = getMoscowNow();
    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);
    if (now >= target) {
        target.setDate(target.getDate() + 1);
    }
    return Math.floor((target - now) / 1000);
}

function getCurrentStage(status, now) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (status.tournamentCompleted) return 'results';
    if (status.canRegister) return 'registration';
    if (status.tournamentActive) {
        if ((currentHour === 20 && currentMinute < 10) || (currentHour === 19 && currentMinute >= 50)) {
            return 'active';
        }
        if (currentHour === 20 && currentMinute >= 10) return 'results';
        return 'active';
    }
    if (currentHour === 19 && currentMinute >= 50) return 'waiting';
    return 'results';
}

// --- Рендер главного экрана турнира ---
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
}

// --- Главный рендер вкладки Турнир (определение стадии) ---
async function renderTournamentTab() {
    const container = document.getElementById('tournamentContent');
    if (!container) return;

    try {
        const statusRes = await window.apiRequest('/tournament/status');
        const status = await statusRes.json();
        const now = getMoscowNow();
        const stage = getCurrentStage(status, now);

        if (stage === 'registration') {
            renderRegistrationScreen(container, status.isRegistered);
        } else if (stage === 'waiting') {
            const secondsToStart = getSecondsUntil(20, 0);
            renderWaitingStage(container, secondsToStart);
        } else if (stage === 'active') {
            const secondsLeft = getSecondsUntil(20, 10);
            renderActiveStage(container, secondsLeft);
        } else {
            await renderBracket(container);
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:#aaa; text-align:center;">Ошибка загрузки данных турнира</p>';
    }
}

// --- 1. Экран регистрации (10:00 – 19:49) ---
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
            await window.apiRequest('/tournament/select-class', { method: 'POST', body: JSON.stringify({ class: className }) });
            await window.apiRequest('/tournament/select-subclass', { method: 'POST', body: JSON.stringify({ subclass: selectedTournamentSubclass }) });
            renderTournamentTab();
        });
    });

    const subclassSelect = document.getElementById('tournamentSubclassSelect');
    if (subclassSelect) {
        subclassSelect.addEventListener('change', async () => {
            const subclass = subclassSelect.value;
            selectedTournamentSubclass = subclass;
            await window.apiRequest('/tournament/select-subclass', { method: 'POST', body: JSON.stringify({ subclass }) });
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

// --- 2. Ожидание начала (19:50 – 19:59) ---
function renderWaitingStage(container, secondsToStart) {
    if (waitingTimerInterval) clearInterval(waitingTimerInterval);

    container.innerHTML = `
        <div class="tournament-waiting">
            <div class="tournament-waiting-icon">⚔️</div>
            <div class="tournament-waiting-title">Турнир "Золотой Коготь"</div>
            <div class="tournament-waiting-message">Турнир начнётся через</div>
            <div class="tournament-timer-digits" id="tournamentStartTimer"></div>
            <div class="tournament-waiting-note">Страница обновится автоматически</div>
        </div>
    `;

    function updateTimerDisplay(remaining) {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const timerHtml = `
            <div class="countdown-digits">
                <div class="digit-box"><div class="digit-value">${mins.toString().padStart(2, '0')}</div><div class="digit-unit">минут</div></div>
                <div class="colon">:</div>
                <div class="digit-box"><div class="digit-value">${secs.toString().padStart(2, '0')}</div><div class="digit-unit">секунд</div></div>
            </div>
        `;
        const timerDiv = document.getElementById('tournamentStartTimer');
        if (timerDiv) timerDiv.innerHTML = timerHtml;
    }

    let remaining = secondsToStart;
    updateTimerDisplay(remaining);
    waitingTimerInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(waitingTimerInterval);
            renderTournamentTab();
        } else {
            updateTimerDisplay(remaining);
        }
    }, 1000);
}

// --- 3. Активный бой (20:00 – 20:09) ---
function renderActiveStage(container, secondsLeft) {
    if (waitingTimerInterval) clearInterval(waitingTimerInterval);

    container.innerHTML = `
        <div class="tournament-waiting">
            <div class="tournament-waiting-icon">⚔️</div>
            <div class="tournament-waiting-title">Турнир "Золотой Коготь"</div>
            <div class="tournament-waiting-message">Выявляем сильнейшего</div>
            <div class="tournament-timer-digits" id="tournamentActiveTimer"></div>
            <div class="tournament-waiting-note">Результаты появятся через несколько минут</div>
        </div>
    `;

    function updateTimerDisplay(remaining) {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const timerHtml = `
            <div class="countdown-digits">
                <div class="digit-box"><div class="digit-value">${mins.toString().padStart(2, '0')}</div><div class="digit-unit">минут</div></div>
                <div class="colon">:</div>
                <div class="digit-box"><div class="digit-value">${secs.toString().padStart(2, '0')}</div><div class="digit-unit">секунд</div></div>
            </div>
        `;
        const timerDiv = document.getElementById('tournamentActiveTimer');
        if (timerDiv) timerDiv.innerHTML = timerHtml;
    }

    let remaining = secondsLeft;
    updateTimerDisplay(remaining);
    waitingTimerInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(waitingTimerInterval);
            renderTournamentTab();
        } else {
            updateTimerDisplay(remaining);
        }
    }, 1000);
}

// --- 4. Результаты (после 20:10) ---
async function renderBracket(container) {
    try {
        const bracketRes = await window.apiRequest('/tournament/bracket');
        const bracket = await bracketRes.json();
        if (!bracket.matches || bracket.matches.length === 0) {
            container.innerHTML = `<p style="color:#aaa; text-align:center;">Матчи турнира ещё не загружены. Попробуйте позже.</p>`;
            return;
        }

        const rounds = {};
        bracket.matches.forEach(m => {
            if (!rounds[m.round]) rounds[m.round] = [];
            rounds[m.round].push(m);
        });

        let html = '<div class="tournament-bracket">';
        for (let roundNum = 1; roundNum <= 4; roundNum++) {
            const roundMatches = rounds[roundNum] || [];
            if (roundMatches.length === 0 && roundNum === 4) break;
            html += `<div class="tournament-round"><div class="tournament-round-title">${getRoundName(roundNum)}</div>`;
            roundMatches.forEach(match => {
                html += renderMatchRow(match);
            });
            html += `</div>`;
        }
        const round5Matches = rounds[5] || [];
        const thirdPlaceMatch = round5Matches.find(m => m.match_index === 2);
        const finalMatch = round5Matches.find(m => m.match_index === 1);
        if (thirdPlaceMatch) {
            html += `<div class="tournament-round"><div class="tournament-round-title">Матч за 3-е место</div>${renderMatchRow(thirdPlaceMatch)}</div>`;
        }
        if (finalMatch) {
            html += `<div class="tournament-round"><div class="tournament-round-title">Финал</div>${renderMatchRow(finalMatch)}</div>`;
        }
        html += '</div><button id="closeBracketBtn" class="tournament-close-btn">Закрыть</button>';
        container.innerHTML = html;

        document.querySelectorAll('.tournament-replay-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const matchId = btn.dataset.matchId;
                const matchData = bracket.matches.find(m => m.id == matchId);
                if (matchData && matchData.match_log) {
                    showSeriesReplayModal(matchData.match_log);
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

// --- Модальное окно для просмотра серии матчей (best-of-3) с улучшенным дизайном ---
function truncateName(name, maxLen = 13) {
    if (!name) return '—';
    if (name.length <= maxLen) return name;
    return name.slice(0, maxLen) + '…';
}

function showSeriesReplayModal(matchLog) {
    console.log('matchLog.games[0]:', matchLog.games[0]);
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.innerText = 'Просмотр матчей серии';

    let gamesHtml = '';
    if (matchLog && matchLog.games && Array.isArray(matchLog.games)) {
        console.log('userData.id:', userData.id);
        matchLog.games.forEach((game, idx) => {
            // Определяем победу: сначала проверяем winnerId (новые турниры), затем winner (старые)
            let isPlayerWin;
            if (game.winnerId !== undefined) {
                isPlayerWin = (Number(game.winnerId) === Number(userData.id));
            } else {
                isPlayerWin = (game.winner === 'player');
            }
            const statusText = isPlayerWin ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ';
            const statusColor = isPlayerWin ? '#2ecc71' : '#e74c3c';
            const playerName = game.playerName || userData?.username || 'Игрок';
            const enemyName = game.enemyName || 'Противник';
            gamesHtml += `
                <div class="series-game-item" data-game-index="${idx}" style="display: flex; align-items: center; justify-content: space-between; background-color: #2a303c; border-radius: 12px; padding: 8px 12px; margin-bottom: 8px; border: 1px solid #00aaff;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; margin-bottom: 4px; color: #00aaff;">Сражение №${idx+1}</div>
                        <div style="font-size: 14px;">
                            ${truncateName(playerName)} : ${truncateName(enemyName)} - <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
                        </div>
                    </div>
                    <button class="watch-game-btn" data-game-index="${idx}" style="background-color: #2f3542; border: 1px solid #aaa; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #aaa;">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            `;
        });
    } else {
        gamesHtml = '<p style="color:#aaa;">Не удалось загрузить данные матчей</p>';
    }

    modalBody.innerHTML = `
        <div class="series-replay-list" style="display: flex; flex-direction: column;">
            ${gamesHtml}
        </div>
        <div id="gameReplayContainer" style="margin-top: 20px; display: none;">
            <div id="gameReplayLog" class="battle-log" style="height: 300px; overflow-y: auto;"></div>
            <button id="closeGameReplayBtn" class="btn" style="margin-top: 10px;">Закрыть</button>
        </div>
    `;
    modal.style.display = 'flex';

    const listContainer = modalBody.querySelector('.series-replay-list');
    const replayContainer = modalBody.querySelector('#gameReplayContainer');
    const replayLog = modalBody.querySelector('#gameReplayLog');
    const closeReplayBtn = modalBody.querySelector('#closeGameReplayBtn');

    function showGameLog(gameIndex) {
        const game = matchLog.games[gameIndex];
        if (!game || !game.messages) {
            replayLog.innerHTML = '<p style="color:#aaa;">Лог боя не найден</p>';
        } else {
            replayLog.innerHTML = '';
            game.messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = 'log-entry';
                div.innerHTML = msg.text;
                replayLog.appendChild(div);
            });
            replayLog.scrollTop = replayLog.scrollHeight;
        }
        replayContainer.style.display = 'block';
        listContainer.style.display = 'none';
    }

    function closeReplay() {
        replayContainer.style.display = 'none';
        listContainer.style.display = 'block';
        replayLog.innerHTML = '';
    }

    modalBody.querySelectorAll('.watch-game-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const gameIdx = parseInt(btn.dataset.gameIndex);
            showGameLog(gameIdx);
        });
    });

    if (closeReplayBtn) closeReplayBtn.addEventListener('click', closeReplay);

    const closeBtn = modal.querySelector('.close');
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
}

// --- Лидеры ---
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
            tableContainer.innerHTML = `<table class="tournament-leaders-table"><thead><tr><th>Место</th><th>Игрок</th><th>Очки</th></tr></thead><tbody><tr><td colspan="3" style="text-align:center; padding:20px; color:#aaa;">Нет данных</td></tr></tbody></table>`;
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

// --- Вспомогательные функции ---
function getSubclassesForClass(className) {
    const map = {
        warrior: ['guardian', 'berserker', 'knight'],
        assassin: ['assassin', 'venom_blade', 'blood_hunter'],
        mage: ['pyromancer', 'cryomancer', 'illusionist']
    };
    return map[className] || [];
}

function getRoundName(roundNum) {
    const names = { 1: '1/16 финала', 2: '1/8 финала', 3: '1/4 финала', 4: '1/2 финала' };
    return names[roundNum] || `Раунд ${roundNum}`;
}

function showTournamentRulesModal() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerHTML = '<i class="fas fa-trophy" style="margin-right: 8px;"></i> Турнир "Золотой Коготь"';
    modalBody.innerHTML = `
        <div style="padding: 5px 10px;">
            <p><i class="fas fa-calendar-alt" style="color:#00aaff;"></i> <strong>Ежедневный турнир</strong> – начало в 20:00 МСК. Участвуют 32 игрока.</p>
            <p><i class="fas fa-users" style="color:#00aaff;"></i> <strong>Регистрация</strong> – с 10:00 до 19:50. Выберите класс и роль, снаряжение фиксируется.</p>
            <p><i class="fas fa-chart-line" style="color:#00aaff;"></i> <strong>Турнирные очки (ТО)</strong> – начисляются за каждое занятое место.</p>
            <p><i class="fas fa-gem" style="color:#00aaff;"></i> <strong>Награды за турнир</strong> – монеты, алмазы, опыт и сундуки согласно месту.</p>
            <p><i class="fas fa-crown" style="color:#00aaff;"></i> <strong>Ежемесячный бонус</strong> – 1-3 места в сезоне получают VIP Silver подписку на 30 дней.</p>
            <p><i class="fas fa-chart-simple" style="color:#00aaff;"></i> <strong>Лиги</strong> – по итогам сезона лучшие игроки переходят в следующую лигу.</p>
            <p style="margin-top:16px; font-size:13px; color:#aaa;">Просматривайте свои бои, анализируйте тактику и поднимайтесь в рейтинге!</p>
        </div>
    `;
    modal.style.display = 'flex';
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
}

window.renderTournament = renderTournament;
