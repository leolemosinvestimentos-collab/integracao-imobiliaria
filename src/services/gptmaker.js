const axios = require('axios');

/**
 * Dispara uma mensagem ativa via GPT Maker para um número de WhatsApp.
 *
 * Variáveis de ambiente necessárias:
 *   GPTMAKER_API_TOKEN   → token da API do GPT Maker
 *   GPTMAKER_FLOW_ID     → ID do fluxo que será iniciado para o lead
 *   GPTMAKER_WORKSPACE_ID → ID do workspace (visível na URL do painel)
 *
 * Documentação: https://docs.gptmaker.ai
 */
async function sendWhatsAppMessage(phone, variables = {}) {
  const token       = process.env.GPTMAKER_API_TOKEN;
  const flowId      = process.env.GPTMAKER_FLOW_ID;
  const workspaceId = process.env.GPTMAKER_WORKSPACE_ID;

  if (!token)       throw new Error('GPTMAKER_API_TOKEN não configurado no .env');
  if (!flowId)      throw new Error('GPTMAKER_FLOW_ID não configurado no .env');
  if (!workspaceId) throw new Error('GPTMAKER_WORKSPACE_ID não configurado no .env');

  // Remove não-dígitos e garante apenas números
  const phoneDigits = phone.replace(/\D/g, '');

  const url  = `https://api.gptmaker.ai/v2/workspace/${workspaceId}/flows/${flowId}/start`;
  const body = { phone: phoneDigits, variables };

  try {
    const res = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(`[gptmaker] Mensagem disparada para ${phoneDigits}:`, res.data);
    return res.data;
  } catch (err) {
    console.error(`[gptmaker] Erro ao disparar para ${phoneDigits} — status: ${err.response?.status}`);
    console.error('[gptmaker] Resposta da API:', JSON.stringify(err.response?.data, null, 2));
    throw err;
  }
}

module.exports = { sendWhatsAppMessage };
