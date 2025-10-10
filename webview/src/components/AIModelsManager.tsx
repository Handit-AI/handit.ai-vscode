import React, { useState, useEffect, useRef } from 'react';
import { useVSCode } from '../hooks/useVSCode';

// Global providers cache to avoid multiple API calls
let globalProviders: any[] = [];
let providersLoaded = false;

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
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showModelsDropdown, setShowModelsDropdown] = useState(false);
  const [modelSearchTerm, setModelSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modelsDropdownRef = useRef<HTMLDivElement>(null);
  const { postMessage } = useVSCode();

  // Get models for the selected provider
  const getModelsForProvider = (provider: any) => {
    return provider?.config?.models || [];
  };

  // Get current models based on selected provider
  const currentModels = selectedProvider ? getModelsForProvider(selectedProvider) : [];

  const handleProviderChange = (provider: any) => {
    setSelectedProvider(provider);
    setSelectedModel(''); // Reset selected model when changing provider
    setModelSearchTerm(''); // Reset search term
    setShowProviderDropdown(false);
  };

  // Filter models based on search term
  const filteredModels = currentModels.filter((model: string) =>
    model.toLowerCase().includes(modelSearchTerm.toLowerCase())
  );

  const handleModelSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModelSearchTerm(e.target.value);
    if (!showModelsDropdown) {
      setShowModelsDropdown(true);
    }
  };

  const handleSearchInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModelsDropdown(true);
    // Focus the input when clicking on it
    const input = e.currentTarget.querySelector('input') as HTMLInputElement;
    if (input) {
      input.focus();
      input.removeAttribute('readonly');
    }
  };

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
    setModelSearchTerm(model);
    setShowModelsDropdown(false);
  };

  // Load providers on component mount (only once)
  useEffect(() => {
    // Check if providers are already loaded in global cache
    if (providersLoaded && globalProviders.length > 0) {
      console.log('📦 Using cached providers from memory');
      setProviders(globalProviders);
      if (globalProviders.length > 0) {
        // Sort by ID and select the one with the lowest ID
        const sortedProviders = [...globalProviders].sort((a: any, b: any) => a.id - b.id);
        const defaultProvider = sortedProviders[0];
        setSelectedProvider(defaultProvider);
        console.log('🎯 Default provider selected from cache (lowest ID):', defaultProvider);
      }
      setIsLoadingProviders(false);
    } else if (!providersLoaded) {
      console.log('🔄 Loading providers from API...');
      postMessage({
        command: 'getProviders'
      });
    }
  }, []); // Empty dependency array to run only once

  const handleConnect = () => {
    if (!selectedModel || !apiKey || !selectedProvider) {
      return;
    }

    setIsConnecting(true);

    console.log('🚀 Starting connection process...');
    console.log('📊 Selected provider:', selectedProvider);
    console.log('📊 Selected model:', selectedModel);
    console.log('🔑 API key length:', apiKey.length);

    // Create integration token directly since we already have the provider data
    console.log('🔑 Creating integration token...');
    const tokenData = {
      providerId: selectedProvider.id,
      name: `Mi Token ${selectedProvider.name}`,
      token: apiKey,
      data: {
        defaultModel: selectedModel
      }
    };

    console.log('📤 Token data:', tokenData);

    postMessage({
      command: 'createIntegrationToken',
      tokenData: tokenData
    });
  };

  // Handle responses from the extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { command, success, data, error } = event.data;

      if (command === 'getProviders') {
        if (success) {
          console.log('✅ Providers retrieved:', data);
          
          // Ensure data is an array
          if (!Array.isArray(data)) {
            console.error('❌ Providers data is not an array:', data);
            postMessage({
              command: 'showErrorMessage',
              message: '❌ Failed to load providers. Please try again.'
            });
            setIsLoadingProviders(false);
            return;
          }
          
          // Save to global cache
          globalProviders = data;
          providersLoaded = true;
          
          // Set providers and select the one with the lowest ID
          setProviders(data);
          if (data.length > 0) {
            // Sort by ID and select the one with the lowest ID
            const sortedProviders = [...data].sort((a: any, b: any) => a.id - b.id);
            const defaultProvider = sortedProviders[0];
            setSelectedProvider(defaultProvider);
            console.log('🎯 Default provider selected (lowest ID):', defaultProvider);
            console.log('📊 All providers loaded and cached:', data);
          }
          setIsLoadingProviders(false);
        } else {
          console.error('❌ Failed to get providers:', error);
          postMessage({
            command: 'showErrorMessage',
            message: '❌ Failed to load providers. Please try again.'
          });
          setIsLoadingProviders(false);
        }
      } else if (command === 'createIntegrationToken') {
        if (success) {
          console.log('✅ Integration token created:', data);

          // Send configuration to VS Code extension
          console.log('⚙️ Sending configuration to extension...');
          postMessage({
            command: 'configureAI',
            provider: selectedProvider?.name,
            model: selectedModel,
            apiKey: apiKey
          });
          
          // Navigate to control panel
          console.log('🎉 Connection successful! Navigating to control panel...');
          onConnect?.();
        } else {
          console.error('❌ Failed to create integration token:', error);
          postMessage({
            command: 'showErrorMessage',
            message: '❌ Something went wrong while connecting. Please check your token and try again'
          });
        }
        setIsConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []); // Empty dependency array to prevent re-renders

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProviderDropdown(false);
      }
      if (modelsDropdownRef.current && !modelsDropdownRef.current.contains(event.target as Node)) {
        setShowModelsDropdown(false);
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

  const SearchIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
      <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Get provider icon based on provider name
  const getProviderIcon = (providerName: string) => {
    switch (providerName) {
      case 'OpenAI':
        return (
          <img 
            src={openAIIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3TDEyIDEyTDIyIDdMMTIgMloiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMiAxN0wxMiAyMkwyMiAxNyIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0yIDEyTDEyIDE3TDIyIDEyIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+'} 
            alt="OpenAI" 
            width="20" 
            height="20"
          />
        );
      case 'TogetherAI':
        return (
          <img 
            src={togetherAIIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3TDEyIDEyTDIyIDdMMTIgMloiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMiAxN0wxMiAyMkwyMiAxNyIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0yIDEyTDEyIDE3TDIyIDEyIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+'} 
            alt="TogetherAI" 
            width="24" 
            height="20"
            style={{ objectFit: 'contain' }}
          />
        );
      case 'AWSBedrock':
        return (
          <img 
            src={awsBedrockIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3TDEyIDEyTDIyIDdMMTIgMloiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMiAxN0wxMiAyMkwyMiAxNyIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+'} 
            alt="AWS Bedrock" 
            width="24" 
            height="20"
            style={{ objectFit: 'contain' }}
          />
        );
      default:
        return (
          <div style={{ width: '20px', height: '20px', backgroundColor: 'var(--vscode-input-background)', borderRadius: '4px' }} />
        );
    }
  };

  if (isLoadingProviders) {
    return (
      <div className="ai-models-manager">
        <div className="ai-models-header">
          <h1 className="ai-models-title">Connect your AI provider</h1>
          <p className="ai-models-subtitle">
            Loading providers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-models-manager">
      <div className="ai-models-header">
        <h1 className="ai-models-title">Connect your AI provider</h1>
        <p className="ai-models-subtitle">
          I'll use your API token to evaluate your agents directly from your provider.
        </p>
      </div>

      <div className="ai-models-content">
        {/* Select provider section */}
        <div className="ai-models-section" ref={dropdownRef}>
          <h3 className="ai-models-section-title">Select provider</h3>
          <div className="provider-select" onClick={() => setShowProviderDropdown(!showProviderDropdown)}>
            <div className="provider-option">
              {selectedProvider ? getProviderIcon(selectedProvider.name) : null}
              <span>{selectedProvider?.name || 'Select a provider'}</span>
            </div>
            <ChevronDownIcon />
          </div>
          {showProviderDropdown && (
            <div className="provider-dropdown">
              {providers
                .sort((a: any, b: any) => a.id - b.id)
                .map((provider) => (
                <div 
                  key={provider.id}
                  className={`provider-dropdown-item ${selectedProvider?.id === provider.id ? 'selected' : ''}`}
                  onClick={() => handleProviderChange(provider)}
                >
                  {getProviderIcon(provider.name)}
                  <span>{provider.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Select models section */}
        <div className="ai-models-section" ref={modelsDropdownRef}>
          <h3 className="ai-models-section-title">Select your favorite model</h3>
          <div className="model-search-container">
            <div className="model-search-input" onClick={() => setShowModelsDropdown(!showModelsDropdown)}>
              <SearchIcon />
              <div onClick={handleSearchInputClick}>
                <input
                  type="text"
                  placeholder={selectedProvider ? "Search models..." : "Select a provider first"}
                  value={modelSearchTerm}
                  onChange={handleModelSearchChange}
                  onFocus={() => setShowModelsDropdown(true)}
                  className="model-search-field"
                  readOnly={!selectedProvider}
                  disabled={!selectedProvider}
                />
              </div>
              <ChevronDownIcon />
            </div>
            {showModelsDropdown && selectedProvider && (
              <div className="models-dropdown">
                {filteredModels.length > 0 ? (
                  filteredModels.map((model: string) => (
                    <div 
                      key={model} 
                      className={`model-dropdown-item ${selectedModel === model ? 'selected' : ''}`}
                      onClick={() => handleModelSelect(model)}
                    >
                      <div className="model-info">
                        {getProviderIcon(selectedProvider.name)}
                        <span>{model}</span>
                      </div>
                      {selectedModel === model && (
                        <div className="model-check">✓</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="model-dropdown-item no-results">
                    <span>No models found</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Connect to provider section */}
        <div className="ai-models-section">
          <h3 className="ai-models-section-title">Connect to {selectedProvider?.name || 'provider'}</h3>
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
            disabled={!selectedModel || !apiKey || isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIModelsManager;
