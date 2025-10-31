// frontend/CalAIder-frontend/src/utils/timeFormatUtils.js

/**
 * Parses various time formats (e.g., "7 PM", "14:30", "noon") and converts to HH:mm:ss.
 * @param {string} timeStr The time string to parse.
 * @returns {string|null} The formatted time string or null if parsing fails.
 */
export const parseAndFormatTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;

    let hours = 0;
    let minutes = 0;
    const lowerCaseTime = timeStr.toLowerCase().trim();

    // Handle keywords
    if (lowerCaseTime === 'noon') return '12:00:00';
    if (lowerCaseTime === 'midnight') return '00:00:00';

    // Handle AM/PM format, e.g., "7pm", "8:30 am"
    const amPmMatch = lowerCaseTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/);
    if (amPmMatch) {
        hours = parseInt(amPmMatch[1], 10);
        minutes = amPmMatch[2] ? parseInt(amPmMatch[2], 10) : 0;
        const period = amPmMatch[3];

        if (period === 'pm' && hours < 12) {
            hours += 12;
        } else if (period === 'am' && hours === 12) { // Midnight case
            hours = 0;
        }
    } else {
        // Handle 24-hour format, e.g., "14:30", "09:00"
        const militaryMatch = lowerCaseTime.match(/(\d{1,2}):(\d{2})/);
        if (militaryMatch) {
            hours = parseInt(militaryMatch[1], 10);
            minutes = parseInt(militaryMatch[2], 10);
        } else {
            // Handle simple hour format, e.g., "7" (assume AM/PM based on context if possible, but here we can't)
            const simpleHourMatch = lowerCaseTime.match(/^(\d{1,2})$/);
            if (simpleHourMatch) {
                hours = parseInt(simpleHourMatch[1], 10);
                // Naive assumption: if hour is < 8, it's likely PM. This is a weak assumption.
                if (hours > 0 && hours < 8) {
                    hours += 12;
                }
            } else {
                return null; // Cannot parse
            }
        }
    }

    if (hours > 23 || minutes > 59) return null;

    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:00`;
};
