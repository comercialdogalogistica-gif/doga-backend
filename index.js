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
    range: 'Sheet1!A:G',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        new Date().toLocaleString('pt-BR'),
        dados.nome,
        dados.email,
        dados.telefone,
        dados.cidade,
        dados.veiculo,
        dados.capacidade
      ]]
    }
  });
}

async function enviarMensagem(telefone, nome) {
  const numero = telefone.replace(/\D/g, '');
  await axios.post(
    `${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`,
    {
      number: `55${numero}`,
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
    const get = (label) => fields.find(f => f.label === label)?.value || '';

    const dados = {
      nome: get('Nome completo'),
      email: get('Email'),
      telefone: get('WhatsApp'),
      cidade: get('Cidade/Estado'),
      veiculo: get('Tipo de veículo'),
      capacidade: get('Capacidade de peso')
    };

    await salvarNaPlanilha(dados);
    await enviarMensagem(dados.telefone, dados.nome);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error?.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Backend rodando!'));
