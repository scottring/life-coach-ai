import React, { useState, useEffect } from 'react';
import { useFamily } from '../providers/FamilyProvider';

function FamilyFinances({ familyId, embedded = false, onDataChange = null }) {
  const [financeData, setFinanceData] = useState({
    currentWeek: {
      date: new Date(),
      creditCardExpenses: 0,
      mortgagePayment: 0,
      autoPayments: 0,
      otherMajorExpenses: 0,
      checkingBalance: 0,
      notes: ''
    },
    historicalData: []
  });

  const [showDataEntry, setShowDataEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  useEffect(() => {
    if (familyId) {
      loadFinanceData();
    }
  }, [familyId]);

  const loadFinanceData = () => {
    try {
      const stored = localStorage.getItem(`family_finances_${familyId}`);
      if (stored) {
        const data = JSON.parse(stored);
        // Convert date strings back to Date objects
        data.currentWeek.date = new Date(data.currentWeek.date);
        data.historicalData = data.historicalData.map(entry => ({
          ...entry,
          date: new Date(entry.date)
        }));
        setFinanceData(data);
      }
    } catch (error) {
      console.error('Error loading finance data:', error);
    }
  };

  const saveFinanceData = (data) => {
    setFinanceData(data);
    localStorage.setItem(`family_finances_${familyId}`, JSON.stringify(data));
    
    // Notify parent component if embedded
    if (onDataChange) {
      onDataChange(data);
    }
  };

  const calculateCashFlow = (entry) => {
    const totalExpenses = entry.creditCardExpenses + entry.mortgagePayment + 
                         entry.autoPayments + entry.otherMajorExpenses;
    return entry.checkingBalance - totalExpenses;
  };

  const getFinancialHealth = (cashFlow) => {
    if (cashFlow > 1000) return { status: 'excellent', color: 'green', message: 'Strong financial position' };
    if (cashFlow > 500) return { status: 'good', color: 'blue', message: 'Healthy cash flow' };
    if (cashFlow > 0) return { status: 'cautious', color: 'yellow', message: 'Tight but manageable' };
    if (cashFlow > -500) return { status: 'warning', color: 'orange', message: 'Monitor closely' };
    return { status: 'critical', color: 'red', message: 'Immediate attention needed' };
  };

  const addFinanceEntry = (entry) => {
    const newData = {
      ...financeData,
      historicalData: [entry, ...financeData.historicalData].slice(0, 26), // Keep last 26 weeks
      currentWeek: {
        date: new Date(),
        creditCardExpenses: 0,
        mortgagePayment: entry.mortgagePayment, // Carry over mortgage (usually same)
        autoPayments: entry.autoPayments, // Carry over auto payments
        otherMajorExpenses: 0,
        checkingBalance: 0,
        notes: ''
      }
    };
    saveFinanceData(newData);
    setShowDataEntry(false);
    setEditingEntry(null);
  };

  const updateCurrentWeek = (updates) => {
    const newData = {
      ...financeData,
      currentWeek: { ...financeData.currentWeek, ...updates }
    };
    saveFinanceData(newData);
  };

  const getWeekLabel = (date) => {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(start.getDate() + 6);
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
  };

  const currentCashFlow = calculateCashFlow(financeData.currentWeek);
  const currentHealth = getFinancialHealth(currentCashFlow);

  // Prepare chart data for the last 12 weeks
  const chartData = financeData.historicalData.slice(0, 12).reverse().map(entry => ({
    week: getWeekLabel(entry.date),
    cashFlow: calculateCashFlow(entry),
    expenses: entry.creditCardExpenses + entry.mortgagePayment + entry.autoPayments + entry.otherMajorExpenses,
    balance: entry.checkingBalance
  }));

  const maxValue = Math.max(
    ...chartData.map(d => Math.max(d.cashFlow, d.balance, d.expenses)),
    Math.abs(Math.min(...chartData.map(d => d.cashFlow))) // Handle negative values
  );

  const chartHeight = embedded ? 200 : 300;

  return (
    <div className={`space-y-6 ${embedded ? '' : 'max-w-6xl mx-auto'}`}>
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Family Finances</h2>
            <p className="text-gray-600">Track weekly cash flow and financial health</p>
          </div>
          <button
            onClick={() => setShowDataEntry(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Add This Week's Data
          </button>
        </div>
      )}

      {/* Current Week Summary */}
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${embedded ? 'p-4' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-bold text-gray-900 ${embedded ? 'text-lg' : 'text-xl'}`}>
            Current Week Cash Flow
          </h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            currentHealth.color === 'green' ? 'bg-green-100 text-green-800' :
            currentHealth.color === 'blue' ? 'bg-blue-100 text-blue-800' :
            currentHealth.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
            currentHealth.color === 'orange' ? 'bg-orange-100 text-orange-800' :
            'bg-red-100 text-red-800'
          }`}>
            {currentHealth.message}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              ${(financeData.currentWeek.creditCardExpenses + 
                 financeData.currentWeek.mortgagePayment + 
                 financeData.currentWeek.autoPayments + 
                 financeData.currentWeek.otherMajorExpenses).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Expenses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              ${financeData.currentWeek.checkingBalance.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Checking Balance</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${currentCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${currentCashFlow.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Net Cash Flow</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {financeData.historicalData.length}
            </div>
            <div className="text-sm text-gray-600">Weeks Tracked</div>
          </div>
        </div>

        {embedded && (
          <button
            onClick={() => setShowDataEntry(true)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Update This Week's Data
          </button>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className={`font-bold text-gray-900 mb-4 ${embedded ? 'text-lg' : 'text-xl'}`}>
            Cash Flow Trend (Last 12 Weeks)
          </h3>
          
          <div className="relative" style={{ height: chartHeight }}>
            <svg width="100%" height="100%" className="overflow-visible">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <g key={ratio}>
                  <line
                    x1="60"
                    y1={chartHeight * ratio}
                    x2="100%"
                    y2={chartHeight * ratio}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <text
                    x="50"
                    y={chartHeight * ratio + 4}
                    className="text-xs fill-gray-500"
                    textAnchor="end"
                  >
                    ${Math.round(maxValue * (1 - ratio)).toLocaleString()}
                  </text>
                </g>
              ))}
              
              {/* Zero line */}
              {maxValue > 0 && (
                <line
                  x1="60"
                  y1={chartHeight * (maxValue / (maxValue * 2))}
                  x2="100%"
                  y2={chartHeight * (maxValue / (maxValue * 2))}
                  stroke="#374151"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              )}

              {/* Cash flow line */}
              {chartData.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  points={chartData.map((d, i) => {
                    const x = 60 + (i * (100 - 60) / (chartData.length - 1)) + '%';
                    const y = chartHeight * (1 - (d.cashFlow + maxValue) / (maxValue * 2));
                    return `${x.replace('%', '')} ${y}`;
                  }).join(' ')}
                />
              )}

              {/* Data points */}
              {chartData.map((d, i) => {
                const x = 60 + (i * (100 - 60) / Math.max(chartData.length - 1, 1));
                const y = chartHeight * (1 - (d.cashFlow + maxValue) / (maxValue * 2));
                return (
                  <g key={i}>
                    <circle
                      cx={`${x}%`}
                      cy={y}
                      r="4"
                      fill={d.cashFlow >= 0 ? "#10b981" : "#ef4444"}
                      stroke="white"
                      strokeWidth="2"
                    />
                    {/* Week labels */}
                    <text
                      x={`${x}%`}
                      y={chartHeight + 20}
                      className="text-xs fill-gray-600"
                      textAnchor="middle"
                      transform={`rotate(-45 ${x}% ${chartHeight + 20})`}
                    >
                      {d.week}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex justify-center space-x-6 mt-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Cash Flow Trend</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Positive</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">Negative</span>
            </div>
          </div>
        </div>
      )}

      {/* Data Entry Modal */}
      {showDataEntry && (
        <FinanceDataEntryModal
          initialData={editingEntry || financeData.currentWeek}
          onSave={addFinanceEntry}
          onCancel={() => {
            setShowDataEntry(false);
            setEditingEntry(null);
          }}
          embedded={embedded}
        />
      )}

      {/* Quick Data Entry (Embedded Mode) */}
      {embedded && !showDataEntry && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-900 text-sm">Quick Update</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Credit Card Expenses</label>
              <input
                type="number"
                value={financeData.currentWeek.creditCardExpenses}
                onChange={(e) => updateCurrentWeek({ creditCardExpenses: parseFloat(e.target.value) || 0 })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Checking Balance</label>
              <input
                type="number"
                value={financeData.currentWeek.checkingBalance}
                onChange={(e) => updateCurrentWeek({ checkingBalance: parseFloat(e.target.value) || 0 })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Historical Data Table (Non-embedded) */}
      {!embedded && financeData.historicalData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Historical Data</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Cards</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mortgage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Other</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checking</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cash Flow</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {financeData.historicalData.slice(0, 12).map((entry, index) => {
                  const cashFlow = calculateCashFlow(entry);
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getWeekLabel(entry.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${entry.creditCardExpenses.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${entry.mortgagePayment.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${entry.autoPayments.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${entry.otherMajorExpenses.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${entry.checkingBalance.toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        cashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${cashFlow.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Data Entry Modal Component
function FinanceDataEntryModal({ initialData, onSave, onCancel, embedded }) {
  const [formData, setFormData] = useState({
    date: initialData.date || new Date(),
    creditCardExpenses: initialData.creditCardExpenses || 0,
    mortgagePayment: initialData.mortgagePayment || 0,
    autoPayments: initialData.autoPayments || 0,
    otherMajorExpenses: initialData.otherMajorExpenses || 0,
    checkingBalance: initialData.checkingBalance || 0,
    notes: initialData.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const calculateCashFlow = () => {
    const totalExpenses = formData.creditCardExpenses + formData.mortgagePayment + 
                         formData.autoPayments + formData.otherMajorExpenses;
    return formData.checkingBalance - totalExpenses;
  };

  const cashFlow = calculateCashFlow();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg p-6 mx-4 ${embedded ? 'max-w-md' : 'max-w-2xl'} w-full max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Weekly Finance Data</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Week Starting</label>
              <input
                type="date"
                value={formData.date.toISOString().split('T')[0]}
                onChange={(e) => setFormData(prev => ({ ...prev, date: new Date(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Checking Balance</label>
              <input
                type="number"
                step="0.01"
                value={formData.checkingBalance}
                onChange={(e) => setFormData(prev => ({ ...prev, checkingBalance: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Card Expenses</label>
              <input
                type="number"
                step="0.01"
                value={formData.creditCardExpenses}
                onChange={(e) => setFormData(prev => ({ ...prev, creditCardExpenses: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mortgage Payment</label>
              <input
                type="number"
                step="0.01"
                value={formData.mortgagePayment}
                onChange={(e) => setFormData(prev => ({ ...prev, mortgagePayment: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auto Payments</label>
              <input
                type="number"
                step="0.01"
                value={formData.autoPayments}
                onChange={(e) => setFormData(prev => ({ ...prev, autoPayments: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Other Major Expenses</label>
              <input
                type="number"
                step="0.01"
                value={formData.otherMajorExpenses}
                onChange={(e) => setFormData(prev => ({ ...prev, otherMajorExpenses: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Any notes about this week's finances..."
            />
          </div>

          {/* Cash Flow Preview */}
          <div className={`p-3 rounded-lg ${cashFlow >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="text-center">
              <div className={`text-xl font-bold ${cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Net Cash Flow: ${cashFlow.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                ${formData.checkingBalance.toLocaleString()} - ${(formData.creditCardExpenses + formData.mortgagePayment + formData.autoPayments + formData.otherMajorExpenses).toLocaleString()} = ${cashFlow.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700"
            >
              Save Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FamilyFinances;