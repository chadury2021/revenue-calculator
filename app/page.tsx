/**
 * BitFrost Revenue Engine - Next.js Application
 * Production-ready financial modeling with TypeScript and React
 * Deployable to Vercel
 */

"use client"
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

// TypeScript Interfaces
interface ScenarioParams {
  dailyVolume: number;
  internalMatchRatio: number;
  clearingFee: number;
  nettingFee: number;
  hlFundingRate: number;
  archBorrowRate: number;
  frictionCost: number;
  equity: number;
  leverage: number;
  monthlyLiquidations: number;
  liquidationFee: number;
  dailyHedge: number;
  hedgeEfficiency: number;
}

interface RevenueResult {
  total: number;
  clearing: number;
  funding: number;
  liquidations: number;
  hedging: number;
  monthlyAvg: number;
  dailyAvg: number;
  fundingSpread: number;
  deployedNotional: number;
  fundingROE: number;
  clearingDaily: number;
  hedgeDaily: number;
}

// Constants
const DAYS_PER_YEAR = 365;
const MONTHS_PER_YEAR = 12;
const BPS_PER_UNIT = 10000;

// Scenario Defaults
const SCENARIOS: Record<string, ScenarioParams> = {
  bear: {
    dailyVolume: 500_000_000,
    internalMatchRatio: 0.30,
    clearingFee: 1.5,
    nettingFee: 0.5,
    hlFundingRate: 2,
    archBorrowRate: 3,
    frictionCost: 1.5,
    equity: 50_000_000,
    leverage: 2.0,
    monthlyLiquidations: 10_000_000,
    liquidationFee: 0.3,
    dailyHedge: 50_000_000,
    hedgeEfficiency: 0.2,
  },
  base: {
    dailyVolume: 2_000_000_000,
    internalMatchRatio: 0.50,
    clearingFee: 1.5,
    nettingFee: 0.5,
    hlFundingRate: 8,
    archBorrowRate: 2.5,
    frictionCost: 1.2,
    equity: 100_000_000,
    leverage: 8.0,
    monthlyLiquidations: 50_000_000,
    liquidationFee: 0.4,
    dailyHedge: 200_000_000,
    hedgeEfficiency: 0.5,
  },
  bull: {
    dailyVolume: 5_000_000_000,
    internalMatchRatio: 0.65,
    clearingFee: 1.5,
    nettingFee: 0.5,
    hlFundingRate: 25,
    archBorrowRate: 2,
    frictionCost: 0.8,
    equity: 200_000_000,
    leverage: 12.0,
    monthlyLiquidations: 150_000_000,
    liquidationFee: 0.5,
    dailyHedge: 500_000_000,
    hedgeEfficiency: 1.0,
  },
};

// Revenue Calculator
class RevenueCalculator {
  calculate(params: ScenarioParams): RevenueResult {
    const V_d = params.dailyVolume;
    const alpha = params.internalMatchRatio;
    const f_c = params.clearingFee / BPS_PER_UNIT;
    const f_n = params.nettingFee / BPS_PER_UNIT;
    const f_H = params.hlFundingRate / 100;
    const r_l = params.archBorrowRate / 100;
    const kappa = params.frictionCost / BPS_PER_UNIT;
    const E = params.equity;
    const L = params.leverage;
    const L_m = params.monthlyLiquidations;
    const phi = params.liquidationFee / 100;
    const H_d = params.dailyHedge;
    const eta = params.hedgeEfficiency / BPS_PER_UNIT;

    // Revenue Streams
    const R_clear = DAYS_PER_YEAR * V_d * alpha * (f_c + f_n);
    const s = f_H - r_l - kappa;
    const N = L * E;
    const R_funding = s * N;
    const R_liq = MONTHS_PER_YEAR * L_m * phi;
    const R_hedge = DAYS_PER_YEAR * H_d * eta;
    const R_total = R_clear + R_funding + R_liq + R_hedge;

    return {
      total: R_total,
      clearing: R_clear,
      funding: R_funding,
      liquidations: R_liq,
      hedging: R_hedge,
      monthlyAvg: R_total / MONTHS_PER_YEAR,
      dailyAvg: R_total / DAYS_PER_YEAR,
      fundingSpread: s,
      deployedNotional: N,
      fundingROE: s * L * 100,
      clearingDaily: R_clear / DAYS_PER_YEAR,
      hedgeDaily: R_hedge / DAYS_PER_YEAR,
    };
  }

  generateMonthlyForecast(params: ScenarioParams): Array<{
    month: number;
    clearing: number;
    funding: number;
    liquidations: number;
    hedging: number;
    total: number;
  }> {
    const result = this.calculate(params);
    const data = [];
    for (let month = 1; month <= 12; month++) {
      data.push({
        month,
        clearing: result.clearing / DAYS_PER_YEAR,
        funding: result.funding / DAYS_PER_YEAR,
        liquidations: result.liquidations / DAYS_PER_YEAR,
        hedging: result.hedging / DAYS_PER_YEAR,
        total: result.dailyAvg,
      });
    }
    return data;
  }
}

