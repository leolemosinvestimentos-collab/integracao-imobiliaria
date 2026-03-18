#!/usr/bin/env bash
# Simula um webhook do GPT Maker para testar localmente
curl -s -X POST http://localhost:3000/webhook/gptmaker \
  -H "Content-Type: application/json" \
  -d '{
    "lead": {
      "name": "Maria Silva",
      "email": "maria.silva@exemplo.com",
      "phone": "11987654321"
    },
    "variables": {},
    "messages": []
  }' | jq .
