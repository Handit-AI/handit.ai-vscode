import React, { useState } from 'react';

type StepKey = 'start' | 'send' | 'run' | 'review' | 'fixes';

const steps: { key: StepKey; label: string }[] = [
  { key: 'start', label: 'Start Session' },
  { key: 'send', label: 'Send Traces' },
  { key: 'run', label: 'Run Evaluations' },
  { key: 'review', label: 'Review Insights' },
  { key: 'fixes', label: 'Apply Fixes' }
];

const StepContent: React.FC<{ active: StepKey }> = ({ active }) => {
  switch (active) {
    case 'start':
      return (
        <div className="cp-card">
          <h2 className="cp-title">Start Session</h2>
          <p className="cp-subtext">Initialize a new evaluation session to collect traces.</p>
        </div>
      );
    case 'send':
      return (
        <div className="cp-card">
          <h2 className="cp-title">Sending traces to Handit:</h2>
          <p className="cp-subtext">3 traces received</p>
          <button className="cp-primary">Run Evaluations</button>
        </div>
      );
    case 'run':
      return (
        <div className="cp-card">
          <h2 className="cp-title">Evaluation Summary</h2>
          <ul className="cp-list">
            <li className="cp-list-item"><span>model-beta-2</span><span className="cp-meta">Accuracy: 78%</span></li>
            <li className="cp-list-item"><span>model-gamma-1</span><span className="cp-pass">Passed 92%</span></li>
            <li className="cp-list-item"><span>tool-delta-3</span><span className="cp-pass">Passed 85%</span></li>
          </ul>
          <div className="cp-section">
            <h3 className="cp-section-title">Issues</h3>
            <p className="cp-subtext">Inconsistent output for the prompt "Generate a summary of the document"</p>
          </div>
          <button className="cp-primary">Review Fixes</button>
        </div>
      );
    case 'review':
      return (
        <div className="cp-card">
          <h2 className="cp-title">Review Insights</h2>
          <p className="cp-subtext">Compare candidate prompts and see failure clusters.</p>
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

const ControlPanel: React.FC = () => {
  const [active, setActive] = useState<StepKey>('send');

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
        <StepContent active={active} />
      </main>
    </div>
  );
};

export default ControlPanel;


