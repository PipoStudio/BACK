// netlify/functions/notificar-premio.js
const axios = require('axios'); // Asegrate de haber instalado axios en tu carpeta /functions

exports.handler = async (event) => {
    const { email, tipoRacha } = JSON.parse(event.body);
    
    // Aqu defines qu grupo de MailerLite recibe a cada racha
    const grupos = {
        'RACHA_7': 'ID_GRUPO_7_DIAS',
        'RACHA_15': 'ID_GRUPO_15_DIAS',
        'RACHA_30': 'ID_GRUPO_30_DIAS'
    };

    // Llamada a la API de MailerLite
    await axios.post(`https://connect.mailerlite.com/api/subscribers`, {
        email: email,
        groups: [grupos[tipoRacha]]
    }, {
        headers: { 'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}` }
    });

    return { statusCode: 200, body: "Notificacin enviada" };
};