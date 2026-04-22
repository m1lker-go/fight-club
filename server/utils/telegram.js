// utils/telegram.js
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_URL = process.env.CLIENT_URL || 'https://ваш-домен.com'; // замените на ваш URL

async function sendTelegramNotification(chatId, subject, body, rewardText = null) {
    if (!chatId || !BOT_TOKEN) return;
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    let text = `📬 Новое сообщение в игре!\n\n📝 ${subject}\n${body}`;
    if (rewardText) {
        text += `\n🎁 Награда: ${rewardText}`;
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                reply_markup: {
                    inline_keyboard: [[
                        { text: '📬 Открыть игру', web_app: { url: CLIENT_URL } }
                    ]]
                }
            })
        });
        if (!response.ok) {
            console.error('Telegram notification error:', await response.text());
        }
    } catch (err) {
        console.error('Failed to send Telegram notification:', err);
    }
}

module.exports = { sendTelegramNotification };
