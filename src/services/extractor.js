/**
 * Extrai nome, telefone, e-mail, contextId e dados de interesse imobiliário
 * do payload do GPT Maker.
 */

const TIPOS_IMOVEL = ['apartamento', 'casa', 'cobertura', 'studio', 'flat', 'kitnet', 'terreno'];

function extractTipoImovel(text) {
  if (!text) return '';
  const lower = text.toLowerCase();
  return TIPOS_IMOVEL.find(t => lower.includes(t)) || '';
}

function extractFaixaPreco(text) {
  if (!text) return '';
  // Aceita: "R$2mi", "2 milhões", "R$500mil", "entre 1 e 2 milhões", "2.000.000"
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

  // --- Dados de identificação ---
  let name  = extractFromSources(
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

  // Normaliza telefone para E.164 (Brasil)
  if (phone) {
    phone = phone.replace(/\D/g, '');
    if (phone.length === 11 && !phone.startsWith('55')) phone = `55${phone}`;
    if (phone.length === 10 && !phone.startsWith('55')) phone = `55${phone}`;
    phone = `+${phone}`;
  }

  const contextId = extractFromSources(
    payload.contextId, payload.context_id, payload.sessionId, payload.session_id
  );

  if (!name) console.log(`[extractor] contactName nulo — contato será registrado só pelo contextId: ${contextId}`);

  // --- Dados de interesse imobiliário ---
  // Tenta ler direto dos campos estruturados primeiro
  let tipoImovel  = extractFromSources(lead.tipo_imovel, vars.tipo_imovel, payload.tipo_imovel);
  let faixaPreco  = extractFromSources(lead.faixa_preco, vars.faixa_preco, payload.faixa_preco);
  let prazoCompra = extractFromSources(lead.prazo_compra, vars.prazo_compra, payload.prazo_compra);

  // Fallback: extrai da mensagem do assistente e do histórico
  const textoConversa = [
    payload.message || '',
    ...(Array.isArray(payload.messages)
      ? payload.messages.map(m => m.content || m.text || m.message || '')
      : []),
  ].join(' ');

  if (!tipoImovel)  tipoImovel  = extractTipoImovel(textoConversa);
  if (!faixaPreco)  faixaPreco  = extractFaixaPreco(textoConversa);
  if (!prazoCompra) prazoCompra = extractPrazoCompra(textoConversa);

  return {
    name:        name.trim(),
    email:       email.trim().toLowerCase(),
    phone:       phone.trim(),
    contextId:   contextId.toString().trim(),
    tipoImovel:  tipoImovel.toLowerCase(),
    faixaPreco,
    prazoCompra,
  };
}

module.exports = { extractLeadData };
