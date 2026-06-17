(function() {
  'use strict';

  // ============================================================
  // 祖国人 / HOMELANDER PIXEL-ART DESKTOP PET
  // Base 96x96 virtual pixels -> displayed at 4x scale = 384x384
  // ============================================================

  const STATES = {
    idle:    { frames: 14, fps: 7,  duration: 0,    loop: true  },
    run:     { frames: 18, fps: 22, duration: 0,    loop: true  },
    success: { frames: 16, fps: 12, duration: 2000, loop: false },
    fail:    { frames: 14, fps: 16, duration: 2000, loop: false },
  };

  const PIX = 96;       // virtual pixel canvas size
  const SCALE = 4;      // display scale factor

  // ---------- COLOR PALETTE ----------
  const PAL = {
    // Skin
    skinBase: '#f5c9a3', skinMid: '#e3a67a',
    skinSh:   '#a86c4a', skinHi:  '#fff1e0',
    lip:      '#c97a6a', cheek:   '#ffb0a0',

    // Eyes
    eyeWhite: '#ffffff', eyeIris: '#3a7ce0', eyeIrisHi: '#9acfff',
    eyePup:   '#0a0a14',eyeGlow: '#ff3030', eyeGlowHi: '#ff8080', eyeLaserHi: '#ffffff',
    brow:     '#5a2a1a',

    // Hair (blonde/golden slicked back)
    hairBase:  '#f4d078', hairMid: '#d9a84a', hairSh: '#8a5a1a',
    hairHi:    '#ffe7a0', hairLight: '#fff5c8',

    // Suit (Homelander blue)
    suitBase: '#1a3a9c', suitMid: '#2d5cbe', suitHi: '#4a80d4',
    suitSh:   '#0d1f5c', suitShDp: '#060e30',

    // Cape (red)
    capeBase: '#c81818', capeMid: '#e02828', capeHi: '#ff4040',
    capeSh:   '#7a0c0c', capeLine: '#3a0606', capeIn: '#6a0a0a',

    // Star emblem
    starBase: '#ffffff', starMid: '#ffe070', starSh: '#d49020',
    starHi:   '#ffffff',

    // Belt / gold trim
    goldBase: '#f0c040', goldMid: '#b88020', goldSh: '#6a4810',
    goldHi:   '#fff080',

    // Boots (red)
    bootBase: '#b81818', bootMid: '#e02828', bootHi: '#ff5050',
    bootSh:   '#5a0a0a',

    // Gloves (white with gold trim)
    gloveBase: '#ffffff', gloveMid: '#d8d0e0', gloveSh: '#8a8098',

    // Cloud platform
    cloudBase: '#ffffff', cloudMid: '#e0d8ee', cloudSh: '#a89cc4',
    cloudDark: '#5a4878', cloudHi: '#ffffff',

    // Energy / sparkles
    sparkY: '#ffe760', sparkO: '#ff9030', sparkR: '#ff4040',
    sparkW: '#ffffff', sparkB: '#9acfff',

    // Laser
    laserCore: '#fff0a0', laserMid: '#ff4040',
    laserHot: '#ff9030', laserCool: '#b02020',

    // Outline
    outline: '#1a0a14', outlineSoft: '#4a2a3a',
  };

  // ---------- PIXEL DRAWING HELPERS ----------
  function px(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  }
  function rect(ctx, x, y, w, h, color) {
    if (w <= 0 || h <= 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }
  function hline(ctx, x1, x2, y, color) {
    const a = Math.min(x1, x2), b = Math.max(x1, x2);
    ctx.fillStyle = color;
    ctx.fillRect(a, y, b - a + 1, 1);
  }
  function vline(ctx, x, y1, y2, color) {
    const a = Math.min(y1, y2), b = Math.max(y1, y2);
    ctx.fillStyle = color;
    ctx.fillRect(x, a, 1, b - a + 1);
  }
  function ellipse(ctx, cx, cy, rx, ry, color) {
    for (let y = -ry; y <= ry; y++) {
      const dx = Math.round(rx * Math.sqrt(1 - (y*y)/(ry*ry)));
      if (isNaN(dx)) continue;
      hline(ctx, cx - dx, cx + dx, cy + y, color);
    }
  }
  // Draw 5-point star at (cx,cy), radius r, outline + fill
  function drawStar(ctx, cx, cy, r, outline, fill) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI/2 + (i * Math.PI)/5;
      const rr = (i % 2 === 0) ? r : r * 0.45;
      pts.push([Math.round(cx + Math.cos(a) * rr),
                Math.round(cy + Math.sin(a) * rr)]);
    }
    // Fill: scan row by row, find intersections
    const ys = pts.map(p => p[1]);
    const ymin = Math.min(...ys), ymax = Math.max(...ys);
    for (let y = ymin; y <= ymax; y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, yy1] = pts[i];
        const [x2, yy2] = pts[(i+1) % pts.length];
        if ((yy1 <= y && yy2 > y) || (yy2 <= y && yy1 > y)) {
          const t = (y - yy1) / (yy2 - yy1);
          xs.push(Math.round(x1 + t * (x2 - x1)));
        }
      }
      xs.sort((a,b) => a - b);
      for (let i = 0; i < xs.length; i += 2) {
        if (xs[i+1] !== undefined) hline(ctx, xs[i], xs[i+1], y, fill);
      }
    }
    // Outline lines
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i+1) % pts.length];
      // Bresenham line
      let dx = Math.abs(x2-x1), dy = Math.abs(y2-y1);
      let sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
      let err = dx - dy, cx2 = x1, cy2 = y1;
      while (true) {
        px(ctx, cx2, cy2, outline);
        if (cx2 === x2 && cy2 === y2) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx2 += sx; }
        if (e2 < dx) { err += dx; cy2 += sy; }
      }
    }
  }

  // ---------- CHARACTER PARTS ----------

  // Fluffy cloud platform under feet
  function drawCloud(ctx, cx, baseY, squash, sway) {
    const bumps = [-22,-14,-4,8,18,26];
    for (let i = 0; i < bumps.length; i++) {
      const bx = cx + bumps[i] + sway;
      // Circular bumps
      for (let row = -2; row <= 3; row++) {
        const half = Math.max(0, 4 - Math.abs(row));
        hline(ctx, bx - half, bx + half, baseY + row, PAL.cloudBase);
      }
    }
    // Connecting body
    hline(ctx, cx - 30 + sway, cx + 30 + sway, baseY + 1, PAL.cloudBase);
    hline(ctx, cx - 34 + sway, cx + 34 + sway, baseY + 3, PAL.cloudBase);
    hline(ctx, cx - 36 + sway, cx + 36 + sway, baseY + 4, PAL.cloudBase);
    hline(ctx, cx - 34 + sway, cx + 34 + sway, baseY + 5, PAL.cloudMid);
    hline(ctx, cx - 30 + sway, cx + 30 + sway, baseY + 6, PAL.cloudSh);
    // Shadow underside
    hline(ctx, cx - 26 + sway, cx + 26 + sway, baseY + 7, PAL.cloudSh);
    hline(ctx, cx - 18 + sway, cx + 18 + sway, baseY + 8, PAL.cloudDark);
    // Highlights on top
    for (let i = 0; i < 5; i++) {
      px(ctx, cx - 20 + i*10 + sway, baseY - 1, PAL.cloudHi);
    }
    // Outline pixels along bottom edge
    for (let i = -3; i <= 3; i += 2) {
      px(ctx, cx + i*12 + sway, baseY + 6, PAL.outline);
    }
  }

  // Red cape - draws behind the torso
  function drawCape(ctx, cx, yTop, sway, side) {
    // side: 'both' | 'left' | 'right'
    // Cape flows down from shoulders, with waves based on sway phase

    function drawHalf(halfSide, startX) {
      // Draw as series of horizontal rows with wave shaping
      const rows = 32;
      for (let i = 0; i < rows; i++) {
        const taper = Math.max(2, 14 - Math.floor(i * 0.25));
        const wave = Math.round(Math.sin(i * 0.35 + sway) * 4);
        const xStart = startX + wave;
        const color = (i < 4) ? PAL.capeBase : (i < 12 ? PAL.capeBase : PAL.capeMid);
        hline(ctx, xStart - taper, xStart + taper, yTop + i, color);
        // Outer edge shading
        for (let j = -2; j <= 2; j += 4) {
          if (halfSide === 'right' && j === 2) px(ctx, xStart + taper, yTop + i, PAL.capeSh);
          if (halfSide === 'left'  && j === -2) px(ctx, xStart - taper, yTop + i, PAL.capeSh);
        }
        // Highlight on outer edge
        if (halfSide === 'right' && i > 2 && i < 12) px(ctx, xStart + taper - 1, yTop + i, PAL.capeHi);
        if (halfSide === 'left'  && i > 2 && i < 12) px(ctx, xStart - taper + 1, yTop + i, PAL.capeHi);
        // Outline corners
        if (i > 0 && i % 3 === 0) px(ctx, xStart + taper, yTop + i, PAL.capeLine);
      }
      // Bottom scallop of cape (rounded bottom)
      const botY = yTop + rows - 1;
      for (let i = 0; i < 8; i++) {
        const offX = startX + Math.round(Math.sin(i*0.6 + sway) * 3) + (halfSide==='right'? 1 : -1) * (8-i*2) - halfSide==='right' ? 0 : 0;
        circleFillMini(ctx, offX, botY, 3, PAL.capeBase);
      }
      // Bottom dark outline
      hline(ctx, startX - 12, startX + 12, botY + 1, PAL.capeLine);
    }

    // Simple small half-helper
    function circleFillMini(ctx, cx, cy, r, color) {
      for (let y = -r; y <= r; y++) {
        const dx = Math.round(Math.sqrt(r*r - y*y));
        hline(ctx, cx - dx, cx + dx, cy + y, color);
      }
    }

    if (side === 'both' || side === 'right') drawHalf('right', cx + 14);
    if (side === 'both' || side === 'left')  drawHalf('left', cx - 14);
  }

  // Golden blonde hair - slicked back top + sideburns
  function drawHair(ctx, faceCx, faceTop, bob) {
    const cx = faceCx;
    const topY = faceTop - 10 + bob;

    // Main rounded dome of hair
    const half = [3,5,7,9,11,13,14,15,15,14,13,12,11];
    for (let i = 0; i < half.length; i++) {
      hline(ctx, cx - half[i], cx + half[i], topY + i, PAL.hairBase);
    }
    // Top highlight crest (the curl/slicked back look)
    for (let i = 0; i < 5; i++) {
      const width = 4 - Math.abs(i - 2);
      hline(ctx, cx - width, cx + width, topY - 2 + i, PAL.hairHi);
    }
    // Top pointy curls
    px(ctx, cx,      topY - 3, PAL.hairHi);
    px(ctx, cx - 3,  topY - 1, PAL.hairLight);
    px(ctx, cx + 3,  topY - 1, PAL.hairLight);
    px(ctx, cx - 6,  topY + 1, PAL.hairLight);
    px(ctx, cx + 6,  topY + 1, PAL.hairLight);
    px(ctx, cx - 8,  topY + 2, PAL.hairHi);
    px(ctx, cx + 8,  topY + 2, PAL.hairHi);

    // Sideburns extending down past ears
    for (let i = 10; i < 18; i++) {
      px(ctx, cx - 14, topY + i, PAL.hairMid);
      px(ctx, cx + 14, topY + i, PAL.hairMid);
    }
    px(ctx, cx - 13, topY + 18, PAL.hairMid);
    px(ctx, cx + 13, topY + 18, PAL.hairMid);

    // Mid shading band across head
    for (let x = -14; x <= 14; x += 2) {
      px(ctx, cx + x, topY + 5, PAL.hairMid);
      if (x % 4 === 0) px(ctx, cx + x, topY + 7, PAL.hairMid);
    }
    // Left/right highlight stripes
    for (let y = 1; y < 10; y++) {
      px(ctx, cx - 10, topY + y, PAL.hairHi);
      px(ctx, cx + 10, topY + y, PAL.hairHi);
    }

    // Front bangs - a few wavy strands
    for (let i = 0; i < 4; i++) {
      const wave = Math.round(Math.sin(i) * 2);
      hline(ctx, cx - 8 + wave + i*4, cx - 6 + wave + i*4, topY + 6, PAL.hairHi);
    }

    // Outline along hair edges
    // Top
    px(ctx, cx,     topY - 3, PAL.outline);
    px(ctx, cx - 1, topY - 2, PAL.outline);
    px(ctx, cx + 1, topY - 2, PAL.outline);
    for (let y = 0; y <= 17; y++) {
      const hw = (y < 5) ? Math.min(14, 3 + y*2) : (y < 10 ? 14 : Math.max(4, 16 - (y-9)));
      px(ctx, cx - hw, topY + y, PAL.outline);
      px(ctx, cx + hw, topY + y, PAL.outline);
    }
    // Sideburn tips
    px(ctx, cx - 14, topY + 17, PAL.outline);
    px(ctx, cx + 14, topY + 17, PAL.outline);
  }

  // Face with expression options
  function drawFace(ctx, faceCx, faceTop, opts) {
    const { smile = true, angry = false, laser = false, eyesClosed = false } = opts;
    const cx = faceCx;

    // Oval head shape
    const hW = [5,7,9,11,13,14,14,14,13,12,11,10,9,8,7,6,5];
    for (let i = 0; i < hW.length; i++) {
      hline(ctx, cx - hW[i], cx + hW[i], faceTop + i, PAL.skinBase);
    }
    // Jawline shading (bottom rows slightly darker)
    for (let i = 12; i < hW.length; i++) {
      for (let x = -hW[i]; x <= hW[i]; x += 3) {
        if (Math.abs(x) > hW[i] - 2) px(ctx, cx + x, faceTop + i, PAL.skinMid);
      }
    }
    // Nose shadow
    for (let y = 8; y <= 10; y++) {
      px(ctx, cx - 1, faceTop + y, PAL.skinMid);
      px(ctx, cx + 2, faceTop + y, PAL.skinHi);
    }
    // Cheek blush
    for (let i = 0; i < 2; i++) {
      px(ctx, cx - 8, faceTop + 11 + i, PAL.cheek);
      px(ctx, cx - 7, faceTop + 11 + i, PAL.cheek);
      px(ctx, cx + 7, faceTop + 11 + i, PAL.cheek);
      px(ctx, cx + 8, faceTop + 11 + i, PAL.cheek);
    }

    // Outline of face
    for (let i = 0; i < hW.length; i++) {
      px(ctx, cx - hW[i] - 1, faceTop + i, PAL.outline);
      px(ctx, cx + hW[i] + 1, faceTop + i, PAL.outline);
    }
    // Chin tip
    px(ctx, cx - 2, faceTop + hW.length, PAL.outline);
    px(ctx, cx + 2, faceTop + hW.length, PAL.outline);

    // EYES
    const eyeY = faceTop + 8;
    const LE = cx - 5, RE = cx + 5;

    if (eyesClosed) {
      // Curved closed-eye lines
      for (let i = -2; i <= 2; i++) {
        if (i === 0) continue;
        px(ctx, LE + i, eyeY, PAL.outline);
        px(ctx, RE + i, eyeY, PAL.outline);
      }
      px(ctx, LE, eyeY - 1, PAL.outline);
      px(ctx, RE, eyeY - 1, PAL.outline);
    } else {
      // Eye whites
      ellipse(ctx, LE, eyeY, 2, 2, PAL.eyeWhite);
      ellipse(ctx, RE, eyeY, 2, 2, PAL.eyeWhite);

      if (laser) {
        // Red glowing eyes
        ellipse(ctx, LE, eyeY, 1, 1, PAL.eyeGlow);
        ellipse(ctx, RE, eyeY, 1, 1, PAL.eyeGlow);
        px(ctx, LE, eyeY, PAL.eyeLaserHi);
        px(ctx, RE, eyeY, PAL.eyeLaserHi);
        // Glow aura
        for (let d = -3; d <= 3; d += 2) {
          if (d === 0) continue;
          px(ctx, LE + d, eyeY, PAL.eyeGlowHi);
          px(ctx, RE + d, eyeY, PAL.eyeGlowHi);
          px(ctx, LE, eyeY + d, PAL.eyeGlowHi);
          px(ctx, RE, eyeY + d, PAL.eyeGlowHi);
        }
      } else {
        // Normal blue eyes
        ellipse(ctx, LE, eyeY, 1, 1, PAL.eyeIris);
        ellipse(ctx, RE, eyeY, 1, 1, PAL.eyeIris);
        px(ctx, LE, eyeY, PAL.eyePup); px(ctx, RE, eyeY, PAL.eyePup);
        px(ctx, LE - 1, eyeY - 1, PAL.eyeWhite);
        px(ctx, RE - 1, eyeY - 1, PAL.eyeWhite);
        px(ctx, LE, eyeY - 1, PAL.eyeIrisHi);
        px(ctx, RE, eyeY - 1, PAL.eyeIrisHi);
      }
      // Eye outline
      px(ctx, LE - 3, eyeY, PAL.outline); px(ctx, LE + 3, eyeY, PAL.outline);
      px(ctx, RE - 3, eyeY, PAL.outline); px(ctx, RE + 3, eyeY, PAL.outline);
      px(ctx, LE, eyeY - 3, PAL.outline); px(ctx, RE, eyeY - 3, PAL.outline);
      px(ctx, LE, eyeY + 3, PAL.outline); px(ctx, RE, eyeY + 3, PAL.outline);
    }

    // EYEBROWS
    const bY = faceTop + 5;
    if (angry || laser) {
      // Angled brows slanting inward down
      for (let i = 0; i < 4; i++) {
        px(ctx, LE - 2 + i, bY + (i < 2 ? 0 : 1), PAL.brow);
        px(ctx, RE - 2 + i, bY + (i > 1 ? 0 : 1), PAL.brow);
      }
    } else {
      // Gentle arc brows
      for (let i = -2; i <= 2; i++) {
        const off = Math.abs(i) < 2 ? -1 : 0;
        px(ctx, LE + i, bY + off, PAL.brow);
        px(ctx, RE + i, bY + off, PAL.brow);
      }
    }

    // MOUTH
    const mouthY = faceTop + 13;
    if (angry) {
      // Tight line
      hline(ctx, cx - 3, cx + 3, mouthY, PAL.lip);
      hline(ctx, cx - 2, cx + 2, mouthY - 1, PAL.skinBase);
      px(ctx, cx - 3, mouthY - 1, PAL.outline);
      px(ctx, cx + 3, mouthY - 1, PAL.outline);
    } else if (smile) {
      // Gentle smile curve
      hline(ctx, cx - 3, cx + 3, mouthY, PAL.lip);
      px(ctx, cx - 2, mouthY + 1, PAL.lip);
      px(ctx, cx + 2, mouthY + 1, PAL.lip);
      px(ctx, cx - 1, mouthY + 1, PAL.skinBase);
      px(ctx, cx, mouthY + 1, PAL.skinBase);
      px(ctx, cx + 1, mouthY + 1, PAL.skinBase);
      px(ctx, cx - 3, mouthY, PAL.outline);
      px(ctx, cx + 3, mouthY, PAL.outline);
    } else {
      // Neutral line
      hline(ctx, cx - 3, cx + 3, mouthY, PAL.lip);
      px(ctx, cx - 3, mouthY, PAL.outline);
      px(ctx, cx + 3, mouthY, PAL.outline);
    }
  }

  // Shoulders + collar gold epaulets
  function drawShoulders(ctx, cx, shoulderY) {
    // Shoulder caps
    for (let i = 0; i < 3; i++) {
      const half = 16 - i * 2;
      hline(ctx, cx - half, cx + half, shoulderY - 2 + i, PAL.suitBase);
    }
    // Gold epaulet (shoulder pad) on top edges
    for (let y = 0; y < 2; y++) {
      hline(ctx, cx - 20, cx - 12, shoulderY - 2 + y, PAL.goldBase);
      hline(ctx, cx + 12, cx + 20, shoulderY - 2 + y, PAL.goldBase);
      // Shading on gold
      px(ctx, cx - 20, shoulderY - 2 + y, PAL.goldMid);
      px(ctx, cx + 20, shoulderY - 2 + y, PAL.goldMid);
      // Highlights
      if (y === 0) {
        hline(ctx, cx - 19, cx - 17, shoulderY - 2, PAL.goldHi);
        hline(ctx, cx + 17, cx + 19, shoulderY - 2, PAL.goldHi);
      }
    }
    // Epaulet outlines
    px(ctx, cx - 21, shoulderY - 2, PAL.outline);
    px(ctx, cx + 21, shoulderY - 2, PAL.outline);
    px(ctx, cx - 21, shoulderY, PAL.outline);
    px(ctx, cx + 21, shoulderY, PAL.outline);
    px(ctx, cx - 11, shoulderY - 2, PAL.outline);
    px(ctx, cx + 11, shoulderY - 2, PAL.outline);

    // Gold V-neck collar lines
    for (let i = 0; i < 4; i++) {
      px(ctx, cx - 5 + i, shoulderY + i + 1, PAL.goldBase);
      px(ctx, cx + 4 - i, shoulderY + i + 1, PAL.goldBase);
    }
    // V neck skin visible
    for (let i = 0; i < 3; i++) {
      hline(ctx, cx - 3 + i, cx + 3 - i, shoulderY + i + 1, PAL.skinBase);
    }
  }

  // Torso: blue suit body with star emblem + gold belt
  function drawTorso(ctx, cx, torsoTop, torsoH, opts) {
    const { showStar = true, lift = 0 } = opts;

    // Trapezoid torso - wider at top, narrows at waist
    const topH = 15, botH = 12;
    for (let i = 0; i < torsoH; i++) {
      const t = i / torsoH;
      const half = Math.round(topH + (botH - topH) * t);
      hline(ctx, cx - half, cx + half, torsoTop + i - lift, PAL.suitBase);
      // Outline
      px(ctx, cx - half - 1, torsoTop + i - lift, PAL.outline);
      px(ctx, cx + half + 1, torsoTop + i - lift, PAL.outline);
      // Side shading
      px(ctx, cx - half, torsoTop + i - lift, PAL.suitSh);
      px(ctx, cx + half, torsoTop + i - lift, PAL.suitSh);
      // Mid shading
      px(ctx, cx - 1, torsoTop + i - lift, PAL.suitMid);
      px(ctx, cx + 1, torsoTop + i - lift, PAL.suitMid);
    }
    // Highlights (right side of body, lit from upper right)
    for (let i = 2; i < 10; i++) {
      const t = i / torsoH;
      const half = Math.round(topH + (botH - topH) * t);
      px(ctx, cx + half - 2, torsoTop + i - lift, PAL.suitHi);
    }

    // Chest star emblem
    if (showStar) {
      const starY = torsoTop + 6 - lift;
      // Glow halo
      for (let d = 0; d < 10; d += 2) {
        const a = (d / 10) * Math.PI * 2;
        px(ctx, cx + Math.round(Math.cos(a) * 10),
            starY + Math.round(Math.sin(a) * 7), PAL.starMid);
      }
      drawStar(ctx, cx, starY, 8, PAL.goldSh, PAL.starBase);
      // Center highlight
      px(ctx, cx, starY, PAL.starHi);
      px(ctx, cx - 1, starY, PAL.starBase);
      px(ctx, cx + 1, starY, PAL.starBase);
      // Tiny extra shimmer
      px(ctx, cx - 2, starY - 1, PAL.starHi);
      px(ctx, cx + 1, starY - 2, PAL.starHi);
    }

    // Gold belt
    const beltY = torsoTop + torsoH - 2 - lift;
    for (let row = 0; row < 3; row++) {
      hline(ctx, cx - 16, cx + 16, beltY + row, PAL.goldBase);
    }
    // Belt shading
    hline(ctx, cx - 16, cx + 16, beltY, PAL.goldMid);
    hline(ctx, cx - 16, cx + 16, beltY + 3, PAL.outline);
    hline(ctx, cx - 16, cx + 16, beltY - 1, PAL.outline);
    // Belt buckle
    rect(ctx, cx - 3, beltY, 7, 3, PAL.starBase);
    rect(ctx, cx - 4, beltY - 1, 9, 1, PAL.outline);
    rect(ctx, cx - 4, beltY + 2, 9, 1, PAL.outline);
    px(ctx, cx - 4, beltY, PAL.outline);
    px(ctx, cx + 4, beltY, PAL.outline);
    px(ctx, cx - 4, beltY + 1, PAL.outline);
    px(ctx, cx + 4, beltY + 1, PAL.outline);
    // Buckle highlight
    px(ctx, cx - 1, beltY, PAL.starHi);
    px(ctx, cx, beltY, PAL.starHi);
    // Shimmer dots on belt
    for (let i = -14; i <= 14; i += 3) {
      px(ctx, cx + i, beltY + 1, PAL.goldHi);
    }
  }

  // Arms: blue sleeves ending in white gloves with gold trim
  // pose: 'down', 'up', 'forward', 'back', 'wave', 'bent'
  function drawArm(ctx, shoulderX, shoulderY, pose, bend) {
    const sleeveLen = pose === 'down' ? 18 : (pose === 'up' ? 16 : 14);
    let dx = 0, dy = 0;
    if (pose === 'forward') dy = 0;
    if (pose === 'back') dy = 0;
    if (pose === 'up') dy = -1;
    if (pose === 'wave') dy = 0;
    if (pose === 'bent') dy = 0;

    // Draw arm as series of segments (sleeve)
    for (let i = 0; i < sleeveLen; i++) {
      const bendX = pose === 'forward' ? Math.round(i * 0.2) :
                   (pose === 'back' ? -Math.round(i * 0.15) :
                   (pose === 'up' ? Math.round(Math.sin(i*0.3)*1) :
                   (pose === 'wave' ? Math.round(Math.sin(i*0.4)*2) : 0)));
      const bendY = pose === 'up' ? -i : (pose === 'wave' ? -i*0.6 : i);

      const segColor = (i < 4) ? PAL.suitBase : PAL.suitBase;
      rect(ctx, shoulderX + bendX - 2, shoulderY + Math.round(bendY), 4, 1, segColor);
      px(ctx, shoulderX + bendX - 3, shoulderY + Math.round(bendY), PAL.suitSh);
      px(ctx, shoulderX + bendX + 2, shoulderY + Math.round(bendY), PAL.suitMid);
    }

    // White glove at end of arm
    let gx, gy;
    if (pose === 'up') { gx = shoulderX - 2; gy = shoulderY - sleeveLen + 1; }
    else if (pose === 'wave') { gx = shoulderX - 2; gy = shoulderY - sleeveLen/2 - 2; }
    else if (pose === 'forward') { gx = shoulderX + 4; gy = shoulderY + sleeveLen - 2; }
    else if (pose === 'back') { gx = shoulderX - 5; gy = shoulderY + sleeveLen - 2; }
    else if (pose === 'bent') { gx = shoulderX - 2; gy = shoulderY + sleeveLen - 2; }
    else { gx = shoulderX - 3; gy = shoulderY + sleeveLen; }

    // Glove (small rounded rectangle)
    for (let i = 0; i < 5; i++) {
      const half = (i === 0 || i === 4) ? 2 : 3;
      hline(ctx, gx - half, gx + half, gy + i, PAL.gloveBase);
    }
    // Gold trim at wrist (top of glove)
    hline(ctx, gx - 3, gx + 3, gy, PAL.goldBase);
    // Glove shading
    rect(ctx, gx - 3, gy + 4, 7, 1, PAL.gloveMid);
    // Outline
    for (let i = 0; i < 5; i++) {
      const half = (i === 0 || i === 4) ? 2 : 3;
      px(ctx, gx - half - 1, gy + i, PAL.outline);
      px(ctx, gx + half + 1, gy + i, PAL.outline);
    }
    hline(ctx, gx - 3, gx + 3, gy - 1, PAL.outline);
    hline(ctx, gx - 3, gx + 3, gy + 5, PAL.outline);
    // Fingers hint (3 vertical pixel lines at bottom)
    px(ctx, gx - 2, gy + 5, PAL.outline);
    px(ctx, gx, gy + 5, PAL.outline);
    px(ctx, gx + 2, gy + 5, PAL.outline);
  }

  function drawArms(ctx, cx, shoulderY, pose) {
    if (pose === 'idle') {
      drawArm(ctx, cx - 15, shoulderY, 'down');
      drawArm(ctx, cx + 15, shoulderY, 'down');
    } else if (pose === 'run') {
      drawArm(ctx, cx - 15, shoulderY, 'forward');
      drawArm(ctx, cx + 15, shoulderY, 'back');
    } else if (pose === 'celebrate') {
      drawArm(ctx, cx - 17, shoulderY, 'up');
      drawArm(ctx, cx + 17, shoulderY, 'wave');
    } else if (pose === 'angry') {
      drawArm(ctx, cx - 16, shoulderY, 'up');
      drawArm(ctx, cx + 16, shoulderY, 'up');
    } else if (pose === 'handsUp') {
      drawArm(ctx, cx - 16, shoulderY, 'up');
      drawArm(ctx, cx + 16, shoulderY, 'up');
    }
  }

  // Legs: blue pants -> red boots with gold trim
  function drawLegs(ctx, cx, legsTop, pose, phaseShift) {
    // Pose: 'stand' | 'runL' | 'runR' | 'jump' | 'wide'
    function drawOneLeg(legX, legY, poseType, bend) {
      if (poseType === 'stand') {
        // Upper pants
        for (let i = 0; i < 10; i++) {
          rect(ctx, legX - 4, legY + i, 8, 1, PAL.suitBase);
          px(ctx, legX - 4, legY + i, PAL.suitSh);
          px(ctx, legX + 3, legY + i, PAL.suitMid);
        }
        // Lower pants slightly narrower
        for (let i = 10; i < 16; i++) {
          rect(ctx, legX - 3, legY + i, 6, 1, PAL.suitBase);
          px(ctx, legX - 3, legY + i, PAL.suitSh);
          px(ctx, legX + 2, legY + i, PAL.suitMid);
        }
        // Boot
        const bootY = legY + 16;
        rect(ctx, legX - 4, bootY, 8, 5, PAL.bootBase);
        rect(ctx, legX - 5, bootY + 3, 10, 3, PAL.bootBase);
        // Boot shading
        for (let i = 0; i < 4; i++) {
          px(ctx, legX - 5, bootY + i, PAL.bootSh);
          px(ctx, legX + 4, bootY + i, PAL.bootSh);
        }
        // Boot highlight
        px(ctx, legX + 1, bootY + 1, PAL.bootHi);
        px(ctx, legX + 2, bootY + 2, PAL.bootHi);
        // Gold trim at top of boot
        hline(ctx, legX - 4, legX + 3, bootY, PAL.goldBase);
        // Outline
        for (let i = 0; i < 5; i++) {
          px(ctx, legX - 5, bootY + i, PAL.outline);
          px(ctx, legX + 4, bootY + i, PAL.outline);
        }
        hline(ctx, legX - 5, legX + 4, bootY + 5, PAL.outline);
        // Sole dark row
        hline(ctx, legX - 5, legX + 4, bootY + 4, PAL.bootSh);
        // Leg outline for pants section
        for (let i = 0; i < 16; i++) {
          const half = (i < 10) ? 4 : 3;
          px(ctx, legX - half - 1, legY + i, PAL.outline);
          px(ctx, legX + half, legY + i, PAL.outline);
        }
      } else if (poseType === 'runForward') {
        // Leg bent forward - stepping out
        for (let i = 0; i < 7; i++) {
          rect(ctx, legX - 3 + Math.round(i*0.2), legY + i, 6, 1, PAL.suitBase);
        }
        // Shin goes lower and outward
        for (let i = 7; i < 13; i++) {
          rect(ctx, legX - 2 + (i-6)*2, legY + i, 5, 1, PAL.suitBase);
        }
        // Boot at end
        const bootY = legY + 13;
        rect(ctx, legX + 8, bootY - 2, 10, 4, PAL.bootBase);
        // Gold trim on boot
        hline(ctx, legX + 8, bootY - 2, bootY - 2 ? legX + 9 : legX + 8, PAL.goldBase);
        hline(ctx, legX + 8, legX + 17, bootY - 2, PAL.goldBase);
        // Boot outline and shading
        for (let i = 0; i < 4; i++) {
          px(ctx, legX + 7, bootY - 2 + i, PAL.outline);
          px(ctx, legX + 18, bootY - 2 + i, PAL.outline);
        }
        hline(ctx, legX + 7, legX + 18, bootY + 2, PAL.outline);
        px(ctx, legX + 15, bootY - 1, PAL.bootHi);
        px(ctx, legX + 12, bootY, PAL.bootHi);
      } else if (poseType === 'runBack') {
        // Leg bent back - trailing behind
        for (let i = 0; i < 6; i++) {
          rect(ctx, legX + 2 - Math.round(i*0.2), legY + i, 6, 1, PAL.suitBase);
        }
        for (let i = 6; i < 11; i++) {
          rect(ctx, legX - 3 - (i-5)*2, legY + i, 5, 1, PAL.suitBase);
        }
        // Boot
        const bootY = legY + 11;
        rect(ctx, legX - 18, bootY - 2, 10, 4, PAL.bootBase);
        hline(ctx, legX - 18, legX - 9, bootY - 2, PAL.goldBase);
        for (let i = 0; i < 4; i++) {
          px(ctx, legX - 19, bootY - 2 + i, PAL.outline);
          px(ctx, legX - 9, bootY - 2 + i, PAL.outline);
        }
        hline(ctx, legX - 19, legX - 8, bootY + 2, PAL.outline);
      } else if (poseType === 'jump') {
        // Legs bent up/together
        for (let i = 0; i < 5; i++) {
          rect(ctx, legX - 4, legY + i, 8, 1, PAL.suitBase);
        }
        // Bent section going outward
        for (let i = 5; i < 8; i++) {
          rect(ctx, legX - 3 + (i-4)*2, legY + i, 6, 1, PAL.suitBase);
        }
        // Boot
        const bootY = legY + 8;
        rect(ctx, legX + 4, bootY, 8, 4, PAL.bootBase);
        hline(ctx, legX + 4, legX + 11, bootY, PAL.goldBase);
        for (let i = 0; i < 4; i++) {
          px(ctx, legX + 3, bootY + i, PAL.outline);
          px(ctx, legX + 12, bootY + i, PAL.outline);
        }
        hline(ctx, legX + 3, legX + 12, bootY + 4, PAL.outline);
      }
    }

    // Two legs with phase-based poses
    if (pose === 'stand') {
      drawOneLeg(cx - 7, legsTop, 'stand', 0);
      drawOneLeg(cx + 7, legsTop, 'stand', 0);
    } else if (pose === 'run') {
      const phase = phaseShift;
      if (phase >= 0) {
        drawOneLeg(cx - 7, legsTop, 'runForward', 0);
        drawOneLeg(cx + 7, legsTop, 'runBack', 0);
      } else {
        drawOneLeg(cx - 7, legsTop, 'runBack', 0);
        drawOneLeg(cx + 7, legsTop, 'runForward', 0);
      }
    } else if (pose === 'jump') {
      drawOneLeg(cx - 6, legsTop, 'jump', 0);
      drawOneLeg(cx + 6, legsTop, 'jump', 0);
    } else if (pose === 'wide') {
      drawOneLeg(cx - 10, legsTop, 'stand', 0);
      drawOneLeg(cx + 10, legsTop, 'stand', 0);
    }
  }

  // Laser beams from eyes (for fail/attack state)
  function drawLaserBeams(ctx, faceCx, faceTop, frame) {
    const LE = faceCx - 5, RE = faceCx + 5;
    const eyeY = faceTop + 8;

    // Two beams going down-right and down-left (classic superhero style)
    // Beam 1 from left eye, going down-right
    // Beam 2 from right eye, going down-left
    // Length pulses with frame
    const baseLen = 40 + (frame % 6) * 3;

    function drawBeam(startX, startY, dirX, dirY, length) {
      for (let i = 0; i < length; i++) {
        const bx = startX + Math.round(dirX * i);
        const by = startY + Math.round(dirY * i);
        // Core bright
        px(ctx, bx, by, PAL.laserCore);
        // Surrounding hot glow (alternating pixels)
        if (i % 2 === 0) {
          px(ctx, bx - 1, by, PAL.laserHot);
          px(ctx, bx + 1, by, PAL.laserHot);
          px(ctx, bx, by - 1, PAL.laserHot);
          px(ctx, bx, by + 1, PAL.laserHot);
        }
        // Flickering edge
        if (i % 3 === 0 && frame % 2 === 0) {
          px(ctx, bx - 2, by, PAL.laserMid);
          px(ctx, bx + 2, by, PAL.laserMid);
        }
      }
      // Beam end flash
      const endX = startX + Math.round(dirX * length);
      const endY = startY + Math.round(dirY * length);
      for (let d = 0; d < 3; d++) {
        circleFillMini(ctx, endX, endY, 3 - d, d === 0 ? PAL.laserCore : d === 1 ? PAL.laserHot : PAL.laserMid);
      }
    }

    function circleFillMini(ctx, cx, cy, r, color) {
      for (let y = -r; y <= r; y++) {
        const dx = Math.round(Math.sqrt(r*r - y*y));
        hline(ctx, cx - dx, cx + dx, cy + y, color);
      }
    }

    // Beam 1: from left eye, down-right
    drawBeam(LE, eyeY, 0.75, 1.0, baseLen);
    // Beam 2: from right eye, down-left
    drawBeam(RE, eyeY, -0.75, 1.0, baseLen);
  }

  // ============================================================
  // STATE RENDERERS - each renders one complete frame
  // ============================================================

  function renderIdleFrame(ctx, frame, total) {
    const t = frame / total;
    const bob = Math.round(Math.sin(t * Math.PI * 2) * 1);
    const sway = Math.round(Math.sin(t * Math.PI * 2) * 2);
    const blink = (frame === Math.floor(total * 0.75)) || (frame === Math.floor(total * 0.75) + 1);

    // Cloud
    drawCloud(ctx, 48, 88, 0, sway);
    // Cape behind body
    drawCape(ctx, 48, 48, sway + t*2, 'both');
    // Legs (standing)
    drawLegs(ctx, 48, 60, 'stand', 0);
    // Torso + belt
    drawTorso(ctx, 48, 34, 26, { showStar: true, lift: bob });
    // Shoulders + collar gold
    drawShoulders(ctx, 48, 34 + bob);
    // Arms down at sides
    drawArms(ctx, 48, 34 + bob, 'idle');
    // Face
    drawFace(ctx, 48, 18 + bob, { smile: true, eyesClosed: blink });
    // Hair on top
    drawHair(ctx, 48, 18, bob);
  }

  function renderRunFrame(ctx, frame, total) {
    const t = frame / total;
    const cycle = t * Math.PI * 2;
    const bob = Math.abs(Math.round(Math.sin(cycle) * 2));
    const lean = Math.round(Math.sin(cycle) * 1.5);
    const capeSway = cycle * 1.5 + Math.PI;

    // Motion streaks (speed lines behind body)
    for (let i = 0; i < 8; i++) {
      const sY = 40 + i * 6;
      const sX = 10 + (frame * 2 + i * 3) % 8;
      hline(ctx, sX, sX + 6, sY, PAL.cloudMid);
    }
    // Extra dust puffs on cloud
    drawCloud(ctx, 48, 88 + bob, 1, 0);
    // Dust particles
    for (let i = 0; i < 6; i++) {
      px(ctx, 15 + (i * 5 + frame * 2) % 20, 90 - i, PAL.cloudSh);
      px(ctx, 85 - (i * 5 + frame * 2) % 20, 90 - i, PAL.cloudSh);
    }

    // Cape flowing back
    drawCape(ctx, 48 + lean, 48 - bob, capeSway, 'both');
    // Legs - alternating run pose
    drawLegs(ctx, 48 + lean, 60 - bob, 'run', Math.sin(cycle));
    // Torso tilted forward
    drawTorso(ctx, 48 + lean, 34 - bob, 26, { showStar: true, lift: 0 });
    drawShoulders(ctx, 48 + lean, 34 - bob);
    // Arms swinging opposite to legs
    drawArms(ctx, 48 + lean, 34 - bob, 'run');
    // Face (determined, focused)
    drawFace(ctx, 48 + lean, 18 - bob, { smile: false, angry: false });
    drawHair(ctx, 48 + lean, 18, -bob + lean);
  }

  function renderSuccessFrame(ctx, frame, total) {
    const t = frame / total;
    const rise = Math.round(Math.min(t * 4, 1.5) * -3);  // rise up
    const bob = Math.round(Math.sin(t * Math.PI * 6) * 1);
    const sparklePhase = t * Math.PI * 4;

    // Cloud (slightly squashed from jump)
    drawCloud(ctx, 48, 88, 1, Math.round(Math.sin(t*6)*3));

    // Energy ring around character feet (rising aura)
    const auraY = 70 + rise;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + sparklePhase;
      const rx = Math.round(Math.cos(a) * 28);
      const ry = Math.round(Math.sin(a) * 8);
      if (Math.abs(ry) < 4) {
        const col = (i % 3 === 0) ? PAL.sparkY : PAL.sparkW;
        px(ctx, 48 + rx, auraY + ry, col);
        px(ctx, 48 - rx, auraY - ry, PAL.sparkW);
      }
    }

    // Cape billowing out
    drawCape(ctx, 48, 48 + rise, t * 6 + Math.PI, 'both');
    // Legs - slight jump
    drawLegs(ctx, 48, 60 + rise + bob, 'jump', 0);
    // Torso
    drawTorso(ctx, 48, 34 + rise + bob, 26, { showStar: true, lift: 0 });
    // Shoulders
    drawShoulders(ctx, 48, 34 + rise + bob);
    // Arms up celebrating
    drawArms(ctx, 48, 34 + rise + bob, 'celebrate');
    // Happy face - eyes closed smile
    drawFace(ctx, 48, 18 + rise + bob, { smile: true, eyesClosed: true });
    drawHair(ctx, 48, 18, rise + bob);

    // Sparkle stars around head
    const starCount = 8;
    for (let i = 0; i < starCount; i++) {
      const a = (i / starCount) * Math.PI * 2 + sparklePhase;
      const r = 18 + Math.sin(sparklePhase + i) * 3;
      const sx = 48 + Math.round(Math.cos(a) * r * 1.2);
      const sy = 12 + rise + bob + Math.round(Math.sin(a) * r * 0.7);
      // Draw small sparkle (3x3 cross style)
      px(ctx, sx, sy, PAL.sparkY);
      px(ctx, sx - 1, sy, PAL.sparkW);
      px(ctx, sx + 1, sy, PAL.sparkW);
      px(ctx, sx, sy - 1, PAL.sparkW);
      px(ctx, sx, sy + 1, PAL.sparkW);
      // Add tiny golden dots on each sparkle
      if (frame % 2 === 0) px(ctx, sx + 1, sy - 1, PAL.goldHi);
    }
    // "V" sign / finger hints (extra sparkles near raised hand)
    for (let i = 0; i < 3; i++) {
      const sx = 30 + Math.round(Math.sin(sparklePhase + i) * 5);
      const sy = 18 + rise + bob - 18 + i * 2;
      px(ctx, sx, sy, PAL.sparkY);
      px(ctx, sx - 1, sy + 1, PAL.sparkW);
    }
  }

  function renderFailFrame(ctx, frame, total) {
    const t = frame / total;
    const shake = Math.round(Math.sin(frame * 3) * 2);
    const bodyRise = Math.round(Math.sin(t * Math.PI) * 1);

    // Glowing aura (red energy around character)
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + frame * 0.2;
      const rx = 48 + shake + Math.round(Math.cos(a) * 36);
      const ry = 60 + Math.round(Math.sin(a) * 28);
      if (frame % 2 === 0 || i % 2 === 0) {
        px(ctx, rx, ry, PAL.sparkR);
      } else {
        px(ctx, rx, ry, PAL.sparkO);
      }
    }

    // Cloud (normal but shifted)
    drawCloud(ctx, 48 + shake, 88, 0, shake);

    // Cape flaring out angrily
    drawCape(ctx, 48 + shake, 48 + bodyRise, Math.PI + shake * 0.5, 'both');
    // Legs - wide stance
    drawLegs(ctx, 48 + shake, 60 + bodyRise, 'wide', 0);
    // Torso
    drawTorso(ctx, 48 + shake, 34 + bodyRise, 26, { showStar: true, lift: 0 });
    drawShoulders(ctx, 48 + shake, 34 + bodyRise);
    // Arms raised angrily (fists)
    drawArms(ctx, 48 + shake, 34 + bodyRise, 'angry');
    // Face - angry with glowing laser eyes
    drawFace(ctx, 48 + shake, 18 + bodyRise, { angry: true, laser: true, smile: false });
    drawHair(ctx, 48 + shake, 18, bodyRise);

    // Laser beams from eyes (on alternating frames to simulate pulse)
    if (frame % 2 === 0) {
      drawLaserBeams(ctx, 48 + shake, 18 + bodyRise, frame);
    } else {
      // Narrower laser beams
      drawLaserBeams(ctx, 48 + shake, 18 + bodyRise, frame);
    }

    // Red angry marks (little angled ticks around head)
    const marks = [
      [30, 14], [32, 12], [64, 14], [66, 12], [32, 44], [64, 44]
    ];
    for (const [mx, my] of marks) {
      px(ctx, mx, my, PAL.sparkR);
      px(ctx, mx - 1, my, PAL.sparkO);
      px(ctx, mx + 1, my, PAL.sparkO);
      px(ctx, mx, my - 1, PAL.sparkR);
    }
  }

  // ============================================================
  // DISPLAY & ANIMATION LOOP
  // ============================================================

  const petEl = document.getElementById('pet');
  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = PIX * SCALE;
  displayCanvas.height = PIX * SCALE;
  displayCanvas.style.width = (PIX * SCALE) + 'px';
  displayCanvas.style.height = (PIX * SCALE) + 'px';
  displayCanvas.style.imageRendering = 'pixelated';
  displayCanvas.style.imageRendering = '-moz-crisp-edges';
  petEl.appendChild(displayCanvas);

  const dctx = displayCanvas.getContext('2d');
  dctx.imageSmoothingEnabled = false;

  // Offscreen canvas for pixel drawing (low-res)
  const off = document.createElement('canvas');
  off.width = PIX;
  off.height = PIX;
  const octx = off.getContext('2d');
  octx.imageSmoothingEnabled = false;

  let currentState = 'idle';
  let frame = 0;
  let lastFrameSwitch = performance.now();
  let stateStartedAt = performance.now();

  function drawOneFrame(dt, now) {
    const cfg = STATES[currentState];
    const elapsed = now - lastFrameSwitch;
    if (elapsed >= 1000 / cfg.fps) {
      frame = (frame + 1) % cfg.frames;
      lastFrameSwitch = now;
    }

    // Clear offscreen
    octx.clearRect(0, 0, PIX, PIX);

    // Draw character state
    if (currentState === 'idle')    renderIdleFrame(octx, frame, cfg.frames);
    if (currentState === 'run')     renderRunFrame(octx, frame, cfg.frames);
    if (currentState === 'success') renderSuccessFrame(octx, frame, cfg.frames);
    if (currentState === 'fail')    renderFailFrame(octx, frame, cfg.frames);

    // Scale-blit to display canvas (nearest neighbor to preserve pixel look)
    dctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    dctx.drawImage(off, 0, 0, PIX, PIX, 0, 0, displayCanvas.width, displayCanvas.height);

    // Auto-cycle non-looping states back to idle
    if (!cfg.loop && cfg.duration > 0) {
      if (now - stateStartedAt >= cfg.duration) setState('idle');
    }
  }

  function setState(next) {
    if (!STATES[next]) return;
    currentState = next;
    frame = 0;
    lastFrameSwitch = performance.now();
    stateStartedAt = performance.now();
    refreshHud();
  }

  // ============================================================
  // HUD & INPUT
  // ============================================================
  const hudButtons = document.querySelectorAll('#hud .btn[data-state]');
  const throughBtn = document.getElementById('throughBtn');

  function refreshHud() {
    hudButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.state === currentState);
    });
    throughBtn.textContent = clickThrough ? 'SOLID' : 'CLICK';
  }

  let clickThrough = false;

  hudButtons.forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      setState(btn.dataset.state);
    });
  });

  throughBtn.addEventListener('click', e => {
    e.stopPropagation();
    clickThrough = !clickThrough;
    if (window.petAPI) window.petAPI.setClickThrough(clickThrough);
    refreshHud();
  });

  // Keyboard: 1=idle 2=run 3=success 4=fail T=toggle click-through
  window.addEventListener('keydown', e => {
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

  // Dragging to move window (calls Electron preload API)
  let dragging = false, lastX = 0, lastY = 0;
  petEl.addEventListener('mousedown', e => {
    dragging = true;
    lastX = e.screenX;
    lastY = e.screenY;
    document.body.classList.add('dragging');
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = e.screenX - lastX;
    const dy = e.screenY - lastY;
    lastX = e.screenX;
    lastY = e.screenY;
    if (window.petAPI) window.petAPI.dragWindow(dx, dy);
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    document.body.classList.remove('dragging');
  });

  refreshHud();

  // ============================================================
  // MAIN LOOP
  // ============================================================
  function loop(now) {
    drawOneFrame(0, now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // External API for Codex integration
  window.CodexPet = {
    startTask:    () => setState('run'),
    taskSuccess:  () => setState('success'),
    taskFail:     () => setState('fail'),
    idle:         () => setState('idle'),
    get state()   { return currentState; },
  };

})();
