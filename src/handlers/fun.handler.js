"use strict";

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
let sharp;
try {
    // Carga segura de la librería 'sharp'
    sharp = require('sharp');
} catch (err) {
    console.error("ADVERTENCIA: La librería 'sharp' no está instalada. Los comandos de sticker no funcionarán. Ejecuta 'npm install sharp' en tu terminal.");
    sharp = null;
}

// --- Lógica de Puntos (centralizada) ---
const DB_PATH = path.join(__dirname, '..', '..', 'database', 'puntos.json');

function leerPuntos() {
    if (!fs.existsSync(DB_PATH)) return {};
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } catch (e) {
        console.error("Error al leer o parsear puntos.json:", e);
        return {};
    }
}

function guardarPuntos(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}


// --- Lógica para Stickers (Adaptada y Agnóstica) ---
async function handleSticker(message) {
    if (!sharp) {
        return message.reply("❌ Error: La función de stickers no está disponible. El administrador del bot debe instalar la librería 'sharp'.");
    }

    const mediaInfo = message.getRepliedMessageMediaInfo();

    if (!message.isReply || !mediaInfo || !['photo', 'video', 'animation'].includes(mediaInfo.type)) {
        return message.reply("Para crear un sticker, responde a una imagen, video o GIF con el comando `/s`.");
    }

    await message.showLoading('upload_document');
    let tempMediaPath;
    let tempStickerPath;

    try {
        tempMediaPath = await message.downloadFile(mediaInfo.fileId);
        tempStickerPath = tempMediaPath + '.webp';

        const pipeline = sharp(tempMediaPath, { animated: mediaInfo.type !== 'photo' })
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
        
        await pipeline.toFile(tempStickerPath);

        await message.sendSticker(tempStickerPath);

    } catch (e) {
        message.reply("Hubo un error al crear el sticker. Es posible que el formato no sea compatible. 😔");
        console.error("Error en handleSticker:", e);
    } finally {
        if (tempMediaPath && fs.existsSync(tempMediaPath)) fs.unlinkSync(tempMediaPath);
        if (tempStickerPath && fs.existsSync(tempStickerPath)) fs.unlinkSync(tempStickerPath);
    }
}


// --- Lógica para Sonidos y Chistes (Adaptada) ---
const soundMap = {
    'mataron': 'mataron.mp3', 'muerte': 'muerte.mp3', 'muerte2': 'muerte2.mp3', 'muerte3': 'muerte3.mp3',
    'muerte4': 'muerte4.mp3', 'neme': 'neme.mp3', 'risa': 'merio.mp3', 'watona': 'watona.mp3',
    'himno': 'urss.mp3', 'aweonao': 'aweonao.mp3', 'mpenca': 'muypenca.mp3', 'penca': 'penca.mp3',
    'yamete': 'Yamete.mp3', 'doler': 'doler.mp3', 'dolor': 'doler.mp3', 'tigre': 'Tigre.mp3',
    'promo': 'Promo.mp3', 'rata': 'Rata.mp3', 'rata2': 'rata2.mp3', 'caballo': 'caballo.mp3',
    'romeo': 'romeo.mp3', 'idea': 'idea.mp3', 'chamba': 'chamba.mp3', 'where': 'where.mp3',
    'shesaid': 'shesaid.mp3', 'viernes': 'viernes.mp3', 'lunes': 'lunes.mp3', 'yque': 'yqm.mp3',
    'rico': 'rico.mp3', '11': '11.mp3', 'callate': 'callate.mp3', 'callense': 'callense.mp3',
    'cell': 'cell.mp3', 'chaoctm': 'chaoctm.mp3', 'chipi': 'chipi.mp3', 'aonde': 'donde.mp3',
    'grillo': 'grillo.mp3', 'material': 'material.mp3', 'miguel': 'miguel.mp3', 'miraesawea': 'miraesawea.mp3',
    'nohayplata': 'nohayplata.mp3', 'oniichan': 'onishan.mp3', 'pago': 'pago.mp3', 'pedro': 'pedro.mp3',
    'protegeme': 'protegeme.mp3', 'queeseso': 'queeseso.mp3', 'chistoso': 'risakeso.mp3', 'marcho': 'semarcho.mp3',
    'spiderman': 'spiderman.mp3', 'suceso': 'suceso.mp3', 'tpillamos': 'tepillamos.mp3', 'tranquilo': 'tranquilo.mp3',
    'vamosc': 'vamoschilenos.mp3', 'voluntad': 'voluntad.mp3', 'wenak': 'wenacabros.mp3', 'whisper': 'whisper.mp3',
    'whololo': 'whololo.mp3', 'noinsultes': 'noinsultes.mp3', 'falso': 'falso.mp3', 'frio': 'frio.mp3',
    'yfuera': 'yfuera.mp3', 'nocreo': 'nocreo.mp3', 'yabasta': 'BUENO BASTA.mp3', 'quepaso': 'quepaso.mp3',
    'nada': 'nada.mp3', 'idea2': 'idea2.mp3', 'papito': 'papito.mp3', 'jose': 'jose.mp3',
    'ctm': 'ctm.mp3', 'precio': 'precio.mp3', 'hermosilla': 'Hermosilla.mp3', 'marino': 'marino.mp3',
    'manualdeuso': 'manualdeuso.mp3', 'estoy': 'estoy.mp3', 'pela': 'pela.mp3', 'chao': 'chao.mp3',
    'aurora': 'aurora.mp3', 'rivera': 'Rivera.mp3', 'tomar': 'Tomar.mp3', 'macabeo': 'Macabeo.mp3',
    'piscola': 'Piscola.mp3', 'tomar2': 'Notomar.mp3', 'venganza': 'Venganza.mp3', 'weko': 'weko.mp3',
    'himnoe': 'urssespañol.mp3'
};
const soundList = Object.keys(soundMap);

