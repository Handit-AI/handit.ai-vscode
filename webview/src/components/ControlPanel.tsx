import React, { useState } from 'react';
import { apiService } from '../../../src/services/ApiService';

// Safely get the VS Code webview API. If not preset, acquire ONCE using a global guard
function getVSCodeApi(): any | undefined {
  const w = window as any;
  if (w.vscode) return w.vscode;
  try {
    if (typeof w.acquireVsCodeApi === 'function') {
      if (!w.__handit_vscode_acquired) {
        w.vscode = w.acquireVsCodeApi();
        w.__handit_vscode_acquired = true;
      }
      return w.vscode;
    }
  } catch (e) {
    console.error('[Handit] acquireVsCodeApi failed:', e);
  }
  console.error('[Handit] VS Code API not available in webview');
  return undefined;
}

type StepKey = 'start' | 'send' | 'fixes';

const steps: { key: StepKey; label: string }[] = [
  { key: 'start', label: 'Fix my AI' },
  { key: 'send', label: 'Send Traces' },
  { key: 'fixes', label: 'Apply Fixes' }
];

interface ControlPanelProps {
  traceCount?: number;
  sessionId?: string;
  previewTexts?: string[];
}

const StepContent: React.FC<{ active: StepKey; traceCount?: number; previewTexts?: string[]; onStart?: () => void; onFixIssues?: () => void; showDone?: boolean; showEvaluating?: boolean; foundCount?: number; evaluationComplete?: boolean; showStreaming?: boolean; streamingText?: string; streamingComplete?: boolean; showApplyFixesStreaming?: boolean; applyFixesStreamingText?: string; applyFixesStreamingComplete?: boolean; showApplyFixesProcessing?: boolean; onCopyOptimizedPrompt?: () => void; onDiffOptimizedPrompt?: () => void; onApplyPromptChange?: () => void }> = ({ active, traceCount = 0, previewTexts = [], onStart, onFixIssues, showDone = false, showEvaluating = false, foundCount = 0, evaluationComplete = false, showStreaming = false, streamingText = '', streamingComplete = false, showApplyFixesStreaming = false, applyFixesStreamingText = '', applyFixesStreamingComplete = false, showApplyFixesProcessing = false, onCopyOptimizedPrompt, onDiffOptimizedPrompt, onApplyPromptChange }) => {
  switch (active) {
    case 'start':
      return (
        <div className="cp-card">
          <h2 className="cp-title">Let’s Fix Your AI</h2>
          <p className="cp-subtext">I’m Handit, your AI engineer who helps you find and fix issues in your agents.</p>
          <button className="cp-primary" onClick={onStart}>Get Started</button>
        </div>
      );
    case 'send':
      return (
        <div className="cp-card">
          <h2 className="cp-title">Sending Traces:</h2>
          
          <div className="trace-instructions">
            <p className="cp-subtext">
            Go ahead and run your agent.
            </p>
            <p className="cp-subtext">
              I’ll automatically detect and analyze its traces.
            </p>
            
            <div className="what-happens-next">
              <h3 className="cp-section-title">Here’s what will happen next:</h3>
              <ul className="cp-instructions-list">
                <li>You run your code/agent as usual  </li>
                <li>I'll detect traces automatically</li>
                <li>Each trace will be evaluated for issues</li>
                <li>Then, you can review and apply the suggested fixes </li>
              </ul>
            </div>
          </div>
          
          <div className="trace-counter">
            <p className="cp-subtext">
              <span className={`trace-status-container ${showDone ? 'trace-count-completed' : ''}`}>
                {showDone ? (
                  <svg className="done-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                  </svg>
                ) : (
                  <span className="loading-spinner"></span>
                )}
                <strong>Waiting for your traces ({traceCount} received)</strong>
              </span>
            </p>
            <p className="cp-subtext" style={{ marginLeft: 24, marginTop: 4 }}>
              {traceCount === 0 ? 'Detected traces will appear below.' : 'Detected traces:'}
            </p>
          </div>

          {previewTexts && previewTexts.length > 0 && (
            <div className="evaluation-loading" style={{ marginLeft: 24, marginTop: -4 }}>
              <ul className="cp-instructions-list">
                {previewTexts.map((text, index) => {
                  const isLastItem = index === previewTexts.length - 1;
                  const shouldShowProcessing = !showDone && isLastItem;
                  return (
                    <li key={index} className={shouldShowProcessing ? 'processing-text' : 'evaluation-complete'}>
                      {text}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {showEvaluating && (
            <div className="evaluation-loading">
              {evaluationComplete ? (
                <svg className="done-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
              ) : (
                <span className="loading-spinner"></span>
              )}
              <strong className={evaluationComplete ? 'evaluation-complete' : 'processing-text'}>Evaluating and looking for issues ({foundCount} found)</strong>
            </div>
          )}
          
          {showStreaming && (
            <>
              <h3 className="cp-section-title">These are the issues Handit detected in your agent’s run</h3>
              <div className="insights-streaming">
              <div
                className="streaming-text"
                dangerouslySetInnerHTML={{ __html: streamingText }}
              />
              <span className="streaming-cursor">|</span>
              </div>
            </>
          )}
          
          {traceCount > 0 && streamingComplete && (
            <button className="cp-primary" onClick={onFixIssues}>Fix Issues</button>
          )}
        </div>
      );
    case 'fixes':
      return (
        <div className="cp-card">
          <h2 className="cp-title">
            {showApplyFixesProcessing ? (
              <span className="processing-text">Processing...</span>
            ) : (
              "Apply Fixes"
            )}
          </h2>
          
          {!showApplyFixesProcessing && (
            <p className="cp-subtext">Your prompt has been optimized! Here are the improvements:</p>
          )}
          
          {showApplyFixesStreaming && (
            <div className="optimization-streaming">
              <div
                className="streaming-text"
                dangerouslySetInnerHTML={{ __html: applyFixesStreamingText }}
              />
              <span className="streaming-cursor">|</span>
            </div>
          )}
          
          {applyFixesStreamingComplete && (
            <div className="optimization-complete">
              <button className="cp-primary" onClick={onCopyOptimizedPrompt}>Copy Optimized Prompt</button>
              <button className="cp-primary" style={{ marginLeft: 8 }} onClick={onDiffOptimizedPrompt}>Diff in Project</button>
              <button
                className="cp-primary"
                style={{ marginLeft: 8 }}
                onClick={onApplyPromptChange}
              >
                Apply change
              </button>
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
};

const ControlPanel: React.FC<ControlPanelProps> = ({ traceCount = 0, sessionId, previewTexts = [] }) => {
  const [active, setActive] = useState<StepKey>('start');
  const [showDone, setShowDone] = useState(false);
  const [showEvaluating, setShowEvaluating] = useState(false);
  const [foundCount, setFoundCount] = useState<number>(0);
  const [evaluationComplete, setEvaluationComplete] = useState(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const [showStreaming, setShowStreaming] = useState(false);
  const [streamingComplete, setStreamingComplete] = useState(false);
  const [applyFixesStreamingText, setApplyFixesStreamingText] = useState<string>('');
  const [showApplyFixesStreaming, setShowApplyFixesStreaming] = useState(false);
  const [applyFixesStreamingComplete, setApplyFixesStreamingComplete] = useState(false);
  const [showApplyFixesProcessing, setShowApplyFixesProcessing] = useState(false);
  const [optimizedPromptContent, setOptimizedPromptContent] = useState<string>('');
  const [originalPromptContent, setOriginalPromptContent] = useState<string>('');
  const [autoDiffTriggered, setAutoDiffTriggered] = useState<boolean>(false);

  const handleStart = () => {
    setActive('send');
  };

  const handleCopyOptimizedPrompt = async () => {
    try {
      await navigator.clipboard.writeText(optimizedPromptContent);
      
      // Send message to VS Code extension to show notification
      const vs = getVSCodeApi();
      if (vs) {
        vs.postMessage({
          command: 'showInformationMessage',
          message: 'Optimized Prompt Copied!'
        });
      } else {
        console.log('Optimized Prompt Copied!');
      }
    } catch (error) {
      console.error('Error copying optimized prompt:', error);
      const vs = getVSCodeApi();
      if (vs) {
        vs.postMessage({
          command: 'showErrorMessage',
          message: 'Failed to copy optimized prompt'
        });
      } else {
        console.error('Failed to copy optimized prompt');
      }
    }
  };

  const handleDiffOptimizedPrompt = async () => {
    try {
      console.log('[Handit] Diff button clicked');
      console.log('[Handit] original length:', originalPromptContent?.length || 0, 'optimized length:', optimizedPromptContent?.length || 0);
      if (!optimizedPromptContent || !originalPromptContent) {
        console.warn('Missing prompt content for diff');
        const vs = getVSCodeApi();
        if (vs) {
          vs.postMessage({
            command: 'showErrorMessage',
            message: 'No optimized or original prompt available to diff'
          });
        }
        return;
      }

      const vsApi = getVSCodeApi();
      if (!vsApi) {
        console.error('[Handit] VS Code API not available in webview');
        return;
      }
      vsApi.postMessage({
        command: 'diffPromptInProject',
        originalPrompt: originalPromptContent,
        optimizedPrompt: optimizedPromptContent
      });
    } catch (error) {
      console.error('Error requesting diff for optimized prompt:', error);
    }
  };



  const handleFixIssues = async () => {
    if (!sessionId) {
      console.error('❌ No sessionId available for apply insights call');
      return;
    }

    // Navigate immediately to Apply Fixes step
    setActive('fixes');
    setShowApplyFixesProcessing(true);

    try {
      console.log('🔧 Calling apply insights API...');
      const response = await apiService.applySessionInsights(sessionId);
      console.log('🎉 SUCCESS! Apply insights API response:', response.data);
      console.log('📊 Response status:', response.status);
      
      // Check if response contains optimizedPrompt
      const responseData = response.data;
      const hasOptimizedPrompts = Array.isArray(responseData) && 
        responseData.some((item: any) => item.optimizedPrompt && item.optimizationApplied);
      
      if (hasOptimizedPrompts) {
        console.log('✨ Found optimized prompts, starting streaming');
        // Stop processing effect and start streaming
        setShowApplyFixesProcessing(false);
        startStreamingOptimizedPrompts(responseData);
      } else {
        console.log('ℹ️ No optimized prompts found in response');
        setShowApplyFixesProcessing(false);
      }
    } catch (error) {
      console.error('💥 ERROR calling apply insights API:', error);
      console.error('💥 Error message:', error instanceof Error ? error.message : 'Unknown error');
      setShowApplyFixesProcessing(false);
    }
  };

  const startStreamingInsights = (insightsData: any[]) => {
    if (!insightsData || insightsData.length === 0) return;

    // Escape to prevent HTML injection
    const escapeHtml = (value: string | undefined | null): string => {
      if (value == null) return '';
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    // Build HTML string: bold "Problem {n}:" and plain solution, with preserved newlines
    const parts: string[] = insightsData.map((insight, index) => {
      const num = index + 1;
      const problem = escapeHtml(insight.problem);
      const solution = escapeHtml(insight.solution);
      return `<strong>Problem ${num}:</strong>\n${problem}\n\nSolution:\n${solution}`;
    });
    const fullText = parts.join('\n\n');

    // Reset streaming state
    setStreamingComplete(false);

    // Start streaming the text
    let currentIndex = 0;
    const streamInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setStreamingText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(streamInterval);
        setStreamingComplete(true);
      }
    }, 12); // Faster typing speed (lower = faster)
  };

  const startStreamingOptimizedPrompts = (optimizationResults: any[]) => {
    if (!optimizationResults || optimizationResults.length === 0) return;

    // Filter only successful optimizations with optimizedPrompt
    const validResults = optimizationResults.filter((item: any) => 
      item.status === 'success' && 
      item.optimizationApplied && 
      item.optimizedPrompt && 
      item.originalPrompt
    );

    if (validResults.length === 0) {
      console.log('ℹ️ No valid optimization results found for streaming');
      return;
    }

    console.log('🎬 Starting optimized prompts streaming for', validResults.length, 'results');

    // Escape to prevent HTML injection
    const escapeHtml = (value: string | undefined | null): string => {
      if (value == null) return '';
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    // Store the optimized prompt content for copying
    const firstOptimizedPrompt = validResults[0]?.optimizedPrompt || '';
    setOptimizedPromptContent(firstOptimizedPrompt);
    const firstOriginalPrompt = validResults[0]?.originalPrompt || '';
    setOriginalPromptContent(firstOriginalPrompt);

    // Build HTML string for each optimization result
    const parts: string[] = validResults.map((result) => {
      const originalPrompt = escapeHtml(result.originalPrompt);
      const optimizedPrompt = escapeHtml(result.optimizedPrompt);
      
      return `<div class="optimization-result"><div class="prompt-section"><h4 class="prompt-label">Original Prompt:</h4><div class="prompt-content original-prompt">${originalPrompt}</div></div><div class="prompt-section"><h4 class="prompt-label">Optimized Prompt:</h4><div class="prompt-content optimized-prompt">${optimizedPrompt}</div></div></div>`;
    });

    const fullText = parts.join('');

    // Reset streaming state
    setApplyFixesStreamingComplete(false);
    setShowApplyFixesStreaming(true);

    // Start streaming the text
    let currentIndex = 0;
    const streamInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setApplyFixesStreamingText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(streamInterval);
        setApplyFixesStreamingComplete(true);
      }
    }, 8); // Slightly faster typing speed for better UX
  };

  // Automatically trigger a diff preview once streaming completes
  React.useEffect(() => {
    if (applyFixesStreamingComplete && !autoDiffTriggered) {
      // Ensure we have both prompts
      if (originalPromptContent && optimizedPromptContent) {
        console.log('[Handit] Auto-triggering diff after optimized prompt streaming complete');
        setAutoDiffTriggered(true);
        // Use the same logic as the Diff button
        handleDiffOptimizedPrompt();
      } else {
        console.warn('[Handit] Cannot auto-diff: missing original or optimized prompt');
      }
    }
  }, [applyFixesStreamingComplete, autoDiffTriggered, originalPromptContent, optimizedPromptContent]);

  const handleApplyPromptChange = () => {
    try {
      const vsApi = getVSCodeApi();
      if (!vsApi) {
        console.error('[Handit] VS Code API not available in webview for apply change');
        return;
      }
      vsApi.postMessage({
        command: 'applyPromptChangeInProject',
        originalPrompt: originalPromptContent,
        optimizedPrompt: optimizedPromptContent
      });
    } catch (e) {
      console.error('Error posting applyPromptChangeInProject:', e);
    }
  };

  // Timeline effect: traces → done icon → evaluating
  React.useEffect(() => {
    if (traceCount > 0) {
      console.log('🎯 Timeline started - traceCount:', traceCount);
      
      // After 6 seconds, show done icon and immediately show evaluating
      const doneTimer = setTimeout(() => {
        console.log('✅ Step 1: Showing done icon');
        setShowDone(true);
        console.log('🔍 Step 2: Showing evaluating (immediate after done)');
        setShowEvaluating(true);
      }, 6000);

      return () => {
        clearTimeout(doneTimer);
      };
    }
  }, [traceCount]);

  // Effect to call insights API when showEvaluating becomes true
  React.useEffect(() => {
    if (showEvaluating) {
      console.log('🔍 Step 3: Calling insights API after 3 seconds...');
      console.log('🆔 Current sessionId:', sessionId);
      
      const timer = setTimeout(() => {
        console.log('⏰ API timer fired! Calling insights API...');
        console.log('🆔 SessionId for API call:', sessionId);
        
        if (sessionId) {
          console.log('✅ SessionId exists, calling API...');
          apiService.getSessionInsights(sessionId)
            .then(response => {
              console.log('🎉 SUCCESS! Insights API response:', response.data);
              console.log('📊 Response status:', response.status);

              // Parse total_insights and animate counter
              const totalInsights: number = response.data?.total_insights ?? (Array.isArray(response.data?.insights) ? response.data.insights.length : 0);
              console.log('🧮 Parsed total_insights:', totalInsights);


              // Animate from current foundCount to totalInsights
              let current = 0;
              setFoundCount(0);
              if (totalInsights > 0) {
                const stepMs = 500; // speed per increment
                const incrementTimer = setInterval(() => {
                  current += 1;
                  setFoundCount(current);
                  if (current >= totalInsights) {
                    clearInterval(incrementTimer);
                    setEvaluationComplete(true); // Mark evaluation as complete
                    // Start streaming after a short delay
                    setTimeout(() => {
                      setShowStreaming(true);
                      startStreamingInsights(response.data?.insights || []);
                    }, 1000);
                  }
                }, stepMs);
              } else {
                setEvaluationComplete(true); // No insights to count
              }
            })
            .catch(error => {
              console.error('💥 ERROR calling insights API:', error);
              console.error('💥 Error message:', error.message);
            });
        } else {
          console.error('❌ No sessionId available for API call');
        }
      }, 3000);

      return () => clearTimeout(timer);
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
        <StepContent active={active} traceCount={traceCount} previewTexts={previewTexts} onStart={handleStart} onFixIssues={handleFixIssues} showDone={showDone} showEvaluating={showEvaluating} foundCount={foundCount} evaluationComplete={evaluationComplete} showStreaming={showStreaming} streamingText={streamingText} streamingComplete={streamingComplete} showApplyFixesStreaming={showApplyFixesStreaming} applyFixesStreamingText={applyFixesStreamingText} applyFixesStreamingComplete={applyFixesStreamingComplete} showApplyFixesProcessing={showApplyFixesProcessing} onCopyOptimizedPrompt={handleCopyOptimizedPrompt} onDiffOptimizedPrompt={handleDiffOptimizedPrompt} onApplyPromptChange={handleApplyPromptChange} />
      </main>
    </div>
  );
};

export default ControlPanel;


