require('dotenv').config();
const express = require('express');
const webhookRouter  = require('./routes/webhook');
const imovelRouter   = require('./routes/imovel');
const reuniaoRouter  = require('./routes/reuniao');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/webhook', webhookRouter);
app.use('/imovel',  imovelRouter);
app.use('/reuniao', reuniaoRouter);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Endpoint do webhook: POST http://localhost:${PORT}/webhook/gptmaker`);
});