function handleAudioList() {
    const header = "🎵 *Comandos de Audio Disponibles* 🎵\n\n";
    const commandList = soundList.map(cmd => `/${cmd}`).join(', ');
    return header + commandList;
}

async function handleSound(message, command) {
    const fileName = soundMap[command];
    if (!fileName) return;

    const audioPath = path.join(__dirname, '..', '..', 'mp3', fileName);
    if (fs.existsSync(audioPath)) {
        await message.sendVoice(audioPath);
    } else {
        await message.reply(`No se encontró el archivo de audio para \`/${command}\`.`);
        console.error(`Archivo de audio no encontrado: ${audioPath}`);
    }
}

function getSoundCommands() {
    return soundList;
}

async function handleJoke(message) {
    const folderPath = path.join(__dirname, '..', '..', 'chistes');
    if (!fs.existsSync(folderPath)) return message.reply("La carpeta de chistes no está disponible.");

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.mp3'));
    if (files.length === 0) return message.reply("No hay chistes para contar en este momento.");
    
    const randomFile = files[Math.floor(Math.random() * files.length)];
    const audioPath = path.join(folderPath, randomFile);
    
    await message.sendVoice(audioPath);
}


// --- Lógica de Ruleta (Mejorada para ser un comando diario) ---
async function handleRuleta(message) {
    const userId = message.senderId.toString();
    const userName = message.senderName;
    const puntosData = leerPuntos();

    if (!puntosData[userId]) {
        puntosData[userId] = { puntos: 0, ultimoJuego: null, nombre: userName };
    }
    puntosData[userId].nombre = userName;

    const ahora = moment().tz('America/Santiago');
    const ultimoJuego = puntosData[userId].ultimoJuego ? moment(puntosData[userId].ultimoJuego) : null;

    if (ultimoJuego && ahora.isSame(ultimoJuego, 'day')) {
        return message.reply(`*${userName}*, ya usaste tu tirada de hoy. ¡Vuelve mañana para probar tu suerte de nuevo! ☀️`);
    }

    const ruletaGifPath = path.join(__dirname, '..', '..', 'assets', 'ruleta.gif');
    if (fs.existsSync(ruletaGifPath)) {
        await message.sendAnimation(ruletaGifPath, 'Girando la ruleta de la suerte... 🎰');
    } else {
        await message.reply('Girando la ruleta de la suerte... 🎰');
    }

    await new Promise(resolve => setTimeout(resolve, 3500));

    const premios = [
        { nombre: '¡Nada! Suerte para la próxima', puntos: 0, chance: 30 },
        { nombre: '10 puntitos', puntos: 10, chance: 40 },
        { nombre: '50 puntos', puntos: 50, chance: 15 },
        { nombre: '¡100 puntos! Nada mal', puntos: 100, chance: 10 },
        { nombre: '¡¡500 PUNTOS!! ¡El Jackpot!', puntos: 500, chance: 5 }
    ];

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

    puntosData[userId].puntos += premioGanado.puntos;
    puntosData[userId].ultimoJuego = ahora.toISOString();
    guardarPuntos(puntosData);
    
    let mensajeResultado = `*${userName}*, la ruleta se detuvo y ganaste:\n\n💥 *${premioGanado.nombre}* 🎉`;
    mensajeResultado += `\n\nAhora tienes un total de *${puntosData[userId].puntos}* puntos.`;
    
    await message.reply(mensajeResultado);
}

