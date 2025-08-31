"use strict";

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { handleMessage, handleCallbackQuery } = require('./src/handlers/telegram.handler.js');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error("¡Error! No se encontró el TELEGRAM_BOT_TOKEN en el archivo .env");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// --- Comandos Sugeridos por Telegram ---
const commands = [
    { command: 'menu', description: 'Muestra el menú principal de comandos' },
    { command: 'ping', description: 'Revisa el estado del bot' },
    { command: 'ruleta', description: 'Gira la ruleta para ganar puntos' },
    { command: 'puntos', description: 'Muestra tus puntos acumulados' },
    { command: 'clima', description: 'Muestra el clima de una ciudad' },
    { command: 'sismos', description: 'Muestra los últimos sismos en Chile' },
    { command: 'valores', description: 'Muestra los indicadores económicos' },
    { command: 'audios', description: 'Muestra la lista de audios disponibles' }
];

bot.setMyCommands(commands)
    .then(() => console.log('Comandos de Telegram configurados exitosamente.'))
    .catch((error) => console.error('Error al configurar los comandos de Telegram:', error));

console.log('🤖 Bot de Telegram iniciado y listo para la acción!');

// --- Manejadores de Eventos ---

// Escuchador para mensajes (comandos y texto)
bot.on('message', (msg) => {
    handleMessage(bot, msg);
});

// Escuchador para botones del menú (callback queries)
bot.on('callback_query', (callbackQuery) => {
    handleCallbackQuery(bot, callbackQuery);
});

// Manejo de errores de polling
bot.on('polling_error', (error) => {
    // El error ETELEGRAM 409 es común y se resuelve solo. Lo ignoramos.
    if (error.code === 'ETELEGRAM' && error.response && error.response.statusCode === 409) {
        return;
    }
    console.error(`[Error de Polling en Telegram]:`, error);
});