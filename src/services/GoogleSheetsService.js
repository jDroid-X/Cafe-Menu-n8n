// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT
// Service: GoogleSheetsService
// Decrypts n8n OAuth2 credentials and provides direct
// Google Sheets API v4 read/write with automatic token refresh.
// ==========================================================

"use strict";

const fs     = require("node:fs");
const crypto = require("node:crypto");
const https  = require("node:https");
const { DatabaseSync } = require("node:sqlite");

// Singleton cache
let _cachedToken = null;
let _cred = null;

class GoogleSheetsService {
    constructor() {
        this.n8nDbPath      = process.env.N8N_DB_PATH     || "C:/Users/jiten/.n8n/database.sqlite";
        this.n8nConfigPath  = process.env.N8N_CONFIG_PATH || "C:/Users/jiten/.n8n/config";
        this.credentialId   = "93xN3gnk32S67PtE";
        this.spreadsheetId  = "1zipJC7y1Oa43PWMZHrotGd-lO8v54Xfq70bOLQUATcE";
        this.ordersSheet    = "Orders";
        this.inventorySheet = "Inventory";
        this.faqSheet       = "FAQ";
    }

    static getInstance() {
        if (!GoogleSheetsService._instance) {
            GoogleSheetsService._instance = new GoogleSheetsService();
        }
        return GoogleSheetsService._instance;
    }

    _decryptN8n(encryptedData, encKey) {
        const buf  = Buffer.from(encryptedData, "base64");
        const salt = buf.slice(8, 16);
        const ct   = buf.slice(16);
        const out  = Buffer.alloc(48);
        let prev   = Buffer.alloc(0);
        for (let i = 0; i < 3; i++) {
            const h = crypto.createHash("md5").update(Buffer.concat([prev, Buffer.from(encKey), salt])).digest();
            h.copy(out, i * 16);
            prev = h;
        }
        const dec = crypto.createDecipheriv("aes-256-cbc", out.slice(0, 32), out.slice(32, 48));
        return JSON.parse(dec.update(ct, undefined, "utf8") + dec.final("utf8"));
    }

    _loadCredential() {
        if (_cred) return _cred;
        try {
            if (!fs.existsSync(this.n8nConfigPath)) return null;
            const cfg    = JSON.parse(fs.readFileSync(this.n8nConfigPath, "utf8"));
            const encKey = cfg.encryptionKey;
            if (!encKey) return null;
            const db  = new DatabaseSync(this.n8nDbPath, { readOnly: true });
            const row = db.prepare("SELECT data FROM credentials_entity WHERE id = ?").get(this.credentialId);
            db.close();
            if (!row) return null;
            _cred = this._decryptN8n(row.data, encKey);
            return _cred;
        } catch (err) {
            console.warn("[GoogleSheetsService] Credential load error:", err.message);
            return null;
        }
    }

    async _refreshToken(cred) {
        const body = new URLSearchParams({
            client_id:     cred.clientId,
            client_secret: cred.clientSecret,
            refresh_token: cred.oauthTokenData.refresh_token,
            grant_type:    "refresh_token"
        }).toString();
        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: "oauth2.googleapis.com",
                path: "/token",
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) }
            }, r => {
                let d = "";
                r.on("data", c => d += c);
                r.on("end", () => {
                    const parsed = JSON.parse(d);
                    if (parsed.access_token) {
                        _cachedToken = { access_token: parsed.access_token, expires_at: Date.now() + (parsed.expires_in - 60) * 1000 };
                        resolve(_cachedToken.access_token);
                    } else {
                        reject(new Error("Token refresh failed: " + d));
                    }
                });
            });
            req.on("error", reject);
            req.write(body);
            req.end();
        });
    }

    async _getAccessToken() {
        const cred = this._loadCredential();
        if (!cred) throw new Error("Google Sheets credential not found in n8n database");
        if (_cachedToken && _cachedToken.expires_at > Date.now()) return _cachedToken.access_token;
        return await this._refreshToken(cred);
    }

    _apiRequest(method, path, body, token) {
        return new Promise((resolve, reject) => {
            const bodyStr = body ? JSON.stringify(body) : null;
            const opts = {
                hostname: "sheets.googleapis.com",
                path,
                method,
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
            };
            if (bodyStr) opts.headers["Content-Length"] = Buffer.byteLength(bodyStr);
            const req = https.request(opts, r => {
                let d = "";
                r.on("data", c => d += c);
                r.on("end", () => {
                    try { resolve({ status: r.statusCode, data: JSON.parse(d) }); }
                    catch (_) { resolve({ status: r.statusCode, data: d }); }
                });
            });
            req.on("error", reject);
            if (bodyStr) req.write(bodyStr);
            req.end();
        });
    }

    // Read sheet rows as array of objects (header row = keys)
    async readSheet(sheetName, range) {
        range = range || "A:Z";
        const token    = await this._getAccessToken();
        const fullRange = `${sheetName}!${range}`;
        const res      = await this._apiRequest("GET", `/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(fullRange)}`, null, token);
        if (res.status !== 200) throw new Error(`Sheets read failed (${res.status}): ${JSON.stringify(res.data).substring(0, 200)}`);
        const values = res.data.values || [];
        if (values.length < 2) return [];
        const headers = values[0].map(h => String(h).toLowerCase().replace(/\s+/g, "_"));
        return values.slice(1).map(row => {
            const obj = {};
            headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ""; });
            return obj;
        });
    }

    // Append a row to sheet (maps object keys to column headers)
    async appendRow(sheetName, rowData) {
        const token = await this._getAccessToken();
        const hRes  = await this._apiRequest("GET",
            `/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(`${sheetName}!1:1`)}`, null, token);
        const headers = hRes.data?.values?.[0] || [];
        let rowValues;
        if (headers.length > 0) {
            rowValues = headers.map(h => {
                const key = h.toLowerCase().replace(/\s+/g, "_");
                return rowData[key] !== undefined ? rowData[key] : (rowData[h] !== undefined ? rowData[h] : "");
            });
        } else {
            rowValues = Object.values(rowData);
        }
        const body = { values: [rowValues] };
        const path = `/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(`${sheetName}!A:A`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
        const res  = await this._apiRequest("POST", path, body, token);
        if (res.status !== 200) throw new Error(`Sheets append failed (${res.status}): ${JSON.stringify(res.data).substring(0, 200)}`);
        return res.data;
    }

    // Append a confirmed order row to the Orders sheet
    async appendOrder(order) {
        const row = {
            "order_id":       order.order_code  || "",
            "customer_name":  order.customer_name || "",
            "phone":          order.customer_phone || "",
            "item":           order.item_name    || "",
            "quantity":       String(order.quantity || ""),
            "unit_price":     String(order.unit_price || ""),
            "total_amount":   String(order.total_amount || ""),
            "status":         order.status       || "Confirmed",
            "payment_status": order.payment_status || "Pending",
            "order_date":     order.order_date   || new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, ""),
            "source":         order.source       || "SIMULATOR",
            "notes":          order.notes        || ""
        };
        return await this.appendRow(this.ordersSheet, row);
    }

    // Health ping
    async ping() {
        try {
            const token = await this._getAccessToken();
            const res   = await this._apiRequest("GET",
                `/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent("Inventory!A1:B2")}`, null, token);
            return { ok: res.status === 200, status: res.status };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }
}

module.exports = GoogleSheetsService;
