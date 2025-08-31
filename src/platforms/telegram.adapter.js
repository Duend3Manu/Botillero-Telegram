"use strict";

const fs = require('fs');

/**
 * Adapta un mensaje de Telegram a un formato genérico.
 * @param {TelegramBot} bot - La instancia del bot de Telegram.
 * @param {TelegramBot.Message} msg - El objeto de mensaje de Telegram.
 * @returns {object} Un objeto de mensaje estandarizado.
 */
function adaptTelegramMessage(bot, msg) {
    const chatId = msg.chat.id;

    return {
        platform: 'telegram',
        chatId: chatId,
        text: msg.text || '',
        args: (msg.text || '').split(/\s+/).slice(1),
        
        // --- Funciones de respuesta estandarizadas ---

        reply: (text) => {
            return bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        },

        sendImage: (imagePath, caption) => {
            return bot.sendPhoto(chatId, imagePath, { caption });
        },
        
        sendAudio: (audioPath) => {
            return bot.sendAudio(chatId, audioPath);
        },

        sendAnimation: (gifPath, caption) => {
            return bot.sendAnimation(chatId, gifPath, { caption });
        },

        showLoading: (action = 'typing') => {
            // action puede ser: 'typing', 'upload_photo', 'upload_video', etc.
            return bot.sendChatAction(chatId, action);
        }
    };
}

module.exports = {
    adaptTelegramMessage
};