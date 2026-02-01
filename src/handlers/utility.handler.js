// src/handlers/utility.handler.js
"use strict";

const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment-timezone');
const config = require('../config');
const { generateMessage } = require('../utils/secService');
const { getRandomInfo } = require('../services/utility.service');
// const { getFeriadosResponse } = require('../services/ai.service'); // IA DESHABILITADA
const { getBanksStatus } = require('../services/bank.service');

// Variables para caché de farmacias (evita descargar la lista gigante en cada consulta)
let farmaciasCache = null;
let lastFarmaciasUpdate = 0;
const FARMACIAS_CACHE_TTL = 60 * 60 * 1000; // 1 hora de caché

async function handleFeriados(message) {
    try {
        const userQuery = message ? message.body.replace(/^([!/])feriados\s*/i, '').trim() : '';
        if (message) await message.react('🇨🇱');

        // Volvemos a scrapear feriados.cl ya que la API del gobierno está inestable
        const { data } = await axios.get('https://www.feriados.cl', {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
            }
        });

        const $ = cheerio.load(data);
        const feriadosData = [];

        // Extraemos la tabla de feriados.cl
        // Estructura usual: Fecha | Nombre | Tipo/Irrenunciable
        $('table tbody tr').each((i, el) => {
            const cols = $(el).find('td');
            if (cols.length > 1) {
                const fechaRaw = $(cols[0]).text().trim(); // Ej: "18 de Septiembre (Miércoles)"
                const nombre = $(cols[1]).text().trim();
                const tipo = $(cols[2]).text().trim();
                
                if (fechaRaw && nombre) {
                    feriadosData.push({
                        fecha: fechaRaw,
                        nombre: nombre,
                        irrenunciable: tipo.toLowerCase().includes('irrenunciable') ? "1" : "0"
                    });
                }
            }
        });

        // IA DESHABILITADA - Devolver lista simple de feriados
        if (feriadosData.length === 0) {
            return '❌ No se pudieron obtener los feriados en este momento.';
        }
        
        let reply = '🇨🇱 *Próximos Feriados en Chile:*\n\n';
        feriadosData.slice(0, 10).forEach((feriado, idx) => {
            const tipo = feriado.irrenunciable === "1" ? "Irrenunciable" : "Renunciable";
            reply += `${idx + 1}. *${feriado.fecha}*: ${feriado.nombre} _(${tipo})_\n`;
        });
        
        return reply.trim();

    } catch (error) {
        console.error('Error al obtener los feriados:', error.message);
        return 'Ocurrió un error al leer feriados.cl. Intenta más tarde.';
    }
}

async function handleFarmacias(message) {
    const city = message.body.replace(/^([!/])far\s*/i, '').trim().toLowerCase();
    if (!city) {
        return 'Debes especificar una comuna. Por ejemplo: `!far santiago`';
    }

    try {
        await message.react('⏳');
        
        let farmacias;
        // Verificar si tenemos datos en caché recientes
        if (farmaciasCache && (Date.now() - lastFarmaciasUpdate < FARMACIAS_CACHE_TTL)) {
            farmacias = farmaciasCache;
        } else {
            console.log(`(Farmacias) -> Descargando lista actualizada del Minsal...`);
            const response = await axios.get('https://midas.minsal.cl/farmacia_v2/WS/getLocalesTurnos.php');
            farmacias = response.data;
            farmaciasCache = farmacias; // Guardamos en caché
            lastFarmaciasUpdate = Date.now();
        }
       
        // Filtrar por comuna
        const filteredFarmacias = farmacias.filter(f => 
            f.comuna_nombre && f.comuna_nombre.toLowerCase().includes(city)
        );
        
        console.log(`(Farmacias) -> Farmacias filtradas: ${filteredFarmacias.length}`);

        if (filteredFarmacias.length > 0) {
            // Encontró farmacias en la API
            let replyMessage = `🏥 *Farmacias de turno en ${filteredFarmacias[0].comuna_nombre}*\n\n`;
            filteredFarmacias.slice(0, 5).forEach(f => {
                replyMessage += `*${f.local_nombre}*\n`;
                replyMessage += `📍 ${f.local_direccion}\n`;
                replyMessage += `🕐 ${f.funcionamiento_hora_apertura} - ${f.funcionamiento_hora_cierre}\n`;
                if (f.local_telefono) replyMessage += `📞 ${f.local_telefono}\n`;
                replyMessage += `\n`;
            });
            await message.react('✅');
            return replyMessage.trim();
        }
        
        // No encontró en API, ofrecer alternativas
        const comunasDisponibles = [...new Set(farmacias.map(f => f.comuna_nombre))];
        const algunasComunas = comunasDisponibles.slice(0, 8).join(', ');
        
        await message.react('❌');
        return `❌ No encontré farmacias de turno para "${city}" en la base de datos actual.\n\n💡 **Comunas disponibles en la API:**\n${algunasComunas}\n\n🌐 **Para otras comunas de Chile:**\nConsulta el sitio oficial del Minsal:\nhttps://seremienlinea.minsal.cl/asdigital/index.php?mfarmacias`;
        
    } catch (error) {
        console.error('(Farmacias) -> Error:', error.message);
        await message.react('❌');
        return '❌ No pude obtener información de farmacias en este momento.\n\n🌐 Puedes consultar directamente en:\nhttps://seremienlinea.minsal.cl/asdigital/index.php?mfarmacias';
    }
}

