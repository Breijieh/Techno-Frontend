/**
 * Image Utility Functions
 */

// Get API URL from environment or default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Derive Backend Base URL
// We do NOT strip '/api' because the backend has server.servlet.context-path=/api
// So static resources are also served under /api/uploads/...
const BACKEND_BASE_URL = API_BASE_URL;

/**
 * Resolves the full URL for an image path.
 * Handles multiple path formats:
 * - Full URLs (http/https) - returned as-is
 * - /uploads/... - prepends backend URL
 * - uploads/... - prepends backend URL with leading slash
 * - 2026/02/... (date-based paths) - prepends backend URL + /uploads/
 * - null/undefined - returns undefined
 * 
 * @param path The image path or URL
 * @returns The resolved full URL or undefined
 */
export const resolveImageUrl = (path: string | null | undefined): string | undefined => {
    // Return undefined for null, undefined, empty, or whitespace-only paths
    if (!path || !path.trim()) return undefined;

    // If it's already a full URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // If it's a data URL, return it
    if (path.startsWith('data:')) {
        return path;
    }

    // Normalize the base URL (remove trailing slash if present)
    const baseUrl = BACKEND_BASE_URL.endsWith('/') ? BACKEND_BASE_URL.slice(0, -1) : BACKEND_BASE_URL;

    // Normalize the path
    let normalizedPath = path.trim();

    // Additional check: if after trimming nothing remains, return undefined
    if (!normalizedPath) return undefined;

    // If path starts with /uploads or uploads, it's a relative upload path
    if (normalizedPath.startsWith('/uploads/') || normalizedPath.startsWith('uploads/')) {
        // Ensure it starts with /
        if (!normalizedPath.startsWith('/')) {
            normalizedPath = '/' + normalizedPath;
        }
        const finalUrl = `${baseUrl}${normalizedPath}`;
        return finalUrl;
    }

    // If path looks like a date-based path (e.g., 2026/02/...), prepend /uploads/
    // This handles legacy paths that might be stored without the uploads prefix
    if (/^\d{4}\/\d{2}\//.test(normalizedPath)) {
        const finalUrl = `${baseUrl}/uploads/${normalizedPath}`;
        return finalUrl;
    }

    // For any other relative path, assume it's an upload path
    // This is a fallback to ensure we don't break anything
    if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath;
    }

    // If it doesn't look like a special path, return the original
    // This handles cases like data:image/... which we already checked above
    return path;
};
