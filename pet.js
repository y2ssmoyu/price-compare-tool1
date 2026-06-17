(() => {
  'use strict';

  // ====================================================================
  // CONFIG
  // ====================================================================
  const STATES = {
    idle:    { frames: 8,  loop: true,  fps: 6,  duration: 0 },
    run:     { frames: 12, loop: true,  fps: 18, duration: 0 },
    success: { frames: 10, loop: false, fps: 12, duration: 1500 },
    fail:    { frames: 8,  loop: false, fps: 12, duration: 1500 },
  };

  // Pixel-art base size (the "virtual canvas")
  const SPRITE_W = 64;
  const SPRITE_H = 64;
  // Scale factor for display
  const SCALE = 5;
  const DISPLAY_W = SPRITE_W * SCALE; // 320
  const DISPLAY_H = SPRITE_H * SCALE; // 320

  // Pixel-art palette
  const PAL = {
    outline:  '#2a1845',
    hair:     '#ffffff',
    hairSh:   '#d8c8f0',
    hairSh2:  '#b8a8d0',
    skin:     '#f4c9a8',
    skinSh:   '#d9a878',
    eyeWhite: '#ffffff',
    eyeIris:  '#b03040',
    eyePupil: '#1a0f2e',
    cheek:    '#ff98b8',
    mouth:    '#5a2a45',
    tongue:   '#ff7a9a',
    coat:     '#ffffff',
    coatSh:   '#e8d8f8',
    coatLine: '#b8a8d0',
    sash:     '#9050d0',
    sashSh:   '#6020a0',
    straw:    '#d9a860',
    strawSh:  '#8c6030',
    scar:     '#b85450',
    cloud:    '#ffffff',
    cloudSh:  '#d8c8f0',
    cloudSh2: '#b8a8d0',
    sparkle:  '#ffd94d',
    sparkleSh:'#b08020',
    stress:   '#1a0f2e',
    bg:       null,
  };

  // ====================================================================
  // PIXEL-ART DRAWING HELPERS
  // Each helper draws at the low-resolution (SPRITE_W x SPRITE_H)
  // coordinate system. These primitives combined produce a complete
  // character sprite (one frame).
  // ====================================================================
  function px(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  }
  function pxRect(ctx, x, y, w, h, color) {
    if (w <= 0 || h <= 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }
  function pxHLine(ctx, x1, x2, y, color) {
    const a = Math.min(x1, x2), b = Math.max(x1, x2);
    pxRect(ctx, a, y, b - a + 1, 1, color);
  }
  function pxVLine(ctx, x, y1, y2, color) {
    const a = Math.min(y1, y2), b = Math.max(y1, y2);
    pxRect(ctx, x, a, 1, b - a + 1, color);
  }
  // Pixel ellipse (rounded rect-style, axis aligned)
  function pxEllipse(ctx, cx, cy, rx, ry, color) {
    for (let y = -ry; y <= ry; y++) {
      const dx = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
      if (isNaN(dx)) continue;
      for (let x = -dx; x <= dx; x++) {
        px(ctx, cx + x, cy + y, color);
      }
    }
  }
  function pxCircle(ctx, cx, cy, r, color) {
    pxEllipse(ctx, cx, cy, r, r, color);
  }
  // Pixel outline of ellipse (edge only)
  function pxEllipseStroke(ctx, cx, cy, rx, ry, color) {
    for (let y = -ry; y <= ry; y++) {
      const dx = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
      if (isNaN(dx)) continue;
      px(ctx, cx - dx, cy + y, color);
      px(ctx, cx + dx, cy + y, color);
    }
    for (let x = -rx; x <= rx; x++) {
      const dy = Math.round(ry * Math.sqrt(1 - (x * x) / (rx * rx)));
      if (isNaN(dy)) continue;
      px(ctx, cx + x, cy - dy, color);
      px(ctx, cx + x, cy + dy, color);
    }
  }
  // Rectangle outline
  function pxRectStroke(ctx, x, y, w, h, color) {
    pxHLine(ctx, x, x + w - 1, y, color);
    pxHLine(ctx, x, x + w - 1, y + h - 1, color);
    pxVLine(ctx, x, y, y + h - 1, color);
    pxVLine(ctx, x + w - 1, y, y + h - 1, color);
  }

  // ====================================================================
  // CHARACTER PARTS (drawn as complete pixel-art regions)
  //
  // drawCloud  - fluffy cloud platform under feet
  // drawHair   - big fluffy cloud-like white hair on top
  // drawFace   - oval head with eyes + mouth (opts for expression)
  // drawBody   - white coat + purple sash
  // drawArms   - left + right arms (at pose positions)
  // drawLegs   - legs + sandals (at pose positions)
  //
  // Each function draws pixels into the frame at its designated area
  // relative to the 64x64 character canvas (NOT separate world coords).
  // ====================================================================

  function drawCloud(ctx, squash, stretch, shakeX, baseY) {
    // baseY = top row of cloud. Cloud drawn from baseY down.
    // squash: 0 normal, -1 narrow, +1 wide
    const by = baseY;
    const cx = 32 + shakeX;
    const rowColor = (topY, widthLeft, widthRight, color) => {
      pxHLine(ctx, cx - widthLeft, cx + widthRight - 1, topY, color);
    };
    // Cloud shape — stacked horizontal rows, bumpy top
    const top = [
      // y, leftW, rightW, color
      [by,     4, 4, PAL.cloud],  // small peak center
      [by + 1, 6, 7, PAL.cloud],
      [by + 2, 9, 9, PAL.cloud],
    ];
    for (const [y, lw, rw, col] of top) rowColor(y, lw, rw, col);
    // Main body
    for (let i = 0; i < 3; i++) {
      rowColor(by + 3 + i, 14 + stretch, 14 + stretch, PAL.cloud);
    }
    // Fluffy bumps on top row (little puffs)
    for (let i = 0; i < 3; i++) {
      pxCircle(ctx, cx - 10 + i * 10, by, 2, PAL.cloud);
    }
    pxCircle(ctx, cx - 15, by + 1, 2, PAL.cloud);
    pxCircle(ctx, cx + 15, by + 1, 2, PAL.cloud);
    // Shadow row at bottom of cloud
    rowColor(by + 6, 14 + stretch, 14 + stretch, PAL.cloudSh);
    rowColor(by + 6, 10 + stretch, 10 + stretch, PAL.cloud); // peek through middle
    // Little bottom curve ends
    pxHLine(ctx, cx - 18 - stretch, cx - 14 - stretch, by + 4, PAL.cloud);
    pxHLine(ctx, cx + 14 + stretch, cx + 18 + stretch, by + 4, PAL.cloud);
    // Outline / darker edges
    pxHLine(ctx, cx - 18 - stretch, cx - 15 - stretch, by + 5, PAL.cloudSh);
    pxHLine(ctx, cx + 15 + stretch, cx + 18 + stretch, by + 5, PAL.cloudSh);
    pxHLine(ctx, cx - 20 - stretch, cx - 15 - stretch, by + 5, PAL.cloud);
    pxHLine(ctx, cx + 15 + stretch, cx + 20 + stretch, by + 5, PAL.cloud);
    // Bottom shadow line
    pxHLine(ctx, cx - 18 - stretch, cx + 18 + stretch, by + 7, PAL.cloudSh2);
    // Bottom cloud dark pixels
    pxHLine(ctx, cx - 12, cx + 12, by + 6, PAL.cloudSh);
    pxHLine(ctx, cx - 8, cx + 8, by + 6, PAL.cloud);
  }

  // Draw fluffy hair (big cloud-like hair on top of head)
  // baseY is top of hair. Uses y range baseY to baseY+18 typically.
  function drawHair(ctx, faceCx, baseY, bob) {
    // Large fluffy hair blob on top. Approximate a cloud shape.
    const cx = faceCx;
    const topY = baseY + bob;

    // Peak puffs (little round puffs sticking up)
    pxCircle(ctx, cx - 10, topY + 2, 3, PAL.hair);
    pxCircle(ctx, cx, topY, 4, PAL.hair);
    pxCircle(ctx, cx + 10, topY + 2, 3, PAL.hair);
    pxCircle(ctx, cx - 6, topY - 1, 3, PAL.hair);
    pxCircle(ctx, cx + 5, topY - 1, 3, PAL.hair);

    // Main hair mass — several rows, widest at middle
    const rows = [
      // y offset, half-width, color
      [2,  14, PAL.hair],
      [4,  16, PAL.hair],
      [6,  17, PAL.hair],
      [8,  18, PAL.hair],
      [10, 17, PAL.hair],
      [12, 15, PAL.hair],
      [14, 12, PAL.hair],
    ];
    for (const [oy, hw, col] of rows) {
      pxHLine(ctx, cx - hw, cx + hw, topY + oy, col);
    }

    // Side hair extending down the face (framing)
    for (let i = 0; i < 8; i++) {
      pxRect(ctx, cx - 18 + (i > 5 ? 1 : 0), topY + 8 + i, 2, 1, PAL.hair);
      pxRect(ctx, cx + 16 - (i > 5 ? 1 : 0), topY + 8 + i, 2, 1, PAL.hair);
    }

    // Shading — darker pixels along bottom edges for depth
    pxHLine(ctx, cx - 17, cx - 13, topY + 12, PAL.hairSh);
    pxHLine(ctx, cx + 13, cx + 17, topY + 12, PAL.hairSh);
    pxHLine(ctx, cx - 15, cx - 12, topY + 13, PAL.hairSh);
    pxHLine(ctx, cx + 12, cx + 15, topY + 13, PAL.hairSh);

    // Little front bangs (triangle-ish)
    pxHLine(ctx, cx - 3, cx + 3, topY + 10, PAL.hair);
    pxHLine(ctx, cx - 2, cx + 2, topY + 11, PAL.hair);
    pxHLine(ctx, cx - 1, cx + 1, topY + 12, PAL.hair);

    // Hair outline pixels (darker edges)
    // Left & right outer edge of hair
    for (let i = 0; i < 14; i++) {
      const hw = rows[Math.min(Math.floor(i / 2), rows.length - 1)][1];
      if (i < 2 || i > 12) continue;
      px(ctx, cx - hw - 1, topY + i, PAL.hairSh);
      px(ctx, cx + hw + 1, topY + i, PAL.hairSh);
    }
    // Top outline
    px(ctx, cx - 15, topY + 2, PAL.hairSh);
    px(ctx, cx + 15, topY + 2, PAL.hairSh);
    px(ctx, cx - 12, topY, PAL.hairSh);
    px(ctx, cx + 12, topY, PAL.hairSh);
    px(ctx, cx - 4, topY - 2, PAL.hairSh);
    px(ctx, cx + 4, topY - 2, PAL.hairSh);
  }

  // Draw face: oval shape with eyes + mouth. opts controls expression.
  function drawFace(ctx, faceCx, faceCy, opts) {
    const { smile = true, laugh = false, shocked = false,
            eyesClosed = false, tongueOut = false, blink = false,
            bodyTilt = 0 } = opts;

    // Head shape - oval-ish, built up row by row for pixel precision
    // Half-width per row (relative to cx), centered at faceCy vertically
    const halfW = [7, 9, 10, 11, 12, 12, 12, 11, 10, 9, 8, 6]; // row y offset from top
    const topY = faceCy - Math.floor(halfW.length / 2);

    // Fill face
    for (let i = 0; i < halfW.length; i++) {
      const hw = halfW[i];
      pxHLine(ctx, faceCx - hw, faceCx + hw, topY + i, PAL.skin);
    }

    // Outline for head
    for (let i = 0; i < halfW.length; i++) {
      const hw = halfW[i];
      px(ctx, faceCx - hw - 1, topY + i, PAL.outline);
      px(ctx, faceCx + hw + 1, topY + i, PAL.outline);
    }
    // Top & bottom cap pixels
    px(ctx, faceCx - 2, topY - 1, PAL.outline);
    px(ctx, faceCx - 1, topY - 1, PAL.outline);
    px(ctx, faceCx, topY - 1, PAL.outline);
    px(ctx, faceCx + 1, topY - 1, PAL.outline);
    px(ctx, faceCx + 2, topY - 1, PAL.outline);
    // Bottom rounded
    px(ctx, faceCx - 3, topY + halfW.length, PAL.outline);
    px(ctx, faceCx - 2, topY + halfW.length, PAL.outline);
    px(ctx, faceCx - 1, topY + halfW.length, PAL.outline);
    px(ctx, faceCx, topY + halfW.length, PAL.outline);
    px(ctx, faceCx + 1, topY + halfW.length, PAL.outline);
    px(ctx, faceCx + 2, topY + halfW.length, PAL.outline);
    px(ctx, faceCx + 3, topY + halfW.length, PAL.outline);
    // Connect bottom
    pxHLine(ctx, faceCx - 4, faceCx - 3, topY + halfW.length - 1, PAL.skin);
    pxHLine(ctx, faceCx + 3, faceCx + 4, topY + halfW.length - 1, PAL.skin);

    // Shading (skin shadow) - along jawline
    px(ctx, faceCx - 7, topY + 10, PAL.skinSh);
    px(ctx, faceCx - 8, topY + 8, PAL.skinSh);
    px(ctx, faceCx + 7, topY + 10, PAL.skinSh);
    px(ctx, faceCx + 8, topY + 8, PAL.skinSh);

    // ---- EYES ----
    // Eye position: roughly at faceCy - 2 (middle-upper of face)
    const eyeY = faceCy - 1;
    const leftEyeX = faceCx - 5;
    const rightEyeX = faceCx + 4;

    if (blink || eyesClosed) {
      // Closed eye: horizontal line
      pxHLine(ctx, leftEyeX - 1, leftEyeX + 1, eyeY, PAL.outline);
      pxHLine(ctx, rightEyeX - 1, rightEyeX + 1, eyeY, PAL.outline);
      // curved ^ line
      px(ctx, leftEyeX, eyeY - 1, PAL.outline);
      px(ctx, rightEyeX, eyeY - 1, PAL.outline);
    } else if (shocked) {
      // Big round eyes
      pxEllipse(ctx, leftEyeX, eyeY, 2, 2, PAL.eyeWhite);
      pxEllipse(ctx, rightEyeX, eyeY, 2, 2, PAL.eyeWhite);
      pxCircle(ctx, leftEyeX, eyeY, 1, PAL.eyePupil);
      pxCircle(ctx, rightEyeX, eyeY, 1, PAL.eyePupil);
      // outline
      pxEllipseStroke(ctx, leftEyeX, eyeY, 2, 2, PAL.outline);
      pxEllipseStroke(ctx, rightEyeX, eyeY, 2, 2, PAL.outline);
      // highlight
      px(ctx, leftEyeX - 1, eyeY - 1, PAL.eyeWhite);
      px(ctx, rightEyeX - 1, eyeY - 1, PAL.eyeWhite);
    } else {
      // Normal eyes: small dark dots with a colored iris around
      pxEllipse(ctx, leftEyeX, eyeY, 1, 2, PAL.eyeIris);
      pxEllipse(ctx, rightEyeX, eyeY, 1, 2, PAL.eyeIris);
      px(ctx, leftEyeX, eyeY + 1, PAL.eyePupil);
      px(ctx, rightEyeX, eyeY + 1, PAL.eyePupil);
      px(ctx, leftEyeX, eyeY, PAL.eyePupil);
      px(ctx, rightEyeX, eyeY, PAL.eyePupil);
      // Little eye-white highlight
      px(ctx, leftEyeX - 1, eyeY - 1, PAL.eyeWhite);
      px(ctx, rightEyeX - 1, eyeY - 1, PAL.eyeWhite);
      // outline around eye (just top pixels for style)
      px(ctx, leftEyeX - 2, eyeY, PAL.outline);
      px(ctx, leftEyeX + 1, eyeY, PAL.outline);
      px(ctx, rightEyeX - 1, eyeY, PAL.outline);
      px(ctx, rightEyeX + 2, eyeY, PAL.outline);
    }

    // ---- SCAR under left eye (small cross mark) ----
    pxHLine(ctx, leftEyeX - 4, leftEyeX - 2, eyeY + 3, PAL.scar);
    pxVLine(ctx, leftEyeX - 3, eyeY + 2, eyeY + 4, PAL.scar);

    // ---- CHEEKS (pink blush) ----
    px(ctx, faceCx - 8, eyeY + 3, PAL.cheek);
    px(ctx, faceCx - 7, eyeY + 3, PAL.cheek);
    px(ctx, faceCx + 6, eyeY + 3, PAL.cheek);
    px(ctx, faceCx + 7, eyeY + 3, PAL.cheek);

    // ---- MOUTH ----
    const mouthY = faceCy + 3;
    if (laugh) {
      // Laugh: big open curved mouth
      pxHLine(ctx, faceCx - 3, faceCx + 3, mouthY, PAL.mouth);
      pxHLine(ctx, faceCx - 2, faceCx + 2, mouthY + 1, PAL.mouth);
      pxHLine(ctx, faceCx - 1, faceCx + 1, mouthY + 2, PAL.mouth);
      // Pink interior (tongue-ish)
      pxHLine(ctx, faceCx - 2, faceCx + 2, mouthY, PAL.tongue);
    } else if (shocked) {
      // Shocked: small open circle mouth
      pxEllipse(ctx, faceCx, mouthY + 1, 1, 2, PAL.mouth);
      if (tongueOut) {
        // tongue sticking out
        pxRect(ctx, faceCx - 1, mouthY + 2, 3, 2, PAL.tongue);
      }
    } else if (smile) {
      // Smile: small curved line
      pxHLine(ctx, faceCx - 2, faceCx + 2, mouthY, PAL.mouth);
      px(ctx, faceCx - 3, mouthY - 1, PAL.mouth);
      px(ctx, faceCx + 3, mouthY - 1, PAL.mouth);
    } else {
      // Neutral / determined: straight line
      pxHLine(ctx, faceCx - 2, faceCx + 2, mouthY, PAL.mouth);
    }
  }

  // Body (coat + sash). Painted as one coherent torso region.
  // bodyTop = top row for coat. width = half-width.
  function drawBody(ctx, bodyCx, bodyTop, h, opts) {
    const { coatOpen = false, tilt = 0 } = opts;

    // Coat rows (slightly trapezoid: narrower at top, wider at bottom)
    const halfWTop = 10 + tilt;
    const halfWBot = 13;
    for (let i = 0; i < h; i++) {
      const t = i / h;
      const hw = Math.round(halfWTop + (halfWBot - halfWTop) * t);
      pxHLine(ctx, bodyCx - hw, bodyCx + hw, bodyTop + i, PAL.coat);
    }
    // Coat outline + shoulder area
    for (let i = 0; i < h; i++) {
      const t = i / h;
      const hw = Math.round(halfWTop + (halfWBot - halfWTop) * t);
      px(ctx, bodyCx - hw - 1, bodyTop + i, PAL.coatLine);
      px(ctx, bodyCx + hw + 1, bodyTop + i, PAL.coatLine);
    }
    // Top "V" neck area — shoulder caps instead of a real collar
    pxCircle(ctx, bodyCx - 11, bodyTop, 2, PAL.coat);
    pxCircle(ctx, bodyCx + 11, bodyTop, 2, PAL.coat);
    px(ctx, bodyCx - 12, bodyTop, PAL.coatLine);
    px(ctx, bodyCx + 12, bodyTop, PAL.coatLine);

    // Center front detail (little buttons / placket)
    if (coatOpen) {
      pxVLine(ctx, bodyCx, bodyTop + 2, bodyTop + h - 3, PAL.coatLine);
    } else {
      // Buttons
      for (let i = 0; i < 3; i++) {
        pxRect(ctx, bodyCx - 1, bodyTop + 4 + i * 4, 3, 1, PAL.strawSh);
        pxRect(ctx, bodyCx, bodyTop + 4 + i * 4, 1, 1, PAL.straw);
      }
    }

    // Sash / belt — diagonal + horizontal purple band
    const sashY = bodyTop + h - 5;
    for (let i = 0; i < 3; i++) {
      const offset = i - 1; // diagonal tilt
      pxHLine(ctx, bodyCx - 12 - Math.abs(offset),
              bodyCx + 12 + Math.abs(offset),
              sashY + i, PAL.sash);
    }
    // Sash outline
    pxHLine(ctx, bodyCx - 14, bodyCx + 14, sashY - 1, PAL.sashSh);
    pxHLine(ctx, bodyCx - 14, bodyCx + 14, sashY + 3, PAL.sashSh);
    for (let i = -14; i <= 14; i += 4) {
      px(ctx, bodyCx + i, sashY, PAL.sashSh);
    }
    // Sash trailing tail (diagonal flap)
    for (let i = 0; i < 5; i++) {
      pxHLine(ctx, bodyCx + 10 + i, bodyCx + 12 + i, sashY + 3 + i, PAL.sash);
      px(ctx, bodyCx + 13 + i, sashY + 3 + i, PAL.sashSh);
    }
    pxRect(ctx, bodyCx + 10, sashY + 3, 4, 1, PAL.sashSh);
    // Knot / bow at center
    pxRect(ctx, bodyCx - 3, sashY + 1, 6, 2, PAL.sashSh);
    pxRect(ctx, bodyCx - 2, sashY + 1, 4, 2, PAL.sash);
    px(ctx, bodyCx - 3, sashY + 1, PAL.outline);
    px(ctx, bodyCx + 3, sashY + 1, PAL.outline);

    // Coat shading (shadow along bottom of coat, below sash)
    const shortsTop = sashY + 3;
    const shortsH = 4;
    for (let i = 0; i < shortsH; i++) {
      pxHLine(ctx, bodyCx - 10, bodyCx + 10, shortsTop + i, PAL.coat);
    }
    // Leg gap between shorts
    pxVLine(ctx, bodyCx, shortsTop + shortsH - 2, shortsTop + shortsH, PAL.coatSh);
    // Shorts outline
    pxRectStroke(ctx, bodyCx - 11, shortsTop, 22, shortsH + 1, PAL.coatLine);
    // Leg opening marks
    px(ctx, bodyCx - 7, shortsTop + shortsH + 1, PAL.coatLine);
    px(ctx, bodyCx + 6, shortsTop + shortsH + 1, PAL.coatLine);
  }

  // Arms: drawn as simple rectangular sleeves + hands
  // pose: 'down' | 'up' | 'forward' | 'back'
  function drawArms(ctx, bodyCx, bodyTop, leftPose, rightPose) {
    const armColor = PAL.coat;
    const armOutline = PAL.coatLine;
    const handColor = PAL.skin;
    const handOutline = PAL.skinSh;

    function drawOneArm(shoulderX, shoulderY, pose, isLeft) {
      if (pose === 'down') {
        // Sleeve
        pxRect(ctx, shoulderX - 2, shoulderY, 4, 5, armColor);
        pxRectStroke(ctx, shoulderX - 2, shoulderY, 4, 5, armOutline);
        // Hand at bottom
        pxRect(ctx, shoulderX - 2, shoulderY + 5, 4, 2, handColor);
        px(ctx, shoulderX - 3, shoulderY + 5, handOutline);
        px(ctx, shoulderX + 2, shoulderY + 5, handOutline);
      } else if (pose === 'up') {
        // Arm raised up
        pxRect(ctx, shoulderX - 2, shoulderY - 6, 4, 5, armColor);
        pxRectStroke(ctx, shoulderX - 2, shoulderY - 6, 4, 5, armOutline);
        // Hand at top (raised fist)
        pxRect(ctx, shoulderX - 3, shoulderY - 9, 6, 3, handColor);
        pxRectStroke(ctx, shoulderX - 3, shoulderY - 9, 6, 3, handOutline);
      } else if (pose === 'forward') {
        // Arm angled forward-down
        pxRect(ctx, shoulderX - 2, shoulderY + 2, 4, 5, armColor);
        pxRectStroke(ctx, shoulderX - 2, shoulderY + 2, 4, 5, armOutline);
        pxRect(ctx, shoulderX - 2, shoulderY + 7, 4, 2, handColor);
      } else if (pose === 'back') {
        // Arm swung back
        pxRect(ctx, shoulderX - 2, shoulderY - 1, 4, 5, armColor);
        pxRectStroke(ctx, shoulderX - 2, shoulderY - 1, 4, 5, armOutline);
        pxRect(ctx, shoulderX - 2, shoulderY + 4, 4, 2, handColor);
      } else if (pose === 'wave') {
        // Bent arm, hand near head
        pxRect(ctx, shoulderX - 2, shoulderY - 2, 4, 3, armColor);
        pxRectStroke(ctx, shoulderX - 2, shoulderY - 2, 4, 3, armOutline);
        pxRect(ctx, shoulderX - 3, shoulderY - 5, 4, 3, armColor);
        pxRectStroke(ctx, shoulderX - 3, shoulderY - 5, 4, 3, armOutline);
        pxRect(ctx, shoulderX - 2, shoulderY - 7, 4, 2, handColor);
      } else if (pose === 'clasp') {
        // Hands clasped at chest level
        pxRect(ctx, shoulderX - 2, shoulderY, 4, 3, armColor);
        pxRectStroke(ctx, shoulderX - 2, shoulderY, 4, 3, armOutline);
      }
    }

    const shoulderY = bodyTop + 2;
    const lx = bodyCx - 11;
    const rx = bodyCx + 9;
    drawOneArm(lx, shoulderY, leftPose, true);
    drawOneArm(rx, shoulderY, rightPose, false);
  }

  // Legs + sandals. leftYOff, rightYOff = vertical offset per leg (for run)
  function drawLegs(ctx, bodyCx, shortsBottom, leftYOff, rightYOff, stance, shakeX) {
    const legColor = PAL.skin;
    const legOutline = PAL.skinSh;
    const sandalColor = PAL.straw;
    const sandalOutline = PAL.strawSh;

    function drawOneLeg(legCx, yOff, stanceIn) {
      const topY = shortsBottom + yOff;
      const width = (stanceIn === 'wide') ? 3 : 3;
      const height = (stanceIn === 'bent') ? 3 : 5;

      // Leg (pants / shorts continuation)
      pxRect(ctx, legCx - Math.floor(width / 2), topY, width, height, PAL.coat);
      pxRectStroke(ctx, legCx - Math.floor(width / 2), topY, width, height, PAL.coatLine);
      // Skin below (lower leg)
      const skinY = topY + height;
      pxRect(ctx, legCx - 1, skinY, 3, 2, legColor);
      // Sandal
      pxRect(ctx, legCx - 2, skinY + 2, 5, 2, sandalColor);
      // Sandal outline
      pxRectStroke(ctx, legCx - 3, skinY + 2, 5, 2, sandalOutline);
      // Thong strap (the T-shape between toes)
      px(ctx, legCx, skinY + 1, sandalOutline);
      // Foot shape
      pxRect(ctx, legCx - 2, skinY + 3, 5, 1, sandalColor);
      // Sandal side strap
      pxHLine(ctx, legCx - 3, legCx + 2, skinY + 3, sandalOutline);
    }

    const cx = bodyCx + shakeX;
    drawOneLeg(cx - 7, leftYOff, stance);
    drawOneLeg(cx + 6, rightYOff, stance);
  }

  // ====================================================================
  // COMPLETE FRAME RENDERING — one frame = one full character image
  // drawCompleteFrame(ctx, state, frame) paints the ENTIRE 64x64 sprite
  // using pixel primitives, without relying on external world offsets.
  // ====================================================================

  function drawCompleteFrame(ctx, state, frame, total) {
    // Clear the sprite frame
    ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);

    // Common anchor: head center horizontal x=32
    const FACE_CX = 32;
    // Character layout:
    //   cloud (bottom) at y=56-63
    //   feet/sandals y=52-56
    //   shorts y=44-52
    //   body/coat y=32-48
    //   sash y=43-46
    //   head y=14-30
    //   hair top y=2-16
    //   (approximate — each state adjusts by small pose offsets)

    if (state === 'idle') {
      // Idle: gentle breathing bob + occasional blink
      const t = frame / total;
      const bob = Math.round(Math.sin(t * Math.PI * 2) * 1);
      const blink = (frame === Math.floor(total * 0.75));

      // Cloud
      drawCloud(ctx, 0, 0, 0, 55);
      // Legs slightly apart, standing still
      drawLegs(ctx, FACE_CX, 50 + bob, 0, 0, 'normal', 0);
      // Body (coat) with slight breath squash
      drawBody(ctx, FACE_CX, 33 + bob, 15, { coatOpen: false, tilt: Math.sin(t * Math.PI * 2) * 0 });
      drawArms(ctx, FACE_CX, 33 + bob, 'down', 'down');
      // Hair (big fluffy)
      drawHair(ctx, FACE_CX, 3, bob);
      // Face (smile, maybe blink)
      drawFace(ctx, FACE_CX, 21 + bob, { smile: true, blink });

    } else if (state === 'run') {
      // Run: 12-frame run cycle. Legs alternate, arms swing, body tilted.
      const t = frame / total;
      const cycle = t * Math.PI * 2;
      const tilt = Math.round(Math.sin(cycle) * 1); // body lean
      const bob = Math.abs(Math.round(Math.sin(cycle) * 1));

      // Cloud trail (draw a slightly more compact cloud on the sprite,
      // with speed-motion extra fluff)
      drawCloud(ctx, 0, 1, tilt, 56 - bob);
      // motion streaks behind
      for (let i = 0; i < 4; i++) {
        pxHLine(ctx, 55 - i * 2, 62, 56 - i, PAL.cloudSh);
      }

      // Legs: phase-offset running
      // Compute per-leg vertical offset from cycle
      const leftLegOff = Math.round(Math.sin(cycle) * 2);
      const rightLegOff = Math.round(Math.sin(cycle + Math.PI) * 2);
      drawLegs(ctx, FACE_CX - tilt, 50 - bob,
               leftLegOff, rightLegOff,
               frame % 2 === 0 ? 'normal' : 'bent',
               0);

      // Body — slight forward lean (shift + tilt)
      drawBody(ctx, FACE_CX - tilt, 33 - bob, 15,
               { coatOpen: false, tilt: 0 });

      // Arms swing opposite to same-side leg
      const armPhaseL = Math.round(Math.sin(cycle + Math.PI) * 2);
      const armPhaseR = Math.round(Math.sin(cycle) * 2);
      const leftPose = armPhaseL > 0 ? 'forward' : 'back';
      const rightPose = armPhaseR > 0 ? 'back' : 'forward';
      drawArms(ctx, FACE_CX - tilt, 33 - bob, leftPose, rightPose);

      // Hair (slight wind effect)
      drawHair(ctx, FACE_CX - tilt, 3, bob);
      // Face — determined (neutral mouth, no smile)
      drawFace(ctx, FACE_CX - tilt, 21 - bob,
               { smile: false, shocked: false });

    } else if (state === 'success') {
      // Success: celebration bounce. Character leans back with arms up,
      // slight rotation, sparkles.
      const t = frame / total;
      const bounce = Math.round(Math.abs(Math.sin(t * Math.PI * 3)) * 2);
      const back = Math.round(Math.sin(t * Math.PI * 2) * 1); // lean back

      // Cloud (squished by bounce)
      drawCloud(ctx, 0, bounce > 1 ? 1 : 0, 0, 58 - bounce);

      // Legs splayed out & knees bent slightly
      drawLegs(ctx, FACE_CX, 48 - bounce, back, -back, 'bent', 0);
      // Body tilted back, arms up
      drawBody(ctx, FACE_CX - back, 34 - bounce, 14,
               { coatOpen: true, tilt: 0 });
      drawArms(ctx, FACE_CX - back, 34 - bounce, 'up', 'wave');

      // Hair — still on top but shifted with lean
      drawHair(ctx, FACE_CX - back, 4, -bounce);
      // Laughing face
      drawFace(ctx, FACE_CX - back, 22 - bounce,
               { laugh: true, eyesClosed: true });

      // Sparkle stars around character — appear as frame progresses
      const sparkles = [
        [12, 10, 2], [52, 8, 2], [8, 40, 2],
        [56, 30, 2], [14, 50, 2], [50, 48, 2],
        [32, 2, 2],
      ];
      const count = Math.min(sparkles.length, Math.floor(t * 10));
      for (let i = 0; i < count; i++) {
        const [sx, sy, sr] = sparkles[(i + frame) % sparkles.length];
        drawSparkle(ctx, sx, sy, sr);
      }

    } else if (state === 'fail') {
      // Fail: shocked / worried. Character shakes, stress marks,
      // maybe tongue out, wide eyes.
      const t = frame / total;
      const shakeX = Math.round(Math.sin(frame * 3) * 1);
      const shakeY = Math.round(Math.cos(frame * 3) * 1);

      // Cloud
      drawCloud(ctx, 0, 0, shakeX, 55 + shakeY);
      // Legs apart, slightly bent
      drawLegs(ctx, FACE_CX, 50 + shakeY, 0, 0, 'wide', shakeX);
      // Body
      drawBody(ctx, FACE_CX + shakeX, 33 + shakeY, 15,
               { coatOpen: true, tilt: 0 });
      drawArms(ctx, FACE_CX + shakeX, 33 + shakeY, 'up', 'up');
      // Hair
      drawHair(ctx, FACE_CX + shakeX, 3, shakeY);
      // Shocked face
      drawFace(ctx, FACE_CX + shakeX, 21 + shakeY,
               { shocked: true, tongueOut: (frame % 2 === 0) });

      // Stress lines (vertical squiggles on right side)
      const lineX = 48 + shakeX;
      for (let i = 0; i < 6; i++) {
        px(ctx, lineX + (i % 2 === 0 ? 0 : 1), 12 + i * 3, PAL.stress);
        px(ctx, lineX + 3, 14 + i * 3, PAL.stress);
        px(ctx, 10 - shakeX + (i % 2), 12 + i * 3, PAL.stress);
      }
      // "!?" popup bubble pixels (top right)
      if (frame % 4 < 3) {
        drawPopupPunct(ctx, 50 + shakeX, 6);
      }
    }
  }

  // A little 4-point sparkle star (plus shape)
  function drawSparkle(ctx, cx, cy, size) {
    const col = PAL.sparkle;
    const outline = PAL.sparkleSh;
    // Plus shape
    pxHLine(ctx, cx - size, cx + size, cy, col);
    pxVLine(ctx, cx, cy - size, cy + size, col);
    // Diagonal pixels for sparkle effect
    if (size >= 2) {
      px(ctx, cx - 1, cy - 1, col);
      px(ctx, cx + 1, cy - 1, col);
      px(ctx, cx - 1, cy + 1, col);
      px(ctx, cx + 1, cy + 1, col);
    }
    // Outline corners
    px(ctx, cx - size - 1, cy, outline);
    px(ctx, cx + size + 1, cy, outline);
    px(ctx, cx, cy - size - 1, outline);
    px(ctx, cx, cy + size + 1, outline);
    // Center bright
    px(ctx, cx, cy, PAL.cloud);
  }

  // Tiny "!?" bubble for fail state
  function drawPopupPunct(ctx, bx, by) {
    // Bubble circle
    pxCircle(ctx, bx + 4, by + 5, 6, PAL.cloud);
    pxEllipseStroke(ctx, bx + 4, by + 5, 6, 6, PAL.sashSh);
    // "!"
    pxVLine(ctx, bx, by + 2, by + 6, PAL.outline);
    px(ctx, bx, by + 8, PAL.outline);
    // "?"
    pxHLine(ctx, bx + 5, bx + 7, by + 2, PAL.outline);
    px(ctx, bx + 5, by + 3, PAL.outline);
    pxHLine(ctx, bx + 5, bx + 6, by + 4, PAL.outline);
    px(ctx, bx + 6, by + 5, PAL.outline);
    px(ctx, bx + 6, by + 7, PAL.outline);
    // Little pointer
    px(ctx, bx - 2, by + 10, PAL.sashSh);
    px(ctx, bx - 1, by + 11, PAL.sashSh);
  }

  // ====================================================================
  // SPRITE SHEET BUILDING
  // We pre-render every frame of every state into an offscreen canvas —
  // one "sprite sheet" canvas per state (horizontal strip of frames).
  // At animation time, we just drawImage from the sheet onto display.
  // ====================================================================

  const spriteSheets = {}; // state -> HTMLCanvasElement (sheet W = frames * SPRITE_W, H = SPRITE_H)

  function buildSpriteSheet(state) {
    const cfg = STATES[state];
    const sheet = document.createElement('canvas');
    sheet.width = cfg.frames * SPRITE_W;
    sheet.height = SPRITE_H;
    const sctx = sheet.getContext('2d');
    sctx.imageSmoothingEnabled = false;

    for (let f = 0; f < cfg.frames; f++) {
      // Draw into a scratch 64x64 context, then blit to sheet
      const frame = document.createElement('canvas');
      frame.width = SPRITE_W;
      frame.height = SPRITE_H;
      const fctx = frame.getContext('2d');
      fctx.imageSmoothingEnabled = false;

      drawCompleteFrame(fctx, state, f, cfg.frames);

      sctx.drawImage(frame, f * SPRITE_W, 0, SPRITE_W, SPRITE_H);
    }
    return sheet;
  }

  function buildAllSpriteSheets() {
    for (const s in STATES) {
      spriteSheets[s] = buildSpriteSheet(s);
    }
  }

  // ====================================================================
  // DISPLAY + ANIMATION LOOP
  // ====================================================================

  const petEl = document.getElementById('pet');
  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = DISPLAY_W;
  displayCanvas.height = DISPLAY_H;
  displayCanvas.style.width = DISPLAY_W + 'px';
  displayCanvas.style.height = DISPLAY_H + 'px';
  displayCanvas.style.imageRendering = 'pixelated';
  petEl.appendChild(displayCanvas);

  const dctx = displayCanvas.getContext('2d');
  dctx.imageSmoothingEnabled = false;

  let currentState = 'idle';
  let frame = 0;
  let lastFrameSwitch = performance.now();
  let stateStartedAt = performance.now();
  let clickThrough = false;

  buildAllSpriteSheets();

  function renderFrame(dt, now) {
    const cfg = STATES[currentState];
    const elapsed = now - lastFrameSwitch;
    const frameDur = 1000 / cfg.fps;
    if (elapsed >= frameDur) {
      frame = (frame + 1) % cfg.frames;
      lastFrameSwitch = now;
    }

    // Clear display canvas
    dctx.clearRect(0, 0, DISPLAY_W, DISPLAY_H);

    // Draw current frame from sprite sheet, scaling from SPRITE size to DISPLAY
    const sheet = spriteSheets[currentState];
    dctx.drawImage(
      sheet,
      frame * SPRITE_W, 0, SPRITE_W, SPRITE_H,
      0, 0, DISPLAY_W, DISPLAY_H
    );

    // Auto-return non-looping states to idle
    if (!cfg.loop && cfg.duration > 0) {
      if (now - stateStartedAt >= cfg.duration) {
        setState('idle');
      }
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

  // ====================================================================
  // HUD + INPUT
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
    dragging = true;
    lastX = e.screenX;
    lastY = e.screenY;
    document.body.classList.add('dragging');
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
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

  // ====================================================================
  // MAIN ANIMATION LOOP
  // ====================================================================
  function loop(now) {
    renderFrame(0, now);
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
