"use strict";

// --- Importaciones de Servicios ---
const metroService = require('../services/metro.service');
const economyService = require('../services/economy.service');
const { handlePing } = require('./system.handler');
const { handleFeriados, handleClima, handleSismos, handleMenu } = require('./utility.handler');
const { handleSound, getSoundCommands, handleAudioList, handleRuleta, handlePuntos } = require('./fun.handler');

const soundCommands = getSoundCommands();

async function commandHandler(message) {
    // Ignoramos mensajes que no son comandos
    if (!message.text.startsWith('/') && !message.text.startsWith('!')) {
        return;
    }

    const command = message.text.substring(1).split(' ')[0].toLowerCase();
    console.log(`(Handler) -> Comando recibido en ${message.platform}: "${command}"`);

    try {
        // --- Comandos de sonido ---
        if (soundCommands.includes(command)) {
            // Nota: handleSound necesitará ser adaptado para usar message.sendAudio
            return handleSound(null, message, command); 
        }

        switch (command) {
            // --- Comandos que muestran "escribiendo..." ---
            case 'metro':
                await message.showLoading();
                const metroStatus = await metroService.getMetroStatus();
                return message.reply(metroStatus);

            case 'valores':
                await message.showLoading();
                const indicators = await economyService.getEconomicIndicators();
                return message.reply(indicators);
            
            case 'sismos':
                await message.showLoading();
                const sismos = await handleSismos();
                return message.reply(sismos);

            // --- Otros comandos ---
            case 'ping':
                const pingResponse = await handlePing(message);
                return message.reply(pingResponse);

            case 'feriados':
                const feriados = await utilityService.getFeriados();
                return message.reply(feriados);

            case 'clima':
                const clima = await handleClima(message);
                return message.reply(clima);

            case 'menu':
                const menu = handleMenu(); // Asumiendo que handleMenu devuelve texto
                return message.reply(menu);
            
            case 'audios':
            case 'sonidos':
                const audioList = handleAudioList();
                return message.reply(audioList);
            
            case 'ruleta':
                return handleRuleta(null, message); // Adaptar handleRuleta

            case 'puntos':
            case 'score':
                return handlePuntos(null, message); // Adaptar handlePuntos

            default:
                // Si el comando no se reconoce, podrías enviar un mensaje de ayuda.
                // return message.reply("No reconozco ese comando. ¡Usa /menu para ver las opciones!");
                break;
        }
    } catch (err) {
        console.error(`[command.handler] Error procesando '${command}':`, err);
        message.reply("Ocurrió un error inesperado al procesar tu comando. 😔");
    }
}

module.exports = commandHandler;