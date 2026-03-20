/**
 * Extrai nome, telefone, e-mail, contextId e dados de interesse imobiliário
 * do payload do GPT Maker.
 *
 * Como o GPT Maker envia apenas a última mensagem no webhook (não o histórico
 * completo), este módulo acumula as mensagens por contextId/phone em memória
 * e tenta extrair os dados do histórico acumulado.
 */

const { addMessage, getHistory } = require('./history');

const TIPOS_IMOVEL = ['apartamento', 'casa', 'cobertura', 'studio', 'flat', 'kitnet', 'terreno'];

function extractTipoImovel(text) {
  if (!text) return '';
  const lower = text.toLowerCase();
  return TIPOS_IMOVEL.find(t => lower.includes(t)) || '';
}

function extractFaixaPreco(text) {
  if (!text) return '';
  const match = text.match(
    /R?\$?\s*\d+[\d.,]*\s*(?:mi(?:lhões?|lhao)?|mil)?\s*(?:-|a|até)?\s*R?\$?\s*\d*[\d.,]*\s*(?:mi(?:lhões?|lhao)?|mil)?/i
  );
  return match ? match[0].trim() : '';
}

function extractPrazoCompra(text) {
  if (!text) return '';
  const match = text.match(
    /imediato|urgente|\d+\s*(?:dias?|semanas?|meses?|mês|anos?)|curto prazo|longo prazo/i
  );
  return match ? match[0].trim() : '';
}

function extractFromSources(...sources) {
  for (const src of sources) {
    if (src && typeof src === 'string' && src.trim()) return src.trim();
  }
  return '';
}

function extractLeadData(payload) {
  const lead = payload.lead || payload.contact || {};
  const vars = payload.variables || payload.vars || {};

  // Log de diagnóstico
  console.log('[extractor] lead:', JSON.stringify(lead));
  console.log('[extractor] vars:', JSON.stringify(vars));
  console.log('[extractor] payload (raiz):', JSON.stringify({
    contactName:  payload.contactName,
    contactPhone: payload.contactPhone,
    name:         payload.name,
    phone:        payload.phone,
    email:        payload.email,
    tipo_imovel:  payload.tipo_imovel,
    tipoImovel:   payload.tipoImovel,
    faixa_preco:  payload.faixa_preco,
    faixaPreco:   payload.faixaPreco,
    prazo_compra: payload.prazo_compra,
    prazoCompra:  payload.prazoCompra,
    contextId:    payload.contextId,
    sessionId:    payload.sessionId,
    message:      payload.message,
  }));

  // --- Identificação ---
  let name = extractFromSources(
    lead.contactName, lead.name, lead.nome, lead.full_name, lead.fullName,
    vars.contactName, vars.name, vars.nome, vars.full_name,
    payload.contactName, payload.name, payload.nome
  );

  let email = extractFromSources(
    lead.email, lead.e_mail, lead.email_address,
    vars.email, vars.e_mail,
    payload.email, payload.e_mail
  );

  let phone = extractFromSources(
    lead.contactPhone, lead.phone, lead.telefone, lead.celular, lead.whatsapp,
    vars.contactPhone, vars.phone, vars.telefone, vars.celular, vars.whatsapp,
    payload.contactPhone, payload.phone, payload.telefone, payload.celular, payload.whatsapp
  );

  if (phone) {
    phone = phone.replace(/\D/g, '');
    if (phone.length === 11 && !phone.startsWith('55')) phone = `55${phone}`;
    if (phone.length === 10 && !phone.startsWith('55')) phone = `55${phone}`;
    phone = `+${phone}`;
  }

  const contextId = extractFromSources(
    payload.contextId, payload.context_id, payload.sessionId, payload.session_id
  );

  if (!name) console.log(`[extractor] contactName nulo — contextId: ${contextId}`);

  // --- Acumula a mensagem atual no histórico ---
  const historyKey = contextId || phone;
  const currentMessage = payload.message || '';
  if (historyKey && currentMessage) {
    addMessage(historyKey, currentMessage);
  }

  // --- Interesse imobiliário: tenta variáveis primeiro, depois histórico ---
  let tipoImovel = extractFromSources(
    lead.tipo_imovel,  lead.tipoImovel,  lead.tipo,
    vars.tipo_imovel,  vars.tipoImovel,  vars.tipo,
    payload.tipo_imovel, payload.tipoImovel, payload.tipo
  );

  let faixaPreco = extractFromSources(
    lead.faixa_preco,  lead.faixaPreco,  lead.preco,  lead.orcamento,
    vars.faixa_preco,  vars.faixaPreco,  vars.preco,  vars.orcamento,
    payload.faixa_preco, payload.faixaPreco, payload.preco, payload.orcamento
  );

  let prazoCompra = extractFromSources(
    lead.prazo_compra,  lead.prazoCompra,  lead.prazo,
    vars.prazo_compra,  vars.prazoCompra,  vars.prazo,
    payload.prazo_compra, payload.prazoCompra, payload.prazo
  );

  // Fallback 1: texto da mensagem atual
  const textoAtual = [
    currentMessage,
    ...(Array.isArray(payload.messages)
      ? payload.messages.map(m => m.content || m.text || m.message || '')
      : []),
  ].join(' ');

  if (!tipoImovel)  tipoImovel  = extractTipoImovel(textoAtual);
  if (!faixaPreco)  faixaPreco  = extractFaixaPreco(textoAtual);
  if (!prazoCompra) prazoCompra = extractPrazoCompra(textoAtual);

  // Fallback 2: histórico acumulado da conversa
  if (!tipoImovel || !faixaPreco || !prazoCompra) {
    const historico = getHistory(historyKey);
    if (historico) {
      console.log(`[extractor] Usando histórico acumulado (${historico.length} chars) para key=${historyKey}`);
      if (!tipoImovel)  tipoImovel  = extractTipoImovel(historico);
      if (!faixaPreco)  faixaPreco  = extractFaixaPreco(historico);
      if (!prazoCompra) prazoCompra = extractPrazoCompra(historico);
    }
  }

  const result = {
    name:        name.trim(),
    email:       email.trim().toLowerCase(),
    phone:       phone.trim(),
    contextId:   contextId.toString().trim(),
    tipoImovel:  tipoImovel.toLowerCase(),
    faixaPreco,
    prazoCompra,
  };

  console.log('[extractor] Resultado:', JSON.stringify(result));
  return result;
}

module.exports = { extractLeadData };
