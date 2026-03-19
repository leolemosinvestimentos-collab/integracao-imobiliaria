/**
 * Extrai nome, telefone, e-mail e contextId do payload do GPT Maker.
 *
 * Quando contactName for nulo, o contato é registrado no HubSpot
 * usando apenas o contextId como identificador único.
 */
function extractLeadData(payload) {
  // 1) Tenta ler direto de payload.lead / payload.contact
  const lead = payload.lead || payload.contact || {};

  let name  = lead.contactName || lead.name  || lead.nome  || lead.full_name || lead.fullName || '';
  let email = lead.email || lead.e_mail || lead.email_address || '';
  let phone = lead.contactPhone || lead.phone || lead.telefone || lead.celular || lead.whatsapp || '';

  // 2) Tenta payload.variables
  const vars = payload.variables || payload.vars || {};
  if (!name)  name  = vars.contactName || vars.name  || vars.nome  || vars.full_name || '';
  if (!email) email = vars.email || vars.e_mail || '';
  if (!phone) phone = vars.contactPhone || vars.phone || vars.telefone || vars.celular || vars.whatsapp || '';

  // 3) Tenta campos na raiz do payload
  if (!name)  name  = payload.contactName || payload.name  || payload.nome  || '';
  if (!email) email = payload.email || payload.e_mail || '';
  if (!phone) phone = payload.contactPhone || payload.phone || payload.telefone || payload.celular || payload.whatsapp || '';

  // Normaliza telefone para E.164 (Brasil)
  if (phone) {
    phone = phone.replace(/\D/g, '');
    if (phone.length === 11 && !phone.startsWith('55')) phone = `55${phone}`;
    if (phone.length === 10 && !phone.startsWith('55')) phone = `55${phone}`;
    phone = `+${phone}`;
  }

  // Extrai contextId (identificador único da conversa no GPT Maker)
  const contextId = payload.contextId || payload.context_id || payload.sessionId || payload.session_id || '';

  if (!name) console.log(`[extractor] contactName nulo — contato será registrado só pelo contextId: ${contextId}`);

  return {
    name:      name.trim(),
    email:     email.trim().toLowerCase(),
    phone:     phone.trim(),
    contextId: contextId.toString().trim(),
  };
}

module.exports = { extractLeadData };
