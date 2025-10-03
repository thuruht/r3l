/**
 * R3L:F Centralized Authentication System
 * Handles all authentication state and API calls consistently
 */

class R3LAuth {
    constructor() {
        this.user = null;
        this.isInitialized = false;
        this.debug = true;
        this.log('Auth system initializing...');
    }

    log(message, data = null) {
        if (this.debug) {
            console.log(`[R3L-Auth] ${message}`, data || '');
        }
    }

    error(message, error = null) {
        console.error(`[R3L-Auth] ${message}`, error || '');
    }

    // Check if user has valid session
    isAuthenticated() {
        const hasSession = document.cookie.includes('r3l_session=');
        this.log('Authentication check', { hasSession, cookies: document.cookie });
        return hasSession;
    }

    // Get current user data
    async getCurrentUser() {
        if (this.user) return this.user;
        
        if (!this.isAuthenticated()) {
            this.log('No authentication, returning null user');
            return null;
        }

        try {
            this.log('Fetching current user profile...');
            const response = await this.apiGet('/api/profile');
            this.user = response;
            this.log('User profile loaded', this.user);
            return this.user;
        } catch (error) {
            this.error('Failed to get current user', error);
            this.clearAuth();
            return null;
        }
    }

    // Clear authentication state
    clearAuth() {
        this.log('Clearing authentication state');
        this.user = null;
        document.cookie = 'r3l_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    }

    // Logout user
    logout() {
        this.log('Logging out user');
        this.clearAuth();
        window.location.href = '/auth/login.html?message=' + encodeURIComponent('You have been logged out');
    }

    // Secure fetch with authentication
    async authenticatedFetch(url, options = {}) {
        const finalOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        this.log(`API Request: ${options.method || 'GET'} ${url}`, finalOptions);

        try {
            const response = await fetch(url, finalOptions);
            
            this.log(`API Response: ${response.status} ${response.statusText}`, {
                url,
                status: response.status,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (response.status === 401) {
                this.error('Unauthorized request, clearing auth');
                this.clearAuth();
                window.location.href = '/auth/login.html?message=' + encodeURIComponent('Please log in to continue');
                return response;
            }
            
            return response;
        } catch (error) {
            this.error('Fetch error', error);
            throw error;
        }
    }

    // API helper methods
    async apiGet(endpoint) {
        try {
            const response = await this.authenticatedFetch(endpoint);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            this.error('GET request failed', { endpoint, error });
            throw error;
        }
    }

    async apiPost(endpoint, data = {}) {
        try {
            const response = await this.authenticatedFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            this.error('POST request failed', { endpoint, data, error });
            throw error;
        }
    }

    async apiPatch(endpoint, data = {}) {
        try {
            const response = await this.authenticatedFetch(endpoint, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            this.error('PATCH request failed', { endpoint, data, error });
            throw error;
        }
    }

    async apiDelete(endpoint) {
        try {
            const response = await this.authenticatedFetch(endpoint, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            this.error('DELETE request failed', { endpoint, error });
            throw error;
        }
    }

    // Initialize auth system
    async init() {
        if (this.isInitialized) return;
        
        this.log('Initializing auth system...');
        
        if (this.isAuthenticated()) {
            await this.getCurrentUser();
        }
        
        this.isInitialized = true;
        this.log('Auth system initialized', { user: this.user });
    }
}

// Create global instance
window.r3l = new R3LAuth();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.r3l.init());
} else {
    window.r3l.init();
}