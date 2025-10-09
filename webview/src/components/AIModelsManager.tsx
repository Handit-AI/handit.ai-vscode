import React, { useState, useEffect, useRef } from 'react';
import { useVSCode } from '../hooks/useVSCode';

/**
 * AI Models Manager component
 * Handles AI provider selection, model selection, and API key management
 */
type AIModelsManagerProps = {
  onConnect?: () => void;
  openAIIconUrl?: string;
  togetherAIIconUrl?: string;
  awsBedrockIconUrl?: string;
};

const AIModelsManager: React.FC<AIModelsManagerProps> = ({ onConnect, openAIIconUrl, togetherAIIconUrl, awsBedrockIconUrl }) => {
  const [selectedProvider, setSelectedProvider] = useState('OpenAI');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { postMessage } = useVSCode();

  const providers = [
    { id: 'OpenAI', name: 'OpenAI' },
    { id: 'TogetherAI', name: 'TogetherAI' },
    { id: 'AWSBedrock', name: 'AWS Bedrock' }
  ];

  const models = {
    OpenAI: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo'
    ],
    TogetherAI: [
      'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8'
    ],
    AWSBedrock: [
      'anthropic.claude-3-haiku-20240307-v1:0',
      'anthropic.claude-3-opus-20240229-v1:0',
      'anthropic.claude-3-sonnet-20240229-v1:0',
      'anthropic.claude-3-5-haiku-20241022-v1:0',
      'anthropic.claude-3-5-sonnet-20241022-v2:0',
      'anthropic.claude-3-5-sonnet-20240620-v1:0',
      'anthropic.claude-3-7-sonnet-20250219-v1:0',
      'anthropic.claude-opus-4-20250514-v1:0',
      'anthropic.claude-sonnet-4-20250514-v1:0',
      'anthropic.claude-v2:1',
      'anthropic.claude-v2'
    ]
  };

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    setSelectedModel(''); // Reset selected model when changing provider
    setShowProviderDropdown(false);
  };

  const handleConnect = () => {
    // Send configuration to VS Code extension
    postMessage({
      command: 'configureAI',
      provider: selectedProvider,
      model: selectedModel,
      apiKey: apiKey
    });
    
    // Navigate to control panel
    onConnect?.();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProviderDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const EyeIcon: React.FC<{ hidden?: boolean }> = ({ hidden }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      {hidden ? (
        <>
          <path d="M2 2L22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M17.94 17.94C16.17 19.23 14.16 20 12 20C7 20 3 16 2 12C2.53 9.97 3.72 8.1 5.35 6.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9.9 9.9C9.34 10.46 9 11.2 9 12C9 13.66 10.34 15 12 15C12.8 15 13.54 14.66 14.1 14.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 8C13.86 8 15.5 9.02 16.32 10.54C16.77 11.36 17 12 17 12C17 12 16.77 12.64 16.32 13.46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      ) : (
        <>
          <path d="M2 12C3 8 7 4 12 4C17 4 21 8 22 12C21 16 17 20 12 20C7 20 3 16 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        </>
      )}
    </svg>
  );

  const ChevronDownIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const KeyIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 10V7C7 4.79086 8.79086 3 11 3H13C15.2091 3 17 4.79086 17 7V10M7 10H5C3.89543 10 3 10.8954 3 12V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V12C21 10.8954 20.1046 10 19 10H17M7 10H17M12 15V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const OpenAIIcon: React.FC = () => (
    <img 
      src={openAIIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3TDEyIDEyTDIyIDdMMTIgMloiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMiAxN0wxMiAyMkwyMiAxNyIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0yIDEyTDEyIDE3TDIyIDEyIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+'} 
      alt="OpenAI" 
      width="20" 
      height="20"
    />
  );

  const TogetherAIIcon: React.FC = () => (
    <img 
      src={togetherAIIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3TDEyIDEyTDIyIDdMMTIgMloiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMiAxN0wxMiAyMkwyMiAxNyIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0yIDEyTDEyIDE3TDIyIDEyIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+'} 
      alt="TogetherAI" 
      width="24" 
      height="20"
      style={{ objectFit: 'contain' }}
    />
  );

  const AWSBedrockIcon: React.FC = () => (
    <img 
      src={awsBedrockIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3TDEyIDEyTDIyIDdMMTIgMloiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMiAxN0wxMiAyMkwyMiAxNyIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0yIDEyTDEyIDE3TDIyIDEyIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+'} 
      alt="AWS Bedrock" 
      width="24" 
      height="20"
      style={{ objectFit: 'contain' }}
    />
  );

  return (
    <div className="ai-models-manager">
      <div className="ai-models-header">
        <h1 className="ai-models-title">Manage my AI Models</h1>
        <p className="ai-models-subtitle">
          Choose your AI provider(s), enter your API key(s), select your models and start coding.
        </p>
      </div>

      <div className="ai-models-content">
        {/* Select provider section */}
        <div className="ai-models-section" ref={dropdownRef}>
          <h3 className="ai-models-section-title">Select provider</h3>
          <div className="provider-select" onClick={() => setShowProviderDropdown(!showProviderDropdown)}>
            <div className="provider-option">
              {selectedProvider === 'OpenAI' ? <OpenAIIcon /> : selectedProvider === 'TogetherAI' ? <TogetherAIIcon /> : <AWSBedrockIcon />}
              <span>{selectedProvider}</span>
            </div>
            <ChevronDownIcon />
          </div>
          {showProviderDropdown && (
            <div className="provider-dropdown">
              {providers.map((provider) => (
                <div 
                  key={provider.id}
                  className={`provider-dropdown-item ${selectedProvider === provider.id ? 'selected' : ''}`}
                  onClick={() => handleProviderChange(provider.id)}
                >
                  {provider.id === 'OpenAI' ? <OpenAIIcon /> : provider.id === 'TogetherAI' ? <TogetherAIIcon /> : <AWSBedrockIcon />}
                  <span>{provider.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Select models section */}
        <div className="ai-models-section">
          <h3 className="ai-models-section-title">Select your favorite models</h3>
          <div className="models-list">
            {models[selectedProvider as keyof typeof models].map((model) => (
              <div key={model} className="model-item">
                <div className="model-info">
                  {selectedProvider === 'OpenAI' ? <OpenAIIcon /> : selectedProvider === 'TogetherAI' ? <TogetherAIIcon /> : <AWSBedrockIcon />}
                  <span>{model}</span>
                </div>
                <input
                  type="radio"
                  name="selectedModel"
                  className="model-radio"
                  checked={selectedModel === model}
                  onChange={() => handleModelSelect(model)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Connect to provider section */}
        <div className="ai-models-section">
          <h3 className="ai-models-section-title">Connect to {selectedProvider}</h3>
          <div className="api-key-input">
            <KeyIcon />
            <input
              type={showApiKey ? 'text' : 'password'}
              placeholder="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="api-key-field"
            />
            <button
              type="button"
              className="api-key-toggle"
              onClick={() => setShowApiKey(!showApiKey)}
              aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              <EyeIcon hidden={showApiKey} />
            </button>
          </div>
          <button
            type="button"
            className="connect-button"
            onClick={handleConnect}
            disabled={!selectedModel || !apiKey}
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIModelsManager;