async function handleClima(message) {
    const city = message.body.replace(/^([!/])clima\s*/i, '').trim();
    if (!city) {
        return "Debes indicar una ciudad. Ejemplo: `!clima santiago`";
    }

    try {
        await message.react('⏳');
        const response = await axios.get('http://api.weatherapi.com/v1/forecast.json', {
            params: {
                key: config.weatherApiKey,
                q: city,
                days: 1,
                aqi: 'no',
                alerts: 'no',
                lang: 'es'
            }
        });

        const data = response.data;
        const current = data.current;
        const forecast = data.forecast.forecastday[0].day;
        const location = data.location;

        const reply = `
🌤️ *Clima en ${location.name}, ${location.region}*

- *Ahora:* ${current.temp_c}°C, ${current.condition.text}
- *Sensación Térmica:* ${current.feelslike_c}°C
- *Viento:* ${current.wind_kph} km/h
- *Humedad:* ${current.humidity}%

- *Máx/Mín hoy:* ${forecast.maxtemp_c}°C / ${forecast.mintemp_c}°C
- *Posibilidad de lluvia:* ${forecast.daily_chance_of_rain}%
        `.trim();
        await message.react('🌤️');
        return reply;
    } catch (error) {
        console.error("Error al obtener el clima de WeatherAPI:", error.response?.data?.error?.message || error.message);
        await message.react('❌');
        return `No pude encontrar el clima para "${city}".`;
    }
}

async function handleSismos() {
    try {
        // Nota: handleSismos se llama desde command.handler y retorna string, no recibe message para reaccionar aquí.
        const response = await axios.get('https://api.gael.cloud/general/public/sismos');
        let reply = '🌋 *Últimos 5 sismos en Chile:*\n\n';
        
        response.data.slice(0, 5).forEach(sismo => {
            const fecha = moment(sismo.Fecha).tz('America/Santiago').format('DD/MM/YYYY HH:mm');
            reply += `*Fecha:* ${fecha}\n`;
            reply += `*Lugar:* ${sismo.RefGeografica}\n`;
            reply += `*Magnitud:* ${sismo.Magnitud} ${sismo.Escala}\n`;
            reply += `*Profundidad:* ${sismo.Profundidad} km\n\n`;
        });
        return reply;
    } catch (error) {
        console.error("Error al obtener sismos:", error);
        return "No pude obtener la información de los sismos.";
    }
}

async function handleBus(message, client) {
    const paradero = message.body.replace(/^([!/])bus\s*/i, '').trim().toUpperCase();
    if (!paradero) {
        return client.sendMessage(message.from, "Debes indicar el código del paradero. Ejemplo: `!bus PA433`");
    }

    try {
        await message.react('⏳');
        
        // MEJORA: Usamos API pública (JSON) en lugar de Puppeteer.
        // Es mucho más rápido, estable y no consume RAM del servidor.
        const { data } = await axios.get(`https://api.xor.cl/red/bus-stop/${paradero}`);
        
        let reply = `🚏 *Paradero ${data.id}*\n_${data.status_description}_\n\n`;

        if (!data.services || data.services.length === 0) {
            await message.react('❌');
            return client.sendMessage(message.from, `No hay próximos servicios para el paradero *${paradero}*.`);
        }

        data.services.forEach(s => {
            const buses = s.buses || [];
            if (buses.length > 0) {
                reply += `🚌 *${s.id}*: ${s.status_description}\n`;
                buses.forEach(bus => {
                    const dist = bus.meters_distance;
                    const min = bus.min_arrival_time;
                    const max = bus.max_arrival_time;
                    reply += `   • ${min}-${max} min (${dist}m) - ${bus.id}\n`;
                });
                reply += '\n';
            } else {
                reply += `🚌 *${s.id}*: ${s.status_description}\n`;
            }
        });
        
        await message.react('🚌');
        return client.sendMessage(message.from, reply.trim());

    } catch (error) {
        console.error("Error en !bus:", error.message);
        await message.react('❌');
        return client.sendMessage(message.from, `No se pudo obtener la información para el paradero *${paradero}*.`);
    }
}

