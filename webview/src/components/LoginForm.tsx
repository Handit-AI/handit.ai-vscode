import React, { useState, useEffect } from 'react';
import { useVSCode } from '../hooks/useVSCode';

/**
 * LoginForm component
 * Handles the login form UI and interactions
 */
type LoginFormProps = {
  onSuccess?: () => void;
};

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiResponse, setApiResponse] = useState<{ success: boolean; data?: any; error?: string } | null>(null);

  const { postMessage } = useVSCode();

  /**
   * Listen for messages from the VS Code extension
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Received message from VS Code:', event.data);
      const message = event.data;
      if (message.command === 'loginResponse' || message.command === 'signupResponse') {
        console.log('✅ Login/Signup response received:', message);
        setApiResponse({
          success: message.success,
          data: message.data,
          error: message.error
        });
        
        // Stop loading when we get a response
        setIsLoading(false);
        
        if (message.success) {
          console.log('🎉 Login/Signup successful, navigating to next view');
          // Navigate to next view on successful login/signup
          onSuccess?.();
        } else {
          console.log('❌ Login/Signup failed:', message.error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess]);

  /**
   * Validates the form inputs
   */
  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🚀 Sending login request:', { email, password: '***' });
      
      // Send login data to VS Code extension
      postMessage({
        command: 'login',
        email,
        password
      });

      console.log('📤 Login message sent to VS Code extension');
      // Note: onSuccess will be called when we receive a successful response
      // from the extension, not immediately
    } catch (error) {
      console.error('❌ Login error:', error);
      setIsLoading(false); // Only stop loading on error
    }
  };

  /**
   * Handles input changes and clears errors
   */
  const handleInputChange = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      setEmail(value);
      if (errors.email) {
        setErrors(prev => ({ ...prev, email: undefined }));
      }
    } else {
      setPassword(value);
      if (errors.password) {
        setErrors(prev => ({ ...prev, password: undefined }));
      }
    }
  };

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

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="email" className="form-label">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          className={`form-input ${errors.email ? 'form-input--error' : ''}`}
          placeholder="Enter your email"
          value={email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          disabled={isLoading}
          autoComplete="email"
        />
        {errors.email && (
          <span className="form-error">{errors.email}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">
          Password
        </label>
        <div className="password-input-container">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            className={`form-input ${errors.password ? 'form-input--error' : ''}`}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <EyeIcon hidden={showPassword} />
          </button>
        </div>
        {errors.password && (
          <span className="form-error">{errors.password}</span>
        )}
      </div>


      <button
        type="submit"
        className={`login-button ${isLoading ? 'login-button--loading' : ''}`}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="spinner"></span>
            Creating Account...
          </>
        ) : (
          'Sign in'
        )}
      </button>

      {/* API Response Display */}
      {apiResponse && (
        <div className={`api-response ${apiResponse.success ? 'api-response--success' : 'api-response--error'}`}>
          <h4>{apiResponse.success ? '✅ Signup Successful!' : '❌ Signup Failed'}</h4>
          {apiResponse.success ? (
            <div>
              <p>Account created successfully!</p>
              <details>
                <summary>API Response</summary>
                <pre>{JSON.stringify(apiResponse.data, null, 2)}</pre>
              </details>
            </div>
          ) : (
            <p>{apiResponse.error}</p>
          )}
        </div>
      )}

      <p className="auth-note">Don't have an account? <span className="auth-note__action">Sign up</span></p>

      <button
        type="button"
        className="login-button"
        style={{ marginTop: 8, display: 'none' }}
        onClick={() => {
          const targetText = `You are an expert in image analysis and text extraction. Your task is to analyze images and extract all visible text or provide a detailed description of the visual content if no text is present. Respond in the language of the text found (Spanish or English). \n\n1. If the content is an invoice, receipt, `;
          // Post message to extension to run a workspace-wide diff replacing targetText with 'hola'
          postMessage({
            command: 'bulkReplaceTextDiff',
            searchText: targetText,
            replacementText: 'hola'
          });
        }}
      >
        Find & Diff Replace in Workspace
      </button>

      <button
        type="button"
        className="login-button"
        style={{ marginTop: 8, display: 'none' }}
        onClick={() => {
          const targetText = `You are an expert in image analysis and text extraction. Your task is to analyze images and extract all visible text or provide a detailed description of the visual content if no text is present. Respond in the language of the text found (Spanish or English). \n\n1. If the content is an invoice, receipt, `;
          postMessage({
            command: 'bulkApplyTextReplace',
            searchText: targetText,
            replacementText: 'hola'
          });
        }}
      >
        Apply Replace in Workspace
      </button>
    </form>
  );
};

export default LoginForm;
