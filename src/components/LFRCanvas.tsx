/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  RobotBuild,
  TrackDefinition,
  PIDParameters,
  TelemetryData,
  SimulationLog,
} from '../types';
import { Play, Pause, RotateCcw, AlertTriangle, Cpu } from 'lucide-react';

interface LFRCanvasProps {
  build: RobotBuild;
  track: TrackDefinition;
  pidParams: PIDParameters;
  simSpeed: number; // 1x, 2x, 4x
  onSimSpeedChange: (speed: number) => void;
  onTelemetryUpdate: (data: TelemetryData) => void;
  onLogAdd: (log: SimulationLog) => void;
  onResetLogs: () => void;
}

export const LFRCanvas: React.FC<LFRCanvasProps> = ({
  build,
  track,
  pidParams,
  simSpeed,
  onSimSpeedChange,
  onTelemetryUpdate,
  onLogAdd,
  onResetLogs,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation play state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [lineStatus, setLineStatus] = useState<string>('Online');
  const [lfrPosition, setLfrPosition] = useState({ x: 0, y: 0, theta: 0 });
  const [activeSensors, setActiveSensors] = useState<number[]>([]);

  // Simulation physics variables stored in refs to avoid React re-render lag
  const robotStateRef = useRef({
    x: track.startPos.x,
    y: track.startPos.y,
    theta: track.startPos.theta,
    speed: 0,
    vL: 0,
    vR: 0,
    lastError: 0,
    lastActiveTag: '',
    lapStartTime: 0,
    lapCount: 0,
  });

  // Controller history refs
  const integralRef = useRef<number>(0);
  const prevErrorRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const trailRef = useRef<Array<{ x: number; y: number }>>([]);

  // Base constants mapped from assembled components
  const getMotorLimits = () => {
    const motorId = build.motor?.id || 'tt';
    if (motorId === 'cored') return { maxSpeed: 170, baseSpeed: 120 };
    if (motorId === 'n20') return { maxSpeed: 120, baseSpeed: 85 };
    return { maxSpeed: 80, baseSpeed: 55 }; // TT gearmotor
  };

  const getChassisGrip = () => {
    const chassisId = build.chassis?.id || 'acrylic';
    if (chassisId === 'carbon') return 0.95; // Ultra grip, low friction
    if (chassisId === 'aluminium') return 0.85;
    return 0.70; // Acrylic base, lower lateral traction
  };

  const getSensorOffsets = () => {
    const sensorId = build.sensors?.id || '5s';
    if (sensorId === '3s') return [-14, 0, 14];
    if (sensorId === '5s') return [-18, -9, 0, 9, 18];
    if (sensorId === '7s') return [-24, -16, -8, 0, 8, 16, 24];
    // 9s
    return [-32, -24, -16, -8, 0, 8, 16, 24, 32];
  };

  // Trigger offscreen canvas draw when track changes
  useEffect(() => {
    const offscreen = offscreenCanvasRef.current;
    if (!offscreen) return;
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 450);

    // Draw black line
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 14; // Line thickness
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    track.drawPath(ctx);
    resetSimulation();
  }, [track]);

  // Handle play/pause
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      animationFrameIdRef.current = requestAnimationFrame(loop);
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    }
    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [isPlaying, build, track, pidParams, simSpeed]);

  const resetSimulation = () => {
    robotStateRef.current = {
      x: track.startPos.x,
      y: track.startPos.y,
      theta: track.startPos.theta,
      speed: 0,
      vL: 0,
      vR: 0,
      lastError: 0,
      lastActiveTag: '',
      lapStartTime: performance.now() / 1000,
      lapCount: 0,
    };
    integralRef.current = 0;
    prevErrorRef.current = 0;
    trailRef.current = [];
    setActiveSensors([]);
    setLfrPosition({ x: track.startPos.x, y: track.startPos.y, theta: track.startPos.theta });
    onResetLogs();
    onLogAdd({
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      message: `System Booted. Track: ${track.name} selected.`,
      type: 'info',
    });

    drawMainCanvas();
  };

  // Fuzzy Logic Controller Defuzzification Helper
  const computeFuzzySteer = (error: number): number => {
    // membership functions (Error input: -4 to +4 range)
    // FL (Far Left), L (Left), CE (Center), R (Right), FR (Far Right)
    const trap = (x: number, a: number, b: number, c: number, d: number) => {
      if (x <= a || x >= d) return 0;
      if (x >= b && x <= c) return 1;
      if (x > a && x < b) return (x - a) / (b - a);
      return (d - x) / (d - c);
    };

    const muFL = trap(error, -100, -100, -2.5, -1.2);
    const muL = trap(error, -2.0, -1.0, -1.0, 0);
    const muCE = trap(error, -0.6, 0, 0, 0.6);
    const muR = trap(error, 0, 1.0, 1.0, 2.0);
    const muFR = trap(error, 1.2, 2.5, 100, 100);

    // Centroids of outputs (steering correction angle multiplier)
    const steerFL = 1.4;  // Sharp Right correction
    const steerL = 0.6;   // Moderate Right correction
    const steerCE = 0.0;  // Go straight
    const steerR = -0.6;  // Moderate Left correction
    const steerFR = -1.4; // Sharp Left correction

    // Defuzzify via weighted average
    const sumMemberships = muFL + muL + muCE + muR + muFR;
    if (sumMemberships === 0) return 0;

    const outputSteer = (muFL * steerFL + muL * steerL + muCE * steerCE + muR * steerR + muFR * steerFR) / sumMemberships;
    return outputSteer * 40; // Scale to motor correction values
  };

  // Main simulation tick loop
  const loop = (timestamp: number) => {
    if (!isPlaying) return;

    let dt = (timestamp - lastTimeRef.current) / 1000;
    // Cap dt to prevent massive jumps on tab switches
    if (dt > 0.1) dt = 0.1;
    lastTimeRef.current = timestamp;

    // Run simulation updates proportional to simulation speed setting
    const ticks = simSpeed;
    const subDt = dt / ticks;

    for (let t = 0; t < ticks; t++) {
      updatePhysics(subDt);
    }

    drawMainCanvas();
    animationFrameIdRef.current = requestAnimationFrame(loop);
  };

  const updatePhysics = (dt: number) => {
    const offscreen = offscreenCanvasRef.current;
    if (!offscreen) return;
    const offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!offscreenCtx) return;

    const state = robotStateRef.current;
    const offsets = getSensorOffsets();
    const sensorCount = offsets.length;
    const readings: number[] = [];

    // 1. Compute and sample sensor coordinates
    const sensorOffsetAhead = 26; // position forward of robot pivot
    const angleOffset = Math.PI / 2;

    let totalLineBrightness = 0;
    let weightedSensorSum = 0;

    const sampledReadings: number[] = [];

    offsets.forEach((offset, idx) => {
      // Calculate specific coordinate for sensor item
      const sX = state.x + Math.cos(state.theta) * sensorOffsetAhead + Math.cos(state.theta + angleOffset) * offset;
      const sY = state.y + Math.sin(state.theta) * sensorOffsetAhead + Math.sin(state.theta + angleOffset) * offset;

      let reading = 0;
      if (sX >= 0 && sX < 800 && sY >= 0 && sY < 450) {
        try {
          const pix = offscreenCtx.getImageData(Math.round(sX), Math.round(sY), 1, 1).data;
          // White background: RGB (255,255,255). Black line: RGB (17,24,39)
          const grayscale = (pix[0] + pix[1] + pix[2]) / 3;
          reading = (255 - grayscale) / 255; // 1 = black line, 0 = pure white surface
        } catch (e) {
          reading = 0;
        }
      }
      readings.push(reading);
      sampledReadings.push(reading);

      // Weighted summation to find line center
      // Weight goes from -N to +N based on coordinate layout
      const sensorWeight = (idx - (sensorCount - 1) / 2);
      weightedSensorSum += reading * sensorWeight;
      totalLineBrightness += reading;
    });

    // Save active sensors to display on UI
    setActiveSensors(sampledReadings);

    // 2. Calculate steering error
    let error = 0;
    let onLine = true;

    if (totalLineBrightness > 0.08) {
      error = weightedSensorSum / totalLineBrightness;
      state.lastError = error;
      setLineStatus('Locked');
    } else {
      // Lost the line completely! Coast or pivot in the direction of the last error
      onLine = false;
      error = state.lastError * 1.6; // Amplify steering to return to track
      setLineStatus('Lost (Searching)');
    }

    // 3. AI Camera peeking ahead feature (Dynamic cornering deceleration)
    let speedScaler = 1.0;
    if (build.extra?.id === 'camera') {
      // Sample 3 points far ahead (e.g., 65px ahead)
      const lookAheadDist = 65;
      const leftSampleOffset = -25;
      const rightSampleOffset = 25;

      const lxLeft = state.x + Math.cos(state.theta) * lookAheadDist + Math.cos(state.theta + angleOffset) * leftSampleOffset;
      const lyLeft = state.y + Math.sin(state.theta) * lookAheadDist + Math.sin(state.theta + angleOffset) * leftSampleOffset;

      const lxRight = state.x + Math.cos(state.theta) * lookAheadDist + Math.cos(state.theta + angleOffset) * rightSampleOffset;
      const lyRight = state.y + Math.sin(state.theta) * lookAheadDist + Math.sin(state.theta + angleOffset) * rightSampleOffset;

      try {
        const pixL = offscreenCtx.getImageData(Math.round(lxLeft), Math.round(lyLeft), 1, 1).data;
        const pixR = offscreenCtx.getImageData(Math.round(lxRight), Math.round(lyRight), 1, 1).data;
        const lineL = (255 - ((pixL[0] + pixL[1] + pixL[2]) / 3)) / 255;
        const lineR = (255 - ((pixR[0] + pixR[1] + pixR[2]) / 3)) / 255;

        // If line is detected significantly on either the extreme left or right lookahead point,
        // it means a sharp turn is upcoming! Slow down the robot to navigate safely.
        if (lineL > 0.4 || lineR > 0.4) {
          speedScaler = 0.55; // Decelerate by 45%
        }
      } catch (e) {}
    }

    // 4. Calculate PID steering feedback
    let steerOutput = 0;
    const ctrlId = build.controller?.id || 'p';

    if (ctrlId === 'p') {
      steerOutput = pidParams.kp * error * 14;
    } else if (ctrlId === 'pid') {
      // Integral calculation with windup cap
      integralRef.current += error * dt;
      integralRef.current = Math.max(-6, Math.min(6, integralRef.current));

      // Derivative calculation
      const derivative = (error - prevErrorRef.current) / dt;
      prevErrorRef.current = error;

      steerOutput =
        pidParams.kp * error * 14 +
        pidParams.ki * integralRef.current * 10 +
        pidParams.kd * derivative * 2.8;
    } else if (ctrlId === 'fuzzy') {
      steerOutput = computeFuzzySteer(error);
    }

    // 5. Differential Kinematics Setup
    const limits = getMotorLimits();
    const targetBaseSpeed = limits.baseSpeed * speedScaler;

    // Apply motor values
    let leftMotorSpeed = targetBaseSpeed + steerOutput;
    let rightMotorSpeed = targetBaseSpeed - steerOutput;

    // Clamp wheel speeds to motor caps
    leftMotorSpeed = Math.max(-limits.maxSpeed, Math.min(limits.maxSpeed, leftMotorSpeed));
    rightMotorSpeed = Math.max(-limits.maxSpeed, Math.min(limits.maxSpeed, rightMotorSpeed));

    state.vL = leftMotorSpeed;
    state.vR = rightMotorSpeed;

    // Apply chassis friction constraints
    const grip = getChassisGrip();
    const avgVelocity = (leftMotorSpeed + rightMotorSpeed) / 2;

    // Lateral slide simulation (loss of traction on sharp turns)
    const wheelbase = 30; // pixels
    const rotationVelocity = ((rightMotorSpeed - leftMotorSpeed) / wheelbase) * grip;

    // Update coordinates
    state.theta += rotationVelocity * dt;
    state.x += avgVelocity * Math.cos(state.theta) * dt;
    state.y += avgVelocity * Math.sin(state.theta) * dt;
    state.speed = avgVelocity;

    // Record trail
    if (trailRef.current.length === 0 || Math.hypot(state.x - trailRef.current[trailRef.current.length - 1].x, state.y - trailRef.current[trailRef.current.length - 1].y) > 4) {
      trailRef.current.push({ x: state.x, y: state.y });
      if (trailRef.current.length > 100) trailRef.current.shift();
    }

    // 6. Proximity RFID Reader Check
    if (build.extra?.id === 'rfid' && track.rfidTags) {
      track.rfidTags.forEach((tag) => {
        const dist = Math.hypot(state.x - tag.x, state.y - tag.y);
        if (dist < 22 && state.lastActiveTag !== tag.id) {
          state.lastActiveTag = tag.id;
          const splitTime = performance.now() / 1000 - state.lapStartTime;

          onLogAdd({
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            message: `📡 RFID Tag Detected: [${tag.id}] "${tag.label}" at Split: ${splitTime.toFixed(2)}s!`,
            type: 'checkpoint',
          });

          if (tag.id === 'RFID-ST') {
            state.lapCount++;
            onLogAdd({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              message: `🏆 Lap ${state.lapCount} Completed in ${splitTime.toFixed(2)} seconds!`,
              type: 'success',
            });
            // Reset lap timer
            state.lapStartTime = performance.now() / 1000;
          }
        }
      });
    }

    // Sync state back to React for quick visual tags
    setLfrPosition({ x: state.x, y: state.y, theta: state.theta });

    // 7. Dispatch Telemetry to charts
    onTelemetryUpdate({
      time: parseFloat((performance.now() / 1000).toFixed(1)),
      error: parseFloat(error.toFixed(2)),
      speed: parseFloat(state.speed.toFixed(1)),
      vL: parseFloat(state.vL.toFixed(1)),
      vR: parseFloat(state.vR.toFixed(1)),
    });
  };

  const drawMainCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw dark slate board background
    ctx.fillStyle = '#0a0f18';
    ctx.fillRect(0, 0, 800, 450);

    // Draw Grid Lines (cyber punk retro grid)
    ctx.strokeStyle = '#161e2e';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < 800; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 450);
      ctx.stroke();
    }
    for (let y = 0; y < 450; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(800, y);
      ctx.stroke();
    }

    // Draw glowing board borders
    ctx.strokeStyle = '#1d2a3a';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 800, 450);

    // Render original black line on top of slate board
    ctx.strokeStyle = '#22d3ee'; // Cyan glow line instead of black to look amazing!
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 6;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    track.drawPath(ctx);

    // Draw a inner core line for high contrast
    ctx.strokeStyle = '#0891b2';
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    track.drawPath(ctx);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Draw RFID tags if active
    if (track.rfidTags) {
      track.rfidTags.forEach((tag) => {
        const isRfidEquipped = build.extra?.id === 'rfid';

        ctx.fillStyle = isRfidEquipped ? 'rgba(59, 130, 246, 0.2)' : 'rgba(156, 163, 175, 0.1)';
        ctx.strokeStyle = isRfidEquipped ? '#3b82f6' : '#9ca3af';
        ctx.lineWidth = 1.5;

        // Draw ring
        ctx.beginPath();
        ctx.arc(tag.x, tag.y, 20, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Draw center dot
        ctx.fillStyle = isRfidEquipped ? '#60a5fa' : '#9ca3af';
        ctx.beginPath();
        ctx.arc(tag.x, tag.y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(tag.id, tag.x, tag.y - 25);
      });
    }

    // Draw LFR trail
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trailRef.current.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Robot properties
    const state = robotStateRef.current;

    // Draw AI Camera Look-Ahead cone
    if (build.extra?.id === 'camera') {
      const lookAheadDist = 65;
      const cameraAngleWidth = 0.5; // rad

      ctx.fillStyle = 'rgba(57, 224, 255, 0.15)';
      ctx.strokeStyle = 'rgba(57, 224, 255, 0.4)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(state.x, state.y);
      ctx.arc(
        state.x,
        state.y,
        lookAheadDist,
        state.theta - cameraAngleWidth,
        state.theta + cameraAngleWidth
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // DRAW THE ROBOT CHASSIS
    ctx.save();
    ctx.translate(state.x, state.y);
    ctx.rotate(state.theta);

    // Chassis dimensions
    const chLength = 36;
    const chWidth = 28;

    // Body base color
    let bodyColor = '#334155'; // Dark Grey standard
    let accentColor = '#39e0ff'; // Neon Cyan
    if (build.chassis?.id === 'carbon') {
      bodyColor = '#1e293b'; // carbon black
      accentColor = '#ff5d6c'; // Racing Red
    } else if (build.chassis?.id === 'aluminium') {
      bodyColor = '#64748b'; // Alu metallic
      accentColor = '#ffb020'; // Energetic Orange
    }

    // Chassis Box
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-chLength / 2, -chWidth / 2, chLength, chWidth, 6);
    ctx.fill();
    ctx.stroke();

    // Wheel Left
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.fillRect(-10, -chWidth / 2 - 3, 20, 4);
    ctx.strokeRect(-10, -chWidth / 2 - 3, 20, 4);

    // Wheel Right
    ctx.fillRect(-10, chWidth / 2 - 1, 20, 4);
    ctx.strokeRect(-10, chWidth / 2 - 1, 20, 4);

    // Caster Wheel (back)
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(-chLength / 2 + 5, 0, 3, 0, 2 * Math.PI);
    ctx.fill();

    // Sensor Array boom (front bar)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(chLength / 2, -14);
    ctx.lineTo(chLength / 2, 14);
    ctx.stroke();

    // Active Sensor array dots on the boom
    const sensorOffsets = getSensorOffsets();
    sensorOffsets.forEach((offset, idx) => {
      const activeVal = activeSensors[idx] || 0;
      // High activeVal = red (line detected), low activeVal = green
      ctx.fillStyle = activeVal > 0.4 ? '#f43f5e' : '#10b981';
      ctx.beginPath();
      // Position sensors offset in front
      ctx.arc(chLength / 2 + 4, offset, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw OLED Screen on robot if equipped
    if (build.extra?.id === 'oled') {
      ctx.fillStyle = '#09090B';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1;
      ctx.fillRect(-8, -10, 16, 20);
      ctx.strokeRect(-8, -10, 16, 20);

      // Simple pixel text simulation
      ctx.fillStyle = '#818cf8';
      ctx.font = '5px monospace';
      ctx.fillText(`P:${pidParams.kp}`, -6, -4);
      ctx.fillText(`E:${state.lastError.toFixed(1)}`, -6, 2);
      ctx.fillText(`S:${Math.round(state.speed)}`, -6, 8);
    }

    ctx.restore();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Simulation Screen Wrapper */}
      <div className="relative border border-[#27272A] bg-zinc-950 rounded-xl overflow-hidden shadow-2xl">
        {/* Telemetry Strip Overlay */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#09090B] to-transparent z-10 px-4 flex justify-between items-center text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              {isPlaying ? 'ACTIVE SIMULATION' : 'PAUSED'}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-indigo-400">
              LFR: <b className="text-zinc-200">({Math.round(lfrPosition.x)}, {Math.round(lfrPosition.y)})</b>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-zinc-500">
              Line Lock:{' '}
              <b className={lineStatus.includes('Lost') ? 'text-rose-400' : 'text-emerald-400'}>
                {lineStatus}
              </b>
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-amber-400 flex items-center gap-1">
              <Cpu size={12} />
              Controller: <b className="text-white uppercase">{build.controller?.id || 'P'}</b>
            </span>
          </div>
        </div>

        {/* Physics Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          className="w-full h-auto block aspect-[16/9]"
        />

        {/* Offscreen hidden sampling canvas */}
        <canvas
          ref={offscreenCanvasRef}
          width={800}
          height={450}
          className="hidden"
        />

        {/* Warning Indicator */}
        {!onLinePresent(build) && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col justify-center items-center text-center p-6 z-20">
            <AlertTriangle className="text-amber-500 w-12 h-12 mb-3" />
            <h3 className="font-sans font-bold text-lg text-white mb-1">
              Assemble Hardware Parts
            </h3>
            <p className="text-sm text-zinc-400 max-w-sm">
              Please select a <b>Controller</b> and <b>Sensor Array</b> in the component library to bootstrap the simulation engine.
            </p>
          </div>
        )}
      </div>

      {/* Controller Buttons Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#18181B] border border-[#27272A] rounded-xl p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={!onLinePresent(build)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-sans font-bold text-sm transition-all shadow cursor-pointer ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'Pause Simulation' : 'Run Simulation'}
          </button>

          <button
            onClick={resetSimulation}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-[#27272A] rounded-lg font-sans font-semibold text-sm transition cursor-pointer"
          >
            <RotateCcw size={15} />
            Reset State
          </button>
        </div>

        {/* Sim Speed Selection */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-500">SPEED WARP:</span>
          <div className="bg-zinc-950 border border-[#27272A] rounded-lg p-0.5 flex">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => onSimSpeedChange(spd)}
                className={`px-3 py-1 font-mono text-xs rounded-md transition cursor-pointer ${
                  simSpeed === spd
                    ? 'bg-indigo-500 text-white font-bold shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple validator helper to prevent boot without components
function onLinePresent(b: RobotBuild) {
  return b.controller !== null && b.sensors !== null;
}
