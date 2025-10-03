import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { io, Socket } from 'socket.io-client';

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
     * Login user with new endpoint
     * @param loginData Login data
     * @returns Promise with login response
     */
    public async login(loginData: {
        email: string;
        password: string;
    }): Promise<AxiosResponse> {
        return this.axiosInstance.post('/auth/login', loginData);
    }

    /**
     * Refresh authentication token
     * @param refreshToken Refresh token
     * @returns Promise with new token
     */
    public async refreshToken(refreshToken: string): Promise<AxiosResponse> {
        return this.axiosInstance.post('/auth/refresh', { refreshToken });
    }

    // ==================== CODEGPT ENDPOINTS ====================

    /**
     * Create a new CodeGPT session
     * @param sessionData Session configuration data
     * @returns Promise with session response
     */
    public async createCodeGPTSession(sessionData: {
        type: 'live';
        masking_rules: Record<string, any>;
    }): Promise<AxiosResponse> {
        console.log('🚀 Creating CodeGPT session...');
        console.log('📤 Session data:', sessionData);
        console.log('🌐 API Base URL:', this.baseURL);
        console.log('🔗 Full endpoint URL:', `${this.baseURL}/v1/codegpt/sessions`);
        console.log('🔑 Auth token present:', !!this.axiosInstance.defaults.headers.common['Authorization']);
        
        const response = await this.axiosInstance.post('/v1/codegpt/sessions', sessionData);
        
        console.log('✅ CodeGPT session created successfully');
        console.log('📥 Session response:', response.data);
        
        return response;
    }

    /**
     * Get session insights
     * @param sessionId Session ID
     * @returns Promise with insights response
     */
    public async getSessionInsights(sessionId: string): Promise<AxiosResponse> {
        console.log('🔍 Getting insights for session:', sessionId);
        console.log('🌐 API Base URL:', this.baseURL);
        console.log('🔗 Full endpoint URL:', `${this.baseURL}/v1/codegpt/sessions/${sessionId}/insights`);
        console.log('🔑 Auth token present:', !!this.axiosInstance.defaults.headers.common['Authorization']);
        
        // Ensure Authorization header is present
        const currentAuth = this.axiosInstance.defaults.headers.common['Authorization'] as string | undefined;
        if (!currentAuth) {
            const FALLBACK_TOKEN = '2f3bcfaf11d2d909ed90d2ec706114e15b15a7f5642af4f9a385266c4d210f56';
            console.log('⚠️ No Authorization header set. Applying fallback bearer token for insights call.');
            this.setAuthToken(FALLBACK_TOKEN);
        } else {
            console.log('🔐 Using existing Authorization header for insights call:', currentAuth?.substring(0, 20) + '...');
        }
        
        const response = await this.axiosInstance.get(`/v1/codegpt/sessions/${sessionId}/insights`);
        
        console.log('✅ Session insights retrieved successfully');
        console.log('📥 Insights response:', response.data);
        
        return response;
    }

    // ==================== WEBSOCKET METHODS ====================

    /**
     * Create WebSocket connection
     * @param endpoint WebSocket endpoint
     * @returns WebSocket instance
     */
    // public createWebSocket(endpoint: string): WebSocket {
    //     const wsUrl = this.baseURL.replace('http', 'ws') + endpoint;
    //     console.log(`🔌 Creating WebSocket connection to: ${wsUrl}`);
    //     return new WebSocket(wsUrl);
    // }

    /**
     * Create authenticated WebSocket connection
     * @param endpoint WebSocket endpoint
     * @param token Authentication token
     * @returns WebSocket instance
     */
    // public createAuthenticatedWebSocket(endpoint: string, token: string): WebSocket {
    //     const wsUrl = this.baseURL.replace('http', 'ws') + endpoint + `?token=${token}`;
    //     console.log(`🔌 Creating authenticated WebSocket connection to: ${wsUrl}`);
    //     return new WebSocket(wsUrl);
    // }

    // ==================== SOCKET.IO METHODS ====================

    /**
     * Establish Socket.IO connection after session creation
     * @param sessionId The session ID from the CodeGPT session
     * @param callbacks Object containing callback functions for socket events
     * @returns Promise with Socket instance
     */
    public async establishSocketConnection(
        sessionId: string, 
        callbacks: {
            onConnect?: (socket: Socket) => void;
            onDisconnect?: (reason: string) => void;
            onConnectError?: (error: Error) => void;
            onSubscribed?: (data: any) => void;
            onUnsubscribed?: (data: any) => void;
            onRunCompleted?: (data: any) => void;
            onSessionUpdated?: (data: any) => void;
            onError?: (error: any) => void;
        } = {}
    ): Promise<Socket> {
        try {
            // Get the current auth token from axios headers
            const authHeader = this.axiosInstance.defaults.headers.common['Authorization'] as string;
            console.log('🔍 Raw Authorization header:', authHeader);
            
            const AUTH_TOKEN = '2f3bcfaf11d2d909ed90d2ec706114e15b15a7f5642af4f9a385266c4d210f56';
            console.log('🔑 Extracted AUTH_TOKEN:', AUTH_TOKEN);
            console.log('🔑 Token length:', AUTH_TOKEN ? AUTH_TOKEN.length : 0);
            console.log('🔑 Token type:', typeof AUTH_TOKEN);
            
            if (!AUTH_TOKEN) {
                console.error('❌ No authentication token found!');
                console.log('📊 Available headers:', this.axiosInstance.defaults.headers.common);
                throw new Error('No authentication token found. Please login first.');
            }

            // Connect to Socket.IO server
            const SOCKET_URL = 'http://localhost:3001';
            console.log('🔌 Connecting to Socket.IO server:', SOCKET_URL);
            console.log('🔑 Using AUTH_TOKEN:', AUTH_TOKEN);
            console.log('📋 Session ID:', sessionId);
            console.log('📊 Socket auth object:', { token: AUTH_TOKEN });
            
            const socket = io(SOCKET_URL, {
                auth: {
                    token: AUTH_TOKEN
                },
                query: {
                    token: AUTH_TOKEN
                },
                extraHeaders: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`
                },
                transports: ['polling'],
                forceNew: true,
                timeout: 10000
            });

            socket.on('connect', () => {
                console.log('✅ Socket.IO connected successfully');
                console.log(`📡 Socket ID: ${socket.id}`);
                
                // Subscribe to company notifications
                console.log('📡 Subscribing to company notifications...');
                socket.emit('subscribe-company');
                
                // Call the onConnect callback if provided
                if (callbacks.onConnect) {
                    callbacks.onConnect(socket);
                }
            });

            socket.on('disconnect', (reason) => {
                console.log(`❌ Socket.IO disconnected: ${reason}`);
                
                // Call the onDisconnect callback if provided
                if (callbacks.onDisconnect) {
                    callbacks.onDisconnect(reason);
                }
            });

            socket.on('connect_error', (error) => {
                console.error('❌ Socket.IO connection error:', error.message);
                console.error('🔍 Error details:', error);
                console.error('🔍 Error name:', error.name);
                console.error('🔍 Error stack:', error.stack);
                console.error('🔍 Full error object:', JSON.stringify(error, null, 2));
                
                // Check if error has additional properties (Socket.IO specific)
                const errorAny = error as any;
                if (errorAny.type) console.error('🔍 Error type:', errorAny.type);
                if (errorAny.description) console.error('🔍 Error description:', errorAny.description);
                if (errorAny.context) console.error('🔍 Error context:', errorAny.context);
                if (errorAny.data) console.error('🔍 Error data:', errorAny.data);
                
                // Call the onConnectError callback if provided
                if (callbacks.onConnectError) {
                    callbacks.onConnectError(error);
                }
            });

            socket.on('subscribed', (data) => {
                console.log('✅ Successfully subscribed to company notifications');
                console.log(`📊 Company ID: ${data.companyId}`);
                console.log(`💬 Message: ${data.message}`);
                console.log('📋 Full subscription data:', data);
                
                // Call the onSubscribed callback if provided
                if (callbacks.onSubscribed) {
                    callbacks.onSubscribed(data);
                }
            });

            socket.on('unsubscribed', (data) => {
                console.log('✅ Successfully unsubscribed from company notifications');
                console.log(`📊 Company ID: ${data.companyId}`);
                console.log(`💬 Message: ${data.message}`);
                console.log('📋 Full unsubscription data:', data);
                
                // Call the onUnsubscribed callback if provided
                if (callbacks.onUnsubscribed) {
                    callbacks.onUnsubscribed(data);
                }
            });

            // Run completion notifications
            socket.on('run-completed', (data) => {
                console.log('🎯 Run completed notification received!');
                console.log('📋 Run Details:', data);
                
                const run = data.run;
                if (run && run.action === 'track') {
                    console.log('🎯 Track run detected:', run);
                    console.log('📊 Run action:', run.action);
                    console.log('📊 Run data:', run);
                }
                
                // Call the onRunCompleted callback if provided
                if (callbacks.onRunCompleted) {
                    callbacks.onRunCompleted(data);
                }
            });

            // Session update notifications
            socket.on('session-updated', (data) => {
                console.log('🔄 Session updated notification received!');
                console.log('📋 Session Details:', data);
                
                // Call the onSessionUpdated callback if provided
                if (callbacks.onSessionUpdated) {
                    callbacks.onSessionUpdated(data);
                }
            });

            socket.on('error', (error) => {
                console.error('❌ Socket error:', error);
                
                // Call the onError callback if provided
                if (callbacks.onError) {
                    callbacks.onError(error);
                }
            });

            // Add a catch-all listener for any unhandled events (simplified logging)
            socket.onAny((event: string, ...args: any[]) => {
                console.log(`🔔 [WEBSOCKET EVENT] ${event.toUpperCase()}:`, args);
                console.log(`📊 [WEBSOCKET DATA] Event: ${event} | Timestamp: ${new Date().toISOString()}`);
                console.log('─'.repeat(60));
            });

            // Add listeners for all possible events from your backend
            socket.on('subscribed', (data) => {
                console.log('✅ Successfully subscribed to company notifications');
                console.log(`📊 Company ID: ${data.companyId} | Message: ${data.message}`);
                
                // Call the onSubscribed callback if provided
                if (callbacks.onSubscribed) {
                    callbacks.onSubscribed(data);
                }
            });

            socket.on('unsubscribed', (data) => {
                console.log('✅ Successfully unsubscribed from company notifications');
                console.log(`📊 Company ID: ${data.companyId} | Message: ${data.message}`);
                
                // Call the onUnsubscribed callback if provided
                if (callbacks.onUnsubscribed) {
                    callbacks.onUnsubscribed(data);
                }
            });

            // Run completion notifications
            socket.on('run-completed', (data) => {
                console.log('🎯 Run completed notification received!');
                console.log('📋 Run Details:', data);
                
                const run = data.run;
                if (run && run.action === 'track') {
                    console.log('🎯 Track run detected - Action:', run.action, '| Status:', run.status);
                }
                
                // Call the onRunCompleted callback if provided
                if (callbacks.onRunCompleted) {
                    callbacks.onRunCompleted(data);
                }
            });

            // Session update notifications
            socket.on('session-updated', (data) => {
                console.log('🔄 Session updated notification received!');
                console.log('📋 Session Details:', data);
                
                // Call the onSessionUpdated callback if provided
                if (callbacks.onSessionUpdated) {
                    callbacks.onSessionUpdated(data);
                }
            });

            return socket;

        } catch (error) {
            console.error('❌ Error establishing Socket.IO connection:', error);
            throw error;
        }
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
