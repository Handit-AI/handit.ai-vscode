import React from 'react';
import LoginForm from './components/LoginForm';
import AIModelsManager from './components/AIModelsManager';
import ControlPanel from './components/ControlPanel';
import { useChat } from './hooks/useChat';
import { useVSCode } from './hooks/useVSCode';
import './styles.css';

/**
 * Gets the logo URL from the meta tag (more secure than inline scripts)
 */
function getLogoFromDom(): string | undefined {
  const meta = document.querySelector<HTMLMetaElement>('meta#asset-logo');
  return meta?.dataset.src;
}

/**
 * Main App component
 * Renders the login interface for the VS Code extension
 */
const App: React.FC = () => {
  const logo = getLogoFromDom();
  const [view, setView] = React.useState<'auth' | 'ai-models' | 'control-panel'>('auth');
  const { fixSession } = useChat();
  const { postMessage } = useVSCode();
  
  // Get icon URLs from VS Code extension
  const [openAIIconUrl, setOpenAIIconUrl] = React.useState<string | undefined>();
  const [togetherAIIconUrl, setTogetherAIIconUrl] = React.useState<string | undefined>();
  const [awsBedrockIconUrl, setAwsBedrockIconUrl] = React.useState<string | undefined>();
  
  React.useEffect(() => {
    // Request the icon URLs from the extension
    postMessage({
      command: 'getOpenAIIconUrl'
    });
    postMessage({
      command: 'getTogetherAIIconUrl'
    });
    postMessage({
      command: 'getAwsBedrockIconUrl'
    });
  }, [postMessage]);
  
  // Listen for the responses
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.command === 'openAIIconUrl') {
        setOpenAIIconUrl(event.data.url);
      } else if (event.data.command === 'togetherAIIconUrl') {
        setTogetherAIIconUrl(event.data.url);
      } else if (event.data.command === 'awsBedrockIconUrl') {
        setAwsBedrockIconUrl(event.data.url);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className={`app ${view === 'control-panel' ? 'app--panel' : ''}`}>
      {view === 'auth' ? (
        <div className="app-main">
          <div className="app-header">
            <div className="logo">
              <img src={logo} alt="Handit.ai" className="logo-image" />
            </div>
            <p className="app-subtitle">Sign In</p>
          </div>
          
          <div className="app-content">
            <LoginForm onSuccess={() => setView('ai-models')} />
          </div>
        </div>
      ) : view === 'ai-models' ? (
        <div className="app-main">
          <AIModelsManager 
            onConnect={() => setView('control-panel')} 
            openAIIconUrl={openAIIconUrl}
            togetherAIIconUrl={togetherAIIconUrl}
            awsBedrockIconUrl={awsBedrockIconUrl}
          />
        </div>
      ) : (
        <div className="app-main">
          <ControlPanel 
            traceCount={fixSession.traceCount} 
            sessionId={fixSession.sessionId}
            previewTexts={fixSession.previewTexts}
          />
        </div>
      )}
      
      {view === 'auth' && (
        <div className="app-footer">
          <p className="footer-text">
            By signing in, you agree to our{' '}
            <a href="https://dashboard.handit.ai/terms-of-use" target="_blank" rel="noopener noreferrer" className="footer-link">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="https://dashboard.handit.ai/privacy-policy" target="_blank" rel="noopener noreferrer" className="footer-link">
              Privacy Policy
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default App;
