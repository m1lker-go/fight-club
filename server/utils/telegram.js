const { SocksProxyAgent } = require('socks-proxy-agent');

const proxyUrl = 'socks5://XtrYph:GneBKv@193.187.147.243:8000';
const agent = new SocksProxyAgent(proxyUrl);

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_URL = process.env.CLIENT_URL || 'https://cat-fight.ru';

async function sendTelegramNotification(chatId, subject, body, rewardText = null) {
    console.log(`[Telegram] Попытка отправить сообщение chatId=${chatId}, subject=${subject}`);
    if (!chatId) {
        console.error('[Telegram] Ошибка: chatId отсутствует');
        return;
    }
    if (!BOT_TOKEN) {
        console.error('[Telegram] Ошибка: BOT_TOKEN не задан в переменных окружения');
        return;
    }

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
            }),
            agent: agent
        });

        const responseText = await response.text();
        if (response.ok) {
            console.log(`[Telegram] Успешно отправлено для chatId ${chatId}. Ответ: ${responseText.substring(0, 200)}`);
        } else {
            console.error(`[Telegram] Ошибка: статус ${response.status}, ответ: ${responseText}`);
        }
    } catch (err) {
        console.error('[Telegram] Исключение:', err.message);
    }
}

module.exports = { sendTelegramNotification };