// Formatting Functions
const formatCurrency = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

// Metric Card Component
const MetricCard: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color = 'bg-blue-50',
}) => (
  <div className={`${color} p-4 rounded-lg border border-gray-200`}>
    <p className="text-sm text-gray-600 mb-1">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

// Scenario Tab Component
const ScenarioTab: React.FC<{
  name: string;
  params: ScenarioParams;
  onParamChange: (key: keyof ScenarioParams, value: number) => void;
}> = ({ name, params, onParamChange }) => {
  const calculator = new RevenueCalculator();
  const result = useMemo(() => calculator.calculate(params), [params]);
  const monthlyData = useMemo(() => calculator.generateMonthlyForecast(params), [params]);

  const chartData = [
    { name: 'Clearing', value: result.clearing },
    { name: 'Funding', value: Math.max(0, result.funding) },
    { name: 'Liquidations', value: result.liquidations },
    { name: 'Hedging', value: result.hedging },
  ];

  const COLORS = ['#208480', '#32b8c6', '#f38ba8', '#fab387'];

  return (
    <div className="space-y-6">
      {/* Parameters Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Parameters</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Volumes & Fees */}
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Volumes & Fees</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Daily Volume</label>
                <input
                  type="number"
                  value={params.dailyVolume}
                  onChange={(e) =>
                    onParamChange('dailyVolume', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Internal Match Ratio</label>
                <input
                  type="number"
                  step="0.01"
                  value={params.internalMatchRatio}
                  onChange={(e) =>
                    onParamChange('internalMatchRatio', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Clearing Fee (bps)</label>
                <input
                  type="number"
                  step="0.1"
                  value={params.clearingFee}
                  onChange={(e) =>
                    onParamChange('clearingFee', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Netting Fee (bps)</label>
                <input
                  type="number"
                  step="0.1"
                  value={params.nettingFee}
                  onChange={(e) =>
                    onParamChange('nettingFee', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Funding Arbitrage */}
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Funding Arbitrage</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">HL Funding Rate (APR %)</label>
                <input
                  type="number"
                  step="0.1"
                  value={params.hlFundingRate}
                  onChange={(e) =>
                    onParamChange('hlFundingRate', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Arch Borrow Rate (APR %)</label>
                <input
                  type="number"
                  step="0.1"
                  value={params.archBorrowRate}
                  onChange={(e) =>
                    onParamChange('archBorrowRate', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Friction Cost (bps)</label>
                <input
                  type="number"
                  step="0.1"
                  value={params.frictionCost}
                  onChange={(e) =>
                    onParamChange('frictionCost', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Leverage</label>
                <input
                  type="number"
                  step="0.1"
                  value={params.leverage}
                  onChange={(e) =>
                    onParamChange('leverage', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Liquidations */}
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Liquidations</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Monthly Liquidations</label>
                <input
                  type="number"
                  value={params.monthlyLiquidations}
                  onChange={(e) =>
                    onParamChange('monthlyLiquidations', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Liquidation Fee (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={params.liquidationFee}
                  onChange={(e) =>
                    onParamChange('liquidationFee', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Hedging */}
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Hedging</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Daily Hedge Notional</label>
                <input
                  type="number"
                  value={params.dailyHedge}
                  onChange={(e) =>
                    onParamChange('dailyHedge', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Hedge Efficiency (bps/day)</label>
                <input
                  type="number"
                  step="0.01"
                  value={params.hedgeEfficiency}
                  onChange={(e) =>
                    onParamChange('hedgeEfficiency', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Equity Deployed</label>
                <input
                  type="number"
                  value={params.equity}
                  onChange={(e) =>
                    onParamChange('equity', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Key Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Annual Revenue"
            value={formatCurrency(result.total)}
            color="bg-blue-50"
          />
          <MetricCard
            label="Monthly Average"
            value={formatCurrency(result.monthlyAvg)}
            color="bg-green-50"
          />
          <MetricCard
            label="Funding ROE"
            value={formatPercentage(result.fundingROE)}
            color="bg-purple-50"
          />
          <MetricCard
            label="Funding Spread"
            value={formatPercentage(result.fundingSpread * 100)}
            color="bg-pink-50"
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Composition */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Revenue Composition</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Forecast */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Monthly Forecast</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Bar dataKey="clearing" stackId="a" fill="#208480" />
              <Bar dataKey="funding" stackId="a" fill="#32b8c6" />
              <Bar dataKey="liquidations" stackId="a" fill="#f38ba8" />
              <Bar dataKey="hedging" stackId="a" fill="#fab387" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Revenue Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-4 font-semibold">Stream</th>
                <th className="text-right py-2 px-4 font-semibold">Annual</th>
                <th className="text-right py-2 px-4 font-semibold">% of Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-4">Clearing</td>
                <td className="text-right py-2 px-4">
                  {formatCurrency(result.clearing)}
                </td>
                <td className="text-right py-2 px-4">
                  {formatPercentage(
                    (result.clearing / result.total) * 100
                  )}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-4">Funding Arbitrage</td>
                <td className="text-right py-2 px-4">
                  {formatCurrency(result.funding)}
                </td>
                <td className="text-right py-2 px-4">
                  {formatPercentage(
                    (result.funding / result.total) * 100
                  )}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-4">Liquidations</td>
                <td className="text-right py-2 px-4">
                  {formatCurrency(result.liquidations)}
                </td>
                <td className="text-right py-2 px-4">
                  {formatPercentage(
                    (result.liquidations / result.total) * 100
                  )}
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 px-4">Hedging</td>
                <td className="text-right py-2 px-4">
                  {formatCurrency(result.hedging)}
                </td>
                <td className="text-right py-2 px-4">
                  {formatPercentage(
                    (result.hedging / result.total) * 100
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-bold">TOTAL</td>
                <td className="text-right py-2 px-4 font-bold">
                  {formatCurrency(result.total)}
                </td>
                <td className="text-right py-2 px-4 font-bold">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function BitFrostEngine() {
  const [activeTab, setActiveTab] = useState<'bear' | 'base' | 'bull' | 'comparison'>('base');
  const [bearParams, setBearParams] = useState<ScenarioParams>(SCENARIOS.bear);
  const [baseParams, setBaseParams] = useState<ScenarioParams>(SCENARIOS.base);
  const [bullParams, setBullParams] = useState<ScenarioParams>(SCENARIOS.bull);

  const handleBearChange = (key: keyof ScenarioParams, value: number) => {
    setBearParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleBaseChange = (key: keyof ScenarioParams, value: number) => {
    setBaseParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleBullChange = (key: keyof ScenarioParams, value: number) => {
    setBullParams((prev) => ({ ...prev, [key]: value }));
  };

  const calculator = new RevenueCalculator();
  const bearResult = useMemo(() => calculator.calculate(bearParams), [bearParams]);
  const baseResult = useMemo(() => calculator.calculate(baseParams), [baseParams]);
  const bullResult = useMemo(() => calculator.calculate(bullParams), [bullParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">📊 BitFrost Revenue Engine</h1>
          <p className="text-gray-600 mt-1">
            Mathematical revenue forecasting with scenario analysis
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'bear' as const, label: '🐻 Bear Case' },
              { id: 'base' as const, label: '📈 Base Case' },
              { id: 'bull' as const, label: '🚀 Bull Case' },
              { id: 'comparison' as const, label: '📋 Comparison' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'bear' && (
          <ScenarioTab
            name="Bear Case"
            params={bearParams}
            onParamChange={handleBearChange}
          />
        )}
        {activeTab === 'base' && (
          <ScenarioTab
            name="Base Case"
            params={baseParams}
            onParamChange={handleBaseChange}
          />
        )}
        {activeTab === 'bull' && (
          <ScenarioTab
            name="Bull Case"
            params={bullParams}
            onParamChange={handleBullChange}
          />
        )}
        {activeTab === 'comparison' && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Scenario Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50">
                    <th className="text-left py-3 px-4 font-bold">Metric</th>
                    <th className="text-right py-3 px-4 font-bold">Bear</th>
                    <th className="text-right py-3 px-4 font-bold">Base</th>
                    <th className="text-right py-3 px-4 font-bold">Bull</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-4">Daily Volume</td>
                    <td className="text-right py-2 px-4">{formatCurrency(bearParams.dailyVolume)}</td>
                    <td className="text-right py-2 px-4">{formatCurrency(baseParams.dailyVolume)}</td>
                    <td className="text-right py-2 px-4">{formatCurrency(bullParams.dailyVolume)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-blue-50">
                    <td className="py-2 px-4 font-bold">Annual Revenue</td>
                    <td className="text-right py-2 px-4 font-bold">{formatCurrency(bearResult.total)}</td>
                    <td className="text-right py-2 px-4 font-bold">{formatCurrency(baseResult.total)}</td>
                    <td className="text-right py-2 px-4 font-bold">{formatCurrency(bullResult.total)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-4">Monthly Average</td>
                    <td className="text-right py-2 px-4">{formatCurrency(bearResult.monthlyAvg)}</td>
                    <td className="text-right py-2 px-4">{formatCurrency(baseResult.monthlyAvg)}</td>
                    <td className="text-right py-2 px-4">{formatCurrency(bullResult.monthlyAvg)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-4">Funding Spread</td>
                    <td className="text-right py-2 px-4">{formatPercentage(bearResult.fundingSpread * 100)}</td>
                    <td className="text-right py-2 px-4">{formatPercentage(baseResult.fundingSpread * 100)}</td>
                    <td className="text-right py-2 px-4">{formatPercentage(bullResult.fundingSpread * 100)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-4">Funding ROE</td>
                    <td className="text-right py-2 px-4">{formatPercentage(bearResult.fundingROE)}</td>
                    <td className="text-right py-2 px-4">{formatPercentage(baseResult.fundingROE)}</td>
                    <td className="text-right py-2 px-4">{formatPercentage(bullResult.fundingROE)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-600 text-sm">
          <p>BitFrost Revenue Engine v1.0 | Production-Ready Financial Modeling</p>
        </div>
      </div>
    </div>
  );
}   