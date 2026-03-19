const axios = require('axios');

const API_BASE = 'https://api.gptmaker.ai/v2';

function buildHeaders() {
  const token = process.env.GPTMAKER_API_TOKEN;
  if (!token) throw new Error('GPTMAKER_API_TOKEN não configurado no .env');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Dispara uma mensagem ativa via GPT Maker para um número de WhatsApp.
 * Usa o endpoint /v2/agent/{agentId}/conversation (texto livre, sem flowId).
 *
 * Variáveis de ambiente necessárias:
 *   GPTMAKER_API_TOKEN    → token da API (Settings > Developers > API Keys)
 *   GPTMAKER_AGENT_ID     → ID do agente (visível na URL do agente no painel)
 *
 * Ref: https://developer.gptmaker.ai/api-reference/agents/conversation
 */
async function sendWhatsAppMessage(phone, prompt, contextId = null) {
  const agentId = process.env.GPTMAKER_AGENT_ID;
  if (!agentId) throw new Error('GPTMAKER_AGENT_ID não configurado no .env');

  const phoneDigits = phone.replace(/\D/g, '');
  const body = {
    phone:     phoneDigits,
    prompt,
    contextId: contextId || phoneDigits,
  };

  try {
    const res = await axios.post(
      `${API_BASE}/agent/${agentId}/conversation`,
      body,
      { headers: buildHeaders() }
    );
    console.log(`[gptmaker] Mensagem disparada para ${phoneDigits}:`, res.data);
    return res.data;
  } catch (err) {
    console.error(`[gptmaker] Erro ao disparar para ${phoneDigits} — status: ${err.response?.status}`);
    console.error('[gptmaker] Resposta da API:', JSON.stringify(err.response?.data, null, 2));
    throw err;
  }
}

/**
 * Envia notificação interna (ex: aviso de reunião para o corretor).
 * Usa o mesmo endpoint, com número fixo de destino.
 */
async function sendNotification(toPhone, message) {
  return sendWhatsAppMessage(toPhone, message, `notif_${Date.now()}`);
}

module.exports = { sendWhatsAppMessage, sendNotification };
