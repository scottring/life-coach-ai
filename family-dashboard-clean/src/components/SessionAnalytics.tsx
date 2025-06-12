import React, { useState, useEffect } from 'react';
import { XMarkIcon, ChartBarIcon, CalendarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { DogBehaviorService } from '../services/dogBehaviorService';
import { LeaveSessionLog } from '../types/dogBehavior';

interface SessionAnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
}

interface AnalyticsData {
  sessions: Array<{
    id: string;
    date: Date;
    behaviorIndex: number;
    duration?: number;
    observations?: LeaveSessionLog['returnObservations'];
  }>;
  averageBehaviorIndex: number;
  totalSessions: number;
  trend: 'improving' | 'declining' | 'stable';
}

export default function SessionAnalytics({ isOpen, onClose, familyId }: SessionAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [sessionHistory, setSessionHistory] = useState<LeaveSessionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(30);
  const [activeTab, setActiveTab] = useState<'chart' | 'history'>('chart');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, familyId, timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsData, historyData] = await Promise.all([
        DogBehaviorService.getHistoricalAnalytics(familyId, timeRange),
        DogBehaviorService.getSessionHistory(familyId, 20)
      ]);
      setAnalytics(analyticsData);
      setSessionHistory(historyData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatBehaviorIndex = (index: number) => {
    return Math.round(index * 100);
  };

  const getBehaviorColor = (index: number) => {
    if (index >= 0.8) return '#34C759'; // Green
    if (index >= 0.6) return '#FFCC00'; // Yellow  
    if (index >= 0.4) return '#FF9500'; // Orange
    return '#FF3B30'; // Red
  };

  const getBehaviorLabel = (index: number) => {
    if (index >= 0.8) return 'Excellent';
    if (index >= 0.6) return 'Good';
    if (index >= 0.4) return 'Fair';
    return 'Needs Work';
  };

  const renderChart = () => {
    if (!analytics || analytics.sessions.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No session data available</p>
          </div>
        </div>
      );
    }

    const maxIndex = Math.max(...analytics.sessions.map(s => s.behaviorIndex));
    const chartHeight = 200;
    const chartWidth = 600;
    const padding = 40;

    return (
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Behavior Index Trend</h3>
        
        <svg width={chartWidth} height={chartHeight + padding * 2} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(value => (
            <g key={value}>
              <line
                x1={padding}
                y1={padding + (1 - value) * chartHeight}
                x2={chartWidth - padding}
                y2={padding + (1 - value) * chartHeight}
                stroke="#f0f0f0"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={padding + (1 - value) * chartHeight + 4}
                textAnchor="end"
                fontSize="12"
                fill="#666"
              >
                {Math.round(value * 100)}%
              </text>
            </g>
          ))}

          {/* Chart area */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(0, 122, 255, 0.3)" />
              <stop offset="100%" stopColor="rgba(0, 122, 255, 0.05)" />
            </linearGradient>
          </defs>

          {/* Area chart */}
          {analytics.sessions.length > 1 && (
            <path
              d={`M ${padding} ${chartHeight + padding} ${analytics.sessions.map((session, index) => {
                const x = padding + (index / (analytics.sessions.length - 1)) * (chartWidth - padding * 2);
                const y = padding + (1 - session.behaviorIndex) * chartHeight;
                return `L ${x} ${y}`;
              }).join(' ')} L ${chartWidth - padding} ${chartHeight + padding} Z`}
              fill="url(#areaGradient)"
            />
          )}

          {/* Line chart */}
          {analytics.sessions.length > 1 && (
            <polyline
              points={analytics.sessions.map((session, index) => {
                const x = padding + (index / (analytics.sessions.length - 1)) * (chartWidth - padding * 2);
                const y = padding + (1 - session.behaviorIndex) * chartHeight;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#007AFF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {analytics.sessions.map((session, index) => {
            const x = padding + (index / Math.max(analytics.sessions.length - 1, 1)) * (chartWidth - padding * 2);
            const y = padding + (1 - session.behaviorIndex) * chartHeight;
            return (
              <g key={session.id}>
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill={getBehaviorColor(session.behaviorIndex)}
                  stroke="white"
                  strokeWidth="2"
                />
                {/* Date labels */}
                <text
                  x={x}
                  y={chartHeight + padding + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#666"
                  transform={analytics.sessions.length > 10 ? `rotate(-45 ${x} ${chartHeight + padding + 20})` : ''}
                >
                  {formatDate(session.date)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex justify-center mt-4 space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>Excellent (80-100%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span>Good (60-79%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
            <span>Fair (40-59%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span>Needs Work (0-39%)</span>
          </div>
        </div>
      </div>
    );
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
            <ChartBarIcon className="h-6 w-6 mr-3 sf-icon" style={{ color: 'var(--apple-blue)' }} />
            <div>
              <h2 className="apple-title text-xl text-gray-800">Session Analytics</h2>
              <p className="apple-caption text-gray-600">
                Behavior tracking and performance insights
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 apple-transition p-2 rounded-lg hover:bg-gray-100/50">
            <XMarkIcon className="w-6 h-6 sf-icon" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 flex-shrink-0" style={{ background: 'white' }}>
          <button
            onClick={() => setActiveTab('chart')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'chart'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ChartBarIcon className="h-4 w-4 inline mr-2" />
            Trend Analysis
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarIcon className="h-4 w-4 inline mr-2" />
            Session History
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full" style={{ background: 'white' }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === 'chart' ? (
            <div className="space-y-6">
              {/* Time Range Selector */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Behavior Index Over Time</h3>
                <div className="flex space-x-2">
                  {[7, 14, 30].map(days => (
                    <button
                      key={days}
                      onClick={() => setTimeRange(days as 7 | 14 | 30)}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        timeRange === days
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats Cards */}
              {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">{analytics.totalSessions}</div>
                    <div className="text-sm text-blue-700">Total Sessions</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">{formatBehaviorIndex(analytics.averageBehaviorIndex)}%</div>
                    <div className="text-sm text-green-700">Average Score</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      {analytics.trend === 'improving' ? (
                        <ArrowTrendingUpIcon className="h-6 w-6 text-green-600 mr-2" />
                      ) : analytics.trend === 'declining' ? (
                        <ArrowTrendingDownIcon className="h-6 w-6 text-red-600 mr-2" />
                      ) : (
                        <div className="w-6 h-6 mr-2 flex items-center justify-center">
                          <div className="w-4 h-0.5 bg-gray-600"></div>
                        </div>
                      )}
                      <div>
                        <div className="text-lg font-bold text-purple-900 capitalize">{analytics.trend}</div>
                        <div className="text-sm text-purple-700">Trend</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-900">
                      {analytics.sessions.length > 0 ? getBehaviorLabel(analytics.averageBehaviorIndex) : 'N/A'}
                    </div>
                    <div className="text-sm text-orange-700">Overall Rating</div>
                  </div>
                </div>
              )}

              {/* Chart */}
              {renderChart()}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Sessions</h3>
              
              {sessionHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No completed sessions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessionHistory.map(session => {
                    const behaviorIndex = DogBehaviorService.calculateBehaviorIndex(session);
                    const duration = session.returnTime && session.departureTime 
                      ? Math.round((session.returnTime.getTime() - session.departureTime.getTime()) / (1000 * 60))
                      : null;

                    return (
                      <div key={session.id} className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              {session.departureTime.toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </div>
                            <div className="text-sm text-gray-600">
                              {session.departureTime.toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit' 
                              })}
                              {session.returnTime && (
                                <> - {session.returnTime.toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit' 
                                })}</>
                              )}
                              {duration && <span className="ml-2">({duration} min)</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div 
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                              style={{ 
                                backgroundColor: `${getBehaviorColor(behaviorIndex)}20`,
                                color: getBehaviorColor(behaviorIndex)
                              }}
                            >
                              {formatBehaviorIndex(behaviorIndex)}% • {getBehaviorLabel(behaviorIndex)}
                            </div>
                          </div>
                        </div>
                        
                        {session.returnObservations && (
                          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                            <div className={session.returnObservations.barkingOccurred ? 'text-red-600' : 'text-green-600'}>
                              {session.returnObservations.barkingOccurred ? '🔊 Barked' : '🔇 Quiet'}
                            </div>
                            <div className={session.returnObservations.accidents?.occurred ? 'text-red-600' : 'text-green-600'}>
                              {session.returnObservations.accidents?.occurred ? '💧 Accident' : '✅ Clean'}
                            </div>
                            <div className={session.returnObservations.destructiveBehavior?.occurred ? 'text-red-600' : 'text-green-600'}>
                              {session.returnObservations.destructiveBehavior?.occurred ? '⚠️ Destructive' : '😌 Calm'}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}