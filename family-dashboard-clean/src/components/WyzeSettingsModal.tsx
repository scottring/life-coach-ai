import React, { useState, useEffect } from 'react';
import { XMarkIcon, CameraIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { wyzeApiService, WyzeDevice } from '../services/wyzeApiService';

interface WyzeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WyzeSettingsModal({ isOpen, onClose }: WyzeSettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyId, setApiKeyId] = useState('');
  const [authMethod, setAuthMethod] = useState<'apikey' | 'credentials' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [cameras, setCameras] = useState<WyzeDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadCurrentSettings();
    }
  }, [isOpen]);

  const loadCurrentSettings = async () => {
    // Check for API key first (preferred method)
    const savedApiKey = localStorage.getItem('wyze_api_key');
    const savedApiKeyId = localStorage.getItem('wyze_api_key_id');
    
    if (savedApiKey && savedApiKeyId) {
      setApiKey(savedApiKey);
      setApiKeyId(savedApiKeyId);
      setAuthMethod('apikey');
      await testApiKeyConnection(savedApiKey, savedApiKeyId);
    } else {
      // Fall back to email/password
      const savedEmail = localStorage.getItem('wyze_email');
      const savedPassword = localStorage.getItem('wyze_password');
      if (savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setAuthMethod('credentials');
        await testCredentialsConnection(savedEmail, savedPassword);
      }
    }
  };

  const testApiKeyConnection = async (testApiKey?: string, testApiKeyId?: string) => {
    const keyToTest = testApiKey || apiKey;
    const keyIdToTest = testApiKeyId || apiKeyId;
    if (!keyToTest || !keyIdToTest) return;

    setIsConnecting(true);
    setError(null);

    try {
      console.log('Testing connection with API key...');
      wyzeApiService.setApiKey(keyToTest, keyIdToTest);
      const connectionTest = await wyzeApiService.testConnection();
      console.log('API Key connection test result:', connectionTest);
      
      await handleSuccessfulConnection();
    } catch (err) {
      setIsConnected(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`API Key connection failed: ${errorMessage}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const testCredentialsConnection = async (testEmail?: string, testPassword?: string) => {
    const emailToTest = testEmail || email;
    const passwordToTest = testPassword || password;
    if (!emailToTest || !passwordToTest) return;

    setIsConnecting(true);
    setError(null);

    try {
      console.log('Testing connection with credentials:', emailToTest, '(password hidden)');
      wyzeApiService.setCredentials(emailToTest, passwordToTest);
      const connectionTest = await wyzeApiService.testConnection();
      console.log('Credentials connection test result:', connectionTest);
      
      await handleSuccessfulConnection();
    } catch (err) {
      setIsConnected(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Detect common authentication issues
      if (errorMessage.includes('authenticate') || errorMessage.includes('Failed to authenticate')) {
        setError('Authentication failed. Try using the API Key method instead (recommended for Google/Apple ID accounts).');
      } else {
        setError(`Connection failed: ${errorMessage}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSuccessfulConnection = async () => {
    setIsConnected(true);
    console.log('Fetching camera devices...');
    const cameraDevices = await wyzeApiService.getCameraDevices();
    console.log('Camera devices received:', cameraDevices);
    setCameras(cameraDevices);
    
    // Check if these are demo cameras
    const hasDemoCameras = cameraDevices.some(cam => cam.mac.startsWith('demo-camera'));
    if (hasDemoCameras) {
      console.warn('Demo cameras detected - real Wyze connection may have failed');
      setError('Connected to Wyze but showing demo cameras. Please check your account has cameras set up.');
    }
    
    // Auto-select first camera if only one exists
    if (cameraDevices.length === 1) {
      setSelectedCamera(cameraDevices[0].mac);
      localStorage.setItem('wyze_primary_camera', cameraDevices[0].mac);
    } else {
      const savedCamera = localStorage.getItem('wyze_primary_camera');
      if (savedCamera && cameraDevices.find(c => c.mac === savedCamera)) {
        setSelectedCamera(savedCamera);
      }
    }
  };

  const handleApiKeyConnect = async () => {
    if (!apiKey.trim() || !apiKeyId.trim()) {
      setError('Please enter both API Key and API Key ID');
      return;
    }

    await testApiKeyConnection(apiKey, apiKeyId);
  };

  const handleCredentialsConnect = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your Wyze email and password');
      return;
    }

    await testCredentialsConnection(email, password);
  };

  const handleDemoMode = () => {
    setIsConnected(true);
    setError(null);
    
    // Set demo cameras
    const demoCameras = [
      {
        mac: 'demo-camera-001',
        nickname: 'Living Room Camera (Demo)',
        product_model: 'WYZE Cam v3',
        product_type: 'Camera',
        device_params: {}
      },
      {
        mac: 'demo-camera-002', 
        nickname: 'Kitchen Camera (Demo)',
        product_model: 'WYZE Cam Pan v2',
        product_type: 'Camera',
        device_params: {}
      }
    ];
    
    setCameras(demoCameras);
    setSelectedCamera(demoCameras[0].mac);
    
    // Store demo mode flag
    localStorage.setItem('wyze_demo_mode', 'true');
    localStorage.setItem('wyze_primary_camera', demoCameras[0].mac);
    
    console.log('Demo mode activated with cameras:', demoCameras);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('wyze_email');
    localStorage.removeItem('wyze_password');
    localStorage.removeItem('wyze_access_token');
    localStorage.removeItem('wyze_primary_camera');
    localStorage.removeItem('wyze_demo_mode');
    setEmail('');
    setPassword('');
    setIsConnected(false);
    setCameras([]);
    setSelectedCamera('');
    setError(null);
  };

  const handleCameraSelect = (cameraMac: string) => {
    setSelectedCamera(cameraMac);
    localStorage.setItem('wyze_primary_camera', cameraMac);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative apple-card w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ background: '#f5f5f7' }}>
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 flex-shrink-0" 
             style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
          <div className="flex items-center">
            <CameraIcon className="h-6 w-6 mr-3 sf-icon" style={{ color: 'var(--apple-blue)' }} />
            <div>
              <h2 className="apple-title text-xl text-gray-800">Wyze Camera Setup</h2>
              <p className="apple-caption text-gray-600">Configure pet monitoring with your Wyze cameras</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 apple-transition p-2 rounded-lg hover:bg-gray-100/50">
            <XMarkIcon className="w-6 h-6 sf-icon" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ background: 'white' }}>
          {/* Connection Status */}
          {isConnected && (
            <div className="mb-6 p-4 rounded-xl flex items-center" 
                 style={{ background: localStorage.getItem('wyze_demo_mode') === 'true' 
                   ? 'rgba(255, 149, 0, 0.1)' : 'rgba(52, 199, 89, 0.1)' }}>
              <CheckCircleIcon className="h-5 w-5 mr-3 sf-icon" 
                              style={{ color: localStorage.getItem('wyze_demo_mode') === 'true' 
                                ? 'var(--apple-orange)' : 'var(--apple-green)' }} />
              <div>
                <p className="apple-subtitle" style={{ color: localStorage.getItem('wyze_demo_mode') === 'true' 
                  ? 'var(--apple-orange)' : 'var(--apple-green)' }}>
                  {localStorage.getItem('wyze_demo_mode') === 'true' ? 'Demo Mode Active' : 'Connected to Wyze'}
                </p>
                <p className="apple-caption text-gray-600">
                  {cameras.length} camera(s) found
                  {localStorage.getItem('wyze_demo_mode') === 'true' && ' (simulated)'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl flex items-start" style={{ background: 'rgba(255, 59, 48, 0.1)' }}>
              <ExclamationTriangleIcon className="h-5 w-5 mr-3 mt-0.5 sf-icon" style={{ color: 'var(--apple-red)' }} />
              <div>
                <p className="apple-subtitle" style={{ color: 'var(--apple-red)' }}>Connection Error</p>
                <p className="apple-caption text-gray-600">{error}</p>
              </div>
            </div>
          )}

          {!isConnected && (
            <div className="space-y-6">
              {/* Authentication Method Selection */}
              {!authMethod && (
                <div>
                  <h3 className="apple-subtitle text-gray-800 mb-4">Choose Authentication Method</h3>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => setAuthMethod('apikey')}
                      className="apple-card w-full p-4 text-left apple-transition hover:transform hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.1), rgba(52, 199, 89, 0.05))', border: '1px solid rgba(52, 199, 89, 0.3)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="apple-subtitle text-gray-800">API Key (Recommended)</p>
                          <p className="apple-caption text-gray-600">Works with Google/Apple ID accounts</p>
                        </div>
                        <span className="apple-caption font-medium" style={{ color: 'var(--apple-green)' }}>Recommended</span>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setAuthMethod('credentials')}
                      className="apple-card w-full p-4 text-left apple-transition hover:transform hover:scale-[1.02]"
                      style={{ background: 'white', border: '1px solid #e5e7eb' }}
                    >
                      <div>
                        <p className="apple-subtitle text-gray-800">Email & Password</p>
                        <p className="apple-caption text-gray-600">Traditional login method</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* API Key Authentication */}
              {authMethod === 'apikey' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="apple-subtitle text-gray-800">Step 1: Enter Your Wyze API Key</h3>
                    <button onClick={() => setAuthMethod(null)} className="apple-caption text-blue-600 hover:text-blue-800">
                      ← Change Method
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block apple-caption text-gray-600 mb-2">API Key</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg apple-caption"
                        placeholder="Enter your Wyze API Key..."
                      />
                    </div>
                    
                    <div>
                      <label className="block apple-caption text-gray-600 mb-2">API Key ID</label>
                      <input
                        type="text"
                        value={apiKeyId}
                        onChange={(e) => setApiKeyId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg apple-caption"
                        placeholder="Enter your API Key ID..."
                      />
                    </div>
                    
                    <button
                      onClick={handleApiKeyConnect}
                      disabled={isConnecting || !apiKey.trim() || !apiKeyId.trim()}
                      className="apple-button w-full px-4 py-3 text-white apple-caption font-medium mb-3"
                      style={{ background: isConnecting || !apiKey.trim() || !apiKeyId.trim() ? 'rgba(0, 122, 255, 0.5)' : 'var(--apple-blue)' }}
                    >
                      {isConnecting ? 'Connecting...' : 'Connect with API Key'}
                    </button>
                  </div>
                </div>
              )}

              {/* Email/Password Authentication */}
              {authMethod === 'credentials' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="apple-subtitle text-gray-800">Step 1: Enter Your Wyze Credentials</h3>
                    <button onClick={() => setAuthMethod(null)} className="apple-caption text-blue-600 hover:text-blue-800">
                      ← Change Method
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block apple-caption text-gray-600 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg apple-caption"
                        placeholder="Enter your Wyze account email..."
                      />
                    </div>
                    
                    <div>
                      <label className="block apple-caption text-gray-600 mb-2">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg apple-caption"
                        placeholder="Enter your Wyze account password..."
                      />
                    </div>
                    
                    <button
                      onClick={handleCredentialsConnect}
                      disabled={isConnecting || !email.trim() || !password.trim()}
                      className="apple-button w-full px-4 py-3 text-white apple-caption font-medium mb-3"
                      style={{ background: isConnecting || !email.trim() || !password.trim() ? 'rgba(0, 122, 255, 0.5)' : 'var(--apple-blue)' }}
                    >
                      {isConnecting ? 'Connecting...' : 'Connect with Credentials'}
                    </button>
                  </div>
                </div>
              )}

              {/* Demo Mode Option */}
              {authMethod && (
                <div className="pt-4 border-t border-gray-200/50">
                  <button
                    onClick={handleDemoMode}
                    disabled={isConnecting}
                    className="apple-button w-full px-4 py-3 apple-caption font-medium"
                    style={{ background: 'rgba(255, 149, 0, 0.1)', color: 'var(--apple-orange)', border: '1px solid rgba(255, 149, 0, 0.3)' }}
                  >
                    Use Demo Mode Instead
                  </button>
                </div>
              )}

              {/* Instructions */}
              {authMethod === 'apikey' && (
                <div className="apple-card p-4" style={{ background: 'rgba(0, 0, 0, 0.03)' }}>
                  <h4 className="apple-subtitle text-gray-800 mb-3">How to Get Your Wyze API Key:</h4>
                  
                  <ol className="space-y-3 apple-caption text-gray-700">
                    <li className="flex">
                      <span className="mr-2 font-medium">1.</span>
                      <div>
                        <strong>Visit the Wyze Developer Console:</strong>
                        <p className="mt-1 text-gray-600">
                          Go to{' '}
                          <a 
                            href="https://developer-api-console.wyze.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            developer-api-console.wyze.com
                          </a>
                        </p>
                      </div>
                    </li>
                    <li className="flex">
                      <span className="mr-2 font-medium">2.</span>
                      <div>
                        <strong>Sign in with your Wyze account:</strong>
                        <p className="mt-1 text-gray-600">Use the same account you use for the Wyze app (Google/Apple ID works here!)</p>
                      </div>
                    </li>
                    <li className="flex">
                      <span className="mr-2 font-medium">3.</span>
                      <div>
                        <strong>Create a new API Key:</strong>
                        <p className="mt-1 text-gray-600">Click "Create API Key" and give it a name like "Pet Monitoring"</p>
                      </div>
                    </li>
                    <li className="flex">
                      <span className="mr-2 font-medium">4.</span>
                      <div>
                        <strong>Copy both values:</strong>
                        <p className="mt-1 text-gray-600">You'll get an API Key and an API Key ID - enter both above</p>
                      </div>
                    </li>
                  </ol>
                  
                  <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(52, 199, 89, 0.1)' }}>
                    <p className="apple-caption" style={{ color: 'var(--apple-green)' }}>
                      <strong>✅ Perfect for Google/Apple ID users!</strong> This method works with any Wyze account type.
                    </p>
                  </div>
                </div>
              )}

              {authMethod === 'credentials' && (
                <div className="apple-card p-4" style={{ background: 'rgba(0, 0, 0, 0.03)' }}>
                  <h4 className="apple-subtitle text-gray-800 mb-3">Email & Password Setup:</h4>
                  
                  <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(255, 149, 0, 0.1)' }}>
                    <p className="apple-caption font-medium mb-2" style={{ color: 'var(--apple-orange)' }}>
                      ⚠️ Google/Apple ID Users
                    </p>
                    <p className="apple-caption text-gray-700">
                      If you sign in with Google/Apple ID, try the API Key method instead (recommended).
                    </p>
                  </div>
                  
                  <ol className="space-y-2 apple-caption text-gray-700">
                    <li className="flex">
                      <span className="mr-2 font-medium">1.</span>
                      <span>Use the same email and password you use to log into wyze.com</span>
                    </li>
                    <li className="flex">
                      <span className="mr-2 font-medium">2.</span>
                      <span>Make sure your cameras are online in the Wyze app</span>
                    </li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Camera Selection */}
          {isConnected && cameras.length > 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="apple-subtitle text-gray-800 mb-4">Step 2: Select Primary Camera for Pet Monitoring</h3>
                
                <div className="space-y-3">
                  {cameras.map(camera => (
                    <div key={camera.mac} className="apple-card p-4 cursor-pointer apple-transition hover:transform hover:scale-[1.02]"
                         onClick={() => handleCameraSelect(camera.mac)}
                         style={{ 
                           background: selectedCamera === camera.mac 
                             ? 'linear-gradient(135deg, rgba(0, 122, 255, 0.1), rgba(0, 122, 255, 0.05))' 
                             : 'white',
                           border: selectedCamera === camera.mac ? '2px solid var(--apple-blue)' : '1px solid #e5e7eb'
                         }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <CameraIcon className="h-6 w-6 mr-3 sf-icon text-gray-600" />
                          <div>
                            <p className="apple-subtitle text-gray-800">{camera.nickname || 'Unnamed Camera'}</p>
                            <p className="apple-caption text-gray-600">{camera.product_model}</p>
                          </div>
                        </div>
                        
                        {selectedCamera === camera.mac && (
                          <CheckCircleIcon className="h-6 w-6 sf-icon" style={{ color: 'var(--apple-blue)' }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monitoring Features */}
              <div className="apple-card p-4" style={{ background: 'rgba(52, 199, 89, 0.05)' }}>
                <h4 className="apple-subtitle text-gray-800 mb-3">What We'll Monitor:</h4>
                <ul className="space-y-2 apple-caption text-gray-700">
                  <li className="flex items-center">
                    <span className="w-2 h-2 rounded-full mr-3" style={{ background: 'var(--apple-green)' }}></span>
                    <span><strong>Barking events</strong> - Times, duration, and loudness levels</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 rounded-full mr-3" style={{ background: 'var(--apple-green)' }}></span>
                    <span><strong>Motion detection</strong> - Pet movement and activity levels</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 rounded-full mr-3" style={{ background: 'var(--apple-green)' }}></span>
                    <span><strong>Calm periods</strong> - Quiet times without barking or excessive movement</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 rounded-full mr-3" style={{ background: 'var(--apple-green)' }}></span>
                    <span><strong>Anxiety scoring</strong> - Overall stress level analysis</span>
                  </li>
                </ul>
              </div>

              {/* Disconnect Option */}
              <div className="pt-4 border-t border-gray-200/50 flex space-x-3">
                <button
                  onClick={handleDisconnect}
                  className="apple-button px-4 py-2 apple-caption font-medium"
                  style={{ background: 'rgba(255, 59, 48, 0.1)', color: 'var(--apple-red)', border: '1px solid rgba(255, 59, 48, 0.2)' }}
                >
                  Disconnect Wyze
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="apple-button px-4 py-2 apple-caption font-medium"
                  style={{ background: 'rgba(255, 149, 0, 0.1)', color: 'var(--apple-orange)', border: '1px solid rgba(255, 149, 0, 0.2)' }}
                >
                  Clear All Data & Reload
                </button>
              </div>
            </div>
          )}

          {isConnected && cameras.length === 0 && (
            <div className="text-center py-8">
              <CameraIcon className="h-16 w-16 text-gray-400/40 mx-auto mb-4 sf-icon" />
              <p className="apple-body text-gray-700 mb-2">No cameras found</p>
              <p className="apple-caption text-gray-600">Make sure your cameras are set up in the Wyze app and try reconnecting.</p>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200/50 flex-shrink-0" 
             style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
          <button
            onClick={onClose}
            className="px-6 py-3 text-white apple-caption font-medium rounded-lg apple-transition"
            style={{ background: 'var(--apple-blue)' }}
          >
            {isConnected ? 'Save Settings' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}