// --- Lógica para !sec (CORREGIDA Y SIMPLIFICADA) ---
async function handleSec(message) {
    // Detectar si el comando contiene 'rm' (ej: !secrm, /secrm)
    const isRm = /\bsecrm\b/i.test(message.body);
    const region = isRm ? 'Metropolitana' : null;
    return generateMessage(region);
}

async function handleRandom() {
    try {
        return await getRandomInfo();
    } catch (error) {
        console.error('Error al obtener dato random:', error);
        return '🎲 Hubo un error al lanzar los dados de la información.';
    }
}

async function handleBancos(message) {
    await message.react('⏳');
    return await getBanksStatus();
}

// --- Lógica para !recap (DESHABILITADA - requiere IA) ---
async function handleRecap(message) {
    return '⚠️ El comando !recap está deshabilitado porque requiere IA (Google Gemini).';
}

// --- Lógica para !menu (ACTUALIZADO CON BOTONES DE TELEGRAM) ---
async function handleMenu(client, message) {
    // Si el cliente es de Telegram y tiene sendMessage, usar menú con botones
    if (client && typeof client.sendMessage === 'function' && message && message.from) {
        try {
            const menuHandler = require('./menu.handler');
            const keyboard = menuHandler.getMainMenuKeyboard();
            
            await client.sendMessage(message.from, '🤖 *Menú Principal - Botillero*\n\nSelecciona una categoría para ver los comandos disponibles:', {
                parse_mode: 'Markdown',
                reply_markup: keyboard  // Pasar el objeto directamente, sin JSON.stringify
            });
            
            return null; // Ya enviamos el mensaje con botones
        } catch (error) {
            console.error('Error enviando menú con botones:', error.message);
            // Si falla, continuar con el menú de texto
        }
    }
    
    // Menú de texto (fallback)  
    return `
╔════════════════════════════╗
   🤖 *BOTILLERO - MENÚ* 🤖
╚════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ *SERVICIOS Y CONSULTAS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☀️ \`!clima [ciudad]\` → Pronóstico del tiempo
💵 \`!valores\` → Indicadores económicos (UF, dólar, etc.)
🎉 \`!feriados\` → Próximos feriados en Chile
💊 \`!far [comuna]\` → Farmacias de turno
🚇 \`!metro\` → Estado del Metro de Santiago
🌋 \`!sismos\` → Últimos sismos reportados
🚌 \`!bus [paradero]\` → Llegada de micros RED
⚡ \`!sec\` / \`!secrm\` → Cortes de luz (nacional/RM)
💳 \`!transbank\` → Estado servicios Transbank
🏦 \`!bancos\` → Estado sitios web bancarios
// 📝 \`!recap\` → Resumir últimos mensajes del grupo (DESHABILITADO - requiere IA)
🔧 \`!ping\` → Estado del sistema/bot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 *BÚSQUEDAS E INFORMACIÓN*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 \`!wiki [texto]\` → Buscar en Wikipedia
🔎 \`!g [texto]\` → Buscar en Google
📰 \`!noticias\` → Titulares de última hora
🚗 \`!pat [patente]\` → Info de vehículo
📱 \`!num [teléfono]\` → Info de número
🎲 \`!random\` → Dato curioso aleatorio
// 📝 \`!resumen [url]\` → Resumir web con IA (DESHABILITADO)
// 🤝 \`!ayuda [duda]\` → Asistente IA (DESHABILITADO)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚽ *FÚTBOL Y DEPORTES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 \`!tabla\` → Tabla liga chilena
📅 \`!partidos\` → Resumen de la fecha
📆 \`!prox\` → Próximos partidos liga
🇨🇱 \`!clasi\` → Partidos clasificatorias
🏅 \`!tclasi\` → Tabla clasificatorias

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 *REDES Y DOMINIOS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 \`!whois [dominio/ip]\` → Consulta WHOIS
🇨🇱 \`!nic [dominio.cl]\` → Info dominio chileno

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 *ENTRETENIMIENTO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
�️ \`!s\` → Crear sticker (responde img/video)
🎵 \`!audios\` → Lista comandos de audio
😂 \`!chiste\` → Escuchar chiste random
🖼️ \`!toimg\` → Sticker a imagen
⏳ \`!18\` / \`!navidad\` / \`!añonuevo\` → Countdowns
🔮 \`!horoscopo [signo]\` → Tu horóscopo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *GESTIÓN*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎫 \`!ticket [texto]\` → Crear ticket
✅ \`!ticketr [num]\` → Resolver ticket
❌ \`!tickete [num]\` → Eliminar ticket
👮 \`!caso [texto]\` → Registrar caso aislado
📋 \`!icaso\` → Listar casos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 *TIP:* Escribe \`bot\` para interactuar conmigo 😎
    `.trim();
}

module.exports = { 
    handleFeriados,
    handleFarmacias,
    handleClima,
    handleSismos,
    handleBus,
    handleSec,
    handleMenu,
    handleRandom,
    handleBancos,
    handleRecap
};