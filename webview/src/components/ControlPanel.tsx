import React, { useState } from 'react';

type StepKey = 'start' | 'send' | 'fixes';

const steps: { key: StepKey; label: string }[] = [
  { key: 'start', label: 'Fix my AI' },
  { key: 'send', label: 'Send Traces' },
  { key: 'fixes', label: 'Apply Fixes' }
];

interface ControlPanelProps {
  traceCount?: number;
  isActive?: boolean;
}

const StepContent: React.FC<{ active: StepKey; traceCount?: number; isActive?: boolean; onStart?: () => void }> = ({ active, traceCount = 0, isActive = false, onStart }) => {
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
                  🎯 <strong>{traceCount}</strong> traces received
                  {traceCount > 0 && <span className="trace-indicator"> ● Live</span>}
                </span>
              ) : (
                <span className="trace-count-inactive">
                  <span className="loading-spinner"></span>
                  <strong>Waiting for your traces ({traceCount} received)</strong>
                </span>
              )}
            </p>
          </div>
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

const ControlPanel: React.FC<ControlPanelProps> = ({ traceCount = 0, isActive = false }) => {
  const [active, setActive] = useState<StepKey>('start');

  const handleStart = () => {
    setActive('send');
  };

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
        <StepContent active={active} traceCount={traceCount} isActive={isActive} onStart={handleStart} />
      </main>
    </div>
  );
};

export default ControlPanel;


