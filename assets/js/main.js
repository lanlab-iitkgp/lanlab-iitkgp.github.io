/* LAN Lab — hero network-constellation animation.
   Vanilla JS, no libraries. A subtle field of drifting nodes with edges
   that fade by distance, sitting behind the hero text. See CLAUDE.md. */

(function () {
  'use strict';

  // ── Tunable parameters ──────────────────────────────────────────────
  // Adjust these to change the feel; no other code edits needed.
  const NODE_COUNT = 40;             // number of drifting nodes
  const NODE_RADIUS = 2;             // node dot radius, px
  const NODE_SPEED = 0.2;            // max drift speed, px per frame
  const CONNECTION_DISTANCE = 130;   // px: nodes closer than this get an edge
  const EDGE_OPACITY = 0.5;          // edge opacity at its strongest (nodes touching)
  // Node/edge colour follows the current theme's --accent, so the
  // constellation recolours when light/dark toggles.
  let NODE_COLOR = readAccent();
  let EDGE_COLOR = NODE_COLOR;
  function readAccent() {
    return getComputedStyle(document.documentElement)
             .getPropertyValue('--accent').trim() || '#2dd4bf';
  }
  window.addEventListener('themechange', function () {
    NODE_COLOR = readAccent();
    EDGE_COLOR = NODE_COLOR;
  });
  // ────────────────────────────────────────────────────────────────────

  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const reduceMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let nodes = [];
  let width = 0;
  let height = 0;
  let rafId = null;
  let running = false;

  // Match the canvas backing store to its CSS size and device pixel ratio.
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createNodes() {
    nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2 * NODE_SPEED,
        vy: (Math.random() - 0.5) * 2 * NODE_SPEED,
      });
    }
  }

  function step() {
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      // Bounce softly off the hero edges.
      if (n.x <= 0 || n.x >= width) n.vx *= -1;
      if (n.y <= 0 || n.y >= height) n.vy *= -1;
      n.x = Math.max(0, Math.min(width, n.x));
      n.y = Math.max(0, Math.min(height, n.y));
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Edges — opacity proportional to how close the two nodes are.
    ctx.strokeStyle = EDGE_COLOR;
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist >= CONNECTION_DISTANCE) continue;
        // proximity: 1 when nodes touch, 0 at the connection threshold.
        const proximity = 1 - dist / CONNECTION_DISTANCE;
        ctx.globalAlpha = EDGE_OPACITY * proximity;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }

    // Nodes.
    ctx.globalAlpha = 1;
    ctx.fillStyle = NODE_COLOR;
    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop() {
    step();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function init() {
    resize();
    createNodes();
    if (reduceMotion) {
      draw(); // render a single static frame, no animation
    } else {
      start();
    }
  }

  init();

  // Re-fit and re-seed on resize (debounced).
  let resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      stop();
      init();
    }, 150);
  });

  // Pause the animation while the hero is scrolled out of view.
  const hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          start();
        } else {
          stop();
        }
      },
      { threshold: 0 }
    );
    observer.observe(hero);
  }
})();
