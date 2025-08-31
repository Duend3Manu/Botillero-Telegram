"use strict";

const axios = require('axios');
const { getSismos } = require('../services/external.service');
const utilityService = require('../services/utility.service');

// --- Funciones de Menú y Ayuda ---
function handleMenu() {
    return `*🤖 Botillero - Menú de Comandos 🤖*\n\n` +
           `*Utilidad ✨*\n` +
           `\`/clima <ciudad>\` - Muestra el pronóstico del tiempo.\n` +
           `\`/sismos\` - Muestra los últimos sismos en Chile.\n` +
           `\`/feriados\` - Muestra los próximos feriados.\n` +
           `\`/valores\` - Indicadores económicos.\n\n` +
           `*Diversión 🎉*\n` +
           `\`/ruleta\` - Gira la ruleta y gana puntos (diario).\n` +
           `\`/puntos\` - Muestra tus puntos acumulados.\n` +
           `\`/audios\` - Lista de comandos de audio.\n\n` +
           `*Stickers 🖼️*\n` +
           `\`/s\` - Responde a una imagen/video para crear un sticker.\n`;
}

// --- Comandos de Utilidad (Adaptados) ---

/**
 * --- ¡CORREGIDO Y ADAPTADO! ---
 * Maneja el comando del clima.
 * @param {object} message - El objeto de mensaje adaptado.
 * @returns {Promise<string>} El pronóstico del clima.
 */
async function handleClima(message) {
    // Usamos `message.args` que nos da nuestro adaptador.
    const city = message.args.join(' ');

    if (!city) {
        return "Por favor, especifica una ciudad. Ejemplo: `/clima Santiago`";
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        console.error("Error: La API key de OpenWeatherMap no está configurada en .env");
        return "❌ El servicio de clima no está disponible en este momento.";
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=es`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        
        const weather = {
            city: data.name,
            country: data.sys.country,
            temp: data.main.temp.toFixed(1),
            feels_like: data.main.feels_like.toFixed(1),
            description: data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1),
            humidity: data.main.humidity,
            wind_speed: (data.wind.speed * 3.6).toFixed(1), // Convertir m/s a km/h
            icon: data.weather[0].icon
        };

        const icons = { '01d': '☀️', '01n': '🌙', '02d': '⛅️', '02n': '☁️', '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️', '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️', '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️', '50d': '🌫️', '50n': '🌫️' };
        const weatherIcon = icons[weather.icon] || '🌡️';

        let result = `*Clima en ${weather.city}, ${weather.country}* ${weatherIcon}\n\n`;
        result += `*Descripción:* ${weather.description}\n`;
        result += `*Temperatura:* ${weather.temp}°C\n`;
        result += `*Sensación Térmica:* ${weather.feels_like}°C\n`;
        result += `*Humedad:* ${weather.humidity}%\n`;
        result += `*Viento:* ${weather.wind_speed} km/h`;

        return result;

    } catch (error) {
        if (error.response && error.response.status === 404) {
            return `No pude encontrar la ciudad "${city}". ¿Está bien escrita?`;
        }
        console.error("Error al obtener el clima:", error);
        return "❌ Hubo un problema al consultar el servicio de clima.";
    }
}

async function handleSismos() {
    return getSismos();
}

async function handleFeriados(message) {
    // Esta función probablemente llama a un servicio que no necesita argumentos.
    // Si necesitara argumentos, se usaría `message.args`.
    return utilityService.getFeriados();
}


// Las otras funciones de tu archivo original (handleFarmacias, handleBus, handleSec) 
// también necesitarían ser adaptadas aquí si las vas a usar.
// Por ahora, solo exportamos las que hemos corregido.

module.exports = {
    handleMenu,
    handleClima,
    handleSismos,
    handleFeriados
};