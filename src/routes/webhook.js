const express = require('express');
const { extractLeadData } = require('../services/extractor');
const { createOrUpdateContact, isLeadNotificado, marcarLeadNotificado } = require('../services/hubspot');
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

    // Verifica se o lead está qualificado (tem nome, interesse e orçamento)
    const isQualificado = lead.name && lead.tipoImovel && lead.faixaPreco;

    if (!isQualificado) {
      console.log(`[webhook] Lead id=${contact.id} ainda não está totalmente qualificado. Aguardando mais dados.`);
      return res.status(200).json({ success: true, hubspot_id: contact.id, lead, notificado: false, reason: 'not_qualified_yet' });
    }

    // Verifica se a notificação já foi enviada para este lead
    const jaNotificado = await isLeadNotificado(contact.id);
    if (jaNotificado) {
      console.log(`[webhook] Lead id=${contact.id} já notificado anteriormente — pulando.`);
      return res.status(200).json({ success: true, hubspot_id: contact.id, lead, notificado: false });
    }

    const mensagem =
      `🔔 Jan! Lead qualificado esperando contato! Nome: ${lead.name} | ` +
      `Telefone: ${lead.phone || 'Não informado'} | ` +
      `Interesse: ${lead.tipoImovel} | ` +
      `Orçamento: ${lead.faixaPreco}. Entre em contato assim que puder!`;

    // Marca ANTES de enviar para evitar duplicata em caso de chamadas simultâneas
    await marcarLeadNotificado(contact.id);

    sendNotification(CORRETOR_PHONE, mensagem).catch(err =>
      console.error('[webhook] Erro ao enviar notificação ao corretor:', err.message)
    );

    return res.status(200).json({ success: true, hubspot_id: contact.id, lead, notificado: true });
  } catch (err) {
    console.error('[webhook] Erro ao processar:', err.response?.data ?? err.message);
    return res.status(500).json({ error: 'Erro interno ao processar o webhook.' });
  }
});

module.exports = router;
