// server.js (VERSÃO FINAL SEM MARCAÇÃO FB - SÓ UTMIFY)

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// VARIÁVEIS DE AMBIENTE (Render Environment)
const PUSHIN_TOKEN = process.env.PUSHIN_TOKEN;
// Chaves do Facebook foram removidas

const paymentStatus = {};

// ===========================================
// FUNÇÃO DE RASTREAMENTO DO FB REMOVIDA
// ===========================================

// ROTA PARA GERAR O PIX
app.post('/gerar-pix', async (req, res) => {
    try {
        const apiUrl = 'https://api.pushinpay.com.br/api/pix/cashIn';
        const paymentData = {
            value: 1999, // R$ 19,99 em centavos
            webhook_url: `https://gruposecreto-backend.onrender.com/webhook-pushinpay`
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

        const normalizedId = data.id.toLowerCase();
        paymentStatus[normalizedId] = "created";
        
        console.log(`✅ PIX gerado com sucesso! ID: ${normalizedId}`);

        // 🔥 MARCAÇÃO AddToCart REMOVIDA DAQUI

        res.json({
            paymentId: normalizedId,
            qrCodeBase64: data.qr_code_base64,
            copiaECola: data.qr_code
        });

    } catch (error) {
        console.error('Erro ao gerar PIX:', error.message);
        res.status(500).json({ error: 'Não foi possível gerar o PIX.' });
    }
});

// ROTA DO WEBHOOK - VERSÃO SEM PIXEL
app.post('/webhook-pushinpay', async (req, res) => {
    console.log("Webhook da PushinPay recebido!");
    
    let webhookData = req.body;
    console.log("Dados do Webhook (bruto):", webhookData);

    if (typeof webhookData === 'string') {
        try {
            webhookData = JSON.parse(webhookData);
        } catch (e) {
            console.error("Erro no parse JSON:", e.message);
        }
    }

    console.log("Dados do Webhook (processado):", webhookData);

    if (webhookData && webhookData.id) {
        const normalizedId = webhookData.id.toLowerCase();
        
        console.log(`🎉 Webhook recebido - ID: ${normalizedId}, Status: ${webhookData.status}`);
        
        if (webhookData.status === 'paid') {
            paymentStatus[normalizedId] = 'paid';
            console.log(`💰 PAGAMENTO CONFIRMADO: ${normalizedId}`);
            console.log(`👤 Pagador: ${webhookData.payer_name}`);
            console.log(`💳 Valor: R$ ${(webhookData.value / 100).toFixed(2)}`);

            // 🔥🔥🔥 MARCAÇÃO PURCHASE REMOVIDA DAQUI
            
            console.log(`Status de pagamento salvo para: ${normalizedId}`);
        } else {
            paymentStatus[normalizedId] = webhookData.status;
            console.log(`Status atualizado: ${normalizedId} -> ${webhookData.status}`);
        }
    }

    res.status(200).json({ success: true, message: "Webhook processado" });
});

// ROTA DE VERIFICAÇÃO DE STATUS
app.get('/check-status/:paymentId', (req, res) => {
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
});
