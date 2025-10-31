export function formatDate(dateObj) {
    if (!dateObj) return "";
    const date = new Date(dateObj.dateTime || dateObj.date);
    return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Format detected event date/time in "Nov 1, 10:30 AM - Nov 1, 01:30 PM" format
 * @param {object} event - Event object with startDate, startTime, endDate, endTime
 * @returns {string} Formatted date range string
 */
export function formatEventDateTime(event) {
    if (!event.startDate) return "";

    // Treat YYYY-MM-DD as a date-only (no timezone) to avoid UTC shifting by new Date()
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const parseYMD = (ymd) => {
        if (!ymd || typeof ymd !== 'string') return null;
        const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        const year = Number(m[1]);
        const month = Number(m[2]);
        const day = Number(m[3]);
        return { year, month, day, monthShort: monthNames[month - 1] };
    };

    // Helper to format time in 12-hour format with AM/PM
    const formatTime = (timeStr) => {
        if (!timeStr) return null;

        // Parse HH:mm or HH:mm:ss format
        const match = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (!match) return null;

        let hours = parseInt(match[1], 10);
        const minutes = match[2];
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12 || 12; // Convert to 12-hour format

        return `${hours}:${minutes} ${ampm}`;
    };

    // Parse start date (date-only safe)
    const startParts = parseYMD(event.startDate);
    const startMonth = startParts ? startParts.monthShort : new Date(event.startDate).toLocaleString('en-US', { month: 'short' });
    const startDay = startParts ? startParts.day : new Date(event.startDate).getDate();

    // Format start time if available
    const startTimeFormatted = formatTime(event.startTime);

    // Build start string
    let result = `${startMonth} ${startDay}`;
    if (startTimeFormatted) {
        result += `, ${startTimeFormatted}`;
    }

    // Add end date/time if available
    if (event.endDate || event.endTime) {
        const endParts = event.endDate ? parseYMD(event.endDate) : startParts;
        const endMonth = endParts ? endParts.monthShort : new Date(event.endDate || event.startDate).toLocaleString('en-US', { month: 'short' });
        const endDay = endParts ? endParts.day : new Date(event.endDate || event.startDate).getDate();
        const endTimeFormatted = formatTime(event.endTime);

        result += ' - ';

        // Only show end date if different from start date
        if (event.endDate && event.endDate !== event.startDate) {
            result += `${endMonth} ${endDay}`;
            if (endTimeFormatted) result += `, ${endTimeFormatted}`;
        } else if (endTimeFormatted) {
            // Same day, just show end time
            result += endTimeFormatted;
        }
    }

    return result;
}