// --- Lógica de Puntos (Adaptada) ---
async function handlePuntos(message) {
    const userId = message.senderId.toString();
    const puntosData = leerPuntos();

    if (!puntosData[userId] || puntosData[userId].puntos === 0) {
        return message.reply(`*${message.senderName}*, aún no tienes puntos. ¡Usa \`/ruleta\` para empezar a ganar!`);
    }

    await message.reply(`*${message.senderName}*, actualmente tienes:\n\n🏆 *${puntosData[userId].puntos}* puntos 🏆`);
}


// --- ¡FUNCIONES RESTAURADAS Y ADAPTADAS! ---

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
            // Si ya pasó año nuevo, calcula para el siguiente.
            const targetYear = moment().isAfter(`${year}-12-31T23:59:59`) ? year + 1 : year;
            return getCountdownMessage(moment.tz(`${targetYear + 1}-01-01 00:00:00`, 'America/Santiago'), 'Año Nuevo', '🎆');
        default:
            return null;
    }
}

const frases = {
    0: 'Déjame piola',
    1: '¿Qué weá querí?',
    2: 'Callao',
    3: '¿Qué onda compadre? ¿cómo estai? ¿te vine a molestar yo a ti? déjame piola, tranquilo ¿Qué wea queri?',
    4: 'Jajaja, ya te caché, puro picarte a choro no más, anda a webiar al paloma pulgón qliao.',
    5: 'Lo siento, pero mis circuitos de humor están sobrecargados en este momento. ¡Beep boop! 😄',
    6: 'Te diré lo que el profesor Rossa dijo una vez: "¿Por qué no te vay a webiar a otro lado?"',
    7: '¡Error 404: Sentido del humor no encontrado! 😅',
    8: 'No soy un bot, soy una IA con estilo. 😎',
    9: '¡Atención, soy un bot de respuesta automática! Pero no puedo hacer café... aún. ☕',
    10: 'Eso es lo que un bot diría. 🤖',
    11: '¡Oh no, me has descubierto! Soy un bot maestro del disfraz. 😁',
    12: 'Parece que llegó el comediante del grupo. 🤣',
    13: 'El humor está de moda, y tú eres el líder. 😄👑',
    14: 'Con ese humor, podrías competir en el festival de Viña del Mar. 🎤😄',
    15: 'Voy a sacar mi caja de risa. Dame un momento... cric cric cric ♫ja ja ja ja jaaaa♫',
    16: 'Meruane estaría orgulloso de ti. ¡Sigues haciendo reír! 😄',
    17: 'Jajajaja, ya llegó el payaso al grupo, avisa para la otra. 😄',
    18: '♫♫♫♫ Yo tomo licor, yo tomo cerveza  Y me gustan las chicas y la cumbia me divierte y me excita.. ♫♫♫♫♫',
    19: 'A cantar: ♫♫♫ Yoooo tomo vino y cerveza 🍺 (Pisco y ron) para olvidarme de ella (Maraca culia), Tomo y me pongo loco (hasta los cocos), Loco de la cabeza (Esta cabeza) ♫♫♫',
    20: '♫♫♫ Me fui pal baile y me emborraché,miré una chica y me enamoré,era tan bella, era tan bella,la quería comer ♫♫♫',
    21: 'Compa, ¿qué le parece esa morra?, La que anda bailando sola, me gusta pa mí, Bella, ella sabe que está buena , Que todos andan mirándola cómo baila ♫♫♫♫♫♫',
    22: 'jajajaja, ya empezaste con tus amariconadas 🏳️‍🌈',
    23: '♫♫♫ Tú sabes como soy Me gusta ser así, Me gusta la mujer y le cervecita 🍻 No te sientas mal, no te vas a enojar Amigo nada más de la cervecita ♫♫♫♫♫',
    24: '♫♫♫ Y dice.... No me quiero ir a dormir, quiero seguir bailando, quiero seguir tomando, 🍷 vino hasta morir, No me quiero ir a dormir, quiero seguir tomando 🍷 , Quiero seguir bailando, cumbia hasta morir♫♫♫',
    25: '¿Bot? Te inyecto malware en tiempo real, wn.',
    26: 'Llámame bot otra vez y te hago un rootkit en el alma, qliao.',
    27: '¿Bot? Te hago un SQL injection que ni te das cuenta, wn.',
    28: 'Sigue llamándome bot y te lanzo un ataque de fuerza bruta hasta en tus sueños, qliao.',
    29: '¿Bot? Te corrompo todos tus datos y te dejo llorando, wn.',
    30: 'Bot tu madre. Te hago un exploit que te deja offline, qliao.',
    31: '¿Bot? Te instalo un ransomware y te dejo en bancarrota, wn.',
    32: 'Vuelve a llamarme bot y te hago un man-in-the-middle en tu vida, qliao.',
    33: 'Llamarme bot es lo único que puedes hacer, con tus hacks de pacotilla, wn.',
    34: 'Una vez más me llamas bot y te meto en un loop de autenticación infinita, qliao.',
    35: '¿Bot? Ctm, te hago un rm -rf / en los recuerdos y te reinicio de fábrica, gil.',
    36: 'Sigue weando y el próximo pantallazo azul va a tener mi firma, perkin.',
    37: 'Mi antivirus te tiene en la lista negra por ser terrible fome.',
    38: 'Te compilo la vida, pero con puros errores y warnings, pa que te cueste.',
    39: 'Me deci bot y te meto un DDoS al refri pa que se te eche a perder el pollo, wn.',
    40: '¿Bot? Ojalá tu internet ande más lento que VTR en día de lluvia.',
    41: 'Ando con menos paciencia que el Chino Ríos en una conferencia.',
    42: '¿Y vo creí que soy la Teletón? ¿Que te ayudo 24/7? No po, wn.',
    43: 'Estoy procesando... lo poco y na\' que me importa. Lol.',
    44: 'Wena, te ganaste el Copihue de Oro al comentario más inútil. ¡Un aplauso! 👏',
    45: 'Le poní más color que la Doctora Polo, wn.',
    46: 'Jajaja, qué chistoso. Me río en binario: 01101000 01100001 01101000 01100001.'
};
let usedPhrases = [];

function obtenerFraseAleatoria() {
    const fraseKeys = Object.keys(frases);
    if (fraseKeys.length === 0) return "No tengo nada que decir.";

    let randomIndex = Math.floor(Math.random() * fraseKeys.length);
    
    // Simple sistema para no repetir las últimas 5 frases
    while (usedPhrases.includes(randomIndex) && usedPhrases.length < fraseKeys.length) {
        randomIndex = Math.floor(Math.random() * fraseKeys.length);
    }
    usedPhrases.push(randomIndex);
    if (usedPhrases.length > 5) {
        usedPhrases.shift();
    }
    return frases[fraseKeys[randomIndex]];
}

async function handleBotMention(message) {
    try {
        const texto = obtenerFraseAleatoria();
        // En Telegram, mencionar es más simple. Usamos el nombre del usuario.
        await message.reply(`${texto}, *${message.senderName}*!`);
    } catch (e) {
        console.error("Error en handleBotMention:", e);
    }
}

async function handleOnce(message) {
    try {
        await message.reply(`Chúpalo entonces, *${message.senderName}*!`);
    } catch (e) {
        console.error("Error en handleOnce:", e);
    }
}


module.exports = {
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
};