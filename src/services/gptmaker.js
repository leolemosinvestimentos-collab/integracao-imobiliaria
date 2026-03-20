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
 * Dispara mensagem ativa para um lead via agente da Patrícia.
 *   GPTMAKER_AGENT_ID → agente que atende clientes
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
 * Envia notificação interna para o corretor (Jan) via agente exclusivo.
 *   GPTMAKER_NOTIFICATION_AGENT_ID → agente separado, isolado do atendimento ao cliente
 *
 * Usa o telefone do destinatário como contextId fixo para manter
 * uma única thread de notificações com o corretor.
 */
async function sendNotification(toPhone, message) {
  const agentId = process.env.GPTMAKER_NOTIFICATION_AGENT_ID;
  if (!agentId) throw new Error('GPTMAKER_NOTIFICATION_AGENT_ID não configurado no .env');

  const phoneDigits = toPhone.replace(/\D/g, '');
  const body = {
    phone:     phoneDigits,
    prompt:    message,
    contextId: `corretor_${phoneDigits}_${Date.now()}`,

  };

  try {
    const res = await axios.post(
      `${API_BASE}/agent/${agentId}/conversation`,
      body,
      { headers: buildHeaders() }
    );
    console.log(`[gptmaker] Notificação enviada para ${phoneDigits}:`, res.data);
    return res.data;
  } catch (err) {
    console.error(`[gptmaker] Erro ao notificar ${phoneDigits} — status: ${err.response?.status}`);
    console.error('[gptmaker] Resposta da API:', JSON.stringify(err.response?.data, null, 2));
    throw err;
  }
}

module.exports = { sendWhatsAppMessage, sendNotification };
