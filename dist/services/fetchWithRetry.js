"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = fetchWithRetry;
const axios_1 = __importDefault(require("axios"));
async function fetchWithRetry(url, retries = 3, delayMs = 500) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await axios_1.default.get(url, { timeout: 10000 });
            if (res.status >= 200 && res.status < 300)
                return res.data;
            console.warn(`⚠️ fetch attempt ${i + 1} returned status ${res.status}`);
        }
        catch (err) {
            console.warn(`⚠️ fetch attempt ${i + 1} failed:`, err?.message || err);
        }
        await new Promise((r) => setTimeout(r, delayMs));
    }
    return null;
}
//# sourceMappingURL=fetchWithRetry.js.map