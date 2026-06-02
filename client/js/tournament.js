// tournament.js – Турнирная система (64 участника, ежедневно в 20:00 МСК)

let tournamentData = null;
let currentBracket = null;
let currentLeaders = null;
let refreshInterval = null;

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
    
    await renderTournamentTab();
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        if (document.querySelector('.tournament-tab.active')?.dataset.tab === 'leaders') {
            renderLeadersTab();
        }
    }, 60000);
}

async function renderTournamentTab() {
    const container = document.getElementById('tournamentContent');
    if (!container) return;
    
    try {
        const statusRes = await window.apiRequest('/tournament/status');
        const status = await statusRes.json();
        
        const now = new Date();
        const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const currentHour = moscowTime.getHours();
        const canRegister = status.canRegister; // true до 19:50
        const isRegistered = status.isRegistered;
        const registeredClass = status.registeredClass;
        const registeredSubclass = status.registeredSubclass;
        const tournamentActive = status.tournamentActive; // после 20:00 и до завершения
        const tournamentCompleted = status.tournamentCompleted;
        
        if (tournamentCompleted && !tournamentActive) {
            // Показать результаты прошедшего турнира (сетку)
            await renderBracket();
            return;
        }
        
        if (tournamentActive && !tournamentCompleted) {
            // Идёт турнир – показываем сетку с возможностью просмотра своих боёв
            await renderBracket();
            return;
        }
        
        if (canRegister && !tournamentActive) {
            // Регистрация открыта
            let classesHtml = '';
            const userClassesList = userClasses || [];
            for (let cls of userClassesList) {
                const isSelected = (registeredClass === cls.class);
                classesHtml += `
                    <div class="tournament-class-option" data-class="${cls.class}" data-subclasses='${JSON.stringify(getSubclassesForClass(cls.class))}'>
                        <strong>${getClassNameRu(cls.class)}</strong> (уровень ${cls.level})
                        ${isSelected ? '<span class="tournament-check">✓</span>' : ''}
                    </div>
                `;
            }
            
            let subclassesHtml = '';
            if (registeredClass) {
                const subclasses = getSubclassesForClass(registeredClass);
                subclassesHtml = `<div class="tournament-subclass-selector">
                    ${subclasses.map(sc => `<button class="tournament-subclass-btn ${registeredSubclass === sc ? 'active' : ''}" data-subclass="${sc}">${getRoleNameRu(sc)}</button>`).join('')}
                </div>`;
            }
            
            container.innerHTML = `
                <div class="tournament-registration">
                    <h3>Ежедневный турнир</h3>
                    <p>Начало в 20:00 МСК. Участвуют 64 игрока.</p>
                    <p>Выберите класс и роль, которые будут участвовать в турнире.</p>
                    <div class="tournament-class-list">${classesHtml}</div>
                    <div id="tournamentSubclassArea">${subclassesHtml}</div>
                    <button id="tournamentRegisterBtn" class="tournament-action-btn" ${isRegistered ? 'disabled' : ''}>
                        ${isRegistered ? 'Вы уже зарегистрированы' : 'Записаться'}
                    </button>
                    ${isRegistered ? `<button id="tournamentUnregisterBtn" class="tournament-action-btn secondary">Отменить запись</button>` : ''}
                    <div class="tournament-info">Регистрация до 19:50. Снаряжение фиксируется при регистрации.</div>
                </div>
            `;
            
            document.querySelectorAll('.tournament-class-option').forEach(el => {
                el.addEventListener('click', async () => {
                    const className = el.dataset.class;
                    const subclasses = JSON.parse(el.dataset.subclasses);
                    // запросить сервер для выбора класса (временное сохранение)
                    const res = await window.apiRequest('/tournament/select-class', {
                        method: 'POST',
                        body: JSON.stringify({ class: className })
                    });
                    if (res.ok) {
                        renderTournamentTab();
                    } else {
                        showToast('Ошибка выбора класса', 1500);
                    }
                });
            });
            
            document.querySelectorAll('.tournament-subclass-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const subclass = btn.dataset.subclass;
                    const res = await window.apiRequest('/tournament/select-subclass', {
                        method: 'POST',
                        body: JSON.stringify({ subclass })
                    });
                    if (res.ok) {
                        renderTournamentTab();
                    } else {
                        showToast('Ошибка выбора роли', 1500);
                    }
                });
            });
            
            const regBtn = document.getElementById('tournamentRegisterBtn');
            if (regBtn && !isRegistered) {
                regBtn.addEventListener('click', async () => {
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
            return;
        }
        
        container.innerHTML = '<p style="color:#aaa;">Турнир ещё не начался. Загляните позже.</p>';
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:#aaa;">Ошибка загрузки данных турнира</p>';
    }
}

