/**
 * Extrai nome, telefone, e-mail e contextId do payload do GPT Maker.
 *
 * Ordem de busca do nome:
 *   1. payload.lead / payload.contact → contactName, name, nome, fullName
 *   2. payload.variables              → mesmos campos
 *   3. payload raiz                   → mesmos campos
 *   4. payload.messages (array)       → mensagem do usuário com 1-2 palavras
 *                                       após pergunta de confirmação de nome
 */

/**
 * Percorre o array de mensagens e tenta identificar o nome do usuário.
 *
 * Estratégia:
 *   - Filtra apenas mensagens enviadas pelo usuário (role: "user" | "human" | ausente)
 *   - Procura mensagens com 1-2 palavras que pareçam nome próprio (inicial maiúscula)
 *   - Prioriza mensagem que vem logo após uma pergunta de confirmação do bot
 *     (ex: "Confirma que é seu nome?", "pode me dizer seu nome?")
 */
function extractNameFromMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return '';

  const botRoles   = new Set(['assistant', 'bot', 'system', 'patricia', 'patrícia']);
  const namePattern = /^[A-ZÁÉÍÓÚÃÕÂÊÔÇÀ][a-záéíóúãõâêôçà]+(?:\s+[A-ZÁÉÍÓÚÃÕÂÊÔÇÀ][a-záéíóúãõâêôçà]+)?$/;
  const confirmPatterns = /nome|chamo|chama|chamar|confirma|correto|certo/i;

  // Passa 1: procura mensagem do usuário logo após bot perguntar o nome
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];

    const prevRole = (prev.role || prev.type || '').toLowerCase();
    const currRole = (curr.role || curr.type || '').toLowerCase();
    const prevText = (prev.content || prev.text || prev.message || '').trim();
    const currText = (curr.content || curr.text || curr.message || '').trim();

    const prevIsBot  = botRoles.has(prevRole) || prevRole === '';
    const currIsUser = currRole === 'user' || currRole === 'human' || currRole === '';

    if (prevIsBot && currIsUser && confirmPatterns.test(prevText)) {
      if (namePattern.test(currText)) {
        return currText;
      }
    }
  }

  // Passa 2: qualquer mensagem do usuário com 1-2 palavras em formato de nome
  for (const msg of messages) {
    const role = (msg.role || msg.type || '').toLowerCase();
    const text = (msg.content || msg.text || msg.message || '').trim();
    const isUser = role === 'user' || role === 'human' || role === '';

    if (isUser && namePattern.test(text)) {
      return text;
    }
  }

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

  // 4) Varre o array messages buscando o nome digitado pelo usuário
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  if (!name) {
    name = extractNameFromMessages(messages);
    if (name) console.log(`[extractor] Nome extraído do histórico de mensagens: "${name}"`);
  }

  // 5) Busca e-mail e telefone no texto completo das mensagens
  if (!email || !phone) {
    const fullText = messages.map(m => m.content || m.text || m.message || '').join(' ');

    if (!email) {
      const emailMatch = fullText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) email = emailMatch[0];
    }

    if (!phone) {
      const phoneMatch = fullText.match(/(\+?\d[\d\s\-().]{7,}\d)/);
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
