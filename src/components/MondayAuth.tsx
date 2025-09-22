import React, { useState, useEffect } from 'react';
import mondaySdk from 'monday-sdk-js';
import './MondayAuth.css';

interface MondayAuthProps {
  children: React.ReactNode;
}

interface MondayUser {
  id: string;
  name: string;
  email: string;
  photo_original?: string;
}

const MondayAuth: React.FC<MondayAuthProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<MondayUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeMondayAuth = async () => {
      try {
        // Initialize Monday SDK
        const monday = mondaySdk();
        
        // Check if we're in an iframe (Monday.com context)
        const isInIframe = window.self !== window.top;
        
        if (isInIframe) {
          // We're in Monday.com iframe - use context authentication
          try {
            const context = await monday.get('context');
            
            if (context.data && context.data.user) {
              setUser(context.data.user);
              setIsAuthenticated(true);
            } else {
              setError('Please ensure you are logged into Monday.com');
            }
          } catch (contextError) {
            console.error('Monday.com context error:', contextError);
            setError('Unable to authenticate with Monday.com');
          }
        } else {
          // Direct access - check for OAuth token
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          const storedToken = localStorage.getItem('monday_access_token');
          
          if (code) {
            // Handle OAuth callback
            await handleOAuthCallback(code);
          } else if (storedToken) {
            // Validate existing token
            await validateToken(storedToken);
          } else {
            // Redirect to OAuth
            redirectToOAuth();
          }
        }
      } catch (error) {
        console.error('Authentication initialization error:', error);
        setError('Authentication system error');
      } finally {
        setIsLoading(false);
      }
    };

    initializeMondayAuth();
  }, []);

  const handleOAuthCallback = async (code: string) => {
    try {
      // Exchange code for token
      const response = await fetch('/api/monday-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      if (response.ok) {
        const { access_token, user } = await response.json();
        localStorage.setItem('monday_access_token', access_token);
        setUser(user);
        setIsAuthenticated(true);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setError('OAuth authentication failed');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      setError('OAuth processing error');
    }
  };

  const validateToken = async (token: string) => {
    try {
      const monday = mondaySdk();
      monday.setToken(token);
      
      const userResponse = await monday.api('query { me { id name email photo_original } }');
      
      if (userResponse.data && userResponse.data.me) {
        setUser(userResponse.data.me);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('monday_access_token');
        redirectToOAuth();
      }
    } catch (error) {
      console.error('Token validation error:', error);
      localStorage.removeItem('monday_access_token');
      redirectToOAuth();
    }
  };

  const redirectToOAuth = () => {
    const clientId = process.env.REACT_APP_MONDAY_CLIENT_ID;
    const redirectUri = encodeURIComponent(window.location.origin);
    
    if (!clientId) {
      setError('Monday.com app not configured. Please contact your administrator.');
      return;
    }
    
    const oauthUrl = `https://auth.monday.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=boards:read users:read`;
    window.location.href = oauthUrl;
  };

  const logout = () => {
    localStorage.removeItem('monday_access_token');
    setIsAuthenticated(false);
    setUser(null);
    
    // If in iframe, show message. If direct access, redirect to OAuth
    const isInIframe = window.self !== window.top;
    if (!isInIframe) {
      redirectToOAuth();
    }
  };

  if (isLoading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Authenticating with Monday.com...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-error">
        <h2>Authentication Required</h2>
        <p>{error}</p>
        <div className="auth-instructions">
          <h3>To access the Contest Manager:</h3>
          <ol>
            <li>Log into your Monday.com account</li>
            <li>Navigate to the board with the Contest Manager widget</li>
            <li>Access the application through the Monday.com interface</li>
          </ol>
        </div>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Retry Authentication
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-required">
        <h2>Monday.com Authentication Required</h2>
        <p>Please log into Monday.com to access the Contest Manager.</p>
        <button onClick={redirectToOAuth} className="login-btn">
          Login with Monday.com
        </button>
      </div>
    );
  }

  // User is authenticated - render the app
  return (
    <div className="authenticated-app">
      <div className="user-info">
        {user?.photo_original && (
          <img src={user.photo_original} alt={user.name} className="user-avatar" />
        )}
        <span className="user-name">{user?.name}</span>
        <button onClick={logout} className="logout-btn">Logout</button>
      </div>
      {children}
    </div>
  );
};

export default MondayAuth;
