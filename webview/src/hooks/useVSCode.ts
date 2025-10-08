
/**
 * Custom hook for VS Code integration
 * Provides methods to communicate with the VS Code extension
 */
let cachedVsApi: any | null = null;

function safeGetVsCodeApi(): any | undefined {
  const w = window as any;
  if (w.vscode) return w.vscode;
  if (cachedVsApi) return cachedVsApi;
  if (typeof w.acquireVsCodeApi === 'function') {
    try {
      cachedVsApi = w.acquireVsCodeApi();
      w.vscode = cachedVsApi;
      return cachedVsApi;
    } catch (e) {
      // If already acquired elsewhere, fall back to existing global if any
      console.error('[Handit] useVSCode.acquireVsCodeApi failed:', e);
      return w.vscode;
    }
  }
  return undefined;
}

export const useVSCode = () => {
  /**
   * Posts a message to the VS Code extension
   * @param message The message to send
   */
  const postMessage = (message: any) => {
    const api = safeGetVsCodeApi();
    if (api) {
      api.postMessage(message);
      return;
    }
    console.warn('VS Code API not available, trying alternative method');
    // Fallback: try to post message directly
    window.parent.postMessage(message, '*');
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
    vscode?: {
      postMessage: (message: any) => void;
    };
    acquireVsCodeApi?: () => {
      postMessage: (message: any) => void;
    };
  }
}
