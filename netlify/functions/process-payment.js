const axios = require('axios');
const qs = require('querystring');

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { email, amount } = JSON.parse(event.body || "{}");

        // =========================
        // DEBUG ENV
        // =========================
        console.log("ENV CHECK:");
        console.log("ID:", process.env.WOMPI_APP_ID);
        console.log("SECRET:", process.env.WOMPI_APP_SECRET ? "OK" : "MISSING");

        if (!email || !amount) {
            throw new Error("Faltan datos: email o amount");
        }

        // =========================
        // 1. OAUTH
        // =========================
        const auth = await axios.post(
            'https://id.wompi.sv/connect/token',
            qs.stringify({
                grant_type: 'client_credentials',
                client_id: process.env.WOMPI_APP_ID,
                client_secret: process.env.WOMPI_APP_SECRET,
                audience: 'wompi_api'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const token = auth.data.access_token;

        if (!token) {
            throw new Error("No se obtuvo token");
        }

        // =========================
        // 2. DATOS
        // =========================
        const uniqueID = "GW" + Date.now();
        const finalAmount = Number(amount);

        // =========================
        // 3. BODY REAL (IMPORTANTE)
        // =========================
       // =========================
// 3. BODY REAL (CORREGIDO)
// =========================
const wompiBody = {
    identificadorEnlaceComercio: uniqueID,
    monto: finalAmount,
    nombreProducto: "Orden Geekwave",
    configuracion: {
        emailsNotificacion: email,
        urlRetorno: "https://geekwave.netlify.app/",
        urlRedirect: "https://geekwave.netlify.app/", // <--- Agrega esta lnea
        esMontoEditable: false,
        esCantidadEditable: false,
        notificarTransaccionCliente: true 
    },
    limitesDeUso: {
        cantidadMaximaPagosExitosos: 1
    }
};
        console.log(" Body REAL enviado a Wompi:", JSON.stringify(wompiBody));

        // =========================
        // 4. REQUEST
        // =========================
        const res = await axios.post(
            'https://api.wompi.sv/EnlacePago',
            wompiBody,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(" Respuesta Wompi:", res.data);

        if (!res.data || !res.data.urlEnlace) {
            throw new Error("No se recibi URL de pago");
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                urlPagoWompi: res.data.urlEnlace
            })
        };

    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;

        console.error(" Error definitivo:", errorData);

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                status: 'error',
                message: 'Error en pasarela',
                details: errorData
            })
        };
    }
};