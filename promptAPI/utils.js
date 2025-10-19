let _sessionPromise = null;

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

export async function getSession(monitorHandlers) {
    if (_sessionPromise) return _sessionPromise;

    _sessionPromise = (async () => {
        const availability = await LanguageModel.availability();
        if (availability === 'unavailable') {
            const err = new Error('Chrome Prompt API is unavailable on this device/browser.');
            err.code = 'UNAVAILABLE';
            throw err;
        }

        // download progress monitor
        const monitor = monitorHandlers
          ? (m) => {
              let started = false;
              m.addEventListener('downloadprogress', (e) => {
                  if (!started) { started = true; monitorHandlers.onStart?.(); }
                  monitorHandlers.onProgress?.(e.loaded);  // 0..1
                  if (e.loaded >= 1) monitorHandlers.onDone?.();
              });
            }
          : undefined;

        return LanguageModel.create({
            expectedInputs:  [{ type: 'text', languages: ['en'] }],
            expectedOutputs: [{ type: 'text', languages: ['en'] }],
            temperature: 0.2,
            topK: 40,
            monitor,   
        });
    })();

    return _sessionPromise;
}

export function resetSession() { _sessionPromise = null; }
