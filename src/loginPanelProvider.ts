import * as vscode from 'vscode';
import * as path from 'path';
import { apiService } from './services/ApiService';

/**
 * Provider for the login panel webview
 * Handles the webview creation and communication
 */
export class LoginPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'handitLogin.webview';

    constructor(private readonly _extensionUri: vscode.Uri) {}

    /**
     * Resolves the webview view
     * Called when the webview is first created or when the view becomes visible
     */
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        // Configure webview options
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri,
                vscode.Uri.joinPath(this._extensionUri, 'media'),
                vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist')
            ]
        };

        // Set the header title shown above the view
        webviewView.title = 'handit.ai';

        // Set the HTML content for the webview
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'login':
                        this._handleLogin(message.email, message.password, webviewView.webview);
                        return;
                    case 'signup':
                        this._handleSignup(message.email, message.password, webviewView.webview);
                        return;
                    case 'showMessage':
                        vscode.window.showInformationMessage(message.text);
                        return;
                }
            },
            undefined,
            []
        );
    }

    /**
     * Handles login attempts from the webview
     * @param email User email
     * @param password User password
     * @param webview The webview instance for sending responses
     */
    private async _handleLogin(email: string, password: string, webview: vscode.Webview) {
        try {
            // Prepare login data
            const loginData = {
                email: email,
                password: password
            };

            console.log('🚀 Attempting login with new endpoint...');
            console.log('📤 Login data:', loginData);

            // Use new login endpoint
            const response = await apiService.login(loginData);
            
            console.log('✅ Login response received');
            console.log('📥 Login response data:', response.data);
            
            // Store authentication token if provided
            if (response.data.token) {
                console.log('🔑 Token received from login response:', response.data.token);
                console.log('🔑 Token type:', typeof response.data.token);
                console.log('🔑 Token length:', response.data.token.length);
                apiService.setAuthToken(response.data.token);
                console.log('✅ Token stored in ApiService');
                vscode.window.showInformationMessage(`Login successful for ${email}!`);
                
                // Send success response to webview
                if (webview) {
                    webview.postMessage({
                        command: 'loginResponse',
                        success: true,
                        data: response.data
                    });
                }
                
                // Create CodeGPT session after successful login
                await this._createCodeGPTSession(webview);
            } else {
                console.log('⚠️ No token received from login response');
                console.log('📊 Login response data:', response.data);
                vscode.window.showInformationMessage(`Login successful for ${email}!`);
                
                // Send success response to webview
                if (webview) {
                    webview.postMessage({
                        command: 'loginResponse',
                        success: true,
                        data: response.data
                    });
                }
                
                // Create CodeGPT session after successful login
                await this._createCodeGPTSession(webview);
            }

        } catch (error: any) {
            console.error('❌ Login error:', error);
            console.error('📊 Error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message,
                code: error.code
            });

            // Handle different types of errors
            let errorMessage = 'Failed to login';
            if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Cannot connect to Handit.ai service. Please ensure it\'s running.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Invalid email or password.';
            } else if (error.response?.status === 400) {
                errorMessage = 'Invalid login data. Please check your information.';
            } else if (error.response?.status) {
                errorMessage = `Login error: ${error.response.status} ${error.response.statusText}`;
            }

            // Send error response to webview
            if (webview) {
                webview.postMessage({
                    command: 'loginResponse',
                    success: false,
                    error: errorMessage
                });
            }

            // Show error message in VS Code
            vscode.window.showErrorMessage(`Login failed: ${errorMessage}`);
        }
    }

    /**
     * Handles signup attempts from the webview
     * @param email User email
     * @param password User password
     * @param webview The webview instance for sending responses
     */
    private async _handleSignup(email: string, password: string, webview: vscode.Webview) {
        try {
            // Extract firstName from email (part before @)
            const firstName = email.split('@')[0];
            
            // Prepare signup data
            const signupData = {
                email: email,
                password: password,
                firstName: firstName,
                lastName: ""
            };

            // Use ApiService singleton for the API call
            const response = await apiService.signupCompany(signupData);
            
            // Store authentication token if provided
            if (response.data.token) {
                console.log('🔑 Token received from signup response:', response.data.token);
                console.log('🔑 Token type:', typeof response.data.token);
                console.log('🔑 Token length:', response.data.token.length);
                apiService.setAuthToken(response.data.token);
                console.log('✅ Token stored in ApiService');
            } else {
                console.log('⚠️ No token received from signup response');
                console.log('📊 Signup response data:', response.data);
            }
            
            // Send success response to webview
            webview.postMessage({
                command: 'signupResponse',
                success: true,
                data: response.data
            });

            // Show success message in VS Code
            vscode.window.showInformationMessage(`Signup successful for ${email}!`);
            
            // Create CodeGPT session after successful signup
            await this._createCodeGPTSession(webview);

        } catch (error: any) {
            // Handle different types of errors
            let errorMessage = 'Failed to create account';
            if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Cannot connect to Handit.ai service. Please ensure it\'s running.';
            } else if (error.response?.status === 400) {
                errorMessage = 'Invalid signup data. Please check your information.';
            } else if (error.response?.status === 409) {
                errorMessage = 'Account already exists with this email.';
            } else if (error.response?.status) {
                errorMessage = `Signup error: ${error.response.status} ${error.response.statusText}`;
            }

            // Send error response to webview
            webview.postMessage({
                command: 'signupResponse',
                success: false,
                error: errorMessage
            });

            // Show error message in VS Code
            vscode.window.showErrorMessage(`Signup failed: ${errorMessage}`);
        }
    }

    /**
     * Generates the HTML content for the webview
     * @param webview The webview instance
     * @returns HTML string
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get the path to the webview files
        const webviewPath = path.join(this._extensionUri.fsPath, 'webview', 'dist');
        const webviewUri = webview.asWebviewUri(vscode.Uri.file(webviewPath));

        // Check if we're in development mode
        const config = vscode.workspace.getConfiguration('handitLogin');
        const devMode = config.get<boolean>('devMode', false);

        if (devMode) {
            // In development mode, load from localhost
            return this._getDevHtml(webview);
        } else {
            // In production mode, load from bundled files
            return this._getProductionHtml(webview, webviewUri);
        }
    }

    /**
     * Generates HTML for development mode (localhost)
     * @param webview The webview instance for CSP
     * @returns HTML string for development
     */
    private _getDevHtml(webview: vscode.Webview): string {
        // Get the logo path from media directory
        const logoUri = vscode.Uri.joinPath(this._extensionUri, 'media', 'handit.png');
        const logoWebviewUri = webview.asWebviewUri(logoUri);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Handit Login</title>
    <meta id="asset-logo" data-src="${logoWebviewUri}">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        img-src ${webview.cspSource} https: data: http://localhost:5173;
        style-src ${webview.cspSource} 'unsafe-inline' http://localhost:5173;
        font-src ${webview.cspSource} https: data:;
        script-src ${webview.cspSource} http://localhost:5173 'unsafe-eval';
        connect-src ${webview.cspSource} ws://localhost:5173 http://localhost:5173;
    ">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        #root {
            width: 100%;
            height: 100vh;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script>
        const vscode = acquireVsCodeApi();
        window.vscode = vscode;
    </script>
    <script type="module" src="http://localhost:5173/@vite/client"></script>
    <script type="module" src="http://localhost:5173/src/main.tsx"></script>
</body>
</html>`;
    }

    /**
     * Creates a CodeGPT session after successful authentication
     * This method is called after both login and signup
     * @param webview The webview instance for sending messages
     */
    private async _createCodeGPTSession(webview: vscode.Webview) {
        try {
            console.log('🚀 Creating CodeGPT session after authentication...');
            
            // Create CodeGPT session with live type and empty masking rules
            const sessionData = {
                type: 'live' as const,
                masking_rules: {} as Record<string, any>
            };
            
            const response = await apiService.createCodeGPTSession(sessionData);
            
            console.log('✅ CodeGPT session created successfully after authentication');
            console.log('📥 Session ID:', response.data.id);
            console.log('📊 Full session response:', response.data);
            
            // Show success message to user
            vscode.window.showInformationMessage(`CodeGPT session created! Session ID: ${response.data.id}`);
            
            // Establish Socket.IO connection after successful session creation
            await this._establishSocketConnection(response.data.id, webview);
            
        } catch (error: any) {
            console.error('❌ Failed to create CodeGPT session:', error);
            console.error('📊 Error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message,
                code: error.code
            });
            
            // Handle different types of errors
            let errorMessage = 'Failed to create CodeGPT session';
            if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Cannot connect to Handit.ai service for CodeGPT session.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Authentication failed for CodeGPT session.';
            } else if (error.response?.status === 500) {
                errorMessage = `Server error (500): ${error.response?.data?.message || error.response?.statusText || 'Internal server error'}`;
                console.error('🔍 Server error details:', error.response?.data);
            } else if (error.response?.status) {
                errorMessage = `CodeGPT session error: ${error.response.status} ${error.response.statusText}`;
                if (error.response.data) {
                    console.error('🔍 Response data:', error.response.data);
                }
            }
            
            // Show error message (but don't fail the login/signup process)
            vscode.window.showWarningMessage(`CodeGPT session warning: ${errorMessage}`);
        }
    }

    /**
     * Establishes Socket.IO connection after CodeGPT session creation
     * @param sessionId The session ID from the CodeGPT session
     * @param webview The webview instance for sending messages
     */
    private async _establishSocketConnection(sessionId: string, webview: vscode.Webview) {
        try {
            console.log('🔌 Establishing Socket.IO connection...');
            console.log('📋 Session ID for socket connection:', sessionId);
            
            // Call the establishSocketConnection method from ApiService
            const socket = await apiService.establishSocketConnection(sessionId, {
                onConnect: (socket) => {
                    console.log('🎉 Socket connection established successfully!');
                    console.log('📡 Socket ID:', socket.id);
                    vscode.window.showInformationMessage('Socket connection established successfully!');
                },
                onDisconnect: (reason) => {
                    console.log('🔌 Socket disconnected:', reason);
                    vscode.window.showWarningMessage(`Socket disconnected: ${reason}`);
                },
                onConnectError: (error) => {
                    console.error('❌ Socket connection error:', error);
                    vscode.window.showErrorMessage(`Socket connection failed: ${error.message}`);
                },
                onSubscribed: (data) => {
                    console.log('✅ Successfully subscribed to company notifications');
                    console.log('📊 Subscription data:', data);
                },
                onUnsubscribed: (data) => {
                    console.log('✅ Successfully unsubscribed from company notifications');
                    console.log('📊 Unsubscription data:', data);
                },
                onRunCompleted: (data) => {
                    console.log('🎯 Run completed notification received!');
                    console.log('📋 Run data:', data);
                    
                    const run = data.run;
                    if (run && run.action === 'track') {
                        console.log('🎯 Track run detected - sending trace count update to webview');
                        
                        // Send trace count update to webview
                        webview.postMessage({
                            command: 'traceReceived',
                            traceData: run,
                            timestamp: data.timestamp
                        });
                    }
                    
                    vscode.window.showInformationMessage('New run completed! Check console for details.');
                },
                onSessionUpdated: (data) => {
                    console.log('🔄 Session updated notification received!');
                    console.log('📋 Session update data:', data);
                },
                onError: (error) => {
                    console.error('❌ Socket error:', error);
                    vscode.window.showErrorMessage(`Socket error: ${error}`);
                }
            });
            
            console.log('✅ Socket connection method completed successfully');
            return socket;
            
        } catch (error: any) {
            console.error('❌ Failed to establish Socket.IO connection:', error);
            console.error('📊 Socket connection error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // Show error message but don't fail the entire process
            vscode.window.showWarningMessage(`Socket connection warning: ${error.message}`);
        }
    }

    /**
     * Generates HTML for production mode (bundled files)
     * @param webview The webview instance for CSP
     * @param webviewUri Base URI for webview resources
     * @returns HTML string for production
     */
    private _getProductionHtml(webview: vscode.Webview, webviewUri: vscode.Uri): string {
        // Get the logo path from media directory
        const logoUri = vscode.Uri.joinPath(this._extensionUri, 'media', 'handit.png');
        const logoWebviewUri = webview.asWebviewUri(logoUri);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Handit Login</title>
    <meta id="asset-logo" data-src="${logoWebviewUri}">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        img-src ${webview.cspSource} https: data:;
        style-src ${webview.cspSource} 'unsafe-inline';
        font-src ${webview.cspSource} https: data:;
        script-src ${webview.cspSource};
    ">
    <link rel="stylesheet" href="${webviewUri}/assets/index.css">
</head>
<body>
    <div id="root"></div>
    <script>
        const vscode = acquireVsCodeApi();
        window.vscode = vscode;
    </script>
    <script type="module" src="${webviewUri}/assets/index.js"></script>
</body>
</html>`;
    }
}
