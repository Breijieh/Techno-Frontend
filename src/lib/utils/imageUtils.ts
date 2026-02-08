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
 * If the path is a relative path starting with /uploads, it prepends the backend base URL.
 * If the path is already a full URL (http/https), it returns it as is.
 * If the path is null or undefined, it returns undefined.
 * 
 * @param path The image path or URL
 * @returns The resolved full URL or undefined
 */
export const resolveImageUrl = (path: string | null | undefined): string | undefined => {
    if (!path) return undefined;

    // Log for debugging
    // console.log('Resolving Image URL - Input:', path);

    // If it's already a full URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // Try to handle both /uploads and uploads
    // Backend saves as /uploads/..., but just in case
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    if (cleanPath.startsWith('/uploads')) {
        // Ensure we don't have double slashes if BACKEND_BASE_URL ends with /
        const baseUrl = BACKEND_BASE_URL.endsWith('/') ? BACKEND_BASE_URL.slice(0, -1) : BACKEND_BASE_URL;
        const finalUrl = `${baseUrl}${cleanPath}`;

        // Console log strictly for debugging the user's issue
        console.log(`[ImageUtils] Resolved: ${path} -> ${finalUrl}`);

        return finalUrl;
    }

    // Return original for other cases (e.g. data:image/...)
    return path;
};
