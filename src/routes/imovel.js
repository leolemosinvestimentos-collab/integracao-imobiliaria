const express = require('express');
const { searchLeadsByInterest } = require('../services/hubspot');
const { sendWhatsAppMessage }   = require('../services/gptmaker');

const router = express.Router();

/**
 * POST /imovel/novo
 *
 * Body:
 *   tipo      {string}  ex: "apartamento", "casa", "cobertura"
 *   preco     {string}  ex: "R$2mi-R$3mi"
 *   descricao {string}  texto livre que será enviado ao lead pelo WhatsApp
 *
 * Busca leads no HubSpot que têm interesse compatível com o imóvel
 * e dispara uma mensagem ativa via GPT Maker para cada um.
 */
router.post('/novo', async (req, res) => {
  const { tipo, preco, descricao } = req.body;

  if (!tipo || !descricao) {
    return res.status(400).json({ error: 'Campos obrigatórios: tipo, descricao.' });
  }

  console.log(`[imovel] Novo imóvel recebido — tipo: ${tipo} | preco: ${preco}`);

  let leads;
  try {
    leads = await searchLeadsByInterest(tipo, preco);
    console.log(`[imovel] ${leads.length} lead(s) compatível(is) encontrado(s) no HubSpot.`);
  } catch (err) {
    console.error('[imovel] Erro ao buscar leads no HubSpot:', err.response?.data ?? err.message);
    return res.status(500).json({ error: 'Erro ao buscar leads no HubSpot.' });
  }

  if (leads.length === 0) {
    return res.status(200).json({ sent: 0, message: 'Nenhum lead compatível encontrado.' });
  }

  const results = await Promise.allSettled(
    leads.map(async (lead) => {
      const phone = lead.properties.phone;
      if (!phone) {
        console.warn(`[imovel] Lead id=${lead.id} sem telefone — pulando.`);
        return { skipped: true, id: lead.id };
      }

      await sendWhatsAppMessage(phone, {
        tipo_imovel:  tipo,
        faixa_preco:  preco   || '',
        descricao:    descricao,
        nome_lead:    lead.properties.firstname || '',
      });

      return { sent: true, id: lead.id, phone };
    })
  );

  const sent    = results.filter(r => r.status === 'fulfilled' && r.value?.sent).length;
  const skipped = results.filter(r => r.status === 'fulfilled' && r.value?.skipped).length;
  const failed  = results.filter(r => r.status === 'rejected').length;

  console.log(`[imovel] Resultado — enviados: ${sent} | pulados: ${skipped} | erros: ${failed}`);

  return res.status(200).json({ sent, skipped, failed, total: leads.length });
});

module.exports = router;
