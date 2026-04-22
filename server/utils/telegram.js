// utils/telegram.js
const BOT_TOKEN = 'ВАШ_ТОКЕН_ОТ_BOTFATHER'; // Замените на реальный токен

async function sendTelegramNotification(chatId, subject, body, rewardText = null) {
    if (!chatId) return;
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    let text = `📬 Новое сообщение в игре!\n\n📝 ${subject}\n${body}`;
    if (rewardText) {
        text += `\n🎁 Награда: ${rewardText}`;
    }
    const webAppUrl = 'https://ваш-домен.com'; // Замените на ваш URL мини-приложения
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                reply_markup: {
                    inline_keyboard: [[
                        { text: '📬 Открыть игру', web_app: { url: webAppUrl } }
                    ]]
                }
            })
        });
    } catch (err) {
        console.error('Ошибка отправки уведомления в Telegram:', err);
    }
}

module.exports = { sendTelegramNotification };
