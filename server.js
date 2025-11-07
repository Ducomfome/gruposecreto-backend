// server.js (VERSÃO CORRIGIDA - Para o outro cliente)

require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE CORRIGIDO - Adiciona suporte para x-www-form-urlencoded
app.use(express.urlencoded({ extended: true })); // ← NOVO
app.use(express.json());
app.use(cors());

const PUSHIN_TOKEN = process.env.PUSHIN_TOKEN;
const paymentStatus = {};

// Rota para GERAR O PIX (COM ID NORMALIZADO)
app.post('/gerar-pix', async (req, res) => {
    try {
        const apiUrl = 'https://api.pushinpay.com.br/api/pix/cashIn';
        const paymentData = {
            value: 1999,
            webhook_url: `https://gruposecreto-backend.onrender.com/webhook-pushinpay` // NOVO WEBHOOK
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

        // CORREÇÃO: Normaliza o ID para minúsculas
        const normalizedId = data.id.toLowerCase();
        paymentStatus[normalizedId] = "created";
        
        console.log(`✅ PIX gerado com sucesso! ID: ${normalizedId}`);

        res.json({
            paymentId: normalizedId, // Retorna em minúsculas
            qrCodeBase64: data.qr_code_base64,
            copiaECola: data.qr_code
        });

    } catch (error) {
        console.error('Erro ao gerar PIX:', error.message);
        res.status(500).json({ error: 'Não foi possível gerar o PIX.' });
    }
});

// ROTA DO WEBHOOK - VERSÃO CORRIGIDA
app.post('/webhook-pushinpay', (req, res) => {
    console.log("Webhook da PushinPay recebido!");
    
    // DEBUG: Log dos headers para verificar
    console.log("Content-Type:", req.headers['content-type']);
    
    let webhookData = req.body;
    console.log("Dados do Webhook (bruto):", webhookData);

    // CORREÇÃO: Se vier como string, faz parse
    if (typeof webhookData === 'string') {
        try {
            webhookData = JSON.parse(webhookData);
        } catch (e) {
            console.error("Erro no parse JSON:", e.message);
        }
    }

    console.log("Dados do Webhook (processado):", webhookData);

    // CORREÇÃO: Normaliza o ID e verifica status
    if (webhookData && webhookData.id) {
        const normalizedId = webhookData.id.toLowerCase(); // ← CORREÇÃO DO ID
        
        console.log(`🎉 Webhook recebido - ID: ${normalizedId}, Status: ${webhookData.status}`);
        
        if (webhookData.status === 'paid') {
            paymentStatus[normalizedId] = 'paid';
            console.log(`💰 PAGAMENTO CONFIRMADO: ${normalizedId}`);
            console.log(`👤 Pagador: ${webhookData.payer_name}`);
            console.log(`💳 Valor: R$ ${(webhookData.value / 100).toFixed(2)}`);
        } else {
            paymentStatus[normalizedId] = webhookData.status;
            console.log(`Status atualizado: ${normalizedId} -> ${webhookData.status}`);
        }
    }

    res.status(200).json({ success: true, message: "Webhook processado" });
});

// ROTA DE VERIFICAÇÃO DE STATUS - VERSÃO CORRIGIDA
app.get('/check-status/:paymentId', (req, res) => {
    // CORREÇÃO: Normaliza o ID para minúsculas
    const paymentId = req.params.paymentId.toLowerCase();
    const status = paymentStatus[paymentId] || 'not_found';
    
    res.json({ 
        paymentId,
        status: status,
        message: status === 'paid' ? 'Pagamento confirmado!' : 'Aguardando pagamento'
    });
});

// ROTA EXTRA: Listar todos os pagamentos (para debug)
app.get('/payments', (req, res) => {
    res.json({
        totalPayments: Object.keys(paymentStatus).length,
        payments: paymentStatus
    });
});

// Health check
app.get('/', (req, res) => {
    res.json({ 
        message: 'Sistema de PIX funcionando!',
        webhook: 'https://webhook.site/20cbcf2d-6741-4af2-9e3d-1ea49894b6b0',
        endpoints: {
            gerarPix: 'POST /gerar-pix',
            webhook: 'POST /webhook-pushinpay',
            checkStatus: 'GET /check-status/:paymentId',
            listPayments: 'GET /payments'
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 Webhook externo: https://webhook.site/20cbcf2d-6741-4af2-9e3d-1ea49894b6b0`);
});
