"use strict";

const path = require('path');
const fs = require('fs');

/**
 * Adapta un mensaje de Telegram a un formato genérico y estandarizado.
 * Este es el "traductor universal" para que la lógica de tus comandos
 * no dependa de ninguna plataforma específica.
 * @param {TelegramBot} bot - La instancia del bot de Telegram.
 * @param {TelegramBot.Message} msg - El objeto de mensaje original de Telegram.
 * @returns {object|null} Un objeto de mensaje estandarizado o null si el mensaje es inválido.
 */
function adaptTelegramMessage(bot, msg) {
    // Medida de seguridad para evitar crashes si el mensaje es inválido.
    if (!msg || !msg.from || !msg.chat) {
        console.error("ADAPTADOR: Se recibió un mensaje inválido o incompleto. Se ignorará.", msg);
        return null; // Detiene el procesamiento si el mensaje no es válido.
    }

    const chatId = msg.chat.id;
    const from = msg.from;
    const repliedMsg = msg.reply_to_message;

    return {
        // --- Propiedades estandarizadas ---
        platform: 'telegram',
        chatId: chatId,
        text: msg.text || '',
        args: (msg.text || '').split(/\s+/).slice(1),
        senderId: from.id,
        senderName: from.first_name || from.username || 'Usuario',
        isReply: !!repliedMsg,
        
        // --- Funciones de utilidad estandarizadas ---
        getRepliedMessageMediaInfo: () => {
            if (!repliedMsg) return null;
            if (repliedMsg.sticker) return { fileId: repliedMsg.sticker.file_id, type: 'sticker' };
            if (repliedMsg.photo) return { fileId: repliedMsg.photo[repliedMsg.photo.length - 1].file_id, type: 'photo' };
            if (repliedMsg.video) return { fileId: repliedMsg.video.file_id, type: 'video' };
            if (repliedMsg.animation) return { fileId: repliedMsg.animation.file_id, type: 'animation' };
            return null;
        },

        downloadFile: (fileId) => {
            const tempDir = path.join(__dirname, '..', '..', 'temp');
            // Asegura que la carpeta temporal exista antes de intentar descargar.
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            return bot.downloadFile(fileId, tempDir);
        },

        // --- Funciones de respuesta estandarizadas (AQUÍ ESTÁ LA CORRECCIÓN) ---
        reply: (text) => bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }),
        sendImage: (imagePath, caption) => bot.sendPhoto(chatId, imagePath, { caption }),
        sendAudio: (audioPath) => bot.sendAudio(chatId, audioPath),
        sendVoice: (audioPath) => bot.sendVoice(chatId, audioPath), // <--- ¡ESTA ES LA LÍNEA QUE FALTABA!
        sendSticker: (stickerPath) => bot.sendSticker(chatId, stickerPath),
        sendAnimation: (gifPath, caption) => bot.sendAnimation(chatId, gifPath, { caption }),
        showLoading: (action = 'typing') => bot.sendChatAction(chatId, action),
    };
}

module.exports = {
    adaptTelegramMessage
};