async function renderBracket() {
    const container = document.getElementById('tournamentContent');
    if (!container) return;
    try {
        const bracketRes = await window.apiRequest('/tournament/bracket');
        const bracket = await bracketRes.json();
        if (!bracket.matches || bracket.matches.length === 0) {
            container.innerHTML = '<p style="color:#aaa;">Турнир ещё не завершён, результаты скоро появятся.</p>';
            return;
        }
        
        // Группируем матчи по раундам
        const rounds = {};
        bracket.matches.forEach(m => {
            if (!rounds[m.round]) rounds[m.round] = [];
            rounds[m.round].push(m);
        });
        
        let html = '<div class="tournament-bracket">';
        for (let roundNum = 1; roundNum <= 6; roundNum++) {
            const roundMatches = rounds[roundNum] || [];
            if (roundMatches.length === 0 && roundNum === 6) break;
            html += `<div class="tournament-round"><div class="tournament-round-title">${getRoundName(roundNum)}</div>`;
            roundMatches.forEach(match => {
                const isUserMatch = (match.player1_id === userData.id || match.player2_id === userData.id);
                const hasReplay = !!match.match_log;
                html += `
                    <div class="tournament-match">
                        <div class="tournament-player ${match.winner_id === match.player1_id ? 'winner' : ''}">${escapeHtml(match.player1_name || '—')}</div>
                        <div class="tournament-vs">VS</div>
                        <div class="tournament-player ${match.winner_id === match.player2_id ? 'winner' : ''}">${escapeHtml(match.player2_name || '—')}</div>
                        ${isUserMatch && hasReplay ? `<button class="tournament-replay-btn" data-match-id="${match.id}"><i class="fas fa-play"></i></button>` : ''}
                    </div>
                `;
            });
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
        document.getElementById('closeBracketBtn')?.addEventListener('click', () => renderTournamentTab());
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:#aaa;">Ошибка загрузки сетки турнира</p>';
    }
}

async function renderLeadersTab() {
    const container = document.getElementById('tournamentContent');
    if (!container) return;
    try {
        const leadersRes = await window.apiRequest('/tournament/leaders');
        const leaders = await leadersRes.json();
        if (!leaders.length) {
            container.innerHTML = '<p style="color:#aaa;">Таблица лидеров пока пуста</p>';
            return;
        }
        let html = '<table class="tournament-leaders-table"><thead><tr><th>Место</th><th>Игрок</th><th>Класс</th><th>Турнирные очки</th></tr></thead><tbody>';
        leaders.forEach((item, idx) => {
            html += `<tr>
                <td>${idx+1}</td>
                <td>${escapeHtml(item.username)}</td>
                <td>${getClassNameRu(item.current_class)}</td>
                <td>${item.tournament_points}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:#aaa;">Ошибка загрузки лидеров</p>';
    }
}

function showReplayModal(log) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Просмотр боя';
    modalBody.innerHTML = `<div id="replayLog" class="battle-log" style="height: 300px; overflow-y: auto;"></div>`;
    modal.style.display = 'flex';
    
    // Используем BattleLog для воспроизведения (имитируем)
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

function getSubclassesForClass(className) {
    const map = {
        warrior: ['guardian', 'berserker', 'knight'],
        assassin: ['assassin', 'venom_blade', 'blood_hunter'],
        mage: ['pyromancer', 'cryomancer', 'illusionist']
    };
    return map[className] || [];
}

function getRoundName(roundNum) {
    const names = {1: '1/64', 2: '1/32', 3: '1/16', 4: '1/8', 5: '1/4', 6: '1/2', 7: 'Финал'};
    return names[roundNum] || `Раунд ${roundNum}`;
}

window.renderTournament = renderTournament;
