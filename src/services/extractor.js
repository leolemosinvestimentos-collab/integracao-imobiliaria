/**
 * Extrai nome, telefone, e-mail, contextId e dados de interesse imobiliário
 * do payload do GPT Maker.
 *
 * LOG COMPLETO ativado para diagnóstico dos campos disponíveis.
 */

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

  // Log de diagnóstico: mostra os campos disponíveis nas fontes principais
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

  // --- Interesse imobiliário ---
  // Tenta nomes em snake_case e camelCase nas três fontes
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

  // Fallback: extrai por regex do texto da conversa
  const textoConversa = [
    payload.message || '',
    ...(Array.isArray(payload.messages)
      ? payload.messages.map(m => m.content || m.text || m.message || '')
      : []),
  ].join(' ');

  if (!tipoImovel)  tipoImovel  = extractTipoImovel(textoConversa);
  if (!faixaPreco)  faixaPreco  = extractFaixaPreco(textoConversa);
  if (!prazoCompra) prazoCompra = extractPrazoCompra(textoConversa);

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
