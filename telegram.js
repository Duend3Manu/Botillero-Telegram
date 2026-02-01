// telegram.js - Bot de Telegram (Principal)
"use strict";

require('dotenv').config();

// --- Manejo de Errores Globales ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection en:', promise, 'razón:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

const TelegramBot = require('node-telegram-bot-api');
const commandHandler = require('./src/handlers/command.handler');
const { incrementStats } = require('./src/handlers/system.handler');
const messageBuffer = require('./src/services/message-buffer.service');
const botConfig = require('./config/bot.config');

console.log("🚀 Iniciando Botillero v2.0 para Telegram...");

// Verificar que el token esté configurado
if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ ERROR: TELEGRAM_BOT_TOKEN no está configurado en el archivo .env');
    process.exit(1);
}

// --- CONFIGURACIÓN DEL BOT ---
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
});

console.log('✅ ¡Bot de Telegram conectado y listo!');

// --- RATE LIMITING GLOBAL ---
const messageTimestamps = new Map();
const GLOBAL_COOLDOWN_MS = botConfig.rateLimiting?.globalCooldownMs || 0;

// Limpiar cache de timestamps cada 5 minutos
setInterval(() => {
    const now = Date.now();
    for (const [userId, data] of messageTimestamps.entries()) {
        if (now - data.timestamp > 300000) { // 5 minutos
            messageTimestamps.delete(userId);
        }
    }
}, botConfig.rateLimiting?.cleanupIntervalMs || 300000);

// --- MANEJADOR DE MENSAJES ---
bot.on('message', async (msg) => {
    const startTime = Date.now();
    
    try {
        // Solo procesar mensajes de texto
        if (!msg.text) return;
        
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        
        // Crear objeto de mensaje compatible con el handler existente
        const adaptedMessage = {
            body: msg.text,
            from: chatId.toString(),
            fromMe: false,
            author: userId.toString(),
            timestamp: msg.date,
            _raw: msg,
            
            // Método para responder
            reply: async (text) => {
                return await bot.sendMessage(chatId, text, {
                    parse_mode: 'Markdown',
                    reply_to_message_id: msg.message_id
                });
            },
            
            // Método para reaccionar (Telegram tiene soporte limitado)
            react: async (emoji) => {
                try {
                    await bot.setMessageReaction(chatId, msg.message_id, [{ type: 'emoji', emoji: emoji }]);
                } catch (err) {
                    // Las reacciones no siempre funcionan en todos los chats
                    console.log('No se pudo reaccionar:', err.message);
                }
            },
            
            // Obtener info del chat
            getChat: async () => {
                const chat = await bot.getChat(chatId);
                return {
                    isGroup: chat.type === 'group' || chat.type === 'supergroup',
                    name: chat.title || chat.first_name || 'Chat'
                };
            },
            
            // Obtener contacto
            getContact: async () => {
                return {
                    pushname: msg.from.first_name || msg.from.username || 'Usuario',
                    name: `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim(),
                    number: userId.toString()
                };
            },
            
            hasQuotedMsg: !!msg.reply_to_message,
            
            // Obtener mensaje citado
            getQuotedMessage: async () => {
                if (!msg.reply_to_message) return null;
                
                const quotedMsg = msg.reply_to_message;
                return {
                    hasMedia: !!(quotedMsg.photo || quotedMsg.audio || quotedMsg.document || quotedMsg.sticker),
                    type: quotedMsg.sticker ? 'sticker' : 
                          quotedMsg.photo ? 'image' :
                          quotedMsg.audio ? 'audio' : 'text',
                    downloadMedia: async () => {
                        // Esta funcionalidad se implementará en el adaptador si es necesario
                        throw new Error('downloadMedia no implementado aún para Telegram');
                    }
                };
            }
        };
        
        // Incrementar estadísticas
        incrementStats('message', chatId.toString());
        
        // Guardar mensaje en buffer (solo grupos, solo no-comandos)
        if (!msg.text.startsWith('!') && !msg.text.startsWith('/')) {
            try {
                const chat = await bot.getChat(chatId);
                if (chat.type === 'group' || chat.type === 'supergroup') {
                    messageBuffer.addMessage(chatId.toString(), {
                        user: msg.from.first_name || msg.from.username || 'Usuario',
                        userId: userId.toString(),
                        message: msg.text,
                        timestamp: msg.date * 1000 // Convertir a ms
                    });
                }
            } catch (e) {
                // No es crítico si falla el buffer
            }
        }
        
        // Si es un comando, incrementar contador
        if (msg.text.startsWith('!') || msg.text.startsWith('/')) {
            incrementStats('command', chatId.toString());
            
            // Normalizar comandos de Telegram (/ -> !)
            if (msg.text.startsWith('/')) {
                adaptedMessage.body = '!' + msg.text.substring(1);
            }
        }
        
        try {
            // Procesar comando a través del commandHandler existente
            await commandHandler(bot, adaptedMessage);
        } catch (error) {
            console.error(`❌ Error procesando mensaje:`, error.message);
            await bot.sendMessage(chatId, '❌ Hubo un error al procesar tu comando.');
        }
        
        const processingTime = Date.now() - startTime;
        console.log(`⏱️  Comando procesado en ${processingTime}ms`);
        
    } catch (error) {
        console.error('❌ Error en el manejador de mensajes:', error);
    }
});

// --- MANEJADOR DE CALLBACK QUERY (para botones inline) ---
const callbackHandler = require('./src/handlers/callback.handler');

bot.on('callback_query', async (callbackQuery) => {
    try {
        await callbackHandler(bot, callbackQuery);
    } catch (error) {
        console.error('❌ Error en el manejador de callback_query:', error);
    }
});

// --- MANEJO DE ERRORES DEL BOT ---
bot.on('polling_error', (error) => {
    console.error('❌ Error de polling:', error.message);
});

bot.on('error', (error) => {
    console.error('❌ Error del bot:', error.message);
});

// --- CIERRE ELEGANTE ---
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando bot...');
    try {
        await bot.stopPolling();
        console.log('✅ Bot cerrado correctamente.');
    } catch (e) {
        console.error('❌ Error al cerrar bot:', e);
    }
    process.exit(0);
});

// Información útil
setTimeout(() => {
    console.log('\n💡 Recordatorio: Usa prefijo ! para comandos: !menu, !clima, !valores, etc.');
    console.log('💡 También puedes usar / para comandos: /menu, /clima, /valores, etc.');
}, 3000);
