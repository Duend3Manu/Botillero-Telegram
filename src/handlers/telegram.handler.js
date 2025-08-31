"use strict";

const { adaptTelegramMessage } = require('../platforms/telegram.adapter');
const commandHandler = require('./command.handler');

/**
 * Maneja los mensajes de texto entrantes.
 */
async function handleMessage(bot, msg) {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignoramos mensajes que no contienen texto
    if (!text) {
        return;
    }

    // --- ¡MEJORA! Menú interactivo ---
    if (text.startsWith('/menu')) {
        const menuOptions = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '☀ Clima', callback_data: 'clima' }, { text: ' Richter Sismos', callback_data: 'sismos' }],
                    [{ text: ' Indicadores Económicos', callback_data: 'valores' }, { text: ' Feriados', callback_data: 'feriados' }],
                    [{ text: ' Gira la Ruleta', callback_data: 'ruleta' }, { text: ' Mis Puntos', callback_data: 'puntos' }],
                    [{ text: ' Lista de Audios', callback_data: 'audios' }]
                ]
            }
        };
        bot.sendMessage(chatId, 'Bienvenido al Botillero, ¿qué deseas hacer?', menuOptions);
        return;
    }

    // Para cualquier otro comando o texto, usamos el command handler
    const adaptedMessage = adaptTelegramMessage(bot, msg);
    await commandHandler(adaptedMessage);
}

/**
 * Maneja las pulsaciones de los botones del menú.
 */
async function handleCallbackQuery(bot, callbackQuery) {
    const msg = callbackQuery.message;
    const command = callbackQuery.data;

    // Respondemos al callback para que el cliente de Telegram sepa que lo recibimos
    bot.answerCallbackQuery(callbackQuery.id);

    // Creamos un mensaje falso que se parece a un mensaje de texto normal
    const fakeMsg = {
        ...msg,
        text: `/${command}` // Simulamos que el usuario escribió el comando
    };

    const adaptedMessage = adaptTelegramMessage(bot, fakeMsg);
    await commandHandler(adaptedMessage);
}

module.exports = {
    handleMessage,
    handleCallbackQuery
};