import React, { useState } from 'react';
import { apiService } from '../../../src/services/ApiService';

type StepKey = 'start' | 'send' | 'fixes';

const steps: { key: StepKey; label: string }[] = [
  { key: 'start', label: 'Fix my AI' },
  { key: 'send', label: 'Send Traces' },
  { key: 'fixes', label: 'Apply Fixes' }
];

interface ControlPanelProps {
  traceCount?: number;
  isActive?: boolean;
  sessionId?: string;
}

const StepContent: React.FC<{ active: StepKey; traceCount?: number; isActive?: boolean; onStart?: () => void; showDone?: boolean; showEvaluating?: boolean }> = ({ active, traceCount = 0, isActive = false, onStart, showDone = false, showEvaluating = false }) => {
  switch (active) {
    case 'start':
      return (
        <div className="cp-card">
          <h2 className="cp-title">Start Fixing my AI</h2>
          <p className="cp-subtext">Handit is the AI engineer who actually fix your AI agents.</p>
          <button className="cp-primary" onClick={onStart}>Start</button>
        </div>
      );
    case 'send':
      return (
        <div className="cp-card">
          <h2 className="cp-title">Sending Traces:</h2>
          
          <div className="trace-instructions">
            <p className="cp-subtext">
              Please run your agent so we can detect your traces.
            </p>
            <p className="cp-subtext">
              I'm now monitoring for code traces and will automatically evaluate them to identify potential issues.
            </p>
            
            <div className="what-happens-next">
              <h3 className="cp-section-title">What happens next:</h3>
              <ul className="cp-instructions-list">
                <li>Run your code/agent</li>
                <li>I'll detect traces automatically</li>
                <li>Each trace will be evaluated for issues</li>
                <li>You can choose Apply Fixes when ready</li>
              </ul>
            </div>
          </div>
          
          <div className="trace-counter">
            <p className="cp-subtext">
              {isActive ? (
                <span className="trace-count-active">
                  <span className="loading-spinner"></span>
                  <strong>Waiting for your traces ({traceCount} received)</strong>
                </span>
              ) : (
                <span className="trace-count-inactive">
                  {showDone ? (
                    <svg className="done-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                    </svg>
                  ) : (
                    <span className="loading-spinner"></span>
                  )}
                  <strong>Waiting for your traces ({traceCount} received)</strong>
                </span>
              )}
            </p>
          </div>
          {showEvaluating && (
            <div className="evaluation-loading">
              <span className="loading-spinner"></span>
              <strong className="processing-text">Evaluating and looking for issues (0 found)</strong>
            </div>
          )}
          
          {traceCount > 0 && (
            <button className="cp-primary">Fix Issues</button>
          )}
        </div>
      );
    case 'fixes':
      return (
        <div className="cp-card">
          <h2 className="cp-title">Apply Fixes</h2>
          <p className="cp-subtext">Generate suggestions and apply them to your workflow.</p>
          <button className="cp-primary">Apply Selected Fixes</button>
        </div>
      );
    default:
      return null;
  }
};

const ControlPanel: React.FC<ControlPanelProps> = ({ traceCount = 0, isActive = false, sessionId }) => {
  const [active, setActive] = useState<StepKey>('start');
  const [showDone, setShowDone] = useState(false);
  const [showEvaluating, setShowEvaluating] = useState(false);

  const handleStart = () => {
    setActive('send');
  };

  // Effect to handle trace count changes
  React.useEffect(() => {
    if (traceCount > 0 && !showDone) {
      const timer = setTimeout(() => {
        console.log('✅ Setting showDone to true');
        setShowDone(true);
      }, 8000); // Wait 8 seconds after first trace

      return () => clearTimeout(timer);
    }
  }, [traceCount, showDone]);

  // Effect to show evaluating after showDone
  React.useEffect(() => {
    if (showDone && !showEvaluating) {
      console.log('🔍 showDone is true, setting showEvaluating to true');
      setShowEvaluating(true);
    }
  }, [showDone, showEvaluating]);

  // Effect to call insights API when showEvaluating becomes true
  React.useEffect(() => {
    if (showEvaluating) {
      console.log('🔍 showEvaluating is true, starting 3-second timer...');
      console.log('🆔 Current sessionId:', sessionId);
      
      const timer = setTimeout(() => {
        console.log('⏰ 3-second timer fired! About to call insights API...');
        console.log('🆔 SessionId for API call:', sessionId);
        
        if (sessionId) {
          console.log('✅ SessionId exists, calling API...');
          apiService.getSessionInsights(sessionId)
            .then(response => {
              console.log('🎉 SUCCESS! Insights API response:', response.data);
              console.log('📊 Response status:', response.status);
              console.log('📊 Response headers:', response.headers);
            })
            .catch(error => {
              console.error('💥 ERROR calling insights API:', error);
              console.error('💥 Error message:', error.message);
              console.error('💥 Error response:', error.response?.data);
              console.error('💥 Error status:', error.response?.status);
            });
        } else {
          console.error('❌ No sessionId available for API call');
        }
      }, 3000);

      return () => {
        console.log('🧹 Cleaning up timer...');
        clearTimeout(timer);
      };
    }
  }, [showEvaluating, sessionId]);

  return (
    <div className="cp-layout">
      <aside className="cp-sidebar">
        <ul className="cp-steps">
          {steps.map((s) => (
            <li key={s.key} className={`cp-step ${active === s.key ? 'cp-step--active' : ''}`} onClick={() => setActive(s.key)}>
              {s.label}
            </li>
          ))}
        </ul>
      </aside>
      <main className="cp-content">
        <StepContent active={active} traceCount={traceCount} isActive={isActive} onStart={handleStart} showDone={showDone} showEvaluating={showEvaluating} />
      </main>
    </div>
  );
};

export default ControlPanel;


