/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ControllerType = 'p' | 'pid' | 'fuzzy';
export type SensorCountType = '3s' | '5s' | '7s' | '9s';
export type MotorType = 'tt' | 'n20' | 'cored';
export type ChassisType = 'acrylic' | 'aluminium' | 'carbon';
export type ExtraType = 'none' | 'oled' | 'rfid' | 'camera';

export interface ComponentItem {
  id: string;
  label: string;
  desc: string;
  icon: string;
  perf: number; // 0 to 5
}

export interface ComponentCatalog {
  controller: ComponentItem[];
  sensors: ComponentItem[];
  motor: ComponentItem[];
  chassis: ComponentItem[];
  extra: ComponentItem[];
}

export interface RobotBuild {
  controller: ComponentItem | null;
  sensors: ComponentItem | null;
  motor: ComponentItem | null;
  chassis: ComponentItem | null;
  extra: ComponentItem | null;
}

export interface TrackDefinition {
  id: string;
  name: string;
  desc: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  gridLines?: boolean;
  // Draw commands for the path
  drawPath: (ctx: CanvasRenderingContext2D) => void;
  startPos: { x: number; y: number; theta: number };
  rfidTags?: Array<{ id: string; x: number; y: number; label: string }>;
}

export interface PIDParameters {
  kp: number;
  ki: number;
  kd: number;
}

export interface TelemetryData {
  time: number;
  error: number;
  speed: number;
  vL: number;
  vR: number;
}

export interface SimulationLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'checkpoint';
}

export interface PrebuiltProfile {
  id: string;
  cat: 'core' | 'advanced' | 'task';
  title: string;
  spec: string;
  build: {
    controller: string;
    sensors: string;
    motor: string;
    chassis: string;
    extra: string;
  };
  pid: PIDParameters;
  trackId: string;
}
