/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PREBUILT_PROFILES } from '../data/profiles';
import { PrebuiltProfile } from '../types';
import { Cpu, Award, Milestone, Play } from 'lucide-react';

interface SimulationCatalogProps {
  onLoadProfile: (profile: PrebuiltProfile) => void;
}

export const SimulationCatalog: React.FC<SimulationCatalogProps> = ({ onLoadProfile }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'core' | 'advanced' | 'task'>('all');

  const categories = {
    core: { label: 'Core LFR', icon: <Cpu size={14} className="text-indigo-400" /> },
    advanced: { label: 'Advanced Models', icon: <Milestone size={14} className="text-purple-400" /> },
    task: { label: 'Task Specific', icon: <Award size={14} className="text-amber-400" /> },
  };

  const filteredProfiles = activeTab === 'all'
    ? PREBUILT_PROFILES
    : PREBUILT_PROFILES.filter((p) => p.cat === activeTab);

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-5 mt-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div>
          <h3 className="text-base font-bold font-sans text-white mb-0.5 flex items-center gap-2">
            <span className="w-4 h-1 bg-indigo-500 rounded"></span>
            Prebuilt Robot Profiles
          </h3>
          <p className="text-xs text-zinc-400 font-sans">
            Select a template to instantly load a fully configured robot with expert PID calibration.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex gap-1.5 bg-zinc-950 border border-[#27272A] rounded-lg p-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 font-mono text-xs rounded-md transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-indigo-500 text-white font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({PREBUILT_PROFILES.length})
          </button>
          {Object.entries(categories).map(([key, cat]) => {
            const count = PREBUILT_PROFILES.filter((p) => p.cat === key).length;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`px-3 py-1 font-mono text-xs rounded-md flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === key
                    ? 'bg-indigo-500 text-white font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {cat.icon}
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredProfiles.map((p) => (
          <button
            key={p.id}
            onClick={() => onLoadProfile(p)}
            className="group w-full text-left bg-zinc-900/50 border border-[#27272A] hover:border-indigo-500/50 hover:bg-zinc-800/50 rounded-xl p-4 flex flex-col justify-between transition duration-150 relative overflow-hidden cursor-pointer shadow-md"
          >
            {/* Corner glowing line */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-200"></div>

            <div className="pl-1 flex-1 flex flex-col justify-between gap-3">
              <div>
                <span className="inline-block text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 mb-2 uppercase border border-[#27272A]">
                  {categories[p.cat]?.label || p.cat}
                </span>
                <h4 className="text-sm font-bold font-sans text-white group-hover:text-indigo-400 transition duration-150 leading-snug">
                  {p.title}
                </h4>
                <p className="text-[11px] text-zinc-400 font-sans mt-1.5 leading-relaxed">
                  {p.spec}
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#27272A]/60">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  CTRL: <b className="text-zinc-400">{p.build.controller.toUpperCase()}</b>
                </span>
                <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Load &amp; Run
                  <Play size={10} className="fill-indigo-500 text-indigo-500" />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
