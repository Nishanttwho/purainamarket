const STORAGE_KEY = "puraina.pendingReferral";
const REFERRAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const getReferralCodeFromSearch = (search = "") => {
    const code = new URLSearchParams(search).get("ref")?.trim().toUpperCase() || "";
    return /^[A-Z0-9_-]{2,64}$/.test(code) ? code : "";
};

export const persistReferralCodeFromSearch = (search, { storage = globalThis.sessionStorage, hasExistingSession = false } = {}) => {
    if (!storage) return "";
    if (hasExistingSession) {
        storage.removeItem(STORAGE_KEY);
        return "";
    }
    const code = getReferralCodeFromSearch(search);
    if (!code) return getPendingReferralCode(storage);
    storage.setItem(STORAGE_KEY, JSON.stringify({ code, savedAt: Date.now() }));
    return code;
};

export const getPendingReferralCode = (storage = globalThis.sessionStorage) => {
    if (!storage) return "";
    try {
        const saved = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
        if (!saved || !getReferralCodeFromSearch(`?ref=${encodeURIComponent(saved.code || "")}`)
            || !Number.isFinite(saved.savedAt) || Date.now() - saved.savedAt > REFERRAL_TTL_MS) {
            storage.removeItem(STORAGE_KEY);
            return "";
        }
        return saved.code;
    } catch {
        storage.removeItem(STORAGE_KEY);
        return "";
    }
};

export const clearPendingReferralCode = (storage = globalThis.sessionStorage) => storage?.removeItem(STORAGE_KEY);
