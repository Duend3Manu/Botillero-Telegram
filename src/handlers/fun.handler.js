// src/handlers/fun.handler.js
"use strict";

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const ffmpeg = require('fluent-ffmpeg');
const { MessageMedia } = require('../adapters/wwebjs-adapter');

// --- Lógica para Stickers ---
async function handleSticker(client, message) {
    try {
        // Feedback visual inmediato
        try { await message.react('⏳'); } catch (e) {}

        let mediaMessage = message;

        // si no tiene media, revisa si responde a una
        if (!message.hasMedia && message.hasQuotedMsg) {
            const quoted = await message.getQuotedMessage();
            if (quoted.hasMedia) mediaMessage = quoted;
        }

        if (!mediaMessage.hasMedia) {
            return message.reply('❌ Responde a una imagen, gif o video con `!s`');
        }

        console.log(`(Sticker) -> Procesando tipo: ${mediaMessage.type}`);

        const media = await mediaMessage.downloadMedia();
        if (!media) return message.reply('❌ No se pudo descargar la media');

        const tempDir = path.join(__dirname, '..', '..', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const ext = media.mimetype.split('/')[1].split(';')[0];
        const timestamp = Date.now();
        const tempFilePath = path.join(tempDir, `sticker_in_${timestamp}.${ext}`);
        const outputFilePath = path.join(tempDir, `sticker_out_${timestamp}.webp`);

        fs.writeFileSync(tempFilePath, media.data, 'base64');

        const isAnimated = media.mimetype.includes('video') || media.mimetype.includes('gif');

        await new Promise((resolve, reject) => {
            const command = ffmpeg(tempFilePath)
                .on('error', (err) => reject(err))
                .on('end', () => resolve());

            if (isAnimated) {
                // Configuración SIMPLIFICADA para animados
                command
                    .inputOptions(['-t 6'])  // Máximo 6 segundos
                    .outputOptions([
                        '-vcodec libwebp',
                        '-vf scale=512:512:force_original_aspect_ratio=decrease,fps=10',  // Simplificado
                        '-loop 0',
                        '-preset default',
                        '-an',  // Sin audio
                        '-vsync 0'
                    ])
                    .toFormat('webp');
            } else {
                // Configuración SIMPLE para estáticos
                command
                    .outputOptions([
                        '-vcodec libwebp',
                        '-vf scale=512:512:force_original_aspect_ratio=decrease',
                        '-qscale 75'
                    ])
                    .toFormat('webp');
            }
            
            command.save(outputFilePath);
        });

        // Validar que el archivo se generó correctamente
        if (!fs.existsSync(outputFilePath)) {
            throw new Error('No se generó el archivo WebP');
        }

        const stats = fs.statSync(outputFilePath);
        console.log(`(Sticker) -> WebP generado: ${(stats.size / 1024).toFixed(2)} KB`);

        // Validar tamaño (límite de ~500KB para stickers)
        if (stats.size > 500 * 1024) {
            fs.unlinkSync(tempFilePath);
            fs.unlinkSync(outputFilePath);
            return message.reply('❌ El sticker es muy grande (>500KB). Usa un video/gif más corto.');
        }

        const webpMedia = MessageMedia.fromFilePath(outputFilePath);
        
        // Enviar como sticker
        await client.sendMessage(message.from, webpMedia, {
            sendMediaAsSticker: true,
            stickerName: 'Botillero',
            stickerAuthor: '🤖'
        });

        // Reacción de éxito
        try { await message.react('✅'); } catch (e) {}

        // Limpieza
        try {
            fs.unlinkSync(tempFilePath);
            fs.unlinkSync(outputFilePath);
        } catch (e) {}

    } catch (err) {
        console.error('(Sticker) -> Error:', err);
        try { await message.react('❌'); } catch (e) {}
        message.reply('❌ Error al crear sticker. Intenta con una imagen, GIF o video más corto.');
    }
}

// --- Lógica para Sonidos ---
const soundMap = {
    'mataron': { file: 'mataron.mp3', reaction: '😂' }, 'muerte': { file: 'muerte.mp3', reaction: '😂' },
    'muerte2': { file: 'muerte2.mp3', reaction: '😂' }, 'muerte3': { file: 'muerte3.mp3', reaction: '😂' },
    'muerte4': { file: 'muerte4.mp3', reaction: '😂' }, 'neme': { file: 'neme.mp3', reaction: '🏳️‍🌈' },
    'risa': { file: 'merio.mp3', reaction: '😂' }, 'watona': { file: 'watona.mp3', reaction: '😂' },
    'himno': { file: 'urss.mp3', reaction: '🇷🇺' }, 'aweonao': { file: 'aweonao.mp3', reaction: '😂' },
    'mpenca': { file: 'muypenca.mp3', reaction: '😂' }, 'penca': { file: 'penca.mp3', reaction: '😂' },
    'yamete': { file: 'Yamete.mp3', reaction: '😂' }, 'doler': { file: 'doler.mp3', reaction: '😂' },
    'dolor': { file: 'doler.mp3', reaction: '🏳️‍🌈' }, 'tigre': { file: 'Tigre.mp3', reaction: '🐯' },
    'promo': { file: 'Promo.mp3', reaction: '😂' }, 'rata': { file: 'Rata.mp3', reaction: '🐁' },
    'rata2': { file: 'rata2.mp3', reaction: '🐁' }, 'caballo': { file: 'caballo.mp3', reaction: '🏳️‍🌈' },
    'romeo': { file: 'romeo.mp3', reaction: '😂' }, 'idea': { file: 'idea.mp3', reaction: '😂' },
    'chamba': { file: 'chamba.mp3', reaction: '😂' }, 'where': { file: 'where.mp3', reaction: '😂' },
    'shesaid': { file: 'shesaid.mp3', reaction: '😂' }, 'viernes': { file: 'viernes.mp3', reaction: '😂' },
    'lunes': { file: 'lunes.mp3', reaction: '😂' }, 'yque': { file: 'yqm.mp3', reaction: '😂' },
    'rico': { file: 'rico.mp3', reaction: '😂' }, '11': { file: '11.mp3', reaction: '😂' },
    'callate': { file: 'callate.mp3', reaction: '😂' }, 'callense': { file: 'callense.mp3', reaction: '😂' },
    'cell': { file: 'cell.mp3', reaction: '😂' }, 'chaoctm': { file: 'chaoctm.mp3', reaction: '😂' },
    'chipi': { file: 'chipi.mp3', reaction: '😂' }, 'aonde': { file: 'donde.mp3', reaction: '😂' },
    'grillo': { file: 'grillo.mp3', reaction: '😂' }, 'material': { file: 'material.mp3', reaction: '😂' },
    'miguel': { file: 'miguel.mp3', reaction: '😂' }, 'miraesawea': { file: 'miraesawea.mp3', reaction: '😂' },
    'nohayplata': { file: 'nohayplata.mp3', reaction: '😂' }, 'oniichan': { file: 'onishan.mp3', reaction: '😂' },
    'pago': { file: 'pago.mp3', reaction: '😂' }, 'pedro': { file: 'pedro.mp3', reaction: '😂' },
    'protegeme': { file: 'protegeme.mp3', reaction: '😂' }, 'queeseso': { file: 'queeseso.mp3', reaction: '😂' },
    'chistoso': { file: 'risakeso.mp3', reaction: '😂' }, 'marcho': { file: 'semarcho.mp3', reaction: '😂' },
    'spiderman': { file: 'spiderman.mp3', reaction: '😂' }, 'suceso': { file: 'suceso.mp3', reaction: '😂' },
    'tpillamos': { file: 'tepillamos.mp3', reaction: '😂' }, 'tranquilo': { file: 'tranquilo.mp3', reaction: '😂' },
    'vamosc': { file: 'vamoschilenos.mp3', reaction: '😂' }, 'voluntad': { file: 'voluntad.mp3', reaction: '😂' },
    'wenak': { file: 'wenacabros.mp3', reaction: '😂' }, 'whisper': { file: 'whisper.mp3', reaction: '😂' },
    'whololo': { file: 'whololo.mp3', reaction: '😂' }, 'noinsultes': { file: 'noinsultes.mp3', reaction: '😂' },
    'falso': { file: 'falso.mp3', reaction: '😂' }, 'frio': { file: 'frio.mp3', reaction: '😂' },
    'yfuera': { file: 'yfuera.mp3', reaction: '😂' }, 'nocreo': { file: 'nocreo.mp3', reaction: '😂' },
    'yabasta': { file: 'BUENO BASTA.mp3', reaction: '😂' }, 'quepaso': { file: 'quepaso.mp3', reaction: '😂' },
    'nada': { file: 'nada.mp3', reaction: '😂' }, 'idea2': { file: 'idea2.mp3', reaction: '😂' },
    'papito': { file: 'papito.mp3', reaction: '😂' }, 'jose': { file: 'jose.mp3', reaction: '😂' },
    'ctm': { file: 'ctm.mp3', reaction: '😂' }, 'precio': { file: 'precio.mp3', reaction: '😂' },
    'hermosilla': { file: 'Hermosilla.mp3', reaction: '😂' }, 'marino': { file: 'marino.mp3', reaction: '😂' },
    'manualdeuso': { file: 'manualdeuso.mp3', reaction: '😂' }, 'estoy': { file: 'estoy.mp3', reaction: '😂' },
    'pela': { file: 'pela.mp3', reaction: '😂' }, 'chao': { file: 'chao.mp3', reaction: '😂' },
    'aurora': { file: 'aurora.mp3', reaction: '😂' }, 'rivera': { file: 'Rivera.mp3', reaction: '😂' },
    'tomar': { file: 'Tomar.mp3', reaction: '😂' }, 'macabeo': { file: 'Macabeo.mp3', reaction: '😂' },
    'piscola': { file: 'Piscola.mp3', reaction: '😂' }, 'tomar2': { file: 'Notomar.mp3', reaction: '😂' },
    'venganza': { file: 'Venganza.mp3', reaction: '😂' }, 'weko': { file: 'weko.mp3', reaction: '🏳️‍🌈' },
    'himnoe': { file: 'urssespañol.mp3', reaction: '🇷🇺' } ,  'onichan': { file: 'onishan.mp3', reaction: '😂' }
};

const soundList = Object.keys(soundMap);

function handleAudioList() {
    const header = "🎵 **Comandos de Audio Disponibles** 🎵\n\n";
    const commandList = soundList.map(cmd => `!${cmd}`).join('\n');
    return header + commandList;
}

async function handleSound(client, message, command) {
    const soundInfo = soundMap[command];
    if (!soundInfo) return;

    const audioPath = path.join(__dirname, '..', '..', 'mp3', soundInfo.file);

    try {
        // Verificar existencia de forma asíncrona (no bloqueante)
        await fs.promises.access(audioPath);

        // Intentar reaccionar, pero ignorar si falla
        try {
            await new Promise(resolve => setTimeout(resolve, 500)); // Pausa de 0.5s
            await message.react(soundInfo.reaction);
        } catch (reactionError) {
            // Ignoramos el error cosmético
        }
        const media = MessageMedia.fromFilePath(audioPath);
        await message.reply(media, undefined, { sendAudioAsVoice: false });
    } catch (error) {
        if (error.code === 'ENOENT') {
            message.reply(`No se encontró el archivo de audio para "!${command}".`);
            console.error(`Archivo no encontrado: ${audioPath}`);
        } else {
            console.error(`Error en handleSound:`, error);
        }
    }
}

function getSoundCommands() {
    return soundList;
}

async function handleJoke(client, message) {
    const folderPath = path.join(__dirname, '..', '..', 'chistes');
    
    try {
        // Leer directorio de forma asíncrona
        const files = await fs.promises.readdir(folderPath);
        
        if (files.length === 0) return message.reply("No hay chistes para contar.");
        
        const randomIndex = Math.floor(Math.random() * files.length);
        const audioPath = path.join(folderPath, files[randomIndex]);
        
        const media = MessageMedia.fromFilePath(audioPath);
        await message.reply(media, undefined, { sendAudioAsVoice: false });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return message.reply("La carpeta de chistes no está configurada.");
        }
        console.error("Error en handleJoke:", error);
    }
}

