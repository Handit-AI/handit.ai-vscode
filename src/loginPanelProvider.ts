import * as vscode from 'vscode';
import * as path from 'path';

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
                        this._handleLogin(message.email, message.password);
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
     */
    private _handleLogin(email: string, password: string) {
        // For now, just show a message (no actual login functionality)
        vscode.window.showInformationMessage(`Login attempt with email: ${email}`);
        
        // In a real implementation, you would:
        // 1. Validate credentials
        // 2. Make API calls
        // 3. Store authentication tokens
        // 4. Update UI state
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
    <script type="module" src="http://localhost:5173/@vite/client"></script>
    <script type="module" src="http://localhost:5173/src/main.tsx"></script>
</body>
</html>`;
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
    <script type="module" src="${webviewUri}/assets/index.js"></script>
</body>
</html>`;
    }
}
