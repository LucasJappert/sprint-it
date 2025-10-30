/**
 * Utilidades para manejo y formateo de fechas
 */

/**
 * Formatea una fecha como fecha relativa (hace cuánto tiempo)
 * Ejemplos: "Just now", "5 minutes ago", "2 hours ago", "3 days ago", "12/03/2025"
 */
export const formatRelativeDate = (date: Date): string => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInMs = now.getTime() - commentDate.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
        const minutes = Math.floor(diffInMs / (1000 * 60));
        return minutes <= 1 ? "Just now" : `${minutes} minutes ago`;
    }
    if (diffInDays < 1) {
        const hours = Math.floor(diffInHours);
        return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    }
    if (diffInDays < 7) {
        const days = Math.floor(diffInDays);
        return days === 1 ? "1 day ago" : `${days} days ago`;
    }
    return commentDate.toLocaleDateString();
};

/**
 * Formatea una fecha en formato local argentino
 * Ejemplos: "29 oct 2025, 18:17"
 */
export const formatLocalDate = (date: Date): string => {
    return date.toLocaleString("es-AR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

/**
 * Formatea una fecha en formato ISO sin milisegundos y con offset de timezone
 * Ejemplo: "2025-10-29 18:17:28" (UTC-3)
 */
export const formatISODate = (date: Date): string => {
    return new Date(date.getTime() - 3 * 60 * 60 * 1000)
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d{3}Z$/, "")
        .replace("Z", "");
};

/**
 * Formatea una fecha para mostrar en headers o títulos
 * Ejemplos: "2025", "29 oct", "29 oct 2025"
 */
export const formatHeaderDate = (date: Date, includeYear = false): string => {
    const options: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
    };

    if (includeYear) {
        options.year = "numeric";
    }

    return date.toLocaleDateString("es-AR", options);
};
