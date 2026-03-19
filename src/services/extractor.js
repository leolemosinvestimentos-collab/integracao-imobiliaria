/**
 * Extrai nome, telefone, e-mail e contextId do payload do GPT Maker.
 *
 * Ordem de busca do nome:
 *   1. payload.lead / payload.contact → contactName, name, nome, fullName
 *   2. payload.variables              → mesmos campos
 *   3. payload raiz                   → mesmos campos
 *   4. payload.message (texto livre)  → padrão "Prazer, [Nome]."
 *   5. payload.messages (histórico)   → mesmo padrão + regex de e-mail/telefone
 */

/**
 * Tenta extrair o primeiro nome próprio de frases do tipo:
 *   "Prazer, Leo. Confirma que é seu nome?"
 *   "Oi! Sou a Ana, como posso ajudar?"
 * Retorna string vazia se não encontrar.
 */
function extractNameFromText(text) {
  if (!text) return '';

  // Padrão 1: "Prazer, Nome." ou "Prazer, Nome Sobrenome."
  const prazerMatch = text.match(/Prazer[,\s]+([A-ZÁÉÍÓÚÃÕÂÊÔÇÀ][a-záéíóúãõâêôçà]+(?:\s+[A-ZÁÉÍÓÚÃÕÂÊÔÇÀ][a-záéíóúãõâêôçà]+)*)/);
  if (prazerMatch) return prazerMatch[1];

  // Padrão 2: "seu nome é Nome" ou "nome: Nome"
  const nomeMatch = text.match(/(?:seu nome é|nome[:\s]+)\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇÀ][a-záéíóúãõâêôçà]+(?:\s+[A-ZÁÉÍÓÚÃÕÂÊÔÇÀ][a-záéíóúãõâêôçà]+)*)/i);
  if (nomeMatch) return nomeMatch[1];

  return '';
}

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

  // 4) Extrai nome do campo message (string única) quando contactName vier nulo
  if (!name && payload.message) {
    name = extractNameFromText(payload.message);
  }

  // 5) Fallback: busca no histórico de mensagens
  if (!name || !email || !phone) {
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const text = messages.map(m => m.content || m.text || m.message || '').join(' ');

    if (!name)  name  = extractNameFromText(text);

    if (!email) {
      const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) email = emailMatch[0];
    }

    if (!phone) {
      const phoneMatch = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
      if (phoneMatch) phone = phoneMatch[0].replace(/\D/g, '');
    }
  }

  // Normaliza telefone para E.164 (Brasil)
  if (phone) {
    phone = phone.replace(/\D/g, '');
    if (phone.length === 11 && !phone.startsWith('55')) phone = `55${phone}`;
    if (phone.length === 10 && !phone.startsWith('55')) phone = `55${phone}`;
    phone = `+${phone}`;
  }

  // Extrai contextId (identificador único da conversa no GPT Maker)
  const contextId = payload.contextId || payload.context_id || payload.sessionId || payload.session_id || '';

  return {
    name:      name.trim(),
    email:     email.trim().toLowerCase(),
    phone:     phone.trim(),
    contextId: contextId.toString().trim(),
  };
}

module.exports = { extractLeadData };
