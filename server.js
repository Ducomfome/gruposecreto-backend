// server.js (Versão Final Correta - Use esta!)

require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors'); 

const app = express();
const PORT = process.env.PORT || 3000;

// ==================================================================
//  Os 3 "Abridores de Carta" para o Webhook funcionar
// ==================================================================
app.use(express.json()); // Lê JSON
app.use(express.text()); // Lê Texto Puro
app.use(express.urlencoded({ extended: true })); // Lê Formato de Formulário
// ==================================================================

app.use(cors()); 

const PUSHIN_TOKEN = process.env.PUSHIN_TOKEN;
const paymentStatus = {};

// Rota para GERAR O PIX
app.post('/gerar-pix', async (req, res) => {
    try {
        const apiUrl = 'https://api.pushinpay.com.br/api/pix/cashIn';
        
        // CORRETO: Não enviamos o webhook_url aqui
        const paymentData = {
            value: 1999 // Mude o valor aqui se precisar
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PUSHIN_TOKEN}`
            },
            body: JSON.stringify(paymentData)
        });

        const data = await response.json();
        
        if (!response.ok || !data.id) {
            console.error('ERRO na API PushinPay:', data);
            throw new Error(data.message || 'Resposta inválida da API');
        }

        paymentStatus[data.id] = "created";
        console.log(`✅ PIX gerado com sucesso! ID: ${data.id}`);

        res.json({
            paymentId: data.id,
            qrCodeBase64: data.qr_code_base64,
            copiaECola: data.qr_code
        });

    } catch (error) {
        console.error('Erro ao gerar PIX:', error.message);
        res.status(500).json({ error: 'Não foi possível gerar o PIX.' });
    }
});

// ROTA DO WEBHOOK (Onde a PushinPay vai te avisar)
app.post('/webhook-pushinpay', (req, res) => {
    console.log("Webhook da PushinPay recebido!");
    let webhookData = req.body;

    if (typeof webhookData === 'string') {
        try { webhookData = JSON.parse(webhookData); } catch (e) { /* ignora */ }
    }
    
    console.log("Dados do Webhook:", webhookData);

    let paymentId = null;
    let paymentStatusReceived = null;

    if (webhookData && webhookData.id) {
        paymentId = webhookData.id;
        paymentStatusReceived = webhookData.status;
    } else if (webhookData && webhookData.data) { // Algumas APIs mandam dentro de um "data"
        paymentId = webhookData.data.id;
        paymentStatusReceived = webhookData.data.status;
    }
    // ... (outras verificações se necessário) ...

    if (paymentStatusReceived === 'paid' && paymentId) {
        console.log(`Pagamento ${paymentId} foi confirmado!`);
        paymentStatus[paymentId] = 'paid';
    }

    res.status(200).send('OK');
});

// ROTA DE VERIFICAÇÃO DE STATUS
app.get('/check-status/:paymentId', (req, res) => {
    const { paymentId } = req.params;
    const status = paymentStatus[paymentId] || 'not_found';
    res.json({ status: status });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
