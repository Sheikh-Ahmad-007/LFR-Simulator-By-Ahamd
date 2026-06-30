/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackDefinition } from '../types';

export const TRACKS: TrackDefinition[] = [
  {
    id: 'loopA',
    name: 'Standard Circuit (Loop A)',
    desc: 'An organic racing loop with wide corners and a single long straightaway. Ideal for tuning base PID values.',
    difficulty: 'Easy',
    startPos: { x: 150, y: 150, theta: 0 },
    drawPath: (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.moveTo(150, 150);
      ctx.lineTo(650, 150); // Top straight
      ctx.arc(650, 250, 100, -Math.PI / 2, Math.PI / 2); // Right loop
      ctx.lineTo(150, 350); // Bottom straight
      ctx.arc(150, 250, 100, Math.PI / 2, -Math.PI / 2); // Left loop
      ctx.stroke();
    },
    rfidTags: [
      { id: 'RFID-ST', x: 150, y: 150, label: 'START/FINISH' },
      { id: 'RFID-C1', x: 650, y: 150, label: 'Sector 1 Checkpoint' },
      { id: 'RFID-C2', x: 400, y: 350, label: 'Sector 2 Checkpoint' },
    ],
  },
  {
    id: 'hairpins',
    name: 'Hairpin & S-Curves',
    desc: 'Features sharp 90-degree corners and tight S-bends. Tests your controller\'s derivative damping to prevent overshooting.',
    difficulty: 'Medium',
    startPos: { x: 100, y: 400, theta: -Math.PI / 2 },
    drawPath: (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.moveTo(100, 400);
      ctx.lineTo(100, 150); // Left wall
      ctx.bezierCurveTo(100, 80, 250, 80, 250, 150); // Top curve
      ctx.lineTo(250, 250); // S-curve part 1
      ctx.bezierCurveTo(250, 320, 400, 320, 400, 250); // S-curve part 2
      ctx.lineTo(400, 150); // Upward straight
      ctx.lineTo(600, 150); // Sharp right turn
      ctx.lineTo(600, 350); // Downward leg
      ctx.lineTo(350, 350); // Inward sharp left
      ctx.lineTo(350, 400); // Zig-zag
      ctx.lineTo(700, 400); // Bottom straight
      ctx.bezierCurveTo(750, 400, 750, 450, 600, 450); // Bottom curve
      ctx.lineTo(100, 450); // Base return
      ctx.lineTo(100, 400); // Closure
      ctx.stroke();
    },
    rfidTags: [
      { id: 'RFID-ST', x: 100, y: 400, label: 'START/FINISH' },
      { id: 'RFID-HP', x: 250, y: 200, label: 'Hairpin Apex' },
      { id: 'RFID-SC', x: 600, y: 250, label: 'Speed Zone' },
    ],
  },
  {
    id: 'crossings',
    name: 'Grid & Cross Intersections',
    desc: 'An orthogonal grid with multiple intersections. Tests sensor algorithm robustness—does the robot cross straight or turn accidentally?',
    difficulty: 'Medium',
    gridLines: true,
    startPos: { x: 150, y: 250, theta: 0 },
    drawPath: (ctx: CanvasRenderingContext2D) => {
      // Draw a continuous loop that crosses over itself!
      ctx.beginPath();
      ctx.moveTo(150, 250);
      ctx.lineTo(650, 250); // Main horizontal cross line

      // Loop around
      ctx.arc(650, 150, 100, Math.PI / 2, -Math.PI / 2, true);
      ctx.lineTo(400, 50);
      ctx.lineTo(400, 450); // Vertical cross line
      ctx.lineTo(150, 450);
      ctx.arc(150, 350, 100, Math.PI / 2, -Math.PI / 2, true);
      ctx.stroke();

      // Ensure connection lines to make it a loop
      ctx.beginPath();
      ctx.moveTo(150, 250);
      ctx.lineTo(150, 350);
      ctx.stroke();
    },
    rfidTags: [
      { id: 'RFID-INT', x: 400, y: 250, label: 'Grid Center Intersect' },
      { id: 'RFID-S1', x: 650, y: 250, label: 'East Loop' },
    ],
  },
  {
    id: 'broken',
    name: 'Broken Line Challenge',
    desc: 'Features a 60-pixel physical gap in the path. The robot must coast straight ahead using momentum and historical error memory.',
    difficulty: 'Hard',
    startPos: { x: 100, y: 250, theta: 0 },
    drawPath: (ctx: CanvasRenderingContext2D) => {
      // First section
      ctx.beginPath();
      ctx.moveTo(100, 250);
      ctx.lineTo(250, 250);
      ctx.stroke();

      // GAP (represented by drawing nothing between 250 and 320 px)

      // Second section
      ctx.beginPath();
      ctx.moveTo(320, 250);
      ctx.lineTo(650, 250);
      ctx.arc(650, 350, 100, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(150, 450);
      ctx.arc(150, 350, 100, Math.PI / 2, -Math.PI / 2);
      ctx.lineTo(100, 250);
      ctx.stroke();
    },
    rfidTags: [
      { id: 'RFID-ST', x: 100, y: 250, label: 'START/FINISH' },
      { id: 'RFID-GAP', x: 285, y: 250, label: 'The Abyss Gap' },
    ],
  },
  {
    id: 'speedway',
    name: 'Super Speedway Oval',
    desc: 'A massive oval with banked-style wide corners. Designed for pure high-speed motor tests to push the physical limits of traction.',
    difficulty: 'Easy',
    startPos: { x: 400, y: 100, theta: 0 },
    drawPath: (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.ellipse(400, 250, 300, 150, 0, 0, 2 * Math.PI);
      ctx.stroke();
    },
    rfidTags: [
      { id: 'RFID-ST', x: 400, y: 100, label: 'SPEED START' },
      { id: 'RFID-M1', x: 700, y: 250, label: 'East Corner' },
      { id: 'RFID-M2', x: 100, y: 250, label: 'West Corner' },
    ],
  },
];
