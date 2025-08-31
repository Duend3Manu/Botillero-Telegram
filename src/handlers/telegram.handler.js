"use strict";

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { MessageMedia } = require('whatsapp-web.js');

// --- Importaciones de TODOS los Handlers y Services ---
const { handlePing } = require('./system.handler.js');
const { generateTelegramMenu, handleSismos, handleClima, handleFarmacias, handleBus, handleSec } = require('./utility.handler.js'); 
const { getSoundCommands, soundMap, handleCountdown, handleJoke, handleAudioList, handleRuleta, handlePuntos, handleSticker, handleStickerToMedia } = require('./fun.handler.js');
const economyService = require('../services/economy.service.js');
const utilityService = require('../services/utility.service.js');
const { handleWikiSearch, handleGoogleSearch, handleNews } = require('./search.handler.js');
const bannerService = require('../services/banner.service.js');
const textoService = require('../services/texto.service.js');
const { handleAiHelp } = require('./ai.handler.js');
const nationalTeamService = require('../services/nationalTeam.service.js');
const { getMatchDaySummary, getLeagueTable, getLeagueUpcomingMatches } = require('../services/league.service.js');
const { handlePatenteSearch, handleTneSearch, handlePhoneSearch } = require('./personalsearch.handler.js');
const { handleTicket, handleCaso } = require('./stateful.handler.js');
const metroService = require('../services/metro.service.js');
const externalService = require('../services/external.service.js');
const networkService = require('../services/network.service.js');
const horoscopeService = require('../services/horoscope.service.js');

const soundCommands = getSoundCommands();
const countdownCommands = ['18', 'navidad', 'añonuevo'];
// --- ¡NUEVO! Set para controlar el cooldown de los botones ---
const commandCooldown = new Set();

function getArgs(text) {
    return text.split(' ').slice(1).join(' ');
}

function formatToTelegramHTML(text) {
    if (!text) return '';
    return text.replace(/\*([^*]+)\*/g, '<b>$1</b>').replace(/_([^_]+)_/g, '<i>$1</i>').replace(/~([^~]+)~/g, '<s>$1</s>');
}