function getCountdownMessage(targetDate, eventName, emoji) {
    const now = moment().tz('America/Santiago');
    const diff = moment.duration(targetDate.diff(now));

    if (diff.asMilliseconds() <= 0) return `¡Feliz ${eventName}! ${emoji}`;

    const days = Math.floor(diff.asDays());
    const hours = diff.hours();
    const minutes = diff.minutes();

    return `Para ${eventName} quedan: ${days} días, ${hours} horas y ${minutes} minutos ${emoji}`;
}

function handleCountdown(command) {
    const year = moment().year();
    switch (command) {
        case '18':
            return getCountdownMessage(moment.tz(`${year}-09-18 00:00:00`, 'America/Santiago'), 'el 18', '🇨🇱');
        case 'navidad':
            return getCountdownMessage(moment.tz(`${year}-12-25 00:00:00`, 'America/Santiago'), 'Navidad', '🎅');
        case 'añonuevo':
            return getCountdownMessage(moment.tz(`${year + 1}-01-01 00:00:00`, 'America/Santiago'), 'Año Nuevo', '🎆');
        default:
            return null;
    }
}

const frases = [
    'Dejame piola',
    '¿Qué weá querí?',
    'Callao',
    '¿Que onda compadre? ¿como estai? ¿te vine a molestar yo a ti? dejame piola, tranquilo ¿Que wea queri?',
    'Jajaja, ya te cache, puro picarte a choro no más, anda a webiar al paloma pulgón qliao.',
    'Lo siento, pero mis circuitos de humor están sobrecargados en este momento. ¡Beep boop! 😄',
    'Te diré lo que el profesor Rossa dijo una vez: "¿Por qué no te vay a webiar a otro lado?"',
    '¡Error 404: Sentido del humor no encontrado! 😅',
    'No soy un bot, soy una IA con estilo. 😎',
    '¡Atención, soy un bot de respuesta automática! Pero no puedo hacer café... aún. ☕',
    'Eso es lo que un bot diría. 🤖',
    '¡Oh no, me has descubierto! Soy un bot maestro del disfraz. 😁',
    'Parece que llegó el comediante del grupo. 🤣',
    'El humor está de moda, y tú eres el líder. 😄👑',
    'Con ese humor, podrías competir en el festival de Viña del Mar. 🎤😄',
    'Voy a sacar mi caja de risa. Dame un momento... cric cric cric ♫ja ja ja ja jaaaa♫',
    'Meruane estaría orgulloso de ti. ¡Sigues haciendo reír! 😄',
    'Jajajaja, ya llegó el payaso al grupo, avisa para la otra. 😄',
    '♫♫♫♫ Yo tomo licor, yo tomo cerveza 🍻 Y me gustan las chicas y la cumbia me divierte y me excita.. ♫♫♫♫♫',
    'A cantar: ♫♫♫ Yoooo tomo vino y cerveza 🍺 (Pisco y ron) para olvidarme de ella (Maraca culia), Tomo y me pongo loco (hasta los cocos), Loco de la cabeza (Esta cabeza) ♫♫♫',
    '♫♫♫ Me fui pal baile y me emborraché,miré una chica y me enamoré,era tan bella, era tan bella,la quería comer ♫♫♫',
    'Compa, ¿qué le parece esa morra?, La que anda bailando sola, me gusta pa mí, Bella, ella sabe que está buena , Que todos andan mirándola cómo baila ♫♫♫♫♫♫',
    'jajajaja, ya empezaste con tus amariconadas 🏳️‍🌈',
    '♫♫♫ Tú sabes como soy Me gusta ser así, Me gusta la mujer y le cervecita 🍻 No te sientas mal, no te vas a enojar Amigo nada más de la cervecita ♫♫♫♫♫',
    '♫♫♫ Y dice.... No me quiero ir a dormir, quiero seguir bailando, quiero seguir tomando, 🍷 vino hasta morir, No me quiero ir a dormir, quiero seguir tomando 🍷 , Quiero seguir bailando, cumbia hasta morir♫♫♫',
    '¿Bot? Te inyecto malware en tiempo real, wn.',
    'Llámame bot otra vez y te hago un rootkit en el alma, qliao.',
    '¿Bot? Te hago un SQL injection que ni te das cuenta, wn.',
    'Sigue llamándome bot y te lanzo un ataque de fuerza bruta hasta en tus sueños, qliao.',
    '¿Bot? Te corrompo todos tus datos y te dejo llorando, wn.',
    'Bot tu madre. Te hago un exploit que te deja offline, qliao.',
    '¿Bot? Te instalo un ransomware y te dejo en bancarrota, wn.',
    'Vuelve a llamarme bot y te hago un man-in-the-middle en tu vida, qliao.',
    'Llamarme bot es lo único que puedes hacer, con tus hacks de pacotilla, wn.',
    'Una vez más me llamas bot y te meto en un loop de autenticación infinita, qliao.',
    '¿Bot? Ctm, te hago un rm -rf / en los recuerdos y te reinicio de fábrica, gil.',
    'Sigue weando y el próximo pantallazo azul va a tener mi firma, perkin.',
    'Mi antivirus te tiene en la lista negra por ser terrible fome.',
    'Te compilo la vida, pero con puros errores y warnings, pa que te cueste.',
    'Me deci bot y te meto un DDoS al refri pa que se te eche a perder el pollo, wn.',
    '¿Bot? Ojalá tu internet ande más lento que VTR en día de lluvia.',
    'Ando con menos paciencia que el Chino Ríos en una conferencia.',
    '¿Y vo creí que soy la Teletón? ¿Que te ayudo 24/7? No po, wn.',
    'Estoy procesando... lo poco y na\' que me importa. Lol.',
    'Wena, te ganaste el Copihue de Oro al comentario más inútil. ¡Un aplauso! 👏',
    'Le poní más color que la Doctora Polo, wn.',
    'Jajaja, qué chistoso. Me río en binario: 01101000 01100001 01101000 01100001.'
];
let usedPhrases = [];

