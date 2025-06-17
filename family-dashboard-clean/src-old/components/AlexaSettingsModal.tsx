import React, { useState, useEffect } from 'react';
import { XMarkIcon, SpeakerWaveIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { alexaApiService, AlexaDevice } from '../services/alexaApiService';

interface AlexaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AlexaSettingsModal({ isOpen, onClose }: AlexaSettingsModalProps) {
  const [deviceId, setDeviceId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState<AlexaDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadCurrentSettings();
    }
  }, [isOpen]);

  const loadCurrentSettings = async () => {
    const credentials = alexaApiService.getCredentials();
    if (credentials) {
      setDeviceId(credentials.deviceId);
      setApiKey(credentials.apiKey || '');
      setSelectedDevice(credentials.deviceId);
      await testConnection();
    }
    
    // Load available devices
    try {
      const availableDevices = await alexaApiService.getAvailableDevices();
      setDevices(availableDevices);
    } catch (error) {
      console.error('Error loading Alexa devices:', error);
    }
  };

  const testConnection = async () => {
    if (!deviceId) {
      setError('Please enter a device ID');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Set credentials first
      await alexaApiService.setCredentials({
        deviceId,
        apiKey: apiKey || undefined
      });

      // Test connection
      const connected = await alexaApiService.testConnection();
      setIsConnected(connected);
      
      if (connected) {
        setError(null);
      } else {
        setError('Unable to connect to Alexa device. Please check your device ID and ensure the device is online.');
      }
    } catch (error) {
      console.error('Alexa connection error:', error);
      setError('Connection failed. Please check your settings and try again.');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!deviceId) {
      setError('Please enter a device ID');
      return;
    }

    setIsConnecting(true);
    try {
      await alexaApiService.setCredentials({
        deviceId,
        apiKey: apiKey || undefined
      });
      
      const connected = await alexaApiService.testConnection();
      if (connected) {
        setIsConnected(true);
        onClose();
      } else {
        setError('Failed to connect to Alexa device');
      }
    } catch (error) {
      setError('Failed to save Alexa settings');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    alexaApiService.clearCredentials();
    setDeviceId('');
    setApiKey('');
    setSelectedDevice('');
    setIsConnected(false);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full h-full flex flex-col" style={{ background: '#f5f5f7' }}>
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 flex-shrink-0" 
             style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
          <div className="flex items-center">
            <SpeakerWaveIcon className="h-6 w-6 mr-3 sf-icon" style={{ color: 'var(--apple-blue)' }} />
            <div>
              <h2 className="apple-title text-xl text-gray-800">Alexa Integration</h2>
              <p className="apple-caption text-gray-600">
                Connect your Alexa device for dog behavior monitoring
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 apple-transition p-2 rounded-lg hover:bg-gray-100/50">
            <XMarkIcon className="w-6 h-6 sf-icon" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full" style={{ background: 'white' }}>
          {/* Connection Status */}
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {isConnected ? (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">Connected to Alexa</span>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mr-2" />
                    <span className="text-orange-800 font-medium">Not Connected</span>
                  </>
                )}
              </div>
              {isConnected && (
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Setup Instructions */}
          {showInstructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-2">Setup Instructions</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    {alexaApiService.getSetupInstructions().map((instruction, index) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ol>
                  <button
                    onClick={() => setShowInstructions(false)}
                    className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Hide Instructions
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showInstructions && (
            <button
              onClick={() => setShowInstructions(true)}
              className="mb-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Show Setup Instructions
            </button>
          )}

          {/* Device Requirements */}
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Device Requirements</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {alexaApiService.getDeviceRequirements().map((requirement, index) => (
                <li key={index} className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {requirement}
                </li>
              ))}
            </ul>
          </div>

          {/* Connection Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Connect Your Alexa Device</h3>
            
            {/* Available Devices */}
            {devices.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select an Alexa Device
                </label>
                <div className="grid gap-3">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDevice === device.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedDevice(device.id);
                        setDeviceId(device.id);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{device.name}</div>
                          <div className="text-sm text-gray-600">{device.type} • {device.room}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {device.capabilities.join(', ')}
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${device.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Device ID Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Device ID {devices.length === 0 && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="e.g., echo-living-room or G091LF11061"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find this in the Alexa app: Devices → Your Device → Settings → Device Options
              </p>
            </div>

            {/* Optional API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key (Optional)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Optional webhook authentication key"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used for secure webhook communication (advanced users only)
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-800 text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={testConnection}
                disabled={isConnecting || !deviceId}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Testing Connection...' : 'Test Connection'}
              </button>
              
              <button
                onClick={handleSave}
                disabled={isConnecting || !deviceId}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Settings
              </button>
            </div>

            {/* Demo Mode Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Demo Mode Available</p>
                  <p>
                    If you don't have an Alexa device configured, the system will generate realistic demo data 
                    for monitoring sessions. This allows you to test the behavior tracking features.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}