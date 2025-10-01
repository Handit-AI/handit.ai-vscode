import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

/**
 * API Service Singleton
 * Centralized service for all API calls and WebSocket connections
 */
export class ApiService {
    private static instance: ApiService;
    private axiosInstance: AxiosInstance;
    private baseURL: string;

    /**
     * Private constructor - only accessible from within the class
     */
    private constructor() {
        this.baseURL = 'http://localhost:3001/api';
        
        // Create axios instance with default configuration
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Setup interceptors
        this.setupInterceptors();
    }

    /**
     * Get the singleton instance
     * @returns ApiService instance
     */
    public static getInstance(): ApiService {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }

    /**
     * Setup request and response interceptors
     */
    private setupInterceptors(): void {
        // Request interceptor
        this.axiosInstance.interceptors.request.use(
            (config) => {
                console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
                console.log('📤 Request data:', config.data);
                return config;
            },
            (error) => {
                console.error('❌ Request interceptor error:', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.axiosInstance.interceptors.response.use(
            (response: AxiosResponse) => {
                console.log(`✅ API Response: ${response.status} ${response.config.url}`);
                console.log('📥 Response data:', response.data);
                return response;
            },
            (error: AxiosError) => {
                console.error(`❌ API Error: ${error.response?.status || 'Network'} ${error.config?.url}`);
                console.error('📥 Error details:', error.response?.data || error.message);
                return Promise.reject(error);
            }
        );
    }

    /**
     * Update base URL (useful for different environments)
     * @param newBaseURL New base URL
     */
    public setBaseURL(newBaseURL: string): void {
        this.baseURL = newBaseURL;
        this.axiosInstance.defaults.baseURL = newBaseURL;
    }

    /**
     * Get current base URL
     * @returns Current base URL
     */
    public getBaseURL(): string {
        return this.baseURL;
    }

    /**
     * Set authorization token
     * @param token Authorization token
     */
    public setAuthToken(token: string): void {
        this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    /**
     * Remove authorization token
     */
    public removeAuthToken(): void {
        delete this.axiosInstance.defaults.headers.common['Authorization'];
    }

    // ==================== AUTH ENDPOINTS ====================

    /**
     * Sign up a new company
     * @param signupData Signup data
     * @returns Promise with signup response
     */
    public async signupCompany(signupData: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }): Promise<AxiosResponse> {
        return this.axiosInstance.post('/auth/signup-company', signupData);
    }

    /**
     * Sign in a company
     * @param loginData Login data
     * @returns Promise with login response
     */
    public async signinCompany(loginData: {
        email: string;
        password: string;
    }): Promise<AxiosResponse> {
        return this.axiosInstance.post('/auth/signin-company', loginData);
    }

    /**
     * Refresh authentication token
     * @param refreshToken Refresh token
     * @returns Promise with new token
     */
    public async refreshToken(refreshToken: string): Promise<AxiosResponse> {
        return this.axiosInstance.post('/auth/refresh', { refreshToken });
    }

    // ==================== WEBSOCKET METHODS ====================

    /**
     * Create WebSocket connection
     * @param endpoint WebSocket endpoint
     * @returns WebSocket instance
     */
    public createWebSocket(endpoint: string): WebSocket {
        const wsUrl = this.baseURL.replace('http', 'ws') + endpoint;
        console.log(`🔌 Creating WebSocket connection to: ${wsUrl}`);
        return new WebSocket(wsUrl);
    }

    /**
     * Create authenticated WebSocket connection
     * @param endpoint WebSocket endpoint
     * @param token Authentication token
     * @returns WebSocket instance
     */
    public createAuthenticatedWebSocket(endpoint: string, token: string): WebSocket {
        const wsUrl = this.baseURL.replace('http', 'ws') + endpoint + `?token=${token}`;
        console.log(`🔌 Creating authenticated WebSocket connection to: ${wsUrl}`);
        return new WebSocket(wsUrl);
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Get axios instance for custom requests
     * @returns Axios instance
     */
    public getAxiosInstance(): AxiosInstance {
        return this.axiosInstance;
    }

    /**
     * Make a custom GET request
     * @param url Endpoint URL
     * @param config Optional axios config
     * @returns Promise with response
     */
    public async get(url: string, config?: any): Promise<AxiosResponse> {
        return this.axiosInstance.get(url, config);
    }

    /**
     * Make a custom POST request
     * @param url Endpoint URL
     * @param data Request data
     * @param config Optional axios config
     * @returns Promise with response
     */
    public async post(url: string, data?: any, config?: any): Promise<AxiosResponse> {
        return this.axiosInstance.post(url, data, config);
    }

    /**
     * Make a custom PUT request
     * @param url Endpoint URL
     * @param data Request data
     * @param config Optional axios config
     * @returns Promise with response
     */
    public async put(url: string, data?: any, config?: any): Promise<AxiosResponse> {
        return this.axiosInstance.put(url, data, config);
    }

    /**
     * Make a custom DELETE request
     * @param url Endpoint URL
     * @param config Optional axios config
     * @returns Promise with response
     */
    public async delete(url: string, config?: any): Promise<AxiosResponse> {
        return this.axiosInstance.delete(url, config);
    }
}

// Export singleton instance
export const apiService = ApiService.getInstance();
