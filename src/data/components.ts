/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComponentCatalog } from '../types';

export const COMPONENT_CATALOG: ComponentCatalog = {
  controller: [
    { id: 'p', label: 'P-Controller', desc: 'Proportional feedback. Rapid but prone to continuous oscillations.', icon: '⚙️', perf: 2 },
    { id: 'pid', label: 'PID-Controller', desc: 'Proportional, Integral, and Derivative control. Highly stable and fast.', icon: '🎛️', perf: 5 },
    { id: 'fuzzy', label: 'Fuzzy Logic', desc: 'Heuristic rule-based control. Smooth cornering without exact mathematical tuning.', icon: '🧠', perf: 4 },
  ],
  sensors: [
    { id: '3s', label: '3-Sensor Array', desc: 'Wide spacing. Low resolution, easy to completely lose track.', icon: '👁️', perf: 2 },
    { id: '5s', label: '5-Sensor Array', desc: 'Balanced density. Ideal for standard circuits and gentle bends.', icon: '👁️👁️', perf: 4 },
    { id: '7s', label: '7-Sensor Array', desc: 'High resolution. Sharp line tracking and faster reaction speed.', icon: '👁️👁️👁️', perf: 5 },
    { id: '9s', label: '9-Sensor Array', desc: 'Maximum precision. Seamless intersection handling and tight turns.', icon: '🔍', perf: 5 },
  ],
  motor: [
    { id: 'tt', label: 'TT Gearmotor', desc: 'Standard 6V yellow motor. Low speed (100 RPM) but very forgiving.', icon: '🔄', perf: 3 },
    { id: 'n20', label: 'N20 Micro Metal', desc: 'Compact 12V motor. Responsive high RPM (180) with moderate inertia.', icon: '⚡', perf: 4 },
    { id: 'cored', label: 'Cored Carbon High-Speed', desc: 'Racing motor. High torque and blazing speed (250 RPM). Needs fine PID.', icon: '🚀', perf: 5 },
  ],
  chassis: [
    { id: 'acrylic', label: 'Acrylic Chassis', desc: 'Lightweight plastic base. Low weight, average friction.', icon: '🔲', perf: 3 },
    { id: 'aluminium', label: 'Aluminium Frame', desc: 'Rigid structural alloy. Stable center of gravity, highly durable.', icon: '🔳', perf: 4 },
    { id: 'carbon', label: 'Carbon Fiber Plate', desc: 'Ultralight racing carbon weaves. Unparalleled grip and acceleration.', icon: '🏎️', perf: 5 },
  ],
  extra: [
    { id: 'none', label: 'None', desc: 'Stock setup with no additional modules.', icon: '⬜', perf: 0 },
    { id: 'oled', label: 'OLED Display Screen', desc: 'Displays real-time PID values and motor output text on the robot chassis.', icon: '🖥️', perf: 1 },
    { id: 'rfid', label: 'RFID Tag Reader', desc: 'Detects RFID checkpoint cards placed on tracks, triggering time-splits.', icon: '📡', perf: 2 },
    { id: 'camera', label: 'AI Camera Sensor', desc: 'Peeks ahead on the track to dynamically scale down speeds before sharp bends.', icon: '📷', perf: 4 },
  ],
};
