// tournament.js – заглушка для турнирной системы

function renderTournament() {
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h2 style="color: #00aaff;">Турнир</h2>
            <p style="color: #aaa;">Раздел в разработке. Скоро здесь появится ежедневный турнир на 64 участника!</p>
        </div>
    `;
}

window.renderTournament = renderTournament;
