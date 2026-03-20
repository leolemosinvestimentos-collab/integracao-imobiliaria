/**
 * Serviço de histórico de conversa em memória.
 *
 * Acumula as mensagens de cada conversa por contextId/phone,
 * permitindo que o extractor analise o histórico completo
 * mesmo quando o GPT Maker envia apenas a última mensagem no webhook.
 *
 * TTL padrão: 24 horas (evita vazamento de memória).
 */

const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

// Map: chave → { messages: string[], updatedAt: Date }
const store = new Map();

/**
 * Adiciona uma mensagem ao histórico de uma conversa.
 * @param {string} key  - contextId ou phone do cliente
 * @param {string} text - texto da mensagem
 */
function addMessage(key, text) {
  if (!key || !text) return;
  const entry = store.get(key) || { messages: [], updatedAt: new Date() };
  entry.messages.push(text.trim());
  entry.updatedAt = new Date();
  store.set(key, entry);
  _cleanup();
}

/**
 * Retorna o histórico completo de uma conversa como string única.
 * @param {string} key
 * @returns {string}
 */
function getHistory(key) {
  if (!key) return '';
  return (store.get(key)?.messages ?? []).join(' ');
}

/**
 * Remove entradas com TTL expirado.
 */
function _cleanup() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.updatedAt.getTime() > TTL_MS) {
      store.delete(key);
    }
  }
}

module.exports = { addMessage, getHistory };
