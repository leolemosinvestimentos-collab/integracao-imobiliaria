const express = require('express');
const { sendNotification } = require('../services/gptmaker');

const router = express.Router();

const CORRETOR_PHONE = '5561994000700';

/**
 * POST /reuniao/agendada
 *
 * Body:
 *   nome        {string}  Nome do cliente
 *   telefone    {string}  Telefone do cliente
 *   horario     {string}  ex: "25/03/2026 às 14h"
 *   tipo_imovel {string}  ex: "apartamento"
 */
router.post('/agendada', async (req, res) => {
  const { nome, telefone, horario, tipo_imovel } = req.body;

  if (!nome || !telefone || !horario || !tipo_imovel) {
    return res.status(400).json({
      error: 'Campos obrigatórios: nome, telefone, horario, tipo_imovel.',
    });
  }

  const mensagem =
    `🔔 Nova reunião agendada! Cliente: ${nome} | Telefone: ${telefone} | Horário: ${horario} | Interesse: ${tipo_imovel}`;

  console.log(`[reuniao] Enviando notificação para ${CORRETOR_PHONE}: ${mensagem}`);

  try {
    await sendNotification(CORRETOR_PHONE, mensagem);
    return res.status(200).json({ success: true, enviado_para: CORRETOR_PHONE });
  } catch (err) {
    console.error('[reuniao] Erro ao enviar notificação:', err.message);
    return res.status(500).json({ error: 'Erro ao enviar notificação via GPT Maker.' });
  }
});

module.exports = router;
