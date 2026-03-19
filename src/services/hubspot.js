const axios = require('axios');

const BASE_URL = 'https://api.hubapi.com/crm/v3/objects/contacts';

// Propriedades customizadas necessárias no HubSpot (Settings > Properties > Contact):
//   gptmaker_context_id  → Single-line text
//   tipo_imovel          → Single-line text  (ou Dropdown: apartamento, casa, cobertura…)
//   faixa_preco          → Single-line text
//   prazo_compra         → Single-line text
const CONTEXT_ID_PROP = 'gptmaker_context_id';
const CUSTOM_PROPS    = [CONTEXT_ID_PROP, 'tipo_imovel', 'faixa_preco', 'prazo_compra'];

function buildHeaders() {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error('HUBSPOT_ACCESS_TOKEN não configurado no .env');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function logHubSpotError(label, err) {
  console.error(`[hubspot] ${label} — status: ${err.response?.status}`);
  console.error('[hubspot] Resposta completa da API:', JSON.stringify(err.response?.data, null, 2));
}

async function searchContact(filterProperty, value) {
  const url = 'https://api.hubapi.com/crm/v3/objects/contacts/search';
  const body = {
    filterGroups: [
      { filters: [{ propertyName: filterProperty, operator: 'EQ', value }] },
    ],
    properties: ['email', 'firstname', 'lastname', 'phone', ...CUSTOM_PROPS],
    limit: 1,
  };
  try {
    const res = await axios.post(url, body, { headers: buildHeaders() });
    return res.data.results?.[0] ?? null;
  } catch (err) {
    logHubSpotError(`searchContact por ${filterProperty}`, err);
    return null;
  }
}

/**
 * Busca leads no HubSpot cujo tipo_imovel bate com o imóvel anunciado.
 * Retorna apenas leads que têm telefone preenchido.
 */
async function searchLeadsByInterest(tipo, _preco) {
  const url = 'https://api.hubapi.com/crm/v3/objects/contacts/search';

  const filters = [
    { propertyName: 'tipo_imovel', operator: 'EQ', value: tipo.toLowerCase() },
    { propertyName: 'phone',       operator: 'HAS_PROPERTY' },
  ];

  const body = {
    filterGroups: [{ filters }],
    properties: ['firstname', 'lastname', 'email', 'phone', 'tipo_imovel', 'faixa_preco', 'prazo_compra'],
    limit: 100,
  };

  try {
    const res = await axios.post(url, body, { headers: buildHeaders() });
    return res.data.results ?? [];
  } catch (err) {
    logHubSpotError('searchLeadsByInterest', err);
    throw err;
  }
}

function buildProperties(lead, includeCustom = true) {
  const parts = lead.name ? lead.name.split(/\s+/) : [];
  const firstname = parts[0] || '';
  const lastname  = parts.slice(1).join(' ') || '';

  const props = {};
  if (firstname)  props.firstname = firstname;
  if (lastname)   props.lastname  = lastname;
  if (lead.email) props.email     = lead.email;

  // HubSpot aceita telefone sem o +
  if (lead.phone) props.phone = lead.phone.replace(/^\+/, '');

  if (includeCustom) {
    if (lead.contextId)  props[CONTEXT_ID_PROP] = lead.contextId;
    if (lead.tipoImovel) props.tipo_imovel       = lead.tipoImovel;
    if (lead.faixaPreco) props.faixa_preco       = lead.faixaPreco;
    if (lead.prazoCompra) props.prazo_compra     = lead.prazoCompra;
  }

  props.hs_lead_status = 'NEW';
  props.lifecyclestage = 'lead';

  return props;
}

async function upsert(method, url, properties, headers) {
  try {
    const res = await axios({ method, url, data: { properties }, headers });
    return res.data;
  } catch (err) {
    // Se falhou por propriedade customizada inexistente, tenta sem elas
    const hasCustom = CUSTOM_PROPS.some(p => p in properties);
    if (hasCustom && err.response?.status === 400) {
      logHubSpotError(`${method.toUpperCase()} com props customizadas falhou, tentando sem`, err);
      const cleaned = Object.fromEntries(
        Object.entries(properties).filter(([k]) => !CUSTOM_PROPS.includes(k))
      );
      const res = await axios({ method, url, data: { properties: cleaned }, headers });
      return res.data;
    }
    logHubSpotError(`${method.toUpperCase()} ${url}`, err);
    throw err;
  }
}

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

module.exports = { createOrUpdateContact, searchLeadsByInterest };