async function executeCommand(bot, command, args, msg) {
    const chatId = msg.chat.id;
    let replyMessage;
    const mockClient = { sendMessage: (chatId, text) => bot.sendMessage(chatId, formatToTelegramHTML(text), { parse_mode: 'HTML' }) };

    switch (command) {
        case 'ping': replyMessage = await handlePing({ timestamp: msg.date }, { getChats: async () => ([]) }); break;
        case 'id': replyMessage = `ℹ️ El ID de este chat es:\n\`${chatId}\``; break;
        case 'chiste': const folderPath = path.join(__dirname, '..', '..', 'chistes'); if (fs.existsSync(folderPath)) { const files = fs.readdirSync(folderPath); if (files.length > 0) { const randomIndex = Math.floor(Math.random() * files.length); const audioPath = path.join(folderPath, files[randomIndex]); await bot.sendVoice(chatId, audioPath); } else { await bot.sendMessage(chatId, "No hay chistes para contar."); }} else { await bot.sendMessage(chatId, "La carpeta de chistes no está configurada."); } return;
        case 'audios': case 'sonidos': replyMessage = handleAudioList(); break;
        case 'feriados': replyMessage = await utilityService.getFeriados(); break;
        case 'valores': replyMessage = await economyService.getEconomicIndicators(); break;
        case 'sismos': replyMessage = await handleSismos(); break;
        case 'clima': if (!args) { await bot.sendMessage(chatId, "Debes indicar una ciudad. Ej: `/clima Valparaíso`"); return; } replyMessage = await handleClima({ body: `!clima ${args}` }); break;
        case 'wiki': if (!args) { await bot.sendMessage(chatId, "Debes indicar qué quieres buscar. Ej: `/wiki Chile`"); return; } replyMessage = await handleWikiSearch({ body: `!wiki ${args}` }); break;
        case 'noticias': replyMessage = await handleNews(); break;
        case 'g': if (!args) { await bot.sendMessage(chatId, "Debes indicar qué quieres buscar. Ej: `/g gatitos`"); return; } replyMessage = await handleGoogleSearch({ body: `!g ${args}` }); break;
        case 'metro': replyMessage = await metroService.getMetroStatus(); break;
        case 'bencina': if (!args) { await bot.sendMessage(chatId, "Debes indicar una comuna. Ej: `/bencina santiago`"); return; } replyMessage = await externalService.getBencinaData(args); break;
        case 'trstatus': replyMessage = await externalService.getTraductorStatus(); break;
        case 'bolsa': replyMessage = await externalService.getBolsaData(); break;
        case 'far': if (!args) { await bot.sendMessage(chatId, "Debes indicar una comuna. Ej: `/far providencia`"); return; } replyMessage = await handleFarmacias({ body: `!far ${args}` }); break;
        case 'sec': case 'secrm': replyMessage = await handleSec({ body: `!${command}` }); break;
        case 'bus': if (!args) { await bot.sendMessage(chatId, "Debes indicar un paradero. Ej: `/bus PA433`"); return; } await handleBus({ body: `!bus ${args}`, from: chatId, react: async() => {} }, mockClient); return;
        case 'horoscopo': if (!args) { await bot.sendMessage(chatId, "Por favor, escribe un signo. Ej: `/horoscopo aries`"); return; } const horoscopeResult = await horoscopeService.getHoroscope(args); await bot.sendMessage(chatId, formatToTelegramHTML(horoscopeResult.text), { parse_mode: 'HTML' }); if (horoscopeResult.imagePath && fs.existsSync(horoscopeResult.imagePath)) { await bot.sendPhoto(chatId, horoscopeResult.imagePath); } return;
        case 'ruleta': const mockClientRuleta = { sendMessage: async (chatId, media, options) => { const gifBuffer = Buffer.from(media.data, 'base64'); await bot.sendAnimation(chatId, gifBuffer, { caption: options.caption }); }}; const mockMessageRuleta = { from: chatId, author: chatId, getContact: async () => ({ pushname: msg.from.first_name, name: msg.from.username }), reply: (text) => bot.sendMessage(chatId, formatToTelegramHTML(text), { parse_mode: 'HTML' }) }; await handleRuleta(mockClientRuleta, mockMessageRuleta); return;
        case 'puntos': case 'score': const mockMessagePuntos = { from: chatId, author: chatId, getContact: async () => ({ pushname: msg.from.first_name, name: msg.from.username }), reply: (text) => bot.sendMessage(chatId, formatToTelegramHTML(text), { parse_mode: 'HTML' }) }; await handlePuntos(null, mockMessagePuntos); return;
        case 'banner': const bannerArgs = args.split(' '); if (bannerArgs.length < 2) { await bot.sendMessage(chatId, "Formato incorrecto. Usa: `/banner <estilo> <texto>`"); return; } const style = bannerArgs[0]; const text = bannerArgs.slice(1).join(' '); await bot.sendMessage(chatId, `Creando tu banner estilo <b>${style}</b>... ✨`, { parse_mode: 'HTML' }); const bannerPath = await bannerService.createBanner(style, text); await bot.sendPhoto(chatId, bannerPath); fs.unlinkSync(bannerPath); return;
        case 'ayuda': if (!args) { await bot.sendMessage(chatId, "Debes hacer una pregunta. Ej: `/ayuda Quién descubrió Chile?`"); return; } replyMessage = await handleAiHelp({ body: `!ayuda ${args}` }); break;
        case 'tabla': replyMessage = await getLeagueTable(); break;
        case 'prox': replyMessage = await getLeagueUpcomingMatches(); break;
        case 'partidos': replyMessage = await getMatchDaySummary(); break;
        case 'tclasi': replyMessage = await nationalTeamService.getQualifiersTable(); break;
        case 'clasi': replyMessage = await nationalTeamService.getQualifiersMatches(); break;
        case 'pat': case 'patente': if (!args) { await bot.sendMessage(chatId, "Debes indicar una patente. Ej: `/patente ABCD12`"); return; } await handlePatenteSearch({ body: `!patente ${args}`, from: chatId }, mockClient); return;
        case 'num': case 'tel': if (!args) { await bot.sendMessage(chatId, "Debes indicar un número de teléfono. Ej: `/tel 912345678`"); return; } await handlePhoneSearch(mockClient, { body: `!tel ${args}`, from: chatId }); return;
        case 'ticket': case 'ticketr': case 'tickete': replyMessage = handleTicket({ body: `!${command} ${args}` }); break;
        case 'caso': case 'ecaso': case 'icaso': replyMessage = await handleCaso({ body: `!${command} ${args}` }); break;
        case 'net': case 'whois': if (!args) { await bot.sendMessage(chatId, "Debes indicar un dominio o IP. Ej: `/net google.com`"); return; } await bot.sendMessage(chatId, "Analizando dominio, un momento..."); const fullResult = await networkService.analyzeDomain(args); const [messageText, filePath] = fullResult.split('|||FILE_PATH|||'); await bot.sendMessage(chatId, formatToTelegramHTML(messageText.trim()), { parse_mode: 'HTML' }); if (filePath && filePath.trim()) { const cleanFilePath = filePath.trim(); await bot.sendDocument(chatId, cleanFilePath); fs.unlinkSync(cleanFilePath);} return;
        default: if (msg.text) { await bot.sendMessage(chatId, "Comando no reconocido, compa."); } return;
    }
    if (replyMessage) {
        const formattedMessage = formatToTelegramHTML(replyMessage);
        await bot.sendMessage(chatId, formattedMessage, { parse_mode: 'HTML', disable_web_page_preview: true });
    }
}

