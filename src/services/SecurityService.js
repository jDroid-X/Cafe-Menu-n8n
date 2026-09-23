// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Service: SecurityService (Native node:crypto JWT & Password Security)
// Zero external binary dependencies (no bcrypt / jsonwebtoken required)
// ==========================================================

const crypto = require('node:crypto');
const ConfigService = require('./ConfigService');

class SecurityService {
    static instance = null;

    constructor() {
        if (SecurityService.instance) return SecurityService.instance;
        this.configService = ConfigService.getInstance();
        SecurityService.instance = this;
    }

    static getInstance() {
        if (!SecurityService.instance) {
            SecurityService.instance = new SecurityService();
        }
        return SecurityService.instance;
    }

    getSecret() {
        return this.configService.getJwtSecret() || process.env.JWT_SECRET || 'jdroid_cafe_menu_jwt_secret_2026';
    }

    /**
     * Hashes a password using native scrypt with a random salt
     * Format: salt:hexHash
     */
    hashPassword(password) {
        if (!password || typeof password !== 'string') {
            throw new Error('Password must be a non-empty string');
        }
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${hash}`;
    }

    /**
     * Verifies password against stored salt:hash or legacy hash
     */
    verifyPassword(password, storedHash) {
        if (!password || !storedHash) return false;

        // Salted scrypt format: salt:hash
        if (storedHash.includes(':')) {
            try {
                const [salt, key] = storedHash.split(':');
                const keyBuffer = Buffer.from(key, 'hex');
                const derivedKey = crypto.scryptSync(password, salt, 64);
                return crypto.timingSafeEqual(keyBuffer, derivedKey);
            } catch (err) {
                console.warn('[SecurityService] Password verification error:', err.message);
                return false;
            }
        }

        // Direct fallback for plain text or demo test accounts
        return password === storedHash;
    }

    /**
     * Signs a JWT using standard HS256 algorithm via native HMAC-SHA256
     */
    signToken(payload, expiresInSeconds = 28800) {
        const secret = this.getSecret();
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const now = Math.floor(Date.now() / 1000);
        const fullPayload = {
            ...payload,
            iat: now,
            exp: now + expiresInSeconds
        };
        const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
        const signature = crypto.createHmac('sha256', secret)
            .update(`${header}.${payloadB64}`)
            .digest('base64url');

        return `${header}.${payloadB64}.${signature}`;
    }

    /**
     * Verifies and decodes a JWT token string
     */
    verifyToken(token) {
        if (!token || typeof token !== 'string') {
            throw new Error('Authentication token required');
        }

        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Malformed token structure');
        }

        const [header, payloadB64, signature] = parts;
        const secret = this.getSecret();
        const expectedSig = crypto.createHmac('sha256', secret)
            .update(`${header}.${payloadB64}`)
            .digest('base64url');

        if (signature !== expectedSig) {
            throw new Error('Invalid token signature');
        }

        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
        const now = Math.floor(Date.now() / 1000);

        if (payload.exp && payload.exp < now) {
            throw new Error('Authentication token expired');
        }

        return payload;
    }

    /**
     * Seeds default admin, cfo, and manager users into the database if missing
     */
    seedDefaultUsers(db) {
        try {
            const defaultUsers = [
                { username: 'demo@jdroidx.ai', email: 'demo@jdroidx.ai', password: 'demo123', role: 'admin' },
                { username: 'admin@jdroidx.ai', email: 'admin@jdroidx.ai', password: 'admin123', role: 'admin' },
                { username: 'cfo@jdroidx.ai', email: 'cfo@jdroidx.ai', password: 'cfo123', role: 'admin' },
                { username: 'manager@jdroidx.ai', email: 'manager@jdroidx.ai', password: 'mgr123', role: 'user' }
            ];

            for (const u of defaultUsers) {
                const existing = db.queryOne('SELECT id FROM users WHERE email = ? OR username = ?', [u.email, u.username]);
                if (!existing) {
                    const hashed = this.hashPassword(u.password);
                    db.run(
                        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                        [u.username, u.email, hashed, u.role]
                    );
                }
            }
            console.log('[SecurityService] 🔐 Verified default users (demo, admin, cfo, manager)');
        } catch (err) {
            console.warn('[SecurityService] Default user seeding warning:', err.message);
        }
    }
}

module.exports = SecurityService;
