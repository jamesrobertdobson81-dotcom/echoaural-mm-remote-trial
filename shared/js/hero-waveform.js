'use strict';

// Animated background waveform for the homepage hero (.hero-waveform-bg).
// Ported from EchoAural Perform's WaveformGraphic "hero" canvas mode
// (components/waveform-graphic.tsx) — same procedural energy-bar +
// oscilloscope-line technique, recoloured to Listen's own brand gradient
// (magenta/purple/cyan) rather than Perform's blue/purple. The old static
// CSS bars (fixed heights, per-bar opacity pulse only) are replaced by a
// single <canvas> this file owns entirely.
(function () {
  function pseudoRandom(seed) {
    var value = Math.sin(seed * 127.1) * 43758.5453;
    return value - Math.floor(value);
  }

  function mount(container) {
    var canvas = document.createElement('canvas');
    canvas.className = 'hero-waveform-canvas';
    container.textContent = '';
    container.appendChild(canvas);

    var context = canvas.getContext('2d');
    if (!context) return;

    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var frame = 0;
    var start = performance.now();

    function sizeCanvas() {
      var bounds = canvas.getBoundingClientRect();
      var scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * scale));
      canvas.height = Math.max(1, Math.round(bounds.height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
    }

    function drawHero(width, height, time) {
      var centre = height * .52;
      var gradient = context.createLinearGradient(width * .04, 0, width, 0);
      gradient.addColorStop(0, '#FF5DBA');
      gradient.addColorStop(.5, '#A66BFF');
      gradient.addColorStop(1, '#3FA6FF');

      for (var index = 0; index < 82; index += 1) {
        var ratio = index / 81;
        var x = width * (.025 + ratio * .96);
        var envelope = .12 + .88 * Math.exp(-Math.pow((ratio - .68) / .31, 2));
        var energy = Math.abs(Math.sin(index * 1.41) * .52 + Math.sin(index * .47 + 1.8) * .36 + Math.sin(index * .18) * .22);
        var pulse = 1 + Math.sin(time * 1.55 + index * .19) * .065;
        var span = height * (.045 + energy * envelope * .43) * pulse;
        context.beginPath();
        context.moveTo(x, centre - span);
        context.lineTo(x, centre + span);
        context.strokeStyle = gradient;
        context.globalAlpha = .2 + envelope * .62;
        context.lineWidth = index % 6 === 0 ? 1.8 : 1.05;
        context.shadowColor = ratio > .65 ? '#3FA6FF' : '#FF5DBA';
        context.shadowBlur = 12;
        context.stroke();

        for (var dot = 0; dot < 2; dot += 1) {
          var random = pseudoRandom(index * 7 + dot * 19);
          var side = dot === 0 ? -1 : 1;
          var y = centre + side * (span + 4 + random * height * .11 * envelope);
          context.fillStyle = ratio > .66 ? '#3FA6FF' : '#FF5DBA';
          context.globalAlpha = .25 + random * .44;
          var size = random > .72 ? 1.6 : 1;
          context.fillRect(x + (random - .5) * 5, y, size, size);
        }
      }

      function drawWave(phase, alpha, lineWidth) {
        context.beginPath();
        for (var wx = 0; wx <= width; wx += 2) {
          var wr = wx / width;
          var wenv = .15 + .85 * Math.exp(-Math.pow((wr - .65) / .36, 2));
          var wy = centre
            + Math.sin(wr * Math.PI * 10.7 + phase) * height * .046 * wenv
            + Math.sin(wr * Math.PI * 20.2 - phase * .55) * height * .018 * wenv;
          if (wx === 0) context.moveTo(wx, wy);
          else context.lineTo(wx, wy);
        }
        context.strokeStyle = gradient;
        context.globalAlpha = alpha;
        context.lineWidth = lineWidth;
        context.shadowColor = '#A66BFF';
        context.shadowBlur = 19;
        context.stroke();
      }

      drawWave(time * .31 + .8, .52, 1.35);
      drawWave(time * .52, 1, 2.45);
      context.globalAlpha = 1;
      context.shadowBlur = 0;
    }

    function render(now) {
      var bounds = canvas.getBoundingClientRect();
      var width = bounds.width;
      var height = bounds.height;
      context.clearRect(0, 0, width, height);
      drawHero(width, height, (now - start) / 1000);
      if (!reducedMotion) frame = requestAnimationFrame(render);
    }

    sizeCanvas();
    render(start);

    if (window.ResizeObserver) {
      var observer = new ResizeObserver(function () {
        sizeCanvas();
        if (reducedMotion) render(performance.now());
      });
      observer.observe(canvas);
    }
  }

  function init() {
    var container = document.querySelector('.hero-waveform-bg');
    if (container) mount(container);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
