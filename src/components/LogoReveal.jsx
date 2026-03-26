import { useEffect, useRef } from 'react';

// Perlin-like noise
function createNoise() {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function grad(hash, x, y) {
    const h = hash & 3;
    return ((h & 1) === 0 ? x : -x) + ((h & 2) === 0 ? y : -y);
  }

  return function noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    return lerp(
      lerp(grad(perm[perm[X] + Y], xf, yf), grad(perm[perm[X + 1] + Y], xf - 1, yf), u),
      lerp(grad(perm[perm[X] + Y + 1], xf, yf - 1), grad(perm[perm[X + 1] + Y + 1], xf - 1, yf - 1), u),
      v
    );
  };
}

function fbm(noise, x, y, octaves = 5) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise(x * freq, y * freq);
    amp *= 0.45;
    freq *= 2.1;
  }
  return val;
}

export default function LogoReveal() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const noise = createNoise();
    let startTime = null;
    let dpr, w, h;

    // Nebula offscreen buffer
    const nebBuf = document.createElement('canvas');
    const nebCtx = nebBuf.getContext('2d');
    const NEB_RES = 220;
    nebBuf.width = NEB_RES;
    nebBuf.height = NEB_RES;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.addEventListener('resize', resize);
    resize();

    // Orb position: upper-left area near the hero text
    function getOrb() {
      return { x: w * 0.18, y: h * 0.38 };
    }

    function drawOrb(orb, pulse) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Outer halo - purple
      const r1 = 130 + pulse * 25;
      const g1 = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, r1);
      g1.addColorStop(0, `rgba(200,180,255,${0.12 + pulse * 0.04})`);
      g1.addColorStop(0.12, `rgba(139,92,246,${0.10 + pulse * 0.03})`);
      g1.addColorStop(0.35, `rgba(99,102,241,${0.05 + pulse * 0.02})`);
      g1.addColorStop(0.6, 'rgba(57,0,103,0.02)');
      g1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r1, 0, Math.PI * 2);
      ctx.fill();

      // Intense purple glow
      const r2 = 50 + pulse * 12;
      const g2 = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, r2);
      g2.addColorStop(0, `rgba(220,200,255,${0.6 + pulse * 0.12})`);
      g2.addColorStop(0.25, `rgba(139,92,246,${0.4 + pulse * 0.08})`);
      g2.addColorStop(0.6, `rgba(99,102,241,${0.12})`);
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r2, 0, Math.PI * 2);
      ctx.fill();

      // White-hot core
      const r3 = 6 + pulse * 2;
      const g3 = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, r3);
      g3.addColorStop(0, 'rgba(255,255,255,0.9)');
      g3.addColorStop(0.5, 'rgba(200,180,255,0.45)');
      g3.addColorStop(1, 'rgba(139,92,246,0)');
      ctx.fillStyle = g3;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawLensFlare(orb, progress, pulse) {
      if (progress <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const ease = 1 - Math.pow(1 - Math.min(progress, 1), 3);
      const alpha = (0.45 + pulse * 0.12) * ease;

      // Horizontal streak right - across the text area
      const rightLen = w * 0.65 * ease;
      const rGrad = ctx.createLinearGradient(orb.x, orb.y, orb.x + rightLen, orb.y);
      rGrad.addColorStop(0, `rgba(139,92,246,${alpha * 0.7})`);
      rGrad.addColorStop(0.1, `rgba(120,80,230,${alpha * 0.5})`);
      rGrad.addColorStop(0.3, `rgba(99,102,241,${alpha * 0.25})`);
      rGrad.addColorStop(0.6, `rgba(80,60,180,${alpha * 0.08})`);
      rGrad.addColorStop(1, 'rgba(0,0,0,0)');

      // Tapered shape
      ctx.beginPath();
      ctx.moveTo(orb.x - 5, orb.y - 2);
      ctx.lineTo(orb.x + rightLen * 0.2, orb.y - 2.5);
      ctx.lineTo(orb.x + rightLen * 0.6, orb.y - 1);
      ctx.lineTo(orb.x + rightLen, orb.y);
      ctx.lineTo(orb.x + rightLen * 0.6, orb.y + 1);
      ctx.lineTo(orb.x + rightLen * 0.2, orb.y + 2.5);
      ctx.lineTo(orb.x - 5, orb.y + 2);
      ctx.closePath();
      ctx.fillStyle = rGrad;
      ctx.fill();

      // Wider soft glow around streak
      const glowGrad = ctx.createLinearGradient(orb.x, orb.y, orb.x + rightLen, orb.y);
      glowGrad.addColorStop(0, `rgba(139,92,246,${alpha * 0.18})`);
      glowGrad.addColorStop(0.25, `rgba(99,102,241,${alpha * 0.08})`);
      glowGrad.addColorStop(0.5, `rgba(80,60,180,${alpha * 0.03})`);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.moveTo(orb.x - 10, orb.y - 18);
      ctx.lineTo(orb.x + rightLen * 0.3, orb.y - 10);
      ctx.lineTo(orb.x + rightLen * 0.7, orb.y - 3);
      ctx.lineTo(orb.x + rightLen, orb.y);
      ctx.lineTo(orb.x + rightLen * 0.7, orb.y + 3);
      ctx.lineTo(orb.x + rightLen * 0.3, orb.y + 10);
      ctx.lineTo(orb.x - 10, orb.y + 18);
      ctx.closePath();
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // Short left streak
      const leftLen = 100 * ease;
      const lGrad = ctx.createLinearGradient(orb.x, orb.y, orb.x - leftLen, orb.y);
      lGrad.addColorStop(0, `rgba(139,92,246,${alpha * 0.4})`);
      lGrad.addColorStop(0.4, `rgba(99,102,241,${alpha * 0.1})`);
      lGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.moveTo(orb.x, orb.y - 1.5);
      ctx.lineTo(orb.x - leftLen, orb.y);
      ctx.lineTo(orb.x, orb.y + 1.5);
      ctx.closePath();
      ctx.fillStyle = lGrad;
      ctx.fill();

      // Subtle lens ghosts
      const ghosts = [0.2, 0.4, 0.65];
      ghosts.forEach((p, i) => {
        const gx = orb.x + rightLen * p;
        const gr = 4 + i * 2.5;
        const ga = 0.02 * ease * (1 - p);
        ctx.beginPath();
        ctx.arc(gx, orb.y, gr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(139,92,246,${ga})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      ctx.restore();
    }

    function drawNebula(t, alpha) {
      if (alpha <= 0.001) return;

      const imgData = nebCtx.createImageData(NEB_RES, NEB_RES);
      const data = imgData.data;

      const cx = 0.2;
      const cyBase = 0.42;
      const rise = Math.min(t / 12, 1) * 0.06;
      const cy = cyBase - rise;
      const scale = 2.8;
      const slowT = t * 0.05;

      for (let py = 0; py < NEB_RES; py++) {
        for (let px = 0; px < NEB_RES; px++) {
          const u = px / NEB_RES;
          const v = py / NEB_RES;

          const dx = (u - cx) * 1.0;
          const dy = (v - cy) * 1.6;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const falloff = Math.max(0, 1 - dist * 2.2);

          if (falloff <= 0) {
            const idx = (py * NEB_RES + px) * 4;
            data[idx] = data[idx + 1] = data[idx + 2] = data[idx + 3] = 0;
            continue;
          }

          const n1 = fbm(noise, u * scale + slowT * 1.2, v * scale + slowT * 0.8, 5);
          const n2 = fbm(noise, u * scale * 1.4 - slowT * 0.6, v * scale * 1.4 + slowT * 0.5, 4);
          const n3 = fbm(noise, u * scale * 0.7 + slowT * 0.4 + 10, v * scale * 0.7 - slowT * 0.3, 3);

          let density = (n1 * 0.45 + n2 * 0.35 + n3 * 0.2);
          density = Math.max(0, density + 0.1) * falloff * falloff;

          const tendril = Math.pow(Math.max(0, n1 * 0.5 + 0.5), 2) * falloff;
          density = density * 0.7 + tendril * 0.3;

          const intensity = Math.min(1, density * 2.2);

          const idx = (py * NEB_RES + px) * 4;
          // Purple-violet color scheme
          data[idx] = Math.floor(80 + intensity * 60);      // R
          data[idx + 1] = Math.floor(30 + intensity * 62);  // G
          data[idx + 2] = Math.floor(140 + intensity * 106); // B
          data[idx + 3] = Math.floor(intensity * alpha * 255 * 0.25);
        }
      }

      nebCtx.putImageData(imgData, 0, 0);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(nebBuf, 0, 0, w, h);
      ctx.restore();
    }

    function drawAmbient() {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const amb = ctx.createRadialGradient(w * 0.2, h * 0.4, 0, w * 0.2, h * 0.4, w * 0.5);
      amb.addColorStop(0, 'rgba(20,10,35,0.25)');
      amb.addColorStop(0.5, 'rgba(12,6,22,0.08)');
      amb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = amb;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    function render(now) {
      if (!startTime) startTime = now;
      const t = (now - startTime) / 1000;

      ctx.clearRect(0, 0, w, h);

      // Pulse
      const pulse = (Math.sin(t * 2.2) * 0.5 + 0.5) * 0.12 + (Math.sin(t * 1.5 + 1) * 0.5 + 0.5) * 0.08;

      // Timeline
      const flareIn = Math.min(1, Math.max(0, (t - 0.3) / 1.2));
      const nebulaAlpha = t < 1.5 ? 0 : t < 4 ? (t - 1.5) / 2.5 : 1;

      const orb = getOrb();

      drawAmbient();
      drawNebula(t, nebulaAlpha);
      drawLensFlare(orb, flareIn, pulse);
      drawOrb(orb, pulse);

      animRef.current = requestAnimationFrame(render);
    }

    animRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    />
  );
}
