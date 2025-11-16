"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvSecretStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class EnvSecretStore {
    envPath;
    secrets;
    constructor(envPath) {
        this.envPath = envPath || path.join(process.cwd(), '.env');
        this.secrets = new Map();
        this.loadFromEnv();
    }
    loadFromEnv() {
        for (const [key, value] of Object.entries(process.env)) {
            if (value) {
                this.secrets.set(key, value);
            }
        }
    }
    async get(key) {
        const value = this.secrets.get(key) || process.env[key];
        return value || null;
    }
    async set(key, value, _expiresAt) {
        this.secrets.set(key, value);
        process.env[key] = value;
        try {
            if (fs.existsSync(this.envPath)) {
                const content = `\n${key}=${value}\n`;
                fs.appendFileSync(this.envPath, content);
            }
        }
        catch (error) {
            console.warn(`Could not write to .env file: ${error}`);
        }
    }
    async delete(key) {
        this.secrets.delete(key);
        delete process.env[key];
    }
    async list() {
        return Array.from(this.secrets.keys());
    }
    async exists(key) {
        return this.secrets.has(key) || key in process.env;
    }
    async getMetadata(key) {
        if (await this.exists(key)) {
            return {
                key,
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1,
            };
        }
        return null;
    }
    async rotate(key, newValue) {
        await this.set(key, newValue);
    }
    async healthCheck() {
        return typeof process.env === 'object';
    }
    parseEnvFile() {
        const envVars = new Map();
        try {
            if (!fs.existsSync(this.envPath)) {
                return envVars;
            }
            const content = fs.readFileSync(this.envPath, 'utf-8');
            const lines = content.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) {
                    continue;
                }
                const match = trimmed.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    let value = match[2].trim();
                    if ((value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    envVars.set(key, value);
                }
            }
        }
        catch (error) {
            console.error('Error parsing .env file:', error);
        }
        return envVars;
    }
    async reload() {
        const fileVars = this.parseEnvFile();
        for (const [key, value] of fileVars.entries()) {
            this.secrets.set(key, value);
            process.env[key] = value;
        }
    }
    getWarnings() {
        const warnings = [];
        if (!fs.existsSync(this.envPath)) {
            warnings.push(`Warning: .env file not found at ${this.envPath}. Secrets must be provided via environment variables.`);
        }
        const gitignorePath = path.join(process.cwd(), '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
            if (!gitignore.includes('.env')) {
                warnings.push('Security Warning: .env file is not in .gitignore. Add it to prevent committing secrets.');
            }
        }
        return warnings;
    }
}
exports.EnvSecretStore = EnvSecretStore;
//# sourceMappingURL=EnvSecretStore.js.map