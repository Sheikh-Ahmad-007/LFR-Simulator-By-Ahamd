/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrebuiltProfile } from '../types';

export const PREBUILT_PROFILES: PrebuiltProfile[] = [
  {
    id: 'basic',
    cat: 'core',
    title: 'Beginner Proportional Bot',
    spec: 'Simple P-controller with 3 sensors. Tends to sway back and forth (oscillate) at speeds over 120.',
    build: {
      controller: 'p',
      sensors: '3s',
      motor: 'tt',
      chassis: 'acrylic',
      extra: 'none',
    },
    pid: { kp: 0.8, ki: 0.0, kd: 0.0 },
    trackId: 'loopA',
  },
  {
    id: 'pid_pro',
    cat: 'core',
    title: 'High-Speed PID Racer',
    spec: 'Equipped with a fast 7-sensor array and cored carbon motors. Uses full PID feedback to dampen sharp corners.',
    build: {
      controller: 'pid',
      sensors: '7s',
      motor: 'cored',
      chassis: 'carbon',
      extra: 'oled',
    },
    pid: { kp: 1.6, ki: 0.02, kd: 1.2 },
    trackId: 'hairpins',
  },
  {
    id: 'maze_solver',
    cat: 'advanced',
    title: 'AI Vision Cornering Bot',
    spec: 'Equipped with an AI Smart Camera and a 9-sensor array. The camera looks ahead and pre-slows the motors for 90-degree turns.',
    build: {
      controller: 'fuzzy',
      sensors: '9s',
      motor: 'n20',
      chassis: 'aluminium',
      extra: 'camera',
    },
    pid: { kp: 1.2, ki: 0.01, kd: 0.8 },
    trackId: 'hairpins',
  },
  {
    id: 'rfid_challenge',
    cat: 'task',
    title: 'RFID Split-Time Speedster',
    spec: 'A carbon fiber speedster optimized for time-trials. Logs splits at multiple RFID checkpoints to verify tune iterations.',
    build: {
      controller: 'pid',
      sensors: '5s',
      motor: 'cored',
      chassis: 'carbon',
      extra: 'rfid',
    },
    pid: { kp: 1.4, ki: 0.04, kd: 1.0 },
    trackId: 'speedway',
  },
];
