// utils.js

// --- Original variable for session caching ---
let _sessionPromise = null;
let _session = null;

// --- Schema definition remains unchanged ---
export const EVENT_SCHEMA = {
    type: "object",
    properties: {
        events: {
            type: "array",
            minItems: 0,
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    title:     { type: "string", minLength: 1 },
                    startDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                    startTime: { type: ["string", "null"], pattern: "^\\d{2}:\\d{2}(:\\d{2})?$" },
                    endDate:   { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                    endTime:   { type: ["string", "null"], pattern: "^\\d{2}:\\d{2}(:\\d{2})?$" },
                    timezone:  { type: ["string", "null"] },
                    venue:     { type: ["string", "null"] },
                    address:   { type: ["string", "null"] },
                    city:      { type: ["string", "null"] },
                    country:   { type: ["string", "null"] },
                    url:       { type: ["string", "null"] },
                    notes:     { type: ["string", "null"] },
                },
                required: ["title", "startDate"]
            }
        }
    },
    required: ["events"],
    additionalProperties: false
};

// --- Helper to check if Prompt API is available ---
export function promptApiSupported() {
    return typeof globalThis.LanguageModel !== "undefined";
}

// --- Session creator for Chrome’s LanguageModel API ---
// Returns a single cached session per tab.
// Also supports optional download progress monitoring.
export async function getSession(monitorHandlers) {
    if (_session) return _session;
    if (_sessionPromise) return _sessionPromise;

    _sessionPromise = (async () => {
        if (!promptApiSupported()) {
            const err = new Error("Chrome Prompt API is unavailable on this device/browser.");
            err.code = "UNAVAILABLE";
            throw err;
        }

        const availability = await LanguageModel.availability();
        if (availability === "unavailable") {
            const err = new Error("Chrome Prompt API is unavailable on this device/browser.");
            err.code = "UNAVAILABLE";
            throw err;
        }

        const monitor = monitorHandlers
            ? (m) => {
                let started = false;
                m.addEventListener("downloadprogress", (e) => {
                    if (!started) {
                        started = true;
                        monitorHandlers.onStart?.();
                    }
                    monitorHandlers.onProgress?.(e.loaded); // 0..1 progress
                    if (e.loaded >= 1) monitorHandlers.onDone?.();
                });
            }
            : undefined;

        // --- Create the model session once ---
        // The session stays alive for the lifetime of the tab.
        _session = await LanguageModel.create({
            expectedInputs:  [{ type: "text", languages: ["en"] }],
            expectedOutputs: [{ type: "text", languages: ["en"] }],
            temperature: 0.2,
            topK: 40,
            monitor,
        });

        return _session;
    })();

    return _sessionPromise;
}

// --- Preload / prewarm model to download it early ---
// This is called before first use to hide the long initial load time.
export async function prewarmModel(monitorHandlers) {
    return getSession(monitorHandlers);
}

// --- Reset the session manually (rarely needed) ---
export function resetSession() {
    _session = null;
    _sessionPromise = null;
}
