"use strict";

// --- Importaciones de Servicios y Otros Handlers ---
const economyService = require('../services/economy.service');
const { handlePing } = require('./system.handler');
const utilityService = require('../services/utility.service'); // Asumiendo que feriados está aquí
const { handleClima, handleSismos } = require('./utility.handler');
const { 
    handleSticker, 
    handleSound, 
    getSoundCommands, 
    handleAudioList, 
    handleJoke, 
    handleRuleta, 
    handlePuntos,
    handleCountdown,
    handleBotMention,
    handleOnce
} = require('./fun.handler');

const soundCommands = getSoundCommands();

/**
 * --- ¡REFACTORIZADO! ---
 * Este es el manejador de comandos principal y agnóstico a la plataforma.
 * Su única responsabilidad es recibir un mensaje adaptado y dirigirlo a la función correcta.
 * @param {object} message - El objeto de mensaje estandarizado desde el adaptador.
 */
async function commandHandler(message) {
    // Medida de seguridad: si el adaptador devolvió null, no hacemos nada.
    if (!message) {
        return;
    }

    const text = message.text || '';
    if (!text.startsWith('/') && !text.startsWith('!')) {
        // Manejar menciones especiales que no son comandos
        if (/\b(bot|boot|bott|bbot)\b/.test(text.toLowerCase())) {
            return handleBotMention(message);
        }
        if (/\b(once|onse|11)\b/.test(text.toLowerCase())) {
            return handleOnce(message);
        }
        return;
    }

    const command = text.substring(1).split(' ')[0].toLowerCase();
    console.log(`(Handler) -> Comando recibido en ${message.platform}: "${command}"`);

    try {
        // Manejo de comandos de sonido
        if (soundCommands.includes(command)) {
            return handleSound(message, command);
        }

        switch (command) {
            // --- Handlers de Utilidad ---
            case 'ping':
                const pingResponse = await handlePing(message);
                return message.reply(pingResponse);
            case 'feriados':
                await message.showLoading();
                const feriados = await utilityService.getFeriados();
                return message.reply(feriados);
            case 'clima':
                const clima = await handleClima(message);
                return message.reply(clima);
            case 'sismos':
                await message.showLoading();
                const sismos = await handleSismos();
                return message.reply(sismos);
            
            // --- Handlers de Economía ---
            case 'valores':
                await message.showLoading();
                const indicators = await economyService.getEconomicIndicators();
                return message.reply(indicators);

            // --- Handlers de Diversión ---
            case 's':
            case 'sticker':
                return handleSticker(message);
            case 'audios':
            case 'sonidos':
                return message.reply(handleAudioList());
            case 'chiste':
                return handleJoke(message);
            case 'ruleta':
                return handleRuleta(message);
            case 'puntos':
            case 'score':
                return handlePuntos(message);
            case '18':
            case 'navidad':
            case 'añonuevo':
                const countdownMsg = handleCountdown(command);
                return message.reply(countdownMsg);

            default:
                // Opcional: Responder si el comando no se reconoce
                // return message.reply("No reconozco ese comando. Usa `/menu` para ver las opciones.");
                break;
        }
    } catch (err) {
        console.error(`[command.handler] Error procesando '${command}':`, err);
        await message.reply("Ocurrió un error inesperado al procesar tu comando. 😔");
    }
}

module.exports = commandHandler;