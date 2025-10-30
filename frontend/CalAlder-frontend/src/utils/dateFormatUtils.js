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
