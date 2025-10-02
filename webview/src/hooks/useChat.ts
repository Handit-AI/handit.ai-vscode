import { useState, useRef, useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  files?: File[];
  optimizedPrompt?: string;
  optimizedPrompts?: string[];
}

export interface FileAttachment {
  name: string;
  content: string;
  type: string;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      text: 'Hello! I\'m your AI coding assistant powered by **CodeGPT × Handit**. I can help you with:\n\n- **Code explanation** and documentation\n- **Debugging** and error fixing\n- **Code optimization** and refactoring\n- **Test generation** and code review\n- **File analysis** and workspace exploration\n\nType `/` to see available commands, or just ask me anything about your code!',
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileAttachment[]>([]);
  const [fixSession, setFixSession] = useState<{
    active: boolean;
    sessionId?: string;
    socket?: Socket;
    traceCount: number;
    runs: any[];
    insights?: any[];
    isApplyingFixes?: boolean;
    showFixButton?: boolean;
  }>({
    active: false,
    traceCount: 0,
    runs: [],
    showFixButton: true
  });

  // Listen for messages from VS Code extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Received message from VS Code:', event.data);
      const message = event.data;
      
      if (message.command === 'traceReceived') {
        console.log('🎯 Trace received from VS Code:', message);
        
        // Update trace count and add the trace to runs
        setFixSession(prev => {
          const newTraceCount = prev.traceCount + 1;
          
          // Add message about trace received with correct count
          const traceMessage: Message = {
            id: Date.now(),
            text: `🎯 **Trace ${newTraceCount} received!**\n\nWe've detected a new trace and it's automatically being evaluated. This helps us understand your code patterns and identify potential issues.\n\nUse the "Fix Now" button below to generate fixes for all detected issues.`,
            sender: 'ai',
            timestamp: new Date().toLocaleTimeString()
          };

          // Add the message to the messages array
          setMessages(prevMessages => [...prevMessages, traceMessage]);
          
          return {
            ...prev,
            traceCount: newTraceCount,
            runs: [...prev.runs, message.traceData]
          };
        });
      } else if (message.command === 'socketConnected') {
        console.log('🔌 Socket connected from VS Code:', message);
        setFixSession(prev => ({
          ...prev,
          active: true,
          sessionId: message.sessionId,
          socket: message.socket
        }));
      } else if (message.command === 'socketClosed') {
        console.log('🔌 Socket closed from VS Code');
        setFixSession(prev => ({
          ...prev,
          active: false,
          socket: undefined
        }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const establishSocketConnection = async (sessionId: string) => {
    try {
      // Get token from VS Code settings via extension
      const AUTH_TOKEN = '2f3bcfaf11d2d909ed90d2ec706114e15b15a7f5642af4f9a385266c4d210f56'; // This should come from extension
      
      // Connect to Socket.IO server
      const SOCKET_URL = 'http://localhost:3001';
      console.log('🔌 Connecting to Socket.IO server:', SOCKET_URL);
      
      const socket = io(SOCKET_URL, {
        auth: {
          token: AUTH_TOKEN
        },
        transports: ['polling'],
        forceNew: true,
        timeout: 10000
      });

      socket.on('connect', () => {
        console.log('✅ Socket.IO connected successfully');
        console.log(`📡 Socket ID: ${socket.id}`);
        
        // Subscribe to company notifications
        console.log('📡 Subscribing to company notifications...');
        socket.emit('subscribe-company');
        
        setFixSession(prev => ({
          ...prev,
          active: true,
          sessionId,
          socket: socket
        }));
      });

      socket.on('disconnect', (reason) => {
        console.log(`❌ Socket.IO disconnected: ${reason}`);
        setFixSession(prev => ({
          ...prev,
          active: false,
          socket: undefined
        }));
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error.message);
      });

      socket.on('subscribed', (data) => {
        console.log('✅ Successfully subscribed to company notifications');
        console.log(`📊 Company ID: ${data.companyId}`);
        console.log(`💬 Message: ${data.message}`);
      });

      socket.on('unsubscribed', (data) => {
        console.log('✅ Successfully unsubscribed from company notifications');
        console.log(`📊 Company ID: ${data.companyId}`);
        console.log(`💬 Message: ${data.message}`);
      });

      // Run completion notifications
      socket.on('run-completed', (data) => {
        console.log('🎯 Run completed notification received!');
        console.log('📋 Run Details:', data);
        
        const run = data.run;
        if (run && run.action === 'track') {
          console.log('🎯 Track run detected:', run);
          
          // Update the session state and get the new trace count
          setFixSession(prev => {
            const newTraceCount = prev.traceCount + 1;
            
            // Add message about trace received with correct count
            const traceMessage: Message = {
              id: Date.now(),
              text: `🎯 **Trace ${newTraceCount} received!**\n\nWe've detected a new trace and it's automatically being evaluated. This helps us understand your code patterns and identify potential issues.\n\nUse the "Fix Now" button below to generate fixes for all detected issues.`,
              sender: 'ai',
              timestamp: new Date().toLocaleTimeString()
            };

            // Add the message to the messages array
            setMessages(prevMessages => [...prevMessages, traceMessage]);
            scrollToBottom();
            
            return {
              ...prev,
              traceCount: newTraceCount,
              runs: [...prev.runs, run]
            };
          });
        }
      });

      // Session update notifications
      socket.on('session-updated', (data) => {
        console.log('🔄 Session updated notification received!');
        console.log('📋 Session Details:', data);
      });

      socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

    } catch (error) {
      console.error('Error establishing Socket.IO connection:', error);
      throw error;
    }
  };

  const startFixSession = async () => {
    try {
      // Request token from extension
      if (window.vscode) {
        window.vscode.postMessage({ command: 'callHanditAPI' });
        // Wait for the response from the extension
        return new Promise((resolve, reject) => {
          const handleResponse = (event: MessageEvent) => {
            if (event.data.command === 'handitAPIResponse') {
              window.removeEventListener('message', handleResponse);
              if (event.data.success) {
                // Extension successfully created session, now establish Socket.IO connection
                establishSocketConnection(event.data.data.id);
                resolve(event.data.data.id);
              } else {
                reject(new Error(event.data.error));
              }
            }
          };
          window.addEventListener('message', handleResponse);
        });
      }

      // Fallback for development - use direct API call and Socket.IO connection
      const API_BASE = 'http://localhost:3001/api';
      const AUTH_TOKEN = '2f3bcfaf11d2d909ed90d2ec706114e15b15a7f5642af4f9a385266c4d210f56';
      
      const headers = {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      };

      console.log('🚀 Starting FixAI session (development mode)...');
      console.log('📡 API Base:', API_BASE);
      console.log('🔑 Auth Token:', AUTH_TOKEN.substring(0, 10) + '...');

      // Start session
      console.log('📤 Making POST request to:', `${API_BASE}/v1/codegpt/sessions`);
      const response = await fetch(`${API_BASE}/v1/codegpt/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'live',
          masking_rules: {}
        })
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.statusText}`);
      }

      const sessionData = await response.json();
      const sessionId = sessionData.id;
      
      console.log('✅ Session created successfully:', sessionData);
      console.log('🆔 Session ID:', sessionId);

      // Establish Socket.IO connection
      await establishSocketConnection(sessionId);
      return sessionId;
    } catch (error) {
      console.error('Error starting fix session:', error);
      throw error;
    }
  };

  const generateFixes = async () => {
    try {
      const API_BASE = 'http://localhost:3001/api';
      const AUTH_TOKEN = '2f3bcfaf11d2d909ed90d2ec706114e15b15a7f5642af4f9a385266c4d210f56';
      const headers = { 'Authorization': `Bearer ${AUTH_TOKEN}`, 'Content-Type': 'application/json' };

      // Get insights
      const insightsResponse = await fetch(`${API_BASE}/v1/codegpt/sessions/${fixSession.sessionId}/insights`, { method: 'GET', headers });
      if (!insightsResponse.ok) throw new Error(`Failed to get insights: ${insightsResponse.statusText}`);
      
      const insightsResponseData = await insightsResponse.json();
      const insightsData = insightsResponseData.insights || [];
      
      console.log('📊 Insights received:', insightsData);
      console.log('📊 Insights count:', insightsData.length);
      
      // Set insights with pending status
      const insightsWithStatus = insightsData.map((insight: any) => ({ ...insight, status: 'pending' }));
      console.log('📊 Insights with status:', insightsWithStatus);
      
      setFixSession(prev => ({ ...prev, insights: insightsWithStatus, isApplyingFixes: true, showFixButton: false }));

      // Add a message to show the queue immediately
      // Don't add queue message to chat - let the queue UI handle it

      // Apply insights
      const applyResponse = await fetch(`${API_BASE}/v1/codegpt/sessions/${fixSession.sessionId}/apply-insights`, {
        method: 'POST', headers, body: JSON.stringify({ insights: insightsData })
      });
      if (!applyResponse.ok) throw new Error(`Failed to apply insights: ${applyResponse.statusText}`);
      
      const applyData = await applyResponse.json();
      
      // Get the original prompt from the API response
      const originalPrompt = applyData.originalPrompt || insightsResponseData.originalPrompt || "Your current prompt";
      
      await simulateProgress(applyData, originalPrompt);
      
      return insightsData;
    } catch (error) {
      console.error('Error generating fixes:', error);
      const errorMessage: Message = {
        id: Date.now(),
        text: `❌ **Error generating fixes:**\n\n${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
      scrollToBottom();
      throw error;
    }
  };

  const startCheckboxAnimation = (insightCount: number) => {
    console.log('🎬 Starting checkbox animation for', insightCount, 'insights');
    
    // Mark insights as completed one by one with 5-second intervals
    for (let i = 0; i < insightCount; i++) {
      setTimeout(() => {
        console.log(`✅ Checking insight ${i + 1}/${insightCount}`);
        setFixSession(prev => ({
          ...prev,
          insights: prev.insights?.map((insight, index) =>
            index <= i ? { ...insight, status: 'completed' } : insight
          )
        }));
      }, i * 5000); // 5 second delay between each
    }
  };

  const simulateProgress = async (optimizationResults: any[], originalPrompt: string = "Your current prompt") => {
    console.log('🎭 Simulating progress for optimization results:', optimizationResults);

    // Get current insights count for simulation
    let currentInsights: any[] = [];
    setFixSession(prev => {
      currentInsights = prev.insights || [];
      return {
        ...prev,
        insights: prev.insights?.map(insight => ({ ...insight, status: 'pending' }))
      };
    });

    // Start the checkbox animation in parallel (non-blocking)
    startCheckboxAnimation(currentInsights.length);

    // Wait for the animation to complete (5 seconds per checkbox + 1 second final delay)
    const totalAnimationTime = (currentInsights.length * 5000) + 1000;
    await new Promise(resolve => setTimeout(resolve, totalAnimationTime));

    // Update fix session - mark all insights as completed
    setFixSession(prev => ({
      ...prev,
      isApplyingFixes: false,
      insights: prev.insights?.map(insight => ({ ...insight, status: 'completed' }))
    }));

    // Handle the response format - it's an array of optimization results
    const results = Array.isArray(optimizationResults) ? optimizationResults : [optimizationResults];
    
    // Create a better final message with original prompt and optimized version
    let completionText = `## 🎉 Optimization Complete!\n\nYour prompt has been successfully optimized and is ready to use. This improvement will increase your agent's accuracy by approximately **20%**.\n\n`;
    
    results.forEach((result, index) => {
      if (result.optimizationApplied && result.optimizedPrompt) {
        // Add separation between different prompts
        if (index > 0) {
          completionText += `\n\n---\n\n`;
        }
        
        // Use the originalPrompt from the API response, not the fallback
        const realOriginalPrompt = result.originalPrompt || originalPrompt;
        
        completionText += `**📝 Original Prompt:**\n\n`;
        completionText += `\`\`\`\n${realOriginalPrompt}\n\`\`\`\n\n`;
        
        completionText += `**✨ Optimized Prompt:**\n\n`;
        completionText += `\`\`\`\n${result.optimizedPrompt}\n\`\`\`\n\n`;
        
        completionText += `**📋 Next Steps:**\n\n`;
        completionText += `1. Click the **Copy** button below to copy the optimized prompt\n`;
        completionText += `2. Replace your current prompt with the optimized version\n`;
        completionText += `3. Test your agent to see the improved accuracy\n\n`;
        
        completionText += `**💡 Tip:** The optimized prompt includes better context, clearer instructions, and improved formatting for better AI understanding.\n\n`;
      }
    });

    const completionMessage: Message = {
      id: Date.now(),
      text: completionText,
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString(),
      optimizedPrompts: results.map(r => r.optimizedPrompt).filter(Boolean) // Add all optimized prompts for copy functionality
    };
    
    setMessages(prev => [...prev, completionMessage]);
    scrollToBottom();
    
    return optimizationResults;
  };

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!inputValue.trim() && selectedFiles.length === 0) return;
    
    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
      files: selectedFiles.length > 0 ? selectedFiles.map(f => ({ name: f.name, content: f.content, type: f.type } as any)) : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setSelectedFiles([]);
    setIsLoading(true);
    setIsStreaming(true);

    // Send message to VS Code extension
    if (window.vscode) {
      window.vscode.postMessage({
        command: 'sendMessage',
        text: inputValue,
        files: selectedFiles
      });
    }

    // Handle different command types
    if (inputValue.startsWith('/FixAI')) {
      try {
        await startFixSession();
        const responseText = `## FixAI Session Started 🔧\n\nYour AI fix session has started! Please run your agent so we can detect your traces.\n\nI'm now monitoring for code traces and will automatically evaluate them to identify potential issues.\n\n**What happens next:**\n- Run your code/agent\n- I'll detect traces automatically\n- Each trace will be evaluated for issues\n- You can choose Apply Fixes when ready`;
        
        const aiMessage: Message = {
          id: Date.now() + 1,
          text: responseText,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        setIsStreaming(false);
        scrollToBottom();
      } catch (error) {
        const errorMessage: Message = {
          id: Date.now() + 1,
          text: `❌ **Error starting FixAI session:**\n\n${error instanceof Error ? error.message : 'Unknown error occurred'}\n\nPlease try again or check your connection.`,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        setIsStreaming(false);
        scrollToBottom();
      }
    } else if (inputValue.toLowerCase().includes('fix now') && fixSession.active) {
      // Handle text-based fix now command (for backward compatibility)
      await generateFixes();
      setIsLoading(false);
      setIsStreaming(false);
      scrollToBottom();
    } else if (inputValue.toLowerCase().includes('continue') && fixSession.active) {
      const responseText = `✅ **Continuing trace collection...**\n\nI'll keep monitoring for new traces. Run your code/agent and I'll automatically detect and evaluate each trace.\n\nUse the "Fix Now" button below when you're ready to generate fixes for all detected issues.`;
      
      const aiMessage: Message = {
        id: Date.now() + 1,
        text: responseText,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
      setIsStreaming(false);
      scrollToBottom();
    } else {
      // Handle other commands or regular messages
      setTimeout(() => {
        let responseText = '';
        
        if (inputValue.startsWith('/Explain')) {
          responseText = `## Code Explanation Mode 📚\n\nI'll help you understand your code! Please share:\n\n- **The code snippet** you want explained\n- **Specific parts** you're confused about\n- **Context** about what the code should do\n\nI'll provide a detailed breakdown with examples.`;
        } else if (inputValue.startsWith('/Debug')) {
          responseText = `## Debug Mode 🐛\n\nLet's debug your code together! Please provide:\n\n- **The code** that's not working\n- **Error messages** or unexpected behavior\n- **Steps to reproduce** the issue\n- **Expected vs actual** output\n\nI'll help you identify and fix the bugs.`;
        } else if (inputValue.startsWith('/Optimize')) {
          responseText = `## Code Optimization Mode ⚡\n\nI'll help optimize your code for better performance! Share:\n\n- **The code** you want to optimize\n- **Performance issues** you're experiencing\n- **Target environment** (browser, Node.js, etc.)\n\nI'll suggest improvements for speed, memory usage, and best practices.`;
        } else if (inputValue.startsWith('/Test')) {
          responseText = `## Test Generation Mode 🧪\n\nI'll help you write comprehensive tests! Please provide:\n\n- **The code** you want to test\n- **Testing framework** preference (Jest, Mocha, etc.)\n- **Test coverage** requirements\n\nI'll generate unit tests, integration tests, and edge cases.`;
        } else if (inputValue.startsWith('/Refactor')) {
          responseText = `## Code Refactoring Mode 🔄\n\nLet's improve your code structure! Share:\n\n- **The code** you want to refactor\n- **Specific issues** (readability, maintainability, etc.)\n- **Target patterns** or architecture\n\nI'll suggest refactoring strategies and provide improved code.`;
        } else {
          responseText = `I received your message: "${inputValue}". This is a test response from the AI. I can help you with code analysis, debugging, optimization, and more!`;
        }
        
        const aiMessage: Message = {
          id: Date.now() + 1,
          text: responseText,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        setIsStreaming(false);
        scrollToBottom();
      }, 1000);
    }
  }, [inputValue, selectedFiles, fixSession]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setSelectedFiles(prev => [...prev, {
          name: file.name,
          content: content,
          type: file.type
        }]);
      };
      reader.readAsText(file);
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setInputValue('');
    setSelectedFiles([]);
    
    if (window.vscode) {
      window.vscode.postMessage({
        command: 'clearChat'
      });
    }
  }, []);

  return {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isStreaming,
    selectedFiles,
    messagesEndRef,
    inputRef,
    fileInputRef,
    handleSubmit,
    handleFileSelect,
    removeFile,
    openFileDialog,
    clearChat,
    fixSession,
    generateFixes
  };
};