async function telegramCommandHandler(bot, msg) {
    try {
        const text = msg.text || msg.caption || '';
        if (!text) return;
        if (text.startsWith('!') || text.startsWith('/')) {
            const cleanText = text.replace(/@botillero_bot/i, '').trim();
            const command = cleanText.substring(1).split(' ')[0].toLowerCase();
            const args = getArgs(cleanText);

            if (command === 's' && (msg.photo || (msg.reply_to_message && msg.reply_to_message.photo))) {
                // ... (lógica de stickers) ...
                return;
            }

            if (command === 'toimg' && msg.reply_to_message && msg.reply_to_message.sticker) {
                // ... (lógica de toimg) ...
                return;
            }

            if (command === 'texto' && (msg.photo || (msg.reply_to_message && msg.reply_to_message.photo))) {
                // ... (lógica de texto) ...
                return;
            }

            if (soundCommands.includes(command)) { 
                const soundInfo = soundMap[command]; 
                if (soundInfo) { 
                    const audioPath = path.join(__dirname, '..', '..', 'mp3', soundInfo.file); 
                    if (fs.existsSync(audioPath)) { 
                        await bot.sendVoice(msg.chat.id, audioPath);
                        if (soundInfo.reaction) {
                            await bot.sendMessage(msg.chat.id, soundInfo.reaction, { reply_to_message_id: msg.message_id });
                        }
                    } else { 
                        console.error(`(Telegram) Audio file not found: ${audioPath}`); 
                        await bot.sendMessage(msg.chat.id, "No encontré el archivo de audio para ese comando."); 
                    }
                } 
                return; 
            }
            if (countdownCommands.includes(command)) { const replyMessage = handleCountdown(command); await bot.sendMessage(msg.chat.id, formatToTelegramHTML(replyMessage), { parse_mode: 'HTML' }); return; }

            if (command === 'menu' || command === 'start' || command === 'comandos') {
                const menuData = generateTelegramMenu('main');
                await bot.sendMessage(msg.chat.id, menuData.text, menuData.options);
            } else {
                await executeCommand(bot, command, args, msg);
            }
        }
    } catch (error) {
        console.error(`[Error en Telegram Handler] -> `, error);
        await bot.sendMessage(msg.chat.id, "Ucha, algo se rompió al procesar tu comando.");
    }
}

async function handleCallbackQuery(bot, callbackQuery) {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    
    try {
        if (action.startsWith('menu_category_')) {
            bot.answerCallbackQuery(callbackQuery.id);
            const categoryKey = action.replace('menu_category_', '');
            const menuData = generateTelegramMenu(categoryKey);
            await bot.editMessageText(menuData.text, { chat_id: msg.chat.id, message_id: msg.message_id, ...menuData.options });
        } else if (action.startsWith('cmd_')) {
            // --- LÓGICA ANTI-SPAM ---
            if (commandCooldown.has(chatId)) {
                return bot.answerCallbackQuery(callbackQuery.id, { text: 'Espera a que termine el comando anterior.' });
            }
            
            commandCooldown.add(chatId);
            bot.answerCallbackQuery(callbackQuery.id, { text: 'Espera un poco, procesando tu solicitud...' });
            
            const command = action.replace('cmd_', '');
            
            try {
                await executeCommand(bot, command, '', msg);
            } finally {
                // Quita el cerrojo cuando el comando termina (incluso si falla)
                commandCooldown.delete(chatId);
            }

        } else if (action.startsWith('info_')) {
            const commandName = action.replace('info_', '');
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: `Este comando necesita más información. Escríbelo seguido de lo que necesites. Ej: "${commandName} Santiago"`,
                show_alert: true
            });
        }
    } catch (error) {
        console.error(`[Error en Callback Query Handler] -> Acción "${action}":`, error);
        await bot.sendMessage(msg.chat.id, "Hubo un error al procesar el botón.");
        // Asegúrate de quitar el cerrojo también si hay un error
        commandCooldown.delete(chatId);
    }
}

module.exports = {
    telegramCommandHandler,
    handleCallbackQuery
};
