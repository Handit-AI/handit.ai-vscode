import * as vscode from 'vscode';
import * as path from 'path';
import { apiService } from './services/ApiService';

/**
 * Provider for the login panel webview
 * Handles the webview creation and communication
 */
export class LoginPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'handitLogin.webview';

    // Store current diff prompts for Accept/Deny functionality
    private currentOriginalPrompt: string | null = null;
    private currentOptimizedPrompt: string | null = null;
    private currentDiffUri: vscode.Uri | null = null;
    private statusBarAccept: vscode.StatusBarItem | null = null;
    private statusBarDeny: vscode.StatusBarItem | null = null;
    private decorationType: vscode.TextEditorDecorationType | null = null;
    private _editorChangeDisposable: vscode.Disposable | null = null;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this._registerCommands();
    }

    /**
     * Register Accept/Deny commands for diff functionality
     */
    private _registerCommands() {
        // Accept changes command
        vscode.commands.registerCommand('handit.acceptPromptChanges', async () => {
            await this._acceptPromptChanges();
        });

        // Deny changes command
        vscode.commands.registerCommand('handit.denyPromptChanges', async () => {
            // Show feedback input dialog
            const feedback = await vscode.window.showInputBox({
                prompt: 'Could you share what made you decide not to accept the changes? Your feedback would be very helpful.',
                placeHolder: 'Please share your thoughts about why you didn\'t accept the changes...',
                ignoreFocusOut: true
            });

            if (feedback !== undefined) {
                // Handle the feedback
                await this._handleFeedbackSubmission(feedback);
            }
        });

        // Create status bar items for Accept and Deny
        this.statusBarAccept = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarAccept.command = 'handit.acceptPromptChanges';
        this.statusBarAccept.text = '$(check) Accept';
        this.statusBarAccept.tooltip = 'Accept the optimized prompt changes';

        this.statusBarDeny = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
        this.statusBarDeny.command = 'handit.denyPromptChanges';
        this.statusBarDeny.text = '$(x) Deny';
        this.statusBarDeny.tooltip = 'Deny the optimized prompt changes';
    }

    /**
     * Accept the optimized prompt changes
     */
    private async _acceptPromptChanges() {
        if (!this.currentOriginalPrompt || !this.currentOptimizedPrompt || !this.currentDiffUri) {
            vscode.window.showErrorMessage('No prompt changes to accept');
            return;
        }

        try {
            // Find the file that contains the original prompt
            const workspaceFiles = await vscode.workspace.findFiles('**/*', null, 1000);
            let targetFile: vscode.Uri | null = null;

            for (const file of workspaceFiles) {
                try {
                    const doc = await vscode.workspace.openTextDocument(file);
                    const content = doc.getText();
                    if (content.includes(this.currentOriginalPrompt)) {
                        targetFile = file;
                        break;
                    }
                } catch (e) {
                    // Skip files that can't be read
                    continue;
                }
            }

            if (targetFile) {
                // Replace the original prompt with the optimized one
                const doc = await vscode.workspace.openTextDocument(targetFile);
                const content = doc.getText();
                const newContent = content.replace(this.currentOriginalPrompt, this.currentOptimizedPrompt);
                
                const edit = new vscode.WorkspaceEdit();
                edit.replace(targetFile, new vscode.Range(0, 0, doc.lineCount, 0), newContent);
                await vscode.workspace.applyEdit(edit);
                
                vscode.window.showInformationMessage('✅ Prompt changes accepted and applied!');
                this._removeInlineButtons();
                this._hideStatusBar();
            } else {
                vscode.window.showErrorMessage('Could not find the file containing the original prompt');
            }
        } catch (error) {
            console.error('Error accepting prompt changes:', error);
            vscode.window.showErrorMessage('Failed to accept prompt changes');
        }
    }

    /**
     * Deny the optimized prompt changes
     */
    private async _denyPromptChanges() {
        // The feedback modal will be triggered by the webview itself
        // when the user clicks the Deny button in the status bar
        // This function is kept for compatibility but the actual
        // feedback flow is handled in the webview
    }

    /**
     * Handle feedback submission
     */
    private async _handleFeedbackSubmission(feedback: string) {
        try {
            // Here you could send feedback to your backend
            console.log('Feedback received:', feedback);
            
            // Close the diff after feedback is submitted
            await this._closeDiffTab();
            
            vscode.window.showInformationMessage('Thank you for your feedback! It helps us improve.');
        } catch (error) {
            console.error('Error handling feedback:', error);
            vscode.window.showErrorMessage('Failed to submit feedback');
        }
    }


    /**
     * Close the diff tab
     */
    private async _closeDiffTab() {
        this._removeInlineButtons();
        this._hideStatusBar();
        
        // Close ONLY the diff tab we opened (leave original files intact)
        try {
            const groups = vscode.window.tabGroups.all;
            for (const group of groups) {
                for (const tab of group.tabs) {
                    const input: any = tab.input;
                    // Detect diff tabs by input type and our schemes
                    const isDiffTab = input && (input instanceof (vscode as any).TabInputTextDiff || (input?.modified && input?.original));
                    if (isDiffTab) {
                        const leftUri: vscode.Uri | undefined = input.original as vscode.Uri;
                        const rightUri: vscode.Uri | undefined = input.modified as vscode.Uri;
                        const leftMatch = leftUri && (leftUri.scheme === 'handit-virtual' || leftUri.scheme === 'file');
                        const rightMatch = rightUri && (rightUri.scheme === 'handit-optimized' || rightUri.scheme === 'handit-virtual');
                        // Close only if it's our Handit diff (optimized/virtual scheme on either side)
                        if (leftMatch && rightMatch) {
                            await vscode.window.tabGroups.close(tab, true);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error closing diff editors:', error);
        }
    }

    /**
     * Show status bar with Accept/Deny buttons
     */
    private _showStatusBar() {
        if (this.statusBarAccept && this.statusBarDeny) {
            this.statusBarAccept.show();
            this.statusBarDeny.show();
        }
    }

    /**
     * Hide status bar
     */
    private _hideStatusBar() {
        if (this.statusBarAccept) this.statusBarAccept.hide();
        if (this.statusBarDeny) this.statusBarDeny.hide();
        // Clear stored prompts
        this.currentOriginalPrompt = null;
        this.currentOptimizedPrompt = null;
        this.currentDiffUri = null;
    }

    /**
     * Show action menu for Accept/Deny
     */
    private async _showPromptActions() {
        const actions = [
            {
                label: '$(check) Accept Changes',
                description: 'Apply the optimized prompt to your workspace',
                action: () => this._acceptPromptChanges()
            },
            {
                label: '$(x) Deny Changes',
                description: 'Reject the optimized prompt changes',
                action: () => this._denyPromptChanges()
            }
        ];

        const selectedAction = await vscode.window.showQuickPick(actions, {
            placeHolder: 'Choose an action for the prompt changes',
            matchOnDescription: true
        });

        if (selectedAction) {
            await selectedAction.action();
        }
    }

    // Inline buttons removed per request; using status bar actions instead

    /**
     * Remove inline buttons
     */
    private _removeInlineButtons() {
        if (this.decorationType) {
            this.decorationType.dispose();
            this.decorationType = null;
        }
        if (this._editorChangeDisposable) {
            this._editorChangeDisposable.dispose();
            this._editorChangeDisposable = null;
        }
    }

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
                vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist'),
                vscode.Uri.joinPath(this._extensionUri, 'webview', 'src', 'assets')
            ]
        };

        // Set the header title shown above the view
        webviewView.title = 'handit.ai';

        // Set the HTML content for the webview
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            message => {
                try {
                    console.log('[Handit] onDidReceiveMessage:', JSON.stringify({ command: message?.command, keys: Object.keys(message || {}) }));
                } catch {
                    console.log('[Handit] onDidReceiveMessage (non-serializable message)');
                }
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
                    case 'showInformationMessage':
                        vscode.window.showInformationMessage(message.message);
                        return;
                    case 'showErrorMessage':
                        vscode.window.showErrorMessage(message.message);
                        return;
                    case 'diffPromptInProject':
                        console.log('[Handit] Received diffPromptInProject message');
                        console.log('[Handit] original length:', (message.originalPrompt?.length || 0), 'optimized length:', (message.optimizedPrompt?.length || 0));
                        this._handleDiffPromptInProject(message.originalPrompt, message.optimizedPrompt);
                        return;
                    case 'bulkReplaceTextDiff':
                        console.log('[Handit] Received bulkReplaceTextDiff message');
                        this._handleBulkReplaceTextDiff(message.searchText, message.replacementText);
                        return;
                    case 'applyPromptChangeInProject':
                        console.log('[Handit] Received applyPromptChangeInProject message');
                        this._handleApplyPromptChangeInProject(message.originalPrompt, message.optimizedPrompt);
                        return;
                    case 'submitFeedback':
                        console.log('[Handit] Received submitFeedback message');
                        this._handleFeedbackSubmission(message.feedback);
                        return;
                    case 'bulkApplyTextReplace':
                        console.log('[Handit] Received bulkApplyTextReplace message');
                        this._handleBulkApplyTextReplace(message.searchText, message.replacementText);
                        return;
                    case 'getOpenAIIconUrl':
                        console.log('[Handit] Received getOpenAIIconUrl message');
                        this._handleGetOpenAIIconUrl(webviewView.webview);
                        return;
                    case 'getTogetherAIIconUrl':
                        console.log('[Handit] Received getTogetherAIIconUrl message');
                        this._handleGetTogetherAIIconUrl(webviewView.webview);
                        return;
                    case 'getAwsBedrockIconUrl':
                        console.log('[Handit] Received getAwsBedrockIconUrl message');
                        this._handleGetAwsBedrockIconUrl(webviewView.webview);
                        return;
                    case 'getProviders':
                        console.log('[Handit] Received getProviders message');
                        this._handleGetProviders(webviewView.webview);
                        return;
                    case 'createIntegrationToken':
                        console.log('[Handit] Received createIntegrationToken message');
                        this._handleCreateIntegrationToken(webviewView.webview, message.tokenData);
                        return;
                    case 'showErrorMessage':
                        console.log('[Handit] Received showErrorMessage message');
                        this._handleShowErrorMessage(message.message);
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
        connect-src ${webview.cspSource} ws://localhost:5173 http://localhost:5173 http://localhost:3001;
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
        // Acquire VS Code API exactly once and assign to window.vscode
        (function(){
            try {
                if (!window.vscode && typeof acquireVsCodeApi === 'function') {
                    window.vscode = acquireVsCodeApi();
                }
            } catch (e) {
                console.error('[Handit] Failed to acquire VS Code API in dev HTML:', e);
            }
        })();
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

            // Send sessionId to webview so it can be stored in useChat
            webview.postMessage({
                command: 'sessionCreated',
                sessionId: response.data.id,
                sessionData: response.data
            });
            
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
                onModelLogPreview: (previewText: string) => {
                    // Relay a short preview down to the webview to show under the trace counter
                    try {
                        webview.postMessage({
                            command: 'modelLogPreview',
                            preview: previewText
                        });
                    } catch (e) {
                        console.error('❌ Failed to post modelLogPreview to webview:', e);
                    }
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
     * Finds a file in the workspace containing the original prompt and opens a diff with an in-memory optimized version
     */
    private async _handleDiffPromptInProject(originalPrompt: string, optimizedPrompt: string) {
        try {
            console.log('[Handit] Starting _handleDiffPromptInProject');
            
            // Store prompts for Accept/Deny functionality
            this.currentOriginalPrompt = originalPrompt;
            this.currentOptimizedPrompt = optimizedPrompt;
            
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                vscode.window.showWarningMessage('No workspace open to search for prompts.');
                console.warn('[Handit] No workspace folders found');
                return;
            }
            const includePattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], '**/*.{ts,tsx,js,jsx,md,txt,json,py,java,go,rs,rb,php,yml,yaml}');
            const fileUris = await vscode.workspace.findFiles(includePattern, '**/node_modules/**', 200);
            console.log('[Handit] Scanning files for original prompt. Candidates:', fileUris.length);
            let leftUri: vscode.Uri | undefined;
            for (const uri of fileUris) {
                try {
                    const doc = await vscode.workspace.openTextDocument(uri);
                    if (doc.getText().includes(originalPrompt)) {
                        leftUri = uri;
                        console.log('[Handit] Found original prompt in file:', uri.fsPath);
                        break;
                    }
                } catch {}
            }

            if (leftUri) {
                const leftDoc = await vscode.workspace.openTextDocument(leftUri);
                const leftText = leftDoc.getText();
                const replacedText = leftText.includes(originalPrompt)
                    ? leftText.replace(originalPrompt, optimizedPrompt)
                    : optimizedPrompt;

                const scheme = 'handit-optimized';
                const provider: vscode.TextDocumentContentProvider = {
                    provideTextDocumentContent: () => replacedText
                };
                const registration = vscode.workspace.registerTextDocumentContentProvider(scheme, provider);

                try {
                    const rightWithScheme = vscode.Uri.parse(`${scheme}:/${path.basename(leftUri.fsPath)}`);
                    const title = `Optimized vs Original — ${path.basename(leftUri.fsPath)}`;
                    console.log('[Handit] Opening diff view');
                    await vscode.commands.executeCommand('vscode.diff', leftUri, rightWithScheme, title, { preview: true });
                    
                    // Store the diff URI and show status bar buttons
                    this.currentDiffUri = leftUri;
                    this._showStatusBar();
                } finally {
                    // Keep provider longer to ensure diff loads content
                    setTimeout(() => registration.dispose(), 30000);
                }
                return;
            }

            // Fallback: if we didn't find a file, show virtual original vs optimized
            console.warn('[Handit] Original prompt not found in workspace, opening virtual diff');
            const scheme = 'handit-virtual';
            const provider: vscode.TextDocumentContentProvider = {
                provideTextDocumentContent: (uri) => {
                    if (uri.path.endsWith('/original.txt')) return originalPrompt;
                    return optimizedPrompt;
                }
            };
            const registration = vscode.workspace.registerTextDocumentContentProvider(scheme, provider);
            try {
                const leftVirtual = vscode.Uri.parse(`${scheme}:/original.txt`);
                const rightVirtual = vscode.Uri.parse(`${scheme}:/optimized.txt`);
                console.log('[Handit] Opening fallback virtual diff view');
                await vscode.commands.executeCommand('vscode.diff', leftVirtual, rightVirtual, 'Optimized vs Original (virtual)', { preview: true });
                
                // Show status bar buttons for virtual diff too
                this._showStatusBar();
            } finally {
                setTimeout(() => registration.dispose(), 30000);
            }
        } catch (err: any) {
            console.error('❌ Failed to create prompt diff:', err);
            vscode.window.showErrorMessage(`Failed to create prompt diff: ${err?.message || String(err)}`);
        }
    }

    /**
     * Finds all files containing a searchText and opens a diff view replacing it with replacementText.
     * Shows the first diff and logs how many matches/files were found.
     */
    private async _handleBulkReplaceTextDiff(searchText: string, replacementText: string) {
        try {
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                vscode.window.showWarningMessage('No workspace open for text search.');
                return;
            }
            console.log('[Handit] bulkReplaceTextDiff: searching for text length:', (searchText?.length || 0));
            const includePattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], '**/*');
            const fileUris = await vscode.workspace.findFiles(includePattern, '**/{node_modules,.git,dist,out,build}/**', 5000);
            console.log('[Handit] Candidate files:', fileUris.length);

            const matches: vscode.Uri[] = [];
            for (const uri of fileUris) {
                try {
                    const doc = await vscode.workspace.openTextDocument(uri);
                    if (doc.getText().includes(searchText)) {
                        matches.push(uri);
                    }
                } catch {}
            }
            console.log('[Handit] Files containing target text:', matches.length);
            if (matches.length === 0) {
                vscode.window.showInformationMessage('No files found containing the target text.');
                return;
            }

            const leftUri = matches[0];
            const leftDoc = await vscode.workspace.openTextDocument(leftUri);
            const leftText = leftDoc.getText();
            const replacedText = leftText.replace(searchText, replacementText);

            const scheme = 'handit-bulk-replace';
            const provider: vscode.TextDocumentContentProvider = {
                provideTextDocumentContent: () => replacedText
            };
            const registration = vscode.workspace.registerTextDocumentContentProvider(scheme, provider);
            try {
                const rightWithScheme = vscode.Uri.parse(`${scheme}:/${path.basename(leftUri.fsPath)}`);
                const title = `Preview replace in ${path.basename(leftUri.fsPath)}`;
                console.log('[Handit] Opening bulk replace diff view');
                await vscode.commands.executeCommand('vscode.diff', leftUri, rightWithScheme, title, { preview: true });
                vscode.window.showInformationMessage(`Found ${matches.length} file(s) containing the text. Showing first diff.`);
            } finally {
                setTimeout(() => registration.dispose(), 30000);
            }
        } catch (err: any) {
            console.error('❌ bulkReplaceTextDiff failed:', err);
            vscode.window.showErrorMessage(`bulkReplaceTextDiff failed: ${err?.message || String(err)}`);
        }
    }

    /** Apply optimized prompt into the first file containing the original prompt */
    private async _handleApplyPromptChangeInProject(originalPrompt: string, optimizedPrompt: string) {
        try {
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                vscode.window.showWarningMessage('No workspace open to apply changes.');
                return;
            }
            const includePattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], '**/*');
            const fileUris = await vscode.workspace.findFiles(includePattern, '**/{node_modules,.git,dist,out,build}/**', 5000);
            let target: vscode.Uri | undefined;
            for (const uri of fileUris) {
                try {
                    const doc = await vscode.workspace.openTextDocument(uri);
                    if (doc.getText().includes(originalPrompt)) {
                        target = uri;
                        break;
                    }
                } catch {}
            }
            if (!target) {
                vscode.window.showWarningMessage('No file found containing the original prompt to apply change.');
                return;
            }
            const doc = await vscode.workspace.openTextDocument(target);
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
            const newText = doc.getText().replace(originalPrompt, optimizedPrompt);
            edit.replace(target, fullRange, newText);
            const applied = await vscode.workspace.applyEdit(edit);
            if (applied) {
                await doc.save();
                vscode.window.showInformationMessage(`Applied optimized prompt in ${path.basename(target.fsPath)}`);
            } else {
                vscode.window.showErrorMessage('Failed to apply optimized prompt change.');
            }
        } catch (err: any) {
            console.error('❌ applyPromptChangeInProject failed:', err);
            vscode.window.showErrorMessage(`applyPromptChangeInProject failed: ${err?.message || String(err)}`);
        }
    }

    /** Bulk apply replacement across all files containing searchText */
    private async _handleBulkApplyTextReplace(searchText: string, replacementText: string) {
        try {
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                vscode.window.showWarningMessage('No workspace open to apply bulk replace.');
                return;
            }
            const includePattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], '**/*');
            const fileUris = await vscode.workspace.findFiles(includePattern, '**/{node_modules,.git,dist,out,build}/**', 10000);
            let updated = 0;
            for (const uri of fileUris) {
                try {
                    const doc = await vscode.workspace.openTextDocument(uri);
                    const original = doc.getText();
                    if (!original.includes(searchText)) continue;
                    const newText = original.split(searchText).join(replacementText);
                    const edit = new vscode.WorkspaceEdit();
                    const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(original.length));
                    edit.replace(uri, fullRange, newText);
                    const applied = await vscode.workspace.applyEdit(edit);
                    if (applied) {
                        await doc.save();
                        updated += 1;
                    }
                } catch {}
            }
            vscode.window.showInformationMessage(`Bulk replace applied in ${updated} file(s).`);
        } catch (err: any) {
            console.error('❌ bulkApplyTextReplace failed:', err);
            vscode.window.showErrorMessage(`bulkApplyTextReplace failed: ${err?.message || String(err)}`);
        }
    }

    /**
     * Handles request for OpenAI icon URL
     * @param webview The webview instance for sending response
     */
    private _handleGetOpenAIIconUrl(webview: vscode.Webview) {
        try {
            // Get the OpenAI icon path from webview assets
            const openAIIconUri = vscode.Uri.joinPath(this._extensionUri, 'webview', 'src', 'assets', 'OpenAI.png');
            const openAIIconWebviewUri = webview.asWebviewUri(openAIIconUri);
            
            console.log('[Handit] Generated OpenAI icon URL:', openAIIconWebviewUri.toString());
            
            // Send the URL back to the webview
            webview.postMessage({
                command: 'openAIIconUrl',
                url: openAIIconWebviewUri.toString()
            });
        } catch (error) {
            console.error('[Handit] Failed to generate OpenAI icon URL:', error);
            // Send empty URL on error
            webview.postMessage({
                command: 'openAIIconUrl',
                url: undefined
            });
        }
    }

    /**
     * Handles request for TogetherAI icon URL
     * @param webview The webview instance for sending response
     */
    private _handleGetTogetherAIIconUrl(webview: vscode.Webview) {
        try {
            // Get the TogetherAI icon path from webview assets
            const togetherAIIconUri = vscode.Uri.joinPath(this._extensionUri, 'webview', 'src', 'assets', 'togetherAI.png');
            const togetherAIIconWebviewUri = webview.asWebviewUri(togetherAIIconUri);
            
            console.log('[Handit] Generated TogetherAI icon URL:', togetherAIIconWebviewUri.toString());
            
            // Send the URL back to the webview
            webview.postMessage({
                command: 'togetherAIIconUrl',
                url: togetherAIIconWebviewUri.toString()
            });
        } catch (error) {
            console.error('[Handit] Failed to generate TogetherAI icon URL:', error);
            // Send empty URL on error
            webview.postMessage({
                command: 'togetherAIIconUrl',
                url: undefined
            });
        }
    }

    /**
     * Handles request for AWS Bedrock icon URL
     * @param webview The webview instance for sending response
     */
    private _handleGetAwsBedrockIconUrl(webview: vscode.Webview) {
        try {
            // Get the AWS Bedrock icon path from webview assets
            const awsBedrockIconUri = vscode.Uri.joinPath(this._extensionUri, 'webview', 'src', 'assets', 'Amazon.png');
            const awsBedrockIconWebviewUri = webview.asWebviewUri(awsBedrockIconUri);
            
            console.log('[Handit] Generated AWS Bedrock icon URL:', awsBedrockIconWebviewUri.toString());
            
            // Send the URL back to the webview
            webview.postMessage({
                command: 'awsBedrockIconUrl',
                url: awsBedrockIconWebviewUri.toString()
            });
        } catch (error) {
            console.error('[Handit] Failed to generate AWS Bedrock icon URL:', error);
            // Send empty URL on error
            webview.postMessage({
                command: 'awsBedrockIconUrl',
                url: undefined
            });
        }
    }

    /**
     * Handles getting providers from the API
     * @param webview The webview instance for sending response
     */
    private async _handleGetProviders(webview: vscode.Webview) {
        try {
            console.log('[Handit] Getting providers from API...');
            
            // Set the auth token
            apiService.setAuthToken('2f3bcfaf11d2d909ed90d2ec706114e15b15a7f5642af4f9a385266c4d210f56');
            
            const response = await apiService.getProviders();
            console.log('[Handit] Providers response:', response.data);
            
            // Check if response has the expected structure
            const providersData = response.data?.data || response.data;
            console.log('[Handit] Providers data to send:', providersData);
            
            webview.postMessage({ 
                command: 'getProviders', 
                success: true, 
                data: providersData 
            });
        } catch (error) {
            console.error('[Handit] Error getting providers:', error);
            webview.postMessage({ 
                command: 'getProviders', 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            });
        }
    }

    /**
     * Handles creating integration token
     * @param webview The webview instance for sending response
     * @param tokenData The token data to create
     */
    private async _handleCreateIntegrationToken(webview: vscode.Webview, tokenData: any) {
        try {
            console.log('[Handit] Creating integration token...');
            console.log('[Handit] Token data:', tokenData);
            
            // Set the auth token
            apiService.setAuthToken('2f3bcfaf11d2d909ed90d2ec706114e15b15a7f5642af4f9a385266c4d210f56');
            
            const response = await apiService.createIntegrationToken(tokenData);
            console.log('[Handit] Integration token response:', response.data);
            
            // Check if response has the expected structure
            const tokenResponseData = response.data?.data || response.data;
            console.log('[Handit] Token response data to send:', tokenResponseData);
            
            webview.postMessage({ 
                command: 'createIntegrationToken', 
                success: true, 
                data: tokenResponseData 
            });
        } catch (error) {
            console.error('[Handit] Error creating integration token:', error);
            webview.postMessage({ 
                command: 'createIntegrationToken', 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            });
        }
    }

    /**
     * Handles showing error message to user
     * @param message The error message to show
     */
    private _handleShowErrorMessage(message: string) {
        console.log('[Handit] Showing error message:', message);
        vscode.window.showInformationMessage(message);
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
        connect-src ${webview.cspSource} http://localhost:3001;
    ">
    <link rel="stylesheet" href="${webviewUri}/assets/index.css">
</head>
<body>
    <div id="root"></div>
    <script>
        (function(){
            try {
                if (!window.vscode && typeof acquireVsCodeApi === 'function') {
                    window.vscode = acquireVsCodeApi();
                }
            } catch (e) {
                console.error('[Handit] Failed to acquire VS Code API in prod HTML:', e);
            }
        })();
    </script>
    <script type="module" src="${webviewUri}/assets/index.js"></script>
</body>
</html>`;
    }
}