function obtenerFraseAleatoria() {
    let randomIndex = Math.floor(Math.random() * frases.length);
    
    while (usedPhrases.includes(randomIndex) && usedPhrases.length < frases.length) {
        randomIndex = Math.floor(Math.random() * frases.length);
    }
    usedPhrases.push(randomIndex);
    if (usedPhrases.length >= 5) {
        usedPhrases.shift();
    }
    return frases[randomIndex];
}

async function reactAndReplyWithMention(message, text, reaction, separator = ', ') {
    try {
        // Obtener el ID del usuario de manera más directa
        const userId = message.author || message.from;
        
        if (!userId) {
            console.error("No se pudo obtener el ID del usuario");
            return message.reply(text);
        }
        
        // Intentar reaccionar, pero ignorar si falla
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            await message.react(reaction);
        } catch (reactionError) {
            // Ignoramos el error cosmético
        }
        
        // Extraer solo el número de usuario (antes del @)
        const userNumber = userId.split('@')[0];
        
        await message.reply(`${text}${separator}@${userNumber}`, undefined, {
            mentions: [userId]
        });
    } catch (e) {
        console.error("Error en reactAndReplyWithMention:", e);
        // Fallback: responder sin mención si falla todo
        try {
            await message.reply(text);
        } catch (fallbackError) {
            console.error("Error en fallback:", fallbackError);
        }
    }
}

