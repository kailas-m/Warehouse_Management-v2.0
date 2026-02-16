import axios from "axios";

// Using Vite environment variable or defaulting to localhost
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 & Token Refresh + Debug Logging
api.interceptors.response.use(
    (response) => {
        // Debug logging for unexpected response shapes
        if (import.meta.env.VITE_DEBUG_DASHBOARD === 'true') {
            const url = response.config.url;
            const data = response.data;

            // Log warnings for common shape mismatches
            if (url?.includes('/list/') && !Array.isArray(data) && !data?.results) {
                console.warn(`[API Debug] Unexpected response shape for ${url}:`, data);
                console.warn('[API Debug] Expected array or {results: [...]} but got:', typeof data);
            }
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // If 401 Unauthorized and not already retrying
        if (
            error.response &&
            error.response.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes("/auth/login")
        ) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem("refresh_token");
                if (refreshToken) {
                    const res = await axios.post(`${BASE_URL}/auth/refresh/`, {
                        refresh: refreshToken,
                    });

                    // Save new access token
                    localStorage.setItem("access_token", res.data.access);

                    // Update header and retry original request
                    originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                // Clear tokens and redirect to login
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("user_role");
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);

export default api;
