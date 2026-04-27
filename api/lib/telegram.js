const TELEGRAM_API = 'https://api.telegram.org';

const isValidTelegramTarget = target => {
  if (!target || typeof target !== 'object') {
    return false;
  }
  return Boolean(target.botToken && target.chatId);
};

export const sendTelegramMessage = async (target, markdown) => {
  if (!isValidTelegramTarget(target)) {
    return { ok: false, skipped: true, reason: 'telegram-not-configured' };
  }

  const url = `${TELEGRAM_API}/bot${encodeURIComponent(target.botToken)}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: target.chatId,
      text: markdown,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return { ok: false, status: response.status, detail: detail.slice(0, 200) };
  }

  return { ok: true };
};
