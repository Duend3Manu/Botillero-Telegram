// config/bot.config.js
"use strict";

/**
 * Configuración del Bot de Telegram
 * Configuración simplificada para Telegram (sin Puppeteer)
 */

module.exports = {
    // Configuración de Telegram
    telegram: {
        polling: {
            interval: 300, // ms entre polls
            timeout: 10    // timeout en segundos
        }
    },
    
    // Configuración de rate limiting (heredado de WhatsApp, útil para Telegram también)
    rateLimiting: {
        globalCooldownMs: 0, // Sin límite - procesa comandos instantáneamente
        cleanupIntervalMs: 300000, // Limpiar cache cada 5 minutos
        maxWarningsPerUser: 3 // Máximo de advertencias antes de ignorar silenciosamente
    }
};
