/* =====================================================================
   Codex Pet · Desktop Floating Character
   Procedural SVG sprite-frame animation + state machine + physics
   ===================================================================== */
(() => {
  'use strict';

  // ------------------------------------------------------------------
  // CONFIG — matches spec output
  // ------------------------------------------------------------------
  const STATES = {
    idle:    { frames: 8,  loop: true,  fps: 6,  duration: 0 },
    run:     { frames: 12, loop: true,  fps: 18, duration: 0 },
    success: { frames: 10, loop: false, fps: 12, duration: 1000 },
    fail:    { frames: 10, loop: false, fps: 12, duration: 1000 },
  };
  const VIEW = { w: 400, h: 400, anchorX: 200, anchorY: 360 };

  // ------------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------------
  let currentState = 'idle';
  let pendingState = null;
  let frame = 0;
  let lastFrameSwitch = performance.now();
  let stateStartedAt = performance.now();
  let clickThrough = false;

  // Drift physics for idle / run
  const pos = { x: 0, y: 0 };
  let driftT = Math.random() * 10;

  // ------------------------------------------------------------------
  // DOM + SVG setup
  // ------------------------------------------------------------------
  const petEl = document.getElementById('pet');
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW.w} ${VIEW.h}`);
  petEl.appendChild(svg);

  const rootG = el('g');
  svg.appendChild(rootG);

  // Shadowed container: translate is used for world drift; children render at anchor
  const charG = el('g');           // world position (drift)
  const shakeG = el('g');          // run shake + fail shock
  rootG.appendChild(charG);
  charG.appendChild(shakeG);

  function el(tag, attrs = {}, text) {
    const e = document.createElementNS(svgNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  // ====================================================================
  // CHARACTER PARTS — reusable SVG pieces
  // Each part is drawn in a neutral local coordinate, then transformed.
  // Anchor of the entire character: (VIEW.anchorX, VIEW.anchorY) = feet on cloud.
  // ====================================================================

  const COLORS = {
    coat:      '#f7f5fb',
    coatLine:  '#c8b8e8',
    sash:      '#a867e0',
    sashDark:  '#7a3fbf',
    skin:      '#f4c9a8',
    skinDark:  '#c98b66',
    hair:      '#ffffff',
    hairLine:  '#cfc5e0',
    scar:      '#b85450',
    scarLine:  '#6d2c2a',
    eyeWhite:  '#ffffff',
    eyeIris:   '#e04848',
    eyePupil:  '#1a0f2e',
    mouth:     '#1a0f2e',
    tongue:    '#ff7a9a',
    straw:     '#d9b070',
    strawDark: '#8f6a38',
    button:    '#e9c46a',
    cloud:     '#ffffff',
    cloudShade:'#e0d8ee',
    wheel:     '#ffffff',
    wheelLine: '#b8a6e0',
    sparkle:   '#ffd94d',
  };

  // A cloud shape drawn as a series of overlapping circles.
  function drawCloud(cx, cy, scale = 1, squash = 1, stretch = 1, opts = {}) {
    const g = el('g', {
      transform: `translate(${cx} ${cy}) scale(${scale * stretch} ${scale * squash})`,
      opacity: opts.opacity ?? 1,
    });
    const bumps = [
      [-60, 0, 40], [-28, -18, 36], [8, -22, 38], [40, -14, 34],
      [62, 4, 30], [36, 14, 28], [-10, 16, 32], [-48, 14, 28],
    ];
    for (const [bx, by, br] of bumps) {
      g.appendChild(el('circle', {
        cx: bx, cy: by, r: br,
        fill: COLORS.cloud,
        stroke: COLORS.cloudShade,
        'stroke-width': 2,
      }));
    }
    // little fluff puffs
    for (let i = 0; i < 4; i++) {
      const a = i * 1.8;
      g.appendChild(el('circle', {
        cx: Math.cos(a) * 70, cy: Math.sin(a) * 16 - 6, r: 8,
        fill: COLORS.cloud, stroke: COLORS.cloudShade, 'stroke-width': 1.5,
        opacity: 0.8,
      }));
    }
    return g;
  }

  // Cloud-like hair — fluffy blob around the top of head
  function drawHair(baseY) {
    const g = el('g');
    const puffs = [
      [0,   -80, 38], [-30, -70, 32], [30, -70, 32],
      [-48, -50, 28], [48, -50, 28], [-18, -92, 26],
      [20,  -90, 28], [0,  -104, 22], [-36, -88, 22], [40, -92, 24],
    ];
    for (const [px, py, pr] of puffs) {
      g.appendChild(el('circle', {
        cx: VIEW.anchorX + px, cy: baseY + py, r: pr,
        fill: COLORS.hair, stroke: COLORS.hairLine, 'stroke-width': 2,
      }));
    }
    // curly wisps
    for (let i = 0; i < 6; i++) {
      const ang = i * 1.05 + 0.4;
      g.appendChild(el('circle', {
        cx: VIEW.anchorX + Math.cos(ang) * 52,
        cy: baseY - 80 + Math.sin(ang) * 30,
        r: 10, fill: COLORS.hair, stroke: COLORS.hairLine, 'stroke-width': 1.5,
      }));
    }
    return g;
  }

  // Face with eyes & mouth, mood-dependent
  function drawFace(baseY, opts = {}) {
    const { smile = true, laugh = false, shocked = false,
            eyesClosed = false, tongueOut = false, blink = false } = opts;
    const g = el('g');
    const hx = VIEW.anchorX, hy = baseY - 30;

    // face ellipse
    g.appendChild(el('ellipse', {
      cx: hx, cy: hy, rx: 34, ry: 36,
      fill: COLORS.skin, stroke: '#6b3f25', 'stroke-width': 2,
    }));
    // scar on chest area actually on face — small cross scar under left eye
    g.appendChild(el('path', {
      d: `M ${hx - 16} ${hy + 6} l 6 -6 M ${hx - 16} ${hy} l 6 0`,
      stroke: COLORS.scarLine, 'stroke-width': 1.5, fill: 'none',
      'stroke-linecap': 'round',
    }));

    // Eyes
    if (shocked) {
      // big round eyes with white sclera, tiny pupils
      [[-12, -6], [12, -6]].forEach(([dx, dy]) => {
        g.appendChild(el('circle', {
          cx: hx + dx, cy: hy + dy, r: 9,
          fill: COLORS.eyeWhite, stroke: '#1a0f2e', 'stroke-width': 2,
        }));
        g.appendChild(el('circle', {
          cx: hx + dx, cy: hy + dy, r: 3.5,
          fill: COLORS.eyePupil,
        }));
        g.appendChild(el('circle', {
          cx: hx + dx - 2, cy: hy + dy - 2, r: 1.2, fill: '#fff',
        }));
      });
    } else if (laugh || eyesClosed || blink) {
      // closed ^ ^
      [[-12, -6], [12, -6]].forEach(([dx, dy]) => {
        g.appendChild(el('path', {
          d: `M ${hx + dx - 7} ${hy + dy + 2} q 7 -8 14 0`,
          stroke: '#1a0f2e', 'stroke-width': 2.2, fill: 'none',
          'stroke-linecap': 'round',
        }));
      });
    } else {
      [[-12, -6], [12, -6]].forEach(([dx, dy]) => {
        g.appendChild(el('ellipse', {
          cx: hx + dx, cy: hy + dy, rx: 3, ry: 4,
          fill: COLORS.eyePupil,
        }));
        g.appendChild(el('circle', {
          cx: hx + dx - 1, cy: hy + dy - 1.5, r: 1, fill: '#fff',
        }));
      });
    }

    // Mouth
    if (laugh) {
      // wide open laugh
      g.appendChild(el('path', {
        d: `M ${hx - 14} ${hy + 10} Q ${hx} ${hy + 28} ${hx + 14} ${hy + 10}`,
        fill: '#1a0f2e', stroke: '#1a0f2e', 'stroke-width': 2,
      }));
      if (tongueOut) {
        g.appendChild(el('path', {
          d: `M ${hx - 10} ${hy + 18} Q ${hx} ${hy + 34} ${hx + 18} ${hy + 22}`,
          fill: COLORS.tongue, stroke: '#1a0f2e', 'stroke-width': 1.5,
        }));
      }
    } else if (shocked) {
      // O mouth
      g.appendChild(el('ellipse', {
        cx: hx, cy: hy + 16, rx: 6, ry: 9,
        fill: '#1a0f2e',
      }));
      // tongue sticking out
      g.appendChild(el('path', {
        d: `M ${hx - 6} ${hy + 18} Q ${hx} ${hy + 40} ${hx + 10} ${hy + 22}`,
        fill: COLORS.tongue, stroke: '#1a0f2e', 'stroke-width': 1.5,
      }));
    } else if (smile) {
      g.appendChild(el('path', {
        d: `M ${hx - 8} ${hy + 14} Q ${hx} ${hy + 20} ${hx + 8} ${hy + 14}`,
        stroke: '#1a0f2e', 'stroke-width': 2, fill: 'none',
        'stroke-linecap': 'round',
      }));
    } else {
      g.appendChild(el('path', {
        d: `M ${hx - 6} ${hy + 14} l 12 0`,
        stroke: '#1a0f2e', 'stroke-width': 2, 'stroke-linecap': 'round',
      }));
    }

    // cheek blush
    if (!shocked) {
      g.appendChild(el('circle', { cx: hx - 20, cy: hy + 6, r: 4, fill: '#f7a8a8', opacity: 0.7 }));
      g.appendChild(el('circle', { cx: hx + 20, cy: hy + 6, r: 4, fill: '#f7a8a8', opacity: 0.7 }));
    }
    return g;
  }

  // Body: coat + purple sash + chest scar mark. Returns group with center at anchor minus bodyHeight.
  function drawBody(baseY, bodyHeight = 100, tilt = 0, opts = {}) {
    const g = el('g', {
      transform: `translate(${VIEW.anchorX} ${baseY - bodyHeight}) rotate(${tilt})`,
    });

    // Straw hat on the back (behind body)
    if (opts.showBackpackHat) {
      const hat = el('g', { transform: 'translate(14 -50) rotate(12)' });
      hat.appendChild(el('ellipse', {
        cx: 0, cy: 0, rx: 26, ry: 7,
        fill: COLORS.straw, stroke: COLORS.strawDark, 'stroke-width': 2,
      }));
      hat.appendChild(el('path', {
        d: 'M -14 -2 q 14 -18 28 0 z',
        fill: COLORS.straw, stroke: COLORS.strawDark, 'stroke-width': 2,
      }));
      hat.appendChild(el('path', {
        d: 'M -22 0 l 44 0 M -18 3 l 36 0',
        stroke: COLORS.strawDark, 'stroke-width': 1.2, fill: 'none',
      }));
      g.appendChild(hat);
    }

    // Coat main (open, bell-shaped)
    const coatPath = `M -38 -30
                       L  38 -30
                       L  50 ${bodyHeight - 10}
                       Q   0 ${bodyHeight + 6} -50 ${bodyHeight - 10} Z`;
    g.appendChild(el('path', {
      d: coatPath, fill: COLORS.coat, stroke: COLORS.coatLine, 'stroke-width': 2.5,
    }));

    // Coat inner shading
    g.appendChild(el('path', {
      d: `M -34 -26 L -10 -30 L -8 ${bodyHeight - 15} L -30 ${bodyHeight - 10} Z`,
      fill: '#ece4f8', stroke: 'none',
    }));

    // Gold buttons down right side
    for (let i = 0; i < 4; i++) {
      g.appendChild(el('circle', {
        cx: 24, cy: -10 + i * 22, r: 3.2,
        fill: COLORS.button, stroke: '#a87a20', 'stroke-width': 1,
      }));
    }

    // Exposed chest (X-shaped scar) — only upper torso visible
    g.appendChild(el('path', {
      d: `M -12 -28 L 14 -28 L 14 -6 L -12 -6 Z`,
      fill: COLORS.skin, stroke: '#6b3f25', 'stroke-width': 1.8,
    }));
    // scar lines
    g.appendChild(el('path', {
      d: `M -8 -22 L 10 -10 M -8 -10 L 10 -22 M -10 -17 L 12 -17`,
      stroke: COLORS.scarLine, 'stroke-width': 1.4, fill: 'none',
      'stroke-linecap': 'round',
    }));

    // Purple sash (waist cloth)
    g.appendChild(el('path', {
      d: `M -42 ${bodyHeight - 46}
          Q  0 ${bodyHeight - 54} 42 ${bodyHeight - 46}
          L  46 ${bodyHeight - 28}
          Q  0 ${bodyHeight - 20} -46 ${bodyHeight - 28} Z`,
      fill: COLORS.sash, stroke: COLORS.sashDark, 'stroke-width': 2,
    }));
    // Sash tie knot
    g.appendChild(el('path', {
      d: `M -14 ${bodyHeight - 42} q 14 12 28 0 q 2 14 -6 18 q -8 -4 -8 -14 z`,
      fill: COLORS.sashDark, stroke: '#5a2a9a', 'stroke-width': 1.5,
    }));
    // sash trailing flutter
    g.appendChild(el('path', {
      d: `M -20 ${bodyHeight - 30} q -24 12 -20 36 q 16 -6 22 -22 z`,
      fill: COLORS.sash, stroke: COLORS.sashDark, 'stroke-width': 1.5,
      opacity: 0.9,
    }));

    // White pants (visible between sash and knees)
    g.appendChild(el('path', {
      d: `M -24 ${bodyHeight - 30}
          L -12 ${bodyHeight - 10}
          L  12 ${bodyHeight - 10}
          L  24 ${bodyHeight - 30} Z`,
      fill: '#fff', stroke: COLORS.coatLine, 'stroke-width': 2,
    }));
    // fluffy pant cuffs
    g.appendChild(el('ellipse', {
      cx: -18, cy: bodyHeight - 8, rx: 14, ry: 5,
      fill: '#fff', stroke: COLORS.coatLine, 'stroke-width': 2,
    }));
    g.appendChild(el('ellipse', {
      cx: 18, cy: bodyHeight - 8, rx: 14, ry: 5,
      fill: '#fff', stroke: COLORS.coatLine, 'stroke-width': 2,
    }));

    return g;
  }

  // Arm: upper+forearm. anchor at shoulder. Lengths fixed.
  function drawArm(shoulderX, shoulderY, elbowAngle, handAngle, flip = 1) {
    const g = el('g', {
      transform: `translate(${shoulderX} ${shoulderY}) rotate(${flip < 0 ? -elbowAngle : elbowAngle})`,
    });
    // upper arm
    g.appendChild(el('path', {
      d: 'M -8 -2 L -8 22 L 8 22 L 8 -2 Z',
      fill: COLORS.coat, stroke: COLORS.coatLine, 'stroke-width': 2,
    }));
    // cuff
    g.appendChild(el('ellipse', {
      cx: 0, cy: 22, rx: 12, ry: 4, fill: '#fff', stroke: COLORS.coatLine, 'stroke-width': 2,
    }));
    // forearm (rotate from shoulder? simpler: bend at elbow)
    const forearm = el('g', {
      transform: `translate(0 22) rotate(${flip < 0 ? -handAngle : handAngle})`,
    });
    forearm.appendChild(el('path', {
      d: 'M -7 0 L -7 24 L 7 24 L 7 0 Z',
      fill: COLORS.skin, stroke: COLORS.skinDark, 'stroke-width': 1.6,
    }));
    // hand (fist)
    forearm.appendChild(el('circle', {
      cx: 0, cy: 28, r: 8, fill: COLORS.skin, stroke: COLORS.skinDark, 'stroke-width': 1.6,
    }));
    g.appendChild(forearm);
    return g;
  }

  // Leg: thigh + shin. anchor at hip.
  function drawLeg(hipX, hipY, thighAngle, kneeAngle, flip = 1) {
    const g = el('g', {
      transform: `translate(${hipX} ${hipY}) rotate(${flip < 0 ? -thighAngle : thighAngle})`,
    });
    // thigh (white shorts look)
    g.appendChild(el('path', {
      d: 'M -10 -2 L -10 26 L 10 26 L 10 -2 Z',
      fill: '#fff', stroke: COLORS.coatLine, 'stroke-width': 2,
    }));
    // shin
    const shin = el('g', {
      transform: `translate(0 26) rotate(${flip < 0 ? -kneeAngle : kneeAngle})`,
    });
    shin.appendChild(el('path', {
      d: 'M -8 0 L -8 28 L 8 28 L 8 0 Z',
      fill: COLORS.skin, stroke: COLORS.skinDark, 'stroke-width': 1.6,
    }));
    // sandal foot
    shin.appendChild(el('ellipse', {
      cx: 0, cy: 34, rx: 12, ry: 6,
      fill: COLORS.straw, stroke: COLORS.strawDark, 'stroke-width': 2,
    }));
    shin.appendChild(el('path', {
      d: 'M -10 34 L 10 34 M -6 28 q 6 -6 12 0',
      stroke: COLORS.strawDark, 'stroke-width': 1.4, fill: 'none',
    }));
    g.appendChild(shin);
    return g;
  }

  // Energy wheel (replaces foot in run state)
  function drawWheel(cx, cy, radius, rotation, spinStrength = 1) {
    const g = el('g', { transform: `translate(${cx} ${cy}) rotate(${rotation})` });
    // glowing core
    g.appendChild(el('circle', {
      cx: 0, cy: 0, r: radius,
      fill: 'rgba(255,255,255,0.55)',
      stroke: COLORS.wheelLine, 'stroke-width': 2,
    }));
    g.appendChild(el('circle', {
      cx: 0, cy: 0, r: radius - 6,
      fill: 'none', stroke: '#fff', 'stroke-width': 1.5,
      opacity: 0.8,
    }));
    // spokes — more at higher spin
    const spokes = 8;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * 360;
      g.appendChild(el('path', {
        d: `M 0 0 L ${Math.cos(a * Math.PI / 180) * radius} ${Math.sin(a * Math.PI / 180) * radius}`,
        stroke: '#fff', 'stroke-width': 2.5 * spinStrength, opacity: 0.9,
      }));
    }
    // tangential streaks for motion blur
    for (let i = 0; i < 4; i++) {
      g.appendChild(el('path', {
        d: `M ${radius + 4 + i * 3} -${6 + i * 2} l 18 0`,
        stroke: '#fff', 'stroke-width': 2, opacity: 0.6 - i * 0.12,
        'stroke-linecap': 'round',
      }));
    }
    return g;
  }

  // ====================================================================
  // STATE RENDERERS — each draws a single frame given frame index & total.
  // The whole character group re-renders every frame (sprite-like).
  // ====================================================================

  function renderIdle(frame, total) {
    clear(shakeG);
    // Gentle breathing — y scale changes over time, slow drift
    const t = frame / total;
    const bobY = Math.sin(t * Math.PI * 2) * 3;
    const driftX = Math.cos(t * Math.PI * 2) * 6;
    const breathe = 1 + Math.sin(t * Math.PI * 2) * 0.015;

    // Blink happens once per loop at frame ~ total*0.75
    const blink = (frame === Math.floor(total * 0.75));

    // Cloud under character (very slight squash)
    const cloudY = VIEW.anchorY;
    shakeG.appendChild(drawCloud(VIEW.anchorX, cloudY, 1.1, 1 + Math.sin(t * Math.PI * 2) * 0.02,
                                 1 + Math.cos(t * Math.PI * 2) * 0.02));

    // Body bob
    const bodyG = el('g', { transform: `translate(${driftX} ${-60 + bobY}) scale(${breathe} ${breathe})` });

    // Body (standing relaxed on cloud) — slight body tilt
    bodyG.appendChild(drawBody(0, 110, Math.sin(t * Math.PI * 2) * 1.5, { showBackpackHat: true }));
    // Face & hair — relative to body top
    const headBase = 0;
    bodyG.appendChild(drawHair(headBase - 30));
    bodyG.appendChild(drawFace(headBase, { smile: true, blink }));

    // Arms relaxed at sides (slight swing)
    const armSwing = Math.sin(t * Math.PI * 2) * 4;
    bodyG.appendChild(drawArm(-38, -20, 10 + armSwing, 14, 1));
    bodyG.appendChild(drawArm(38, -20, -10 - armSwing, -14, -1));

    // Legs straight / slight stagger
    bodyG.appendChild(drawLeg(-18, 60, 2, 0, 1));
    bodyG.appendChild(drawLeg(18, 60, -2, 0, -1));

    shakeG.appendChild(bodyG);
  }

  function renderRun(frame, total) {
    clear(shakeG);
    const t = frame / total;
    const cycle = t * Math.PI * 2;

    // Drift: slight body bob and forward tilt — character appears to sprint
    const tilt = 14;
    const bobY = Math.abs(Math.sin(cycle)) * -4 - 4;

    // Big running cloud trail behind feet — stretched backward
    const trailG = el('g');
    for (let i = 0; i < 5; i++) {
      const stretch = 1.6 - i * 0.2;
      trailG.appendChild(drawCloud(VIEW.anchorX + 80 + i * 40, VIEW.anchorY - 4,
                                   0.8 - i * 0.1,
                                   0.9 - i * 0.05,
                                   stretch, { opacity: 0.8 - i * 0.12 }));
    }
    shakeG.appendChild(trailG);

    // Speed lines (behind)
    const linesG = el('g');
    for (let i = 0; i < 7; i++) {
      const yOff = (i - 3) * 18;
      linesG.appendChild(el('path', {
        d: `M ${VIEW.anchorX + 70} ${VIEW.anchorY - 80 + yOff} l 80 0`,
        stroke: '#fff', 'stroke-width': 3, opacity: 0.5, 'stroke-linecap': 'round',
      }));
    }
    shakeG.appendChild(linesG);

    // Body — leaned forward, bobbing
    const bodyG = el('g', {
      transform: `translate(0 ${bobY}) rotate(${tilt} ${VIEW.anchorX} ${VIEW.anchorY - 70})`,
    });

    // Legs: 180° phase offset. Use sin for smooth cycle.
    const legPhase = Math.sin(cycle);
    const legPhase2 = Math.sin(cycle + Math.PI);
    // thigh angle driven by phase — between -30° and +30°
    const thighL = legPhase * 35;
    const thighR = legPhase2 * 35;
    // knee bends more when leg is forward
    const kneeL = 15 + legPhase * 15;
    const kneeR = 15 + legPhase2 * 15;

    // Arms swing opposite to same-side leg
    const armL = -legPhase2 * 35;
    const armR = -legPhase * 35;
    const forearmL = 30 + Math.abs(legPhase2) * 20;
    const forearmR = 30 + Math.abs(legPhase) * 20;

    bodyG.appendChild(drawBody(0, 110, 0, { showBackpackHat: true }));

    // excited face — mouth open, determined eyes
    bodyG.appendChild(drawHair(-30));
    bodyG.appendChild(drawFace(0, { smile: false, laugh: false }));
    // over-render mouth as determined grin
    // Arms swinging
    bodyG.appendChild(drawArm(-38, -20, armL + 10, forearmL, 1));
    bodyG.appendChild(drawArm(38, -20, armR - 10, -forearmR, -1));

    // Legs (hips at y ~ 60)
    bodyG.appendChild(drawLeg(-18, 60, thighL, kneeL, 1));
    bodyG.appendChild(drawLeg(18, 60, thighR, kneeR, -1));

    shakeG.appendChild(bodyG);

    // Energy wheels at feet — replace shoes. Compute foot world positions approximately.
    // Simplified: draw wheels below hips, offset by leg phase (more realistic feel).
    const footLx = VIEW.anchorX - 18 + Math.sin(cycle) * 30;
    const footLy = VIEW.anchorY - 8 + Math.abs(Math.cos(cycle)) * 6;
    const footRx = VIEW.anchorX + 18 + Math.sin(cycle + Math.PI) * 30;
    const footRy = VIEW.anchorY - 8 + Math.abs(Math.cos(cycle + Math.PI)) * 6;
    const wheelRot = (frame / total) * 720;
    shakeG.appendChild(drawWheel(footLx, footLy + 6, 22, wheelRot, 1));
    shakeG.appendChild(drawWheel(footRx, footRy + 6, 22, wheelRot + 40, 1));
  }

  function renderSuccess(frame, total) {
    clear(shakeG);
    const t = frame / total;

    // Phase split: 0-0.3 fall, 0.3-0.7 bounce roll, 0.7-1.0 settle laugh
    let cloudSquash = 1, cloudStretch = 1;
    let fallY = 0;
    let bodyRot = 0;
    let bodyY = -20;
    let bodyX = 0;

    if (t < 0.3) {
      const p = t / 0.3;
      fallY = p * 60;
      bodyRot = p * 25;
      cloudSquash = 1 - p * 0.15;
      cloudStretch = 1 + p * 0.1;
    } else if (t < 0.7) {
      const p = (t - 0.3) / 0.4;
      // bouncy roll
      fallY = 60 - Math.sin(p * Math.PI * 3) * 14;
      bodyRot = 25 + Math.sin(p * Math.PI * 4) * 30;
      cloudSquash = 0.9 + Math.sin(p * Math.PI * 3) * 0.2;
      cloudStretch = 1.0 - Math.sin(p * Math.PI * 3) * 0.15;
    } else {
      const p = (t - 0.7) / 0.3;
      fallY = 60 - p * 20;
      bodyRot = 10 + (1 - p) * 20;
      cloudSquash = 1 - (1 - p) * 0.1;
      cloudStretch = 1;
    }

    bodyY += fallY;

    // Cloud — squash/stretch
    shakeG.appendChild(drawCloud(VIEW.anchorX, VIEW.anchorY, 1.05, cloudSquash, cloudStretch));

    // Body — lying back, laughing
    const bodyG = el('g', {
      transform: `translate(${bodyX} ${bodyY}) rotate(${bodyRot} ${VIEW.anchorX} ${VIEW.anchorY - 100})`,
    });
    bodyG.appendChild(drawBody(0, 110, -6, { showBackpackHat: true }));
    bodyG.appendChild(drawHair(-30));
    bodyG.appendChild(drawFace(0, { laugh: true, eyesClosed: true }));

    // Arms up / holding head laugh — hands near forehead
    bodyG.appendChild(drawArm(-38, -30, -60, -90, 1));
    bodyG.appendChild(drawArm(38, -30, 60, 90, -1));
    // Legs lifted & splayed
    bodyG.appendChild(drawLeg(-18, 60, -40, -20, 1));
    bodyG.appendChild(drawLeg(18, 60, -40, 20, -1));
    shakeG.appendChild(bodyG);

    // Star particles — appear after fall, more during bounce
    if (t > 0.25) {
      const stars = el('g');
      const count = 5;
      for (let i = 0; i < count; i++) {
        const ang = i * 1.3 + t * 2;
        const radius = 60 + Math.sin(t * 8 + i) * 20;
        const sx = VIEW.anchorX + Math.cos(ang) * radius - 10;
        const sy = VIEW.anchorY - 120 + Math.sin(ang) * radius * 0.7;
        stars.appendChild(drawStar(sx, sy, 6 + (i % 2) * 2, COLORS.sparkle));
      }
      shakeG.appendChild(stars);
    }
  }

  function renderFail(frame, total) {
    clear(shakeG);
    const t = frame / total;
    // 0-0.2 freeze, 0.2-0.8 violent shake, 0.8-1.0 settle
    let shake = 0;
    if (t > 0.15 && t < 0.85) shake = 1;

    // Cloud slightly wobbly
    shakeG.appendChild(drawCloud(VIEW.anchorX, VIEW.anchorY, 1.0, 1, 1));

    const sx = shake * (Math.sin(frame * 8) * 4);
    const sy = shake * (Math.cos(frame * 7) * 3);
    const bodyG = el('g', { transform: `translate(${sx} ${sy - 60})` });

    bodyG.appendChild(drawBody(0, 110, shake * 6, { showBackpackHat: true }));
    bodyG.appendChild(drawHair(-30));
    bodyG.appendChild(drawFace(0, { shocked: true, tongueOut: true, eyesClosed: false }));

    // Arms flung up panic
    bodyG.appendChild(drawArm(-38, -30, -80, -70, 1));
    bodyG.appendChild(drawArm(38, -30, 80, 70, -1));
    // Legs splayed
    bodyG.appendChild(drawLeg(-18, 60, -30, 0, 1));
    bodyG.appendChild(drawLeg(18, 60, -30, 0, -1));

    shakeG.appendChild(bodyG);

    // Vertical stress lines
    if (shake) {
      const lines = el('g');
      for (let i = -3; i <= 3; i++) {
        if (i === 0) continue;
        lines.appendChild(el('path', {
          d: `M ${VIEW.anchorX + i * 18} ${VIEW.anchorY - 180} l 0 30`,
          stroke: '#1a0f2e', 'stroke-width': 3, 'stroke-linecap': 'round',
          opacity: 0.85,
        }));
      }
      shakeG.appendChild(lines);
    }

    // "!?" popup
    if (t > 0.1) {
      const popScale = 1 + Math.sin(t * 15) * 0.08;
      const popup = el('g', {
        transform: `translate(${VIEW.anchorX + 70} ${VIEW.anchorY - 190}) scale(${popScale})`,
      });
      popup.appendChild(el('circle', {
        cx: 0, cy: 0, r: 26, fill: '#fff2a8', stroke: '#a06b1a', 'stroke-width': 2.5,
      }));
      // "!"
      popup.appendChild(el('path', {
        d: 'M -10 -8 l 3 16 M -10 12 l 3 3',
        stroke: '#1a0f2e', 'stroke-width': 3.5, fill: 'none',
        'stroke-linecap': 'round',
      }));
      popup.appendChild(el('circle', { cx: -9, cy: -4, r: 3, fill: '#1a0f2e' }));
      // "?"
      popup.appendChild(el('path', {
        d: 'M 4 -10 q 10 -2 10 6 q 0 6 -6 8 l -2 6',
        stroke: '#1a0f2e', 'stroke-width': 3.5, fill: 'none',
        'stroke-linecap': 'round',
      }));
      popup.appendChild(el('circle', { cx: 8, cy: 14, r: 2.5, fill: '#1a0f2e' }));
      shakeG.appendChild(popup);
    }
  }

  function drawStar(cx, cy, r, color) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? r : r * 0.45;
      pts.push(`${cx + Math.cos(ang) * rad},${cy + Math.sin(ang) * rad}`);
    }
    return el('polygon', {
      points: pts.join(' '), fill: color, stroke: '#a87a20', 'stroke-width': 1.2,
    });
  }

  // ====================================================================
  // MAIN LOOP
  // ====================================================================
  function render(dt, now) {
    const cfg = STATES[currentState];
    const elapsedFrame = 1000 / cfg.fps;
    if (now - lastFrameSwitch >= elapsedFrame) {
      frame = (frame + 1) % cfg.frames;
      lastFrameSwitch = now;
    }

    switch (currentState) {
      case 'idle':    renderIdle(frame, cfg.frames); break;
      case 'run':     renderRun(frame, cfg.frames); break;
      case 'success': renderSuccess(frame, cfg.frames); break;
      case 'fail':    renderFail(frame, cfg.frames); break;
    }

    // Non-looping states → auto-return to idle
    if (!cfg.loop && cfg.duration > 0) {
      if (now - stateStartedAt >= cfg.duration) {
        setState('idle');
      }
    }

    // Global drift for run state — slow overall x drift relative to stage
    // (Visual only; window itself stays put.)
    driftT += dt * (currentState === 'run' ? 0.06 : 0.015);
    charG.setAttribute(
      'transform',
      `translate(${Math.sin(driftT) * 4} ${Math.cos(driftT * 0.7) * 3})`
    );
  }

  function setState(next) {
    if (!STATES[next]) return;
    currentState = next;
    pendingState = null;
    frame = 0;
    lastFrameSwitch = performance.now();
    stateStartedAt = performance.now();
    refreshHud();
  }

  // ====================================================================
  // HUD + INPUT EVENTS
  // ====================================================================
  const hudButtons = document.querySelectorAll('#hud .btn[data-state]');
  const throughBtn = document.getElementById('throughBtn');

  function refreshHud() {
    hudButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.state === currentState);
    });
    throughBtn.textContent = clickThrough ? 'Solid' : 'Click';
  }

  hudButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setState(btn.dataset.state);
    });
  });

  throughBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clickThrough = !clickThrough;
    if (window.petAPI) window.petAPI.setClickThrough(clickThrough);
    refreshHud();
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === '1') setState('idle');
    else if (e.key === '2') setState('run');
    else if (e.key === '3') setState('success');
    else if (e.key === '4') setState('fail');
    else if (e.key.toLowerCase() === 't') {
      clickThrough = !clickThrough;
      if (window.petAPI) window.petAPI.setClickThrough(clickThrough);
      refreshHud();
    }
  });

  // Dragging to move window
  let dragging = false, lastX = 0, lastY = 0;
  petEl.addEventListener('mousedown', (e) => {
    dragging = true; lastX = e.screenX; lastY = e.screenY;
    document.body.classList.add('dragging');
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.screenX - lastX;
    const dy = e.screenY - lastY;
    lastX = e.screenX; lastY = e.screenY;
    if (window.petAPI) window.petAPI.dragWindow(dx, dy);
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    document.body.classList.remove('dragging');
  });

  refreshHud();

  // ====================================================================
  // ANIMATION LOOP
  // ====================================================================
  let lastT = performance.now();
  function loop(now) {
    const dt = now - lastT;
    lastT = now;
    render(dt, now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Expose API for external integration
  window.CodexPet = {
    startTask: () => setState('run'),
    taskSuccess: () => setState('success'),
    taskFail: () => setState('fail'),
    idle: () => setState('idle'),
    get state() { return currentState; },
  };
})();