async function handleBotMention(client, message) {
    const texto = obtenerFraseAleatoria();
    await reactAndReplyWithMention(message, texto, '🤡', ', ');
}

async function handleOnce(client, message) {
    await reactAndReplyWithMention(message, 'Chupalo entonces', '😂', ' ');
}

// --- Sistema de Control de Ruleta (Cooldown y Anti-Spam) ---
const ruletaCooldowns = new Map(); // userId -> timestamp del último uso
const ruletaSpamTracker = new Map(); // userId -> array de timestamps
const ruletaBannedUsers = new Map(); // userId -> timestamp de fin del ban

const RULETA_COOLDOWN_MS = 5000; // 5 segundos
const SPAM_WINDOW_MS = 30000; // Ventana de 30 segundos para detectar spam
const SPAM_THRESHOLD = 6; // Si usa el comando 6+ veces en 30s = spam
const BAN_DURATION_MS = 20 * 60 * 1000; // 20 minutos

// --- Lógica para Ruleta Rusa con Sistema de Puntos y Anti-Spam ---
async function handleRuleta(client, message) {
    try {
        const { agregarPuntos, obtenerPuntos } = require('../services/puntos.service');
        const moment = require('moment-timezone');
        
        const userId = message.author || message.from;
        const userNumber = userId ? userId.split('@')[0] : 'Usuario';
        
        // Obtener nombre de usuario
        let userName = userNumber;
        try {
            const contact = await message.getContact();
            userName = contact.pushname || contact.name || userNumber;
        } catch (e) {
            // Usar el número si no se puede obtener el nombre
        }
        
        const ahora = Date.now();
        
        // 1. Verificar si el usuario está baneado
        if (ruletaBannedUsers.has(userId)) {
            const banEndTime = ruletaBannedUsers.get(userId);
            if (ahora < banEndTime) {
                const tiempoRestante = Math.ceil((banEndTime - ahora) / 60000);
                return message.reply(`⛔ *${userName}*, estás temporalmente bloqueado por hacer spam.\n\n⏳ Tiempo restante: *${tiempoRestante} minutos*`);
            } else {
                // Ban expirado, limpiar
                ruletaBannedUsers.delete(userId);
                ruletaSpamTracker.delete(userId);
            }
        }
        
        // 2. Verificar cooldown de 5 segundos
        if (ruletaCooldowns.has(userId)) {
            const lastUse = ruletaCooldowns.get(userId);
            const timeSinceLastUse = ahora - lastUse;
            
            if (timeSinceLastUse < RULETA_COOLDOWN_MS) {
                const esperaRestante = Math.ceil((RULETA_COOLDOWN_MS - timeSinceLastUse) / 1000);
                return message.reply(`⏱️ Espera *${esperaRestante}s* antes de volver a jugar.`);
            }
        }
        
        // 3. Detectar spam (tracking de uso frecuente)
        if (!ruletaSpamTracker.has(userId)) {
            ruletaSpamTracker.set(userId, []);
        }
        
        const spamHistory = ruletaSpamTracker.get(userId);
        
        // Limpiar timestamps antiguos (fuera de la ventana de spam)
        const recentUses = spamHistory.filter(timestamp => ahora - timestamp < SPAM_WINDOW_MS);
        recentUses.push(ahora);
        ruletaSpamTracker.set(userId, recentUses);
        
        // Si supera el threshold, banear
        if (recentUses.length >= SPAM_THRESHOLD) {
            const banUntil = ahora + BAN_DURATION_MS;
            ruletaBannedUsers.set(userId, banUntil);
            ruletaCooldowns.delete(userId);
            
            await message.reply(`🚫 *${userName}*, detecté que estás haciendo spam del comando.\n\n⛔ *Bloqueado por 20 minutos.*\n\n💡 Usa el comando con moderación.`);
            
            // Limpiar spam tracker después de banear
            ruletaSpamTracker.delete(userId);
            return;
        }
        
        // 4. Actualizar cooldown
        ruletaCooldowns.set(userId, ahora);
        
        // 5. Lógica de la ruleta con premios
        const premios = [
            { nombre: '¡Nada! Suerte para la próxima 💨', puntos: 0, chance: 30 },
            { nombre: '10 puntitos 🎯', puntos: 10, chance: 40 },
            { nombre: '50 puntos ⭐', puntos: 50, chance: 15 },
            { nombre: '¡100 puntos! Nada mal 🎊', puntos: 100, chance: 10 },
            { nombre: '¡¡500 PUNTOS!! ¡El Jackpot! 💎', puntos: 500, chance: 5 }
        ];
        
        // Animación de suspense
        await message.reply('🎰 *Ruleta de la Suerte* 🎰\n\nGirando la ruleta...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await message.reply('🔄 Girando... girando...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Calcular premio
        const random = Math.random() * 100;
        let acumulado = 0;
        let premioGanado = premios[0];
        
        for (const premio of premios) {
            acumulado += premio.chance;
            if (random < acumulado) {
                premioGanado = premio;
                break;
            }
        }
        
        // Actualizar puntos
        const nuevoTotal = agregarPuntos(userId, userName, premioGanado.puntos);
        
        // Mensaje de resultado
        let emoji = '🎉';
        if (premioGanado.puntos === 0) emoji = '😢';
        else if (premioGanado.puntos >= 500) emoji = '🎊💰';
        else if (premioGanado.puntos >= 100) emoji = '🎉';
        else if (premioGanado.puntos >= 50) emoji = '✨';
        
        let mensajeResultado = `${emoji} *${userName}*, la ruleta se detuvo y ganaste:\n\n💥 *${premioGanado.nombre}*`;
        
        if (premioGanado.puntos > 0) {
            mensajeResultado += `\n\n🏆 Total de puntos: *${nuevoTotal}*`;
        } else {
            mensajeResultado += `\n\n💡 Sigue intentando para ganar puntos.`;
        }
        
        await message.reply(mensajeResultado);
        
    } catch (error) {
        console.error('Error en handleRuleta:', error);
        return message.reply('❌ La ruleta se atascó. Intenta de nuevo.');
    }
}

// --- Comando para ver puntos ---
async function handlePuntos(client, message) {
    try {
        const { obtenerPuntos } = require('../services/puntos.service');
        
        const userId = message.author || message.from;
        const userNumber = userId ? userId.split('@')[0] : 'Usuario';
        
        // Obtener nombre de usuario
        let userName = userNumber;
        try {
            const contact = await message.getContact();
            userName = contact.pushname || contact.name || userNumber;
        } catch (e) {
            // Usar el número si no se puede obtener el nombre
        }
        
        const datosUsuario = obtenerPuntos(userId);
        
        if (datosUsuario.puntos === 0) {
            return message.reply(`*${userName}*, aún no tienes puntos. ¡Usa \`!ruleta\` para empezar a ganar! 🎰`);
        }
        
        await message.reply(`*${userName}*, actualmente tienes:\n\n🏆 *${datosUsuario.puntos}* puntos 🏆\n\n💡 Usa \`!ruleta\` para ganar más puntos.`);
        
    } catch (error) {
        console.error('Error en handlePuntos:', error);
        return message.reply('❌ Error al obtener tus puntos.');
    }
}

// --- Comando para ver ranking de puntos ---
async function handleRanking(client, message) {
    try {
        const { obtenerRanking } = require('../services/puntos.service');
        
        const ranking = obtenerRanking(10);
        
        if (ranking.length === 0) {
            return message.reply('🏆 Aún no hay jugadores en el ranking.\n\n💡 Usa `!ruleta` para ser el primero.');
        }
        
        let mensajeRanking = '🏆 *TOP 10 JUGADORES* 🏆\n\n';
        
        ranking.forEach((jugador, index) => {
            const medallas = ['🥇', '🥈', '🥉'];
            const emoji = medallas[index] || `${index + 1}.`;
            mensajeRanking += `${emoji} *${jugador.nombre}*: ${jugador.puntos} pts\n`;
        });
        
        await message.reply(mensajeRanking);
        
    } catch (error) {
        console.error('Error en handleRanking:', error);
        return message.reply('❌ Error al obtener el ranking.');
    }
}


module.exports = {
    handleSticker,
    handleSound,
    getSoundCommands,
    handleAudioList,
    handleJoke,
    handleCountdown,
    handleBotMention,
    handleOnce,
    handleRuleta,
    handlePuntos,
    handleRanking
};