/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { COMPONENT_CATALOG } from '../data/components';
import { RobotBuild, ComponentItem } from '../types';
import { Check, Info, Star } from 'lucide-react';

interface ComponentLibraryProps {
  build: RobotBuild;
  onSelectComponent: (category: keyof RobotBuild, component: ComponentItem | null) => void;
}

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({
  build,
  onSelectComponent,
}) => {
  const categories: Array<{ key: keyof RobotBuild; label: string; limitDesc: string }> = [
    { key: 'controller', label: '1. Processing Controller Unit', limitDesc: 'Processes sensor errors into steering corrections.' },
    { key: 'sensors', label: '2. Optical Sensor Array', limitDesc: 'Detects the position of the track black line underneath.' },
    { key: 'motor', label: '3. Actuator Motors', limitDesc: 'Defines the maximum physical torque & top velocity limits.' },
    { key: 'chassis', label: '4. Structural Chassis & Tires', limitDesc: 'Configures robot mass distribution and lateral grip tires.' },
    { key: 'extra', label: '5. Special Auxiliary Modules', limitDesc: 'Optional peripheral boards for advanced visual metrics.' },
  ];

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-5 flex flex-col gap-6">
      <div>
        <h3 className="text-base font-bold font-sans text-white mb-1 flex items-center gap-2">
          <span className="w-4 h-1 bg-indigo-500 rounded"></span>
          Component Assembly Bay
        </h3>
        <p className="text-xs text-zinc-400 font-sans">
          Click an engineering part below to plug it into your LFR. Better parts require a more stable algorithm to prevent spin-outs!
        </p>
      </div>

      <div className="flex flex-col gap-5 max-h-[640px] overflow-y-auto pr-2 scrollbar-thin">
        {categories.map(({ key, label, limitDesc }) => {
          const selectedId = build[key]?.id;
          const items = COMPONENT_CATALOG[key];

          return (
            <div key={key} className="border-b border-[#27272A] pb-5 last:border-b-0 last:pb-0">
              <div className="mb-2">
                <span className="text-xs font-mono font-bold text-zinc-500 tracking-wider uppercase">
                  {label}
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">{limitDesc}</p>
              </div>

              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectComponent(key, isSelected ? null : item)}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border text-xs transition duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.1)]'
                          : 'bg-zinc-900/50 border-[#27272A] hover:bg-zinc-800/60 hover:border-zinc-700'
                      }`}
                    >
                      {/* Icon */}
                      <span className="text-xl p-1 bg-zinc-950 rounded-md border border-[#27272A] flex-shrink-0">
                        {item.icon}
                      </span>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={`font-semibold font-sans ${isSelected ? 'text-indigo-400' : 'text-zinc-200'}`}>
                            {item.label}
                          </span>
                          {/* Rating Performance Stars */}
                          <div className="flex gap-0.5" title={`Performance Rating: ${item.perf}/5`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={9}
                                className={i < item.perf ? 'fill-amber-400 stroke-amber-400' : 'stroke-zinc-800 fill-transparent'}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-sans leading-normal">
                          {item.desc}
                        </p>
                      </div>

                      {/* Selected Badge */}
                      <div className="flex-shrink-0 self-center pl-1">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                            isSelected
                              ? 'bg-indigo-500 border-indigo-500 text-white'
                              : 'bg-transparent border-zinc-700'
                          }`}
                        >
                          {isSelected && <Check size={11} className="stroke-[3]" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
