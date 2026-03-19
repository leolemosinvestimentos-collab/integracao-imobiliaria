const axios = require('axios');

const BASE_URL = 'https://api.hubapi.com/crm/v3/objects/contacts';

// Propriedade personalizada usada para deduplicar pelo contextId do GPT Maker.
// Crie-a no HubSpot: Settings > Properties > Contact > Create property
//   Nome interno: gptmaker_context_id  |  Tipo: Single-line text
const CONTEXT_ID_PROP = 'gptmaker_context_id';

function buildHeaders() {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error('HUBSPOT_ACCESS_TOKEN não configurado no .env');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function searchContact(filterProperty, value) {
  const url = 'https://api.hubapi.com/crm/v3/objects/contacts/search';
  const body = {
    filterGroups: [
      { filters: [{ propertyName: filterProperty, operator: 'EQ', value }] },
    ],
    properties: ['email', 'firstname', 'lastname', 'phone', CONTEXT_ID_PROP],
    limit: 1,
  };
  const res = await axios.post(url, body, { headers: buildHeaders() });
  return res.data.results?.[0] ?? null;
}

function buildProperties(lead) {
  const parts = lead.name ? lead.name.split(/\s+/) : [];
  const firstname = parts[0] || '';
  const lastname  = parts.slice(1).join(' ') || '';

  const props = {};
  if (firstname)       props.firstname            = firstname;
  if (lastname)        props.lastname             = lastname;
  if (lead.email)      props.email                = lead.email;
  if (lead.phone)      props.phone                = lead.phone;
  if (lead.contextId)  props[CONTEXT_ID_PROP]     = lead.contextId;

  props.hs_lead_status = 'NEW';
  props.lifecyclestage = 'lead';

  return props;
}

/**
 * Upsert de contato com prioridade de busca:
 *   1. contextId (identificador único da conversa no GPT Maker)
 *   2. e-mail
 *   Se não encontrar, cria novo contato.
 */
async function createOrUpdateContact(lead) {
  const headers = buildHeaders();
  let existing = null;

  // 1) Busca pelo contextId
  if (lead.contextId) {
    existing = await searchContact(CONTEXT_ID_PROP, lead.contextId);
    if (existing) {
      console.log(`[hubspot] Encontrado por contextId=${lead.contextId} (id=${existing.id}), atualizando...`);
    }
  }

  // 2) Fallback: busca pelo e-mail
  if (!existing && lead.email) {
    existing = await searchContact('email', lead.email);
    if (existing) {
      console.log(`[hubspot] Encontrado por email=${lead.email} (id=${existing.id}), atualizando...`);
    }
  }

  // Atualiza contato existente
  if (existing) {
    const res = await axios.patch(
      `${BASE_URL}/${existing.id}`,
      { properties: buildProperties(lead) },
      { headers }
    );
    return res.data;
  }

  // Cria novo contato
  const res = await axios.post(
    BASE_URL,
    { properties: buildProperties(lead) },
    { headers }
  );
  return res.data;
}

module.exports = { createOrUpdateContact };
