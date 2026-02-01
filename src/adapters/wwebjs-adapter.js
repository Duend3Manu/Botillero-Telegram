// src/adapters/wwebjs-adapter.js
"use strict";

/**
 * Adaptador unificado para mensajería
 * Ahora compatible con Telegram (whatsapp-web.js removido)
 */

class MessageMedia {
    constructor(mimetype, data, filename) {
        this.mimetype = mimetype;
        this.data = data;
        this.filename = filename;
    }

    static fromFilePath(filePath) {
        const fs = require('fs');
        const path = require('path');
        const mime = require('mime-types');
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Archivo no encontrado: ${filePath}`);
        }
        
        const data = fs.readFileSync(filePath, { encoding: 'base64' });
        const mimetype = mime.lookup(filePath) || 'application/octet-stream';
        const filename = path.basename(filePath);
        
        return new MessageMedia(mimetype, data, filename);
    }

    static async fromUrl(url, options = {}) {
        const axios = require('axios');
        const mime = require('mime-types');
        
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: options.timeout || 10000,
                headers: options.headers || {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            const data = Buffer.from(response.data).toString('base64');
            const mimetype = response.headers['content-type'] || mime.lookup(url) || 'application/octet-stream';
            const filename = options.filename || 'download';
            
            return new MessageMedia(mimetype, data, filename);
        } catch (error) {
            throw new Error(`Error descargando desde URL: ${error.message}`);
        }
    }
}

module.exports = {
    MessageMedia
};
