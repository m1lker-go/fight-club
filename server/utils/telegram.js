// server/utils/telegram.js
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_URL = process.env.CLIENT_URL || 'https://fight-club-ecru.vercel.app';

async function sendTelegramNotification(chatId, subject, body, rewardText = null) {
    console.log(`🔔 sendTelegramNotification вызван: chatId=${chatId}, subject=${subject}`);
    if (!chatId) {
        console.error('❌ Нет chatId');
        return;
    }
    if (!BOT_TOKEN) {
        console.error('❌ Нет BOT_TOKEN в переменных окружения');
        return;
    }
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    let text = `📬 Новое сообщение в игре!\n\n📝 ${subject}\n${body}`;
    if (rewardText) {
        text += `\n🎁 Награда: ${rewardText}`;
    }
    console.log(`📤 Отправка в Telegram: ${url}, chatId=${chatId}, text=${text.substring(0, 100)}...`);
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
        const responseText = await response.text();
        if (response.ok) {
            console.log(`✅ Уведомление успешно отправлено в Telegram для chatId ${chatId}`);
        } else {
            console.error(`❌ Ошибка Telegram API: ${response.status} - ${responseText}`);
        }
    } catch (err) {
        console.error('❌ Исключение при отправке уведомления:', err);
    }
}

module.exports = { sendTelegramNotification };
