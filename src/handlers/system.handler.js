"use strict";

const si = require('systeminformation');
const moment = require('moment');
require('moment-duration-format');
const { exec } = require('child_process');

/**
 * --- ¡CORREGIDO Y MEJORADO! ---
 * Genera un mensaje de estado del sistema que es agnóstico a la plataforma.
 * Ya no depende de funciones específicas de WhatsApp.
 * @param {object} message - El objeto de mensaje adaptado.
 * @returns {Promise<string>} Un mensaje con el estado del sistema.
 */
async function handlePing(message) {
    try {
        const startTime = Date.now(); // Medir latencia

        // Obtener información del sistema de forma asíncrona
        const osInfoPromise = si.osInfo();
        const cpuInfoPromise = si.cpu();
        const memInfoPromise = si.mem();

        // Esperar a que todas las promesas se resuelvan
        const [os, cpu, mem] = await Promise.all([osInfoPromise, cpuInfoPromise, memInfoPromise]);

        const uptime = moment.duration(process.uptime(), 'seconds').format("D[d], H[h], m[m], s[s]");
        const ramUsage = `${(mem.used / 1024 / 1024 / 1024).toFixed(2)} GB / ${(mem.total / 1024 / 1024 / 1024).toFixed(2)} GB`;
        
        const endTime = Date.now();
        const latency = endTime - startTime;

        // Construir la respuesta en formato Markdown
        let response = `*Pong!* 🏓\n\n`;
        response += `*Estadísticas del Servidor:*\n`;
        response += `➢ *SO:* ${os.distro} (${os.release})\n`;
        response += `➢ *CPU:* ${cpu.manufacturer} ${cpu.brand}\n`;
        response += `➢ *RAM:* ${ramUsage}\n`;
        response += `➢ *Tiempo Activo:* ${uptime}\n\n`;
        response += `*Estadísticas del Bot:*\n`;
        response += `➢ *Plataforma:* \`${message.platform}\`\n`;
        response += `➢ *Latencia:* ${latency} ms`;

        return response;

    } catch (error) {
        console.error("Error al generar el estado del sistema:", error);
        return "❌ Hubo un problema al obtener el estado del sistema.";
    }
}

// Puedes mantener las otras funciones si las usas, o eliminarlas.
// Por ejemplo, si handleRestart no es necesario, puedes quitarlo.
function handleRestart(message) {
    message.reply('Reiniciando el bot...');
    exec('npm start', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error al reiniciar: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });
}

module.exports = {
    handlePing,
    handleRestart
};