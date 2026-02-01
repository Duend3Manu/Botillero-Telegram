// src/services/messaging.service.js
"use strict";

/**
 * Mapeo de tipos de comandos a sus emojis contextuales
 */
const REACTION_MAP = {
    // Deportes
    'sports': { loading: '⚽', success: '🏆', error: '😢' },
    
    // Clima y servicios públicos
    'weather': { loading: '🌤️', success: '☀️', error: '⛈️' },
    'metro': { loading: '🚇', success: '✅', error: '❌' },
    'economy': { loading: '💰', success: '📈', error: '📉' },
    'transbank': { loading: '💳', success: '✅', error: '❌' },
    
    // Búsquedas
    'search': { loading: '🔍', success: '✅', error: '❌' },
    'wiki': { loading: '📚', success: '📖', error: '❌' },
    'news': { loading: '📰', success: '✅', error: '❌' },
    
    // Diversión
    'fun': { loading: '🎉', success: '😂', error: '😅' },
    'joke': { loading: '🤔', success: '😂', error: '😐' },
    'random': { loading: '🎲', success: '✨', error: '❌' },
    'ruleta': { loading: '🎰', success: '🎊', error: '😢' },
    'horoscope': { loading: '🔮', success: '✨', error: '❌' },
    
    // Sistema y red
    'system': { loading: '⏳', success: '✅', error: '❌' },
    'network': { loading: '🌐', success: '✅', error: '❌' },
    'phone': { loading: '📱', success: '✅', error: '❌' },
    
    // Utilidades
    'bus': { loading: '🚌', success: '✅', error: '❌' },
    'pharmacy': { loading: '💊', success: '✅', error: '❌' },
    'earthquake': { loading: '🌍', success: '✅', error: '❌' },
    'bank': { loading: '🏦', success: '✅', error: '❌' },
    
    // Default (comportamiento actual)
    'default': { loading: '⏳', success: '✅', error: '❌' }
};

/**
 * Intenta reaccionar a un mensaje, ignorando errores si falla.
 * @param {import('whatsapp-web.js').Message} message El objeto del mensaje.
 * @param {string} reaction El emoji para reaccionar.
 */
async function tryReact(message, reaction) {
    try {
        await message.react(reaction);
    } catch (error) {
        // Ignora el error de reacción, pero lo registra como advertencia.
        console.warn(`(MessagingService) -> No se pudo reaccionar con ${reaction}: ${error.message}`);
    }
}

/**
 * Obtiene las reacciones apropiadas para un tipo de comando.
 * @param {string} commandType El tipo de comando (ej: 'sports', 'weather', etc.)
 * @returns {Object} Objeto con loading, success y error emojis
 */
function getReactionsForType(commandType) {
    return REACTION_MAP[commandType] || REACTION_MAP['default'];
}

/**
 * Maneja el ciclo de vida de las reacciones para un comando (versión básica sin contexto).
 * @param {import('whatsapp-web.js').Message} message El objeto del mensaje.
 * @param {Promise<any>} commandPromise La promesa que representa la ejecución del comando.
 */
async function handleReaction(message, commandPromise) {
    // UX: Solo mostramos el reloj si la operación tarda más de 500ms
    // Esto evita el "parpadeo" de reacciones en comandos instantáneos (como !menu)
    const loadingTimeout = setTimeout(() => tryReact(message, '⏳'), 500);

    try {
        await commandPromise;
        clearTimeout(loadingTimeout); // Cancelamos el reloj si terminó rápido
        await tryReact(message, '✅');
    } catch (error) {
        clearTimeout(loadingTimeout);
        await tryReact(message, '❌');
        // El error se relanza para que el manejador principal lo capture y envíe el mensaje de error.
        throw error;
    }
}

/**
 * Maneja el ciclo de vida de las reacciones para un comando con contexto.
 * @param {import('whatsapp-web.js').Message} message El objeto del mensaje.
 * @param {Promise<any>} commandPromise La promesa que representa la ejecución del comando.
 * @param {string} commandType El tipo de comando para seleccionar emojis contextuales.
 */
async function handleReactionWithContext(message, commandPromise, commandType = 'default') {
    const reactions = getReactionsForType(commandType);
    
    // UX: Solo mostramos la reacción de carga si la operación tarda más de 500ms
    // Esto evita el "parpadeo" de reacciones en comandos instantáneos
    const loadingTimeout = setTimeout(() => tryReact(message, reactions.loading), 500);

    try {
        await commandPromise;
        clearTimeout(loadingTimeout); // Cancelamos la reacción de carga si terminó rápido
        await tryReact(message, reactions.success);
    } catch (error) {
        clearTimeout(loadingTimeout);
        await tryReact(message, reactions.error);
        // El error se relanza para que el manejador principal lo capture y envíe el mensaje de error.
        throw error;
    }
}

module.exports = { 
    handleReaction, 
    handleReactionWithContext,
    tryReact,
    getReactionsForType
};