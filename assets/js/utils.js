/**
 * Safely escapes HTML characters in a string to prevent XSS.
 * @param {string} str - The string to escape.
 * @returns {string} - The escaped string.
 */
export function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Escapes characters in a string to be safely used inside a Javascript string literal (e.g. onclick arguments).
 * @param {string} str - The string to escape.
 * @returns {string} - The escaped string.
 */
export function escapeJs(str) {
    if (!str) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"');
}
