/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TelemetryData } from '../types';

interface TelemetryChartsProps {
  data: TelemetryData[];
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ data }) => {
  // Take last 40 items for real-time scrolling effect
  const chartData = data.slice(-40);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      {/* Chart 1: Tracking Error & Speed */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4">
        <h4 className="text-sm font-semibold font-sans text-gray-200 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          Error &amp; Velocity Dynamics
        </h4>
        <div className="h-48 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
              WAITING FOR RUNTIME TELEMETRY...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="time" stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v.toFixed(1)}s`} />
                <YAxis stroke="#52525b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090B', borderColor: '#27272A' }}
                  labelStyle={{ color: '#a1a1aa', fontFamily: 'monospace', fontSize: 11 }}
                  itemStyle={{ fontFamily: 'monospace', fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="error"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="Error (px)"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="speed"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Speed (px/s)"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 2: Left & Right Motor Speeds */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4">
        <h4 className="text-sm font-semibold font-sans text-gray-200 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Differential Actuator Drive
        </h4>
        <div className="h-48 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
              WAITING FOR RUNTIME TELEMETRY...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="time" stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v.toFixed(1)}s`} />
                <YAxis stroke="#52525b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090B', borderColor: '#27272A' }}
                  labelStyle={{ color: '#a1a1aa', fontFamily: 'monospace', fontSize: 11 }}
                  itemStyle={{ fontFamily: 'monospace', fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="vL"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  dot={false}
                  name="Left Motor"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="vR"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                  name="Right Motor"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
