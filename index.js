const express = require('express');
const axios = require('axios');
require('dotenv').config();
const { google } = require('googleapis');

const app = express();
app.use(express.json());

const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_KEY;
const INSTANCE_NAME = process.env.INSTANCE_NAME;
const CANAL_LINK = process.env.CANAL_LINK;
const SHEET_ID = process.env.SHEET_ID;

async function salvarNaPlanilha(dados) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A:H',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        new Date().toLocaleString('pt-BR'),
        dados.nome,
        dados.email,
        dados.telefone,
        dados.cidade,
        dados.veiculo,
        dados.capacidade,
        dados.placa
      ]]
    }
  });
}

async function enviarMensagem(telefone, nome) {
  let numero = telefone.replace(/\D/g, '');
  if (!numero.startsWith('55')) {
    numero = '55' + numero;
  }
  await axios.post(
    `${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`,
    {
      number: numero,
      textMessage: {
        text: `Olá ${nome}! 🚛\n\nSeu cadastro na *Doga Logística* foi confirmado!\n\nClique no link abaixo para entrar no nosso canal de fretes:\n${CANAL_LINK}\n\nBem-vindo(a)! 🎉`
      }
    },
    { headers: { apikey: EVOLUTION_KEY } }
  );
}

app.post('/webhook', async (req, res) => {
  try {
    const fields = req.body.data.fields;
console.log('FIELDS COMPLETO:', JSON.stringify(fields, null, 2));
    const getValue = (label) => {
      const field = fields.find(f => f.label === label);
      if (!field) return '';
      const val = field.value;

      if (Array.isArray(val)) {
        return val.map(v => {
          if (typeof v === 'object' && v !== null) {
            return v.text || v.label || v.value || JSON.stringify(v);
          }
          return v;
        }).join(', ');
      }

      if (typeof val === 'object' && val !== null) {
        return val.text || val.label || val.value || JSON.stringify(val);
      }

      return String(val) || '';
    };

    const dados = {
      nome: getValue('Nome Completo'),
      email: getValue('Email'),
      telefone: getValue('WhatsApp'),
      cidade: getValue('Cidade/Estado'),
      veiculo: getValue('Tipo de veículo'),
      capacidade: getValue('Capacidade de peso'),
      placa: getValue('Placa')
    };

    console.log('Dados recebidos:', JSON.stringify(dados));

    await salvarNaPlanilha(dados);
    await enviarMensagem(dados.telefone, dados.nome);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro:', error?.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Backend rodando!'));
