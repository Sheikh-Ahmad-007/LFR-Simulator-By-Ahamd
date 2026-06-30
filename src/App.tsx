/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  RobotBuild,
  TrackDefinition,
  PIDParameters,
  TelemetryData,
  SimulationLog,
  ComponentItem,
  PrebuiltProfile,
} from './types';
import { TRACKS } from './data/tracks';
import { COMPONENT_CATALOG } from './data/components';
import { ComponentLibrary } from './components/ComponentLibrary';
import { LFRCanvas } from './components/LFRCanvas';
import { TelemetryCharts } from './components/TelemetryCharts';
import { SimulationCatalog } from './components/SimulationCatalog';
import {
  Sliders,
  Cpu,
  RefreshCw,
  Terminal,
  Activity,
  Dribbble,
  BookOpen,
  X,
  Gauge,
  Sparkles,
} from 'lucide-react';

export default function App() {
  // 1. App State
  const [build, setBuild] = useState<RobotBuild>({
    controller: null,
    sensors: null,
    motor: null,
    chassis: null,
    extra: null,
  });

  const [selectedTrack, setSelectedTrack] = useState<TrackDefinition>(TRACKS[0]);
  const [pidParams, setPidParams] = useState<PIDParameters>({
    kp: 1.0,
    ki: 0.0,
    kd: 0.4,
  });

  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);
  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const [showHelperModal, setShowHelperModal] = useState<boolean>(false);
  const [activeLogFilter, setActiveLogFilter] = useState<'all' | 'checkpoint' | 'warn' | 'success'>('all');

  // Load custom build from localStorage on mount if available
  useEffect(() => {
    const saved = localStorage.getItem('lfr_build_assembly');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setBuild(data);
      } catch (e) {}
    }
  }, []);

  // 2. Select hardware component helper
  const handleSelectComponent = (category: keyof RobotBuild, item: ComponentItem | null) => {
    const updated = { ...build, [category]: item };
    setBuild(updated);
    localStorage.setItem('lfr_build_assembly', JSON.stringify(updated));

    // Recommend initial parameters if a controller is selected
    if (category === 'controller' && item) {
      if (item.id === 'p') {
        setPidParams({ kp: 0.8, ki: 0.0, kd: 0.0 });
      } else if (item.id === 'pid') {
        setPidParams({ kp: 1.2, ki: 0.01, kd: 0.6 });
      }
    }

    addLog(`Hardware update: Selected ${item ? item.label : 'None'} for ${category}`, 'info');
  };

  // 3. Select Track
  const handleSelectTrack = (trackId: string) => {
    const found = TRACKS.find((t) => t.id === trackId);
    if (found) {
      setSelectedTrack(found);
      setTelemetry([]);
      addLog(`Course Changed: Loaded "${found.name}" circuit.`, 'info');
    }
  };

  // 4. Load a prebuilt profile
  const handleLoadProfile = (profile: PrebuiltProfile) => {
    const loadedBuild: RobotBuild = {
      controller: getComponentById('controller', profile.build.controller),
      sensors: getComponentById('sensors', profile.build.sensors),
      motor: getComponentById('motor', profile.build.motor),
      chassis: getComponentById('chassis', profile.build.chassis),
      extra: getComponentById('extra', profile.build.extra),
    };

    setBuild(loadedBuild);
    setPidParams(profile.pid);
    const track = TRACKS.find((t) => t.id === profile.trackId) || TRACKS[0];
    setSelectedTrack(track);
    setTelemetry([]);

    addLog(`Profile Loaded: "${profile.title}" successfully loaded!`, 'success');
  };

  // Helper to fetch component item
  const getComponentById = (category: string, id: string): ComponentItem => {
    const list: ComponentItem[] = (COMPONENT_CATALOG as any)[category];
    return list.find((item) => item.id === id) || list[0];
  };

  // 5. Diagnostics Logs Dispatcher
  const addLog = (
    messageOrLog: string | SimulationLog,
    type: 'info' | 'success' | 'warn' | 'checkpoint' = 'info'
  ) => {
    if (typeof messageOrLog === 'object' && messageOrLog !== null && 'message' in messageOrLog) {
      setLogs((prev) => [messageOrLog, ...prev].slice(0, 80));
    } else {
      const newLog: SimulationLog = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        message: messageOrLog as string,
        type,
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 80)); // limit logs to last 80
    }
  };

  const handleResetLogs = () => {
    setLogs([]);
  };

  // 6. Telemetry Receiver
  const handleTelemetryUpdate = (data: TelemetryData) => {
    setTelemetry((prev) => {
      const updated = [...prev, data];
      if (updated.length > 250) {
        return updated.slice(-250); // Store last 250 data points for telemetry graphs
      }
      return updated;
    });
  };

  // 7. Local Autotuning System Heuristic Calculations
  const calculateAutotune = () => {
    if (!build.controller || build.controller.id !== 'pid') {
      addLog('Autotuner is only compatible with the PID controller unit.', 'warn');
      return;
    }

    const sensorId = build.sensors?.id || '5s';
    const motorId = build.motor?.id || 'tt';
    const chassisId = build.chassis?.id || 'acrylic';

    // Heuristics based on parts
    let kp = 1.2;
    let ki = 0.01;
    let kd = 0.5;

    // Adjust for sensor count (higher resolution allows higher Kp)
    if (sensorId === '3s') { kp = 0.8; kd = 0.3; }
    else if (sensorId === '7s') { kp = 1.5; kd = 0.8; }
    else if (sensorId === '9s') { kp = 1.8; kd = 1.1; }

    // Adjust for motor speed (higher speed requires higher damping derivative Kd)
    if (motorId === 'n20') { kp += 0.2; kd += 0.2; }
    else if (motorId === 'cored') { kp += 0.4; kd += 0.5; ki = 0.03; }

    // Adjust for chassis traction
    if (chassisId === 'carbon') { kd -= 0.1; } // Carbon has less lateral slide, needs slightly less derivative dampening

    setPidParams({
      kp: parseFloat(kp.toFixed(2)),
      ki: parseFloat(ki.toFixed(3)),
      kd: parseFloat(kd.toFixed(2)),
    });

    addLog('AI Autotune Complete: Recommended parameters deployed successfully!', 'success');
  };

  // Preset calibrations
  const applyPreset = (type: 'balanced' | 'aggressive' | 'underdamped') => {
    if (type === 'balanced') {
      setPidParams({ kp: 1.2, ki: 0.02, kd: 0.7 });
      addLog('Preset applied: Balanced Calibration.', 'info');
    } else if (type === 'aggressive') {
      setPidParams({ kp: 1.8, ki: 0.04, kd: 1.2 });
      addLog('Preset applied: Aggressive Racing Calibration.', 'info');
    } else {
      setPidParams({ kp: 0.7, ki: 0.0, kd: 0.1 });
      addLog('Preset applied: Under-damped sway calibration.', 'info');
    }
  };

  // Filtered Logs
  const filteredLogs = activeLogFilter === 'all'
    ? logs
    : logs.filter((l) => l.type === activeLogFilter);

  // Score Calculations
  const computeStats = () => {
    let count = 0;
    let perfVal = 0;
    (Object.values(build) as Array<ComponentItem | null>).forEach((v) => {
      if (v) {
        count++;
        perfVal += v.perf || 0;
      }
    });
    const maxPerf = 23; // controller(5)+sensor(5)+motor(5)+chassis(5)+extra(3)
    const score = count ? Math.min(100, Math.round((perfVal / maxPerf) * 100)) : 0;
    return { count, score };
  };

  const { count: partsCount, score: perfScore } = computeStats();

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 font-sans antialiased selection:bg-indigo-500/30 selection:text-white pb-12">
      {/* 1. Header bootbar */}
      <header className="border-b border-[#27272A] bg-[#18181B] px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
          <h1 className="font-mono text-sm font-semibold tracking-wide flex items-center gap-2">
            <span className="text-indigo-400">OPEN-LFR-SIM</span>
            <span className="text-zinc-500">v2.1</span>
            <span className="text-zinc-400 font-sans font-normal text-xs px-2 py-0.5 rounded-full bg-zinc-950 border border-[#27272A]">
              Interactive Simulation Suite
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setShowHelperModal(true)}
            className="text-xs font-mono text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <BookOpen size={12} />
            [ Tuning Manual ]
          </button>
          <span className="text-xs font-mono text-zinc-500">
            SYSTEM TIME: <b className="text-zinc-200">{new Date().toTimeString().slice(0, 8)}</b>
          </span>
        </div>
      </header>

      {/* Main dashboard content container */}
      <main className="max-w-[1400px] mx-auto px-4 lg:px-6 pt-6">
        {/* Banner with brief instructions */}
        <div className="mb-6 flex flex-wrap justify-between items-end gap-4 border-b border-[#27272A] pb-6">
          <div>
            <h2 className="text-2xl font-black font-sans tracking-tight text-white flex items-center gap-2">
              🧩 Configure &amp; Simulate <span className="text-indigo-400">LFR</span>
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl font-sans">
              Construct your Line Follower Robot with modular optical boards, high-speed actuators, and adjust proportional-integral-derivative constraints to beat track records!
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl px-5 py-2.5 flex flex-col justify-center min-w-32">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Assembled Parts</span>
              <span className="text-lg font-black font-sans text-white mt-0.5">{partsCount}/5</span>
            </div>
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl px-5 py-2.5 flex flex-col justify-center min-w-36">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Estimated Performance</span>
              <span className="text-lg font-black font-sans text-indigo-400 mt-0.5">{partsCount ? `${perfScore}%` : '—'}</span>
            </div>
          </div>
        </div>

        {/* Dashboard workspace grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Component Assembly (Span 5) */}
          <section className="lg:col-span-4 xl:col-span-4 flex flex-col gap-6">
            <ComponentLibrary build={build} onSelectComponent={handleSelectComponent} />
          </section>

          {/* Right Column: Simulation Board, Controls & Logs (Span 8) */}
          <section className="lg:col-span-8 xl:col-span-8 flex flex-col gap-6">
            {/* LFR Simulation Screen canvas */}
            <LFRCanvas
              build={build}
              track={selectedTrack}
              pidParams={pidParams}
              simSpeed={simSpeed}
              onSimSpeedChange={setSimSpeed}
              onTelemetryUpdate={handleTelemetryUpdate}
              onLogAdd={addLog}
              onResetLogs={handleResetLogs}
            />

            {/* Controller Adjustments + Track Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: Core Line Controls / PID Parameters */}
              <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold font-sans text-white mb-1.5 flex items-center gap-2">
                    <Sliders size={16} className="text-indigo-400" />
                    PID Coefficient Calibration
                  </h3>
                  <p className="text-xs text-zinc-400 mb-4 font-sans">
                    {build.controller?.id === 'pid'
                      ? 'Fine-tune proportional damping to match high-speed motors.'
                      : build.controller?.id === 'p'
                      ? 'P-Controller active: Integral (Ki) and Derivative (Kd) are bypassed.'
                      : 'Fuzzy logic controller active: parameters managed by rule memberships.'}
                  </p>
                </div>

                {/* SLIDERS */}
                <div className="flex flex-col gap-3.5">
                  {/* Kp */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-zinc-300">Proportional Gain (Kp)</span>
                      <b className="text-indigo-400">{pidParams.kp.toFixed(2)}</b>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.05"
                      disabled={!build.controller}
                      value={pidParams.kp}
                      onChange={(e) => setPidParams((p) => ({ ...p, kp: parseFloat(e.target.value) }))}
                      className="w-full accent-indigo-500 bg-zinc-950 rounded h-1.5 cursor-pointer disabled:opacity-30"
                    />
                  </div>

                  {/* Ki */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-zinc-300">Integral Gain (Ki)</span>
                      <b className="text-indigo-400">{pidParams.ki.toFixed(3)}</b>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="0.1"
                      step="0.002"
                      disabled={build.controller?.id !== 'pid'}
                      value={pidParams.ki}
                      onChange={(e) => setPidParams((p) => ({ ...p, ki: parseFloat(e.target.value) }))}
                      className="w-full accent-indigo-500 bg-zinc-950 rounded h-1.5 cursor-pointer disabled:opacity-20"
                    />
                  </div>

                  {/* Kd */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-zinc-300">Derivative Gain (Kd)</span>
                      <b className="text-indigo-400">{pidParams.kd.toFixed(2)}</b>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="2.5"
                      step="0.05"
                      disabled={build.controller?.id !== 'pid'}
                      value={pidParams.kd}
                      onChange={(e) => setPidParams((p) => ({ ...p, kd: parseFloat(e.target.value) }))}
                      className="w-full accent-indigo-500 bg-zinc-950 rounded h-1.5 cursor-pointer disabled:opacity-20"
                    />
                  </div>
                </div>

                {/* AI & Calibration Quick Buttons */}
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-[#27272A]">
                  <div className="flex justify-between items-center gap-2">
                    <button
                      onClick={calculateAutotune}
                      disabled={build.controller?.id !== 'pid'}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-indigo-500/10 hover:bg-indigo-500/25 text-xs font-bold font-sans text-indigo-400 rounded-lg border border-indigo-500/30 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                    >
                      <Sparkles size={13} />
                      AI Autotune Coefficients
                    </button>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => applyPreset('balanced')}
                      disabled={build.controller?.id !== 'pid'}
                      className="flex-1 py-1 px-1 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-zinc-300 rounded border border-[#27272A] disabled:opacity-30 cursor-pointer"
                    >
                      Balanced
                    </button>
                    <button
                      onClick={() => applyPreset('aggressive')}
                      disabled={build.controller?.id !== 'pid'}
                      className="flex-1 py-1 px-1 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-zinc-300 rounded border border-[#27272A] disabled:opacity-30 cursor-pointer"
                    >
                      Racing
                    </button>
                    <button
                      onClick={() => applyPreset('underdamped')}
                      disabled={build.controller?.id !== 'pid'}
                      className="flex-1 py-1 px-1 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-zinc-300 rounded border border-[#27272A] disabled:opacity-30 cursor-pointer"
                    >
                      Swaying
                    </button>
                  </div>
                </div>
              </div>

              {/* Box 2: Track Selection & Active Slot List */}
              <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold font-sans text-white mb-1.5 flex items-center gap-2">
                    <Gauge size={16} className="text-emerald-400" />
                    Circuit &amp; Course Selection
                  </h3>
                  <p className="text-xs text-zinc-400 mb-3 font-sans">
                    Load a path configuration. Tracks vary in curvature, intersections, and physical gaps.
                  </p>
                </div>

                {/* Track Cards */}
                <div className="flex flex-col gap-2 overflow-y-auto max-h-48 pr-1 scrollbar-thin">
                  {TRACKS.map((t) => {
                    const isSelected = selectedTrack.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTrack(t.id)}
                        className={`text-left p-2.5 rounded-lg border text-xs flex justify-between items-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500 text-white font-semibold'
                            : 'bg-zinc-900/50 border-[#27272A] hover:bg-zinc-800/60 text-zinc-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-medium">{t.name}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                t.difficulty === 'Easy'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : t.difficulty === 'Medium'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {t.difficulty}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3.5 pt-3 border-t border-[#27272A] flex justify-between items-center text-[11px] text-zinc-500 font-mono">
                  <span>Track Size: <b className="text-zinc-400">800 × 450 px</b></span>
                  <span>Active RFID Checkpoints: <b className="text-zinc-400">{selectedTrack.rfidTags?.length || 0}</b></span>
                </div>
              </div>
            </div>

            {/* Split/Diagnostics Logs Terminal */}
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-5 flex flex-col gap-3">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="text-sm font-bold font-sans text-white flex items-center gap-2">
                  <Terminal size={16} className="text-indigo-400" />
                  Telemetry Log Terminal
                </h3>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1 bg-zinc-950 border border-[#27272A] rounded-md p-0.5">
                    {['all', 'checkpoint', 'success', 'warn'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setActiveLogFilter(filter as any)}
                        className={`px-2 py-0.5 text-[10px] font-mono rounded capitalize cursor-pointer ${
                          activeLogFilter === filter
                            ? 'bg-indigo-500 text-white font-bold'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleResetLogs}
                    className="text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 border border-[#27272A] px-2 py-1 rounded text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    Clear Console
                  </button>
                </div>
              </div>

              {/* Console log display area */}
              <div className="h-32 bg-zinc-950 border border-[#27272A] rounded-lg p-3 font-mono text-xs overflow-y-auto flex flex-col-reverse gap-1.5 scrollbar-thin">
                {filteredLogs.length === 0 ? (
                  <div className="text-gray-600 text-center py-4">
                    -- [ CONSOLE LOG EMPTY - START THE MOTOR RUN ] --
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="flex gap-3 items-start leading-relaxed border-b border-[#1b2330]/45 pb-1">
                      <span className="text-gray-500 flex-shrink-0">[{log.timestamp}]</span>
                      <span
                        className={`flex-1 ${
                          log.type === 'success'
                            ? 'text-[#3ddc84] font-medium'
                            : log.type === 'warn'
                            ? 'text-[#ffb020]'
                            : log.type === 'checkpoint'
                            ? 'text-[#39e0ff] font-semibold'
                            : 'text-gray-300'
                        }`}
                      >
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Telemetry Charts (from recharts) */}
            <TelemetryCharts data={telemetry} />
          </section>
        </div>

        {/* Templates Bottom Catalog */}
        <SimulationCatalog onLoadProfile={handleLoadProfile} />
      </main>

      {/* Manual Helper Dialog Modal */}
      {showHelperModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="bg-[#18181B] border border-[#27272A] rounded-xl max-w-2xl w-full p-6 relative shadow-2xl">
            <button
              onClick={() => setShowHelperModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold font-sans text-white mb-4 flex items-center gap-2 border-b border-[#27272A] pb-3">
              <Cpu className="text-indigo-400" />
              Line Follower Calibration Manual
            </h3>

            <div className="text-xs text-zinc-300 flex flex-col gap-3.5 overflow-y-auto max-h-[450px] pr-2 font-sans leading-relaxed">
              <div>
                <b className="text-white text-sm font-sans block mb-1">What is a Line Follower Robot (LFR)?</b>
                An LFR is an autonomous mobile robot that detects and follows a contrasting track line (typically black on white) using a line sensor array.
              </div>

              <div>
                <b className="text-white text-sm font-sans block mb-1">Understanding PID Coefficients</b>
                <ul className="list-disc pl-5 mt-1 flex flex-col gap-1.5 text-zinc-400">
                  <li>
                    <span className="text-rose-400 font-bold">Kp (Proportional Gain):</span> Handles the immediate deviation error. Higher Kp values cause rapid response, but excessive gain induces rapid back-and-forth zigzagging oscillations.
                  </li>
                  <li>
                    <span className="text-amber-400 font-bold">Ki (Integral Gain):</span> Corrects steady-state offsets (accumulated historical drift). Used to handle dragging friction or persistent drift on wide loops. Set very low to avoid over-accumulation.
                  </li>
                  <li>
                    <span className="text-emerald-400 font-bold">Kd (Derivative Gain):</span> Predicts upcoming deviation rate of change (actuator damper). Acts as a brake against oscillations. Dampens excessive overshoot on tight corner transitions.
                  </li>
                </ul>
              </div>

              <div>
                <b className="text-white text-sm font-sans block mb-1">Calibration Guidelines</b>
                <ol className="list-decimal pl-5 mt-1 flex flex-col gap-1.5 text-zinc-400 font-sans">
                  <li>
                    Set <b>Ki</b> and <b>Kd</b> to 0. Slowly increase <b>Kp</b> until the robot completes the circuit at moderate speed, even with gentle swaying.
                  </li>
                  <li>
                    If the robot overshoots corner turns, introduce <b>Kd</b> gradually (0.2 to 1.0) to dampen steering.
                  </li>
                  <li>
                    Apply a very small amount of <b>Ki</b> (e.g. 0.01) if you encounter steady-state drift or under-cornering.
                  </li>
                  <li>
                    Utilize the <b>AI Autotuning Engine</b> to automatically extract coefficients optimized for your selected motor speeds, frame weight, and sensor coverage!
                  </li>
                </ol>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#27272A] flex justify-end">
              <button
                onClick={() => setShowHelperModal(false)}
                className="px-4 py-2 bg-indigo-500 text-white font-bold font-sans text-xs rounded-lg hover:bg-indigo-600 transition cursor-pointer"
              >
                Let's Tune!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer credits */}
      <footer className="max-w-[1400px] mx-auto mt-12 px-6 pt-6 border-t border-[#27272A] flex flex-wrap justify-between items-center gap-4 text-xs font-mono text-zinc-600">
        <span>LFR Simulator · Build, Tune &amp; Race</span>
        <span>Local state persistent storage active</span>
      </footer>
    </div>
  );
}
