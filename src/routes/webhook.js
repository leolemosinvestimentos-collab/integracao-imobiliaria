const express = require('express');
const { extractLeadData } = require('../services/extractor');
const { createOrUpdateContact } = require('../services/hubspot');
const { sendNotification } = require('../services/gptmaker');

const CORRETOR_PHONE = '5561994000700';

const router = express.Router();

// POST /webhook/gptmaker
router.post('/gptmaker', async (req, res) => {
  try {
    const payload = req.body;
    console.log('[webhook] Payload recebido:', JSON.stringify(payload, null, 2));

    const lead = extractLeadData(payload);

    if (!lead.name && !lead.email && !lead.phone && !lead.contextId) {
      console.warn('[webhook] Nenhum dado de contato encontrado — ignorando.');
      return res.status(200).json({ skipped: true, reason: 'no_contact_info' });
    }

    const contact = await createOrUpdateContact(lead);
    console.log(`[webhook] Contato criado/atualizado no HubSpot: id=${contact.id}`);

    const mensagem =
      `🔔 Jan! Lead qualificado esperando contato! Nome: ${lead.name || 'Não informado'} | ` +
      `Telefone: ${lead.phone || 'Não informado'} | ` +
      `Interesse: ${lead.tipoImovel || 'Não informado'} | ` +
      `Orçamento: ${lead.faixaPreco || 'Não informado'}. Entre em contato assim que puder!`;

    sendNotification(CORRETOR_PHONE, mensagem).catch(err =>
      console.error('[webhook] Erro ao enviar notificação ao corretor:', err.message)
    );

    return res.status(200).json({ success: true, hubspot_id: contact.id, lead });
  } catch (err) {
    console.error('[webhook] Erro ao processar:', err.response?.data ?? err.message);
    return res.status(500).json({ error: 'Erro interno ao processar o webhook.' });
  }
});

module.exports = router;
