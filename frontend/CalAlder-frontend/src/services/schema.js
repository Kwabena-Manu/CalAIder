// schema.js
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
                    title: { type: "string", minLength: 1 },
                    startDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                    startTime: { type: ["string", "null"], pattern: "^\\d{2}:\\d{2}(:\\d{2})?$" },
                    endDate: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                    endTime: { type: ["string", "null"], pattern: "^\\d{2}:\\d{2}(:\\d{2})?$" },
                    timezone: { type: ["string", "null"] },
                    venue: { type: ["string", "null"] },
                    address: { type: ["string", "null"] },
                    city: { type: ["string", "null"] },
                    country: { type: ["string", "null"] },
                    url: { type: ["string", "null"] },
                    notes: { type: ["string", "null"] },
                },
                required: ["title", "startDate"]
            }
        }
    },
    required: ["events"],
    additionalProperties: false
};