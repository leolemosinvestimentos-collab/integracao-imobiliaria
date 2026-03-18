require('dotenv').config();
const express = require('express');
const webhookRouter = require('./routes/webhook');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/webhook', webhookRouter);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Endpoint do webhook: POST http://localhost:${PORT}/webhook/gptmaker`);
});
