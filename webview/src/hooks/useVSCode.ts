
/**
 * Custom hook for VS Code integration
 * Provides methods to communicate with the VS Code extension
 */
export const useVSCode = () => {
  /**
   * Posts a message to the VS Code extension
   * @param message The message to send
   */
  const postMessage = (message: any) => {
    // Try different ways to access VS Code API
    if (window.vscode) {
      window.vscode.postMessage(message);
    } else if ((window as any).acquireVsCodeApi) {
      const vscode = (window as any).acquireVsCodeApi();
      vscode.postMessage(message);
    } else {
      console.warn('VS Code API not available, trying alternative method');
      // Fallback: try to post message directly
      window.parent.postMessage(message, '*');
    }
  };

  /**
   * Listens for messages from the VS Code extension
   * @param callback Function to call when a message is received
   */
  const onMessage = (callback: (message: any) => void) => {
    const handleMessage = (event: MessageEvent) => {
      callback(event.data);
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  };

  /**
   * Gets VS Code theme information
   */
  const getTheme = () => {
    const body = document.body;
    const isDark = body.classList.contains('vscode-dark') || 
                   body.classList.contains('vscode-high-contrast');
    return {
      isDark,
      isLight: !isDark
    };
  };

  return {
    postMessage,
    onMessage,
    getTheme
  };
};

// Extend the Window interface to include VS Code API
declare global {
  interface Window {
    vscode: {
      postMessage: (message: any) => void;
    };
    acquireVsCodeApi: () => {
      postMessage: (message: any) => void;
    };
  }
}
