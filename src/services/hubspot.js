const axios = require('axios');

const BASE_URL = 'https://api.hubapi.com/crm/v3/objects/contacts';

// Propriedade personalizada para deduplicar pelo contextId do GPT Maker.
// Crie-a no HubSpot: Settings > Properties > Contact > Create property
//   Nome interno: gptmaker_context_id  |  Tipo: Single-line text
// Se a propriedade não existir, o contextId é ignorado sem travar o cadastro.
const CONTEXT_ID_PROP = 'gptmaker_context_id';

function buildHeaders() {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error('HUBSPOT_ACCESS_TOKEN não configurado no .env');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function logHubSpotError(label, err) {
  const data = err.response?.data;
  console.error(`[hubspot] ${label} — status: ${err.response?.status}`);
  console.error('[hubspot] Resposta completa da API:', JSON.stringify(data, null, 2));
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
  try {
    const res = await axios.post(url, body, { headers: buildHeaders() });
    return res.data.results?.[0] ?? null;
  } catch (err) {
    // Se a propriedade customizada não existir, ignora e retorna null
    logHubSpotError(`searchContact por ${filterProperty}`, err);
    return null;
  }
}

function buildProperties(lead, includeContextId = true) {
  const parts = lead.name ? lead.name.split(/\s+/) : [];
  const firstname = parts[0] || '';
  const lastname  = parts.slice(1).join(' ') || '';

  const props = {};
  if (firstname)  props.firstname      = firstname;
  if (lastname)   props.lastname       = lastname;
  if (lead.email) props.email          = lead.email;

  // HubSpot aceita telefone só com dígitos (sem +)
  if (lead.phone) props.phone = lead.phone.replace(/^\+/, '');

  if (includeContextId && lead.contextId) props[CONTEXT_ID_PROP] = lead.contextId;

  props.hs_lead_status = 'NEW';
  props.lifecyclestage = 'lead';

  return props;
}

async function upsert(method, url, properties, headers) {
  try {
    const res = await axios({ method, url, data: { properties }, headers });
    return res.data;
  } catch (err) {
    // Se falhou com contextId, tenta de novo sem ele
    const hasContextId = CONTEXT_ID_PROP in properties;
    if (hasContextId && err.response?.status === 400) {
      logHubSpotError(`${method.toUpperCase()} com contextId falhou, tentando sem`, err);
      const { [CONTEXT_ID_PROP]: _omit, ...propsWithout } = properties;
      const res = await axios({ method, url, data: { properties: propsWithout }, headers });
      return res.data;
    }
    logHubSpotError(`${method.toUpperCase()} ${url}`, err);
    throw err;
  }
}

/**
 * Upsert de contato com prioridade:
 *   1. contextId  2. e-mail  3. cria novo
 */
async function createOrUpdateContact(lead) {
  const headers = buildHeaders();
  let existing = null;

  if (lead.contextId) {
    existing = await searchContact(CONTEXT_ID_PROP, lead.contextId);
    if (existing) console.log(`[hubspot] Encontrado por contextId=${lead.contextId} (id=${existing.id}), atualizando...`);
  }

  if (!existing && lead.email) {
    existing = await searchContact('email', lead.email);
    if (existing) console.log(`[hubspot] Encontrado por email=${lead.email} (id=${existing.id}), atualizando...`);
  }

  if (!existing && lead.phone) {
    const phoneDigits = lead.phone.replace(/^\+/, '');
    existing = await searchContact('phone', phoneDigits);
    if (existing) console.log(`[hubspot] Encontrado por phone=${phoneDigits} (id=${existing.id}), atualizando...`);
  }

  if (existing) {
    return upsert('patch', `${BASE_URL}/${existing.id}`, buildProperties(lead), headers);
  }

  return upsert('post', BASE_URL, buildProperties(lead), headers);
}

module.exports = { createOrUpdateContact };
