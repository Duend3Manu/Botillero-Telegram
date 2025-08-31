"use strict";

const { adaptTelegramMessage } = require('../platforms/telegram.adapter');
const commandHandler = require('./command.handler');

/**
 * Maneja los mensajes de texto entrantes.
 */
async function handleMessage(bot, msg) {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) {
        return; // Ignorar mensajes sin texto (fotos, stickers, etc.)
    }

    // El menú interactivo con botones se activa con el comando /menu
    if (text.startsWith('/menu')) {
        const menuOptions = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '☀️ Clima', callback_data: 'clima' }, { text: ' seismograph: Sismos', callback_data: 'sismos' }],
                    [{ text: ' Indicadores Económicos', callback_data: 'valores' }, { text: ' Feriados', callback_data: 'feriados' }],
                    [{ text: ' Gira la Ruleta', callback_data: 'ruleta' }, { text: ' Mis Puntos', callback_data: 'puntos' }],
                    [{ text: ' Lista de Audios', callback_data: 'audios' }]
                ]
            }
        };
        bot.sendMessage(chatId, 'Bienvenido al Botillero, ¿qué deseas hacer?', menuOptions);
        return;
    }

    // Para cualquier otro comando o texto, se pasa al manejador principal
    const adaptedMessage = adaptTelegramMessage(bot, msg);
    
    // Medida de seguridad: si el mensaje no pudo ser adaptado, no continuamos.
    if (adaptedMessage) {
        await commandHandler(adaptedMessage);
    }
}

/**
 * --- ¡CORREGIDO Y MEJORADO! ---
 * Maneja las pulsaciones de los botones del menú (callback queries).
 */
async function handleCallbackQuery(bot, callbackQuery) {
    const msg = callbackQuery.message;
    const command = callbackQuery.data;
    
    // --- LA CORRECCIÓN CLAVE ---
    // El usuario que presionó el botón está en `callbackQuery.from`,
    // no en `callbackQuery.message.from` (ahí está la info del bot).
    const user = callbackQuery.from;

    // Confirmamos a la API de Telegram que hemos recibido el evento.
    bot.answerCallbackQuery(callbackQuery.id);

    // Creamos un objeto de mensaje "falso" que simula un comando escrito,
    // asegurándonos de usar la información del usuario que interactuó.
    const fakeMsg = {
        ...msg,         // Usamos el mensaje original para obtener el `chat.id`
        from: user,     // ¡Sobrescribimos `from` con el usuario correcto!
        text: `/${command}` // Simulamos el comando, ej: "/puntos"
    };

    // Ahora, cuando el adaptador procese este `fakeMsg`, leerá al usuario correcto.
    const adaptedMessage = adaptTelegramMessage(bot, fakeMsg);

    // Medida de seguridad: si el mensaje no pudo ser adaptado, no continuamos.
    if (adaptedMessage) {
        await commandHandler(adaptedMessage);
    }
}

module.exports = {
    handleMessage,
    handleCallbackQuery
};
