/**
 * API Client - Core utilities for making authenticated API requests
 */

import { getFirebaseAuth } from './firebase';

// API Base URL - uses environment variable or defaults based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (
    process.env.NODE_ENV === 'production'
        ? 'https://api.stumbnail.com'
        : 'http://localhost:4050'
);

/**
 * Standard API response format
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Get the current user's Firebase ID token for API authentication
 * Waits for auth state to be ready if needed
 */
async function getAuthToken(): Promise<string | null> {
    try {
        const auth = await getFirebaseAuth();

        // If currentUser is available, get token directly
        if (auth.currentUser) {
            return await auth.currentUser.getIdToken();
        }

        // Wait for auth state to be determined (handles initial load)
        return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged(async (user) => {
                unsubscribe();
                if (user) {
                    try {
                        const token = await user.getIdToken();
                        resolve(token);
                    } catch {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });

            // Timeout after 5 seconds to prevent hanging
            setTimeout(() => {
                unsubscribe();
                resolve(null);
            }, 5000);
        });
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
}

/**
 * Build headers for API requests
 */
async function buildHeaders(includeAuth: boolean = true): Promise<HeadersInit> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (includeAuth) {
        const token = await getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
}

/**
 * Handle API response and parse JSON
 */
async function handleResponse<T>(response: Response): Promise<T> {
    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error(`API Error: ${response.status} - Failed to parse response`);
    }

    if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data;
}

/**
 * Make an authenticated GET request
 */
export async function apiGet<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>
): Promise<T> {
    const url = new URL(`${API_BASE_URL}${endpoint}`);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                url.searchParams.append(key, String(value));
            }
        });
    }

    const headers = await buildHeaders();
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
    });

    return handleResponse<T>(response);
}

/**
 * Make an authenticated POST request
 */
export async function apiPost<T>(
    endpoint: string,
    body?: Record<string, unknown>
): Promise<T> {
    const headers = await buildHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    return handleResponse<T>(response);
}

/**
 * Make an authenticated DELETE request
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
    const headers = await buildHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers,
    });

    return handleResponse<T>(response);
}

/**
 * Make an authenticated PATCH request
 */
export async function apiPatch<T>(
    endpoint: string,
    body?: Record<string, unknown>
): Promise<T> {
    const headers = await buildHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    return handleResponse<T>(response);
}

export { API_BASE_URL };
