/**
 * Extrai nome, telefone e e-mail do payload do GPT Maker.
 *
 * O GPT Maker envia os dados coletados pela conversa em campos como:
 *   payload.lead       → objeto com campos definidos no fluxo
 *   payload.variables  → variáveis capturadas durante o chat
 *   payload.messages   → histórico de mensagens (fallback)
 *
 * Ajuste os nomes dos campos conforme o seu fluxo no GPT Maker.
 */
function extractLeadData(payload) {
  // 1) Tenta ler direto de payload.lead (formato mais comum)
  const lead = payload.lead || payload.contact || {};

  let name  = lead.contactName || lead.name  || lead.nome  || lead.full_name || lead.fullName || '';
  let email = lead.email || lead.e_mail || lead.email_address || '';
  let phone = lead.contactPhone || lead.phone || lead.telefone || lead.celular || lead.whatsapp || '';

  // 2) Tenta payload.variables (variáveis de fluxo do GPT Maker)
  const vars = payload.variables || payload.vars || {};
  if (!name)  name  = vars.contactName || vars.name  || vars.nome  || vars.full_name || '';
  if (!email) email = vars.email || vars.e_mail || '';
  if (!phone) phone = vars.contactPhone || vars.phone || vars.telefone || vars.celular || vars.whatsapp || '';

  // 3) Tenta campos raiz do payload (GPT Maker às vezes envia na raiz)
  if (!name)  name  = payload.contactName || payload.name  || payload.nome  || '';
  if (!email) email = payload.email || payload.e_mail || '';
  if (!phone) phone = payload.contactPhone || payload.phone || payload.telefone || payload.celular || payload.whatsapp || '';

  // 3) Fallback: busca por regex no histórico de mensagens
  if ((!email || !phone) && Array.isArray(payload.messages)) {
    const text = payload.messages
      .map(m => m.content || m.text || m.message || '')
      .join(' ');

    if (!email) {
      const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) email = emailMatch[0];
    }

    if (!phone) {
      // Aceita formatos: +55 11 91234-5678 | (11) 91234-5678 | 11912345678
      const phoneMatch = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
      if (phoneMatch) phone = phoneMatch[0].replace(/\D/g, '');
    }
  }

  // Normaliza telefone: remove não-dígitos e garante formato E.164 para Brasil
  if (phone) {
    phone = phone.replace(/\D/g, '');
    if (phone.length === 11 && !phone.startsWith('55')) phone = `55${phone}`;
    if (phone.length === 10 && !phone.startsWith('55')) phone = `55${phone}`;
    phone = `+${phone}`;
  }

  return {
    name:  name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
  };
}

module.exports = { extractLeadData };
