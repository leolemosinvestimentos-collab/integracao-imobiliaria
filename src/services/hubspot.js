const axios = require('axios');

const BASE_URL = 'https://api.hubapi.com/crm/v3/objects/contacts';

function buildHeaders() {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error('HUBSPOT_ACCESS_TOKEN não configurado no .env');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Busca um contato existente pelo e-mail.
 * Retorna o objeto do contato ou null.
 */
async function findContactByEmail(email) {
  const url = 'https://api.hubapi.com/crm/v3/objects/contacts/search';
  const body = {
    filterGroups: [
      {
        filters: [
          { propertyName: 'email', operator: 'EQ', value: email },
        ],
      },
    ],
    properties: ['email', 'firstname', 'lastname', 'phone'],
    limit: 1,
  };

  const res = await axios.post(url, body, { headers: buildHeaders() });
  return res.data.results?.[0] ?? null;
}

/**
 * Monta as propriedades do contato para o HubSpot.
 * Separa o nome em firstname / lastname.
 */
function buildProperties(lead) {
  const parts = lead.name ? lead.name.split(/\s+/) : [];
  const firstname = parts[0] || '';
  const lastname  = parts.slice(1).join(' ') || '';

  const props = {};
  if (firstname) props.firstname = firstname;
  if (lastname)  props.lastname  = lastname;
  if (lead.email) props.email    = lead.email;
  if (lead.phone) props.phone    = lead.phone;

  // Origem do lead
  props.hs_lead_status = 'NEW';
  props.lifecyclestage = 'lead';

  return props;
}

/**
 * Cria um novo contato ou atualiza um existente (upsert por e-mail).
 */
async function createOrUpdateContact(lead) {
  const headers = buildHeaders();

  // Tenta localizar contato existente pelo e-mail
  if (lead.email) {
    const existing = await findContactByEmail(lead.email);
    if (existing) {
      console.log(`[hubspot] Contato existente encontrado (id=${existing.id}), atualizando...`);
      const res = await axios.patch(
        `${BASE_URL}/${existing.id}`,
        { properties: buildProperties(lead) },
        { headers }
      );
      return res.data;
    }
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
