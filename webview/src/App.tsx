import React from 'react';
import LoginForm from './components/LoginForm';
import ControlPanel from './components/ControlPanel';
import { useChat } from './hooks/useChat';
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
  const [view, setView] = React.useState<'auth' | 'panel'>('auth');
  const { fixSession } = useChat();

  return (
    <div className={`app ${view === 'panel' ? 'app--panel' : ''}`}>
      {view === 'auth' ? (
        <div className="app-main">
          <div className="app-header">
            <div className="logo">
              <img src={logo} alt="Handit.ai" className="logo-image" />
            </div>
            <p className="app-subtitle">Sign In</p>
          </div>
          
          <div className="app-content">
            <LoginForm onSuccess={() => setView('panel')} />
          </div>
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
