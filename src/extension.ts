import * as vscode from 'vscode';
import { LoginPanelProvider } from './loginPanelProvider';

/**
 * Extension activation function
 * This function is called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Handit Login Extension is now active!');

    // Create the login panel provider
    const loginPanelProvider = new LoginPanelProvider(context.extensionUri);

    // Register the webview view provider
    const disposable = vscode.window.registerWebviewViewProvider(
        LoginPanelProvider.viewType,
        loginPanelProvider
    );

    // Register commands
    const openLoginCommand = vscode.commands.registerCommand('handitLogin.openLogin', () => {
        vscode.window.showInformationMessage('Opening Handit Login Panel...');
    });

    const loginCommand = vscode.commands.registerCommand('handitLogin.login', () => {
        vscode.window.showInformationMessage('Login command triggered!');
    });

    // Add to subscriptions so they get disposed when the extension is deactivated
    context.subscriptions.push(disposable, openLoginCommand, loginCommand);
}

/**
 * Extension deactivation function
 * This function is called when the extension is deactivated
 */
export function deactivate() {
    console.log('Handit Login Extension is now deactivated!');
}
