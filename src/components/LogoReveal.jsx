import { useEffect, useRef } from 'react';

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

export default function LogoReveal({ dotState }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const dotRef = useRef(dotState);

  useEffect(() => {
    dotRef.current = dotState;
  }, [dotState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const noise = createNoise();
    let startTime = null;
    let dpr, w, h;

    let smoothProximity = 0;
    let prevProximity = 0;
    let burstIntensity = 0;
    let burstTimer = 0;
    let wasBright = false;
    let lastDotX = 0;
    let lastDotY = 0;

    const nebBuf = document.createElement('canvas');
    const nebCtx = nebBuf.getContext('2d');
    const NEB_RES = 240;
    nebBuf.width = NEB_RES;
    nebBuf.height = NEB_RES;

    // Ambient nebula — fullscreen, always visible
    const ambNebBuf = document.createElement('canvas');
    const ambNebCtx = ambNebBuf.getContext('2d');
    const AMB_RES = 200;
    ambNebBuf.width = AMB_RES;
    ambNebBuf.height = AMB_RES;

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

    function drawAmbientNebula(t) {
      const imgData = ambNebCtx.createImageData(AMB_RES, AMB_RES);
      const data = imgData.data;
      const slowT = t * 0.03;

      for (let py = 0; py < AMB_RES; py++) {
        for (let px = 0; px < AMB_RES; px++) {
          const u = px / AMB_RES;
          const v = py / AMB_RES;

          const scale = 2.4;
          const n1 = fbm(noise, u * scale + slowT * 1.1, v * scale + slowT * 0.7, 5);
          const n2 = fbm(noise, u * scale * 1.3 - slowT * 0.5 + 5, v * scale * 1.3 + slowT * 0.4, 4);
          const n3 = fbm(noise, u * scale * 0.6 + slowT * 0.25 + 12, v * scale * 0.6 - slowT * 0.35, 3);

          let density = (n1 * 0.45 + n2 * 0.35 + n3 * 0.2);
          density = Math.max(0, density + 0.18);

          const tendril = Math.pow(Math.max(0, n1 * 0.5 + 0.5), 2.5);
          const wisps = Math.pow(Math.max(0, n2 * 0.5 + 0.35), 2.0) * 0.6;
          density = density * 0.4 + tendril * 0.35 + wisps * 0.25;

          const hole = Math.max(0, -n3 * 0.35 + 0.06);
          density = Math.max(0, density - hole * 0.2);

          // Edge vignette — soft fade at screen edges
          const ex = 1 - Math.pow(Math.abs(u * 2 - 1), 3);
          const ey = 1 - Math.pow(Math.abs(v * 2 - 1), 3);
          density *= ex * ey;

          const i = Math.min(1, density * 3.5);

          const idx = (py * AMB_RES + px) * 4;
          data[idx] = Math.floor(15 + i * 75);
          data[idx + 1] = Math.floor(50 + i * 130);
          data[idx + 2] = Math.floor(140 + i * 115);
          data[idx + 3] = Math.floor(i * 255 * 0.7);
        }
      }

      ambNebCtx.putImageData(imgData, 0, 0);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(ambNebBuf, 0, 0, w, h);
      ctx.restore();
    }

    function drawOrb(dotX, dotY, p, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const pulse = (Math.sin(t * 2.5) * 0.5 + 0.5) * 0.1 + (Math.sin(t * 1.7 + 2) * 0.5 + 0.5) * 0.06;
      const pp = p + pulse * p;

      // Enormous ambient glow
      const r00 = 100 + pp * 320;
      const g00 = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, r00);
      g00.addColorStop(0, `rgba(60,120,255,${pp * 0.1})`);
      g00.addColorStop(0.3, `rgba(30,70,200,${pp * 0.04})`);
      g00.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g00;
      ctx.beginPath();
      ctx.arc(dotX, dotY, r00, 0, Math.PI * 2);
      ctx.fill();

      // Wide blue halo
      const r0 = 70 + pp * 220;
      const g0 = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, r0);
      g0.addColorStop(0, `rgba(100,170,255,${pp * 0.25})`);
      g0.addColorStop(0.2, `rgba(60,130,255,${pp * 0.18})`);
      g0.addColorStop(0.45, `rgba(30,80,220,${pp * 0.08})`);
      g0.addColorStop(0.7, `rgba(15,50,180,${pp * 0.03})`);
      g0.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g0;
      ctx.beginPath();
      ctx.arc(dotX, dotY, r0, 0, Math.PI * 2);
      ctx.fill();

      // Main intense blue sphere
      const r1 = 25 + pp * 80;
      const g1 = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, r1);
      g1.addColorStop(0, `rgba(200,230,255,${0.04 + pp * 0.75})`);
      g1.addColorStop(0.15, `rgba(120,190,255,${pp * 0.65})`);
      g1.addColorStop(0.35, `rgba(60,140,255,${pp * 0.4})`);
      g1.addColorStop(0.6, `rgba(30,90,240,${pp * 0.15})`);
      g1.addColorStop(1, 'rgba(10,40,180,0)');
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.arc(dotX, dotY, r1, 0, Math.PI * 2);
      ctx.fill();

      // Bright inner sphere
      if (p > 0.08) {
        const r2 = 12 + pp * 50;
        const g2 = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, r2);
        g2.addColorStop(0, `rgba(240,248,255,${pp * 0.92})`);
        g2.addColorStop(0.2, `rgba(180,220,255,${pp * 0.7})`);
        g2.addColorStop(0.45, `rgba(100,170,255,${pp * 0.35})`);
        g2.addColorStop(0.7, `rgba(50,120,240,${pp * 0.12})`);
        g2.addColorStop(1, 'rgba(20,60,200,0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(dotX, dotY, r2, 0, Math.PI * 2);
        ctx.fill();
      }

      // White-hot core
      if (p > 0.15) {
        const coreP = (p - 0.15) / 0.85;
        const r3 = 5 + coreP * 25;
        const g3 = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, r3);
        g3.addColorStop(0, `rgba(255,255,255,${coreP * 0.98})`);
        g3.addColorStop(0.25, `rgba(230,245,255,${coreP * 0.85})`);
        g3.addColorStop(0.5, `rgba(160,210,255,${coreP * 0.45})`);
        g3.addColorStop(0.75, `rgba(80,150,255,${coreP * 0.15})`);
        g3.addColorStop(1, 'rgba(40,100,240,0)');
        ctx.fillStyle = g3;
        ctx.beginPath();
        ctx.arc(dotX, dotY, r3, 0, Math.PI * 2);
        ctx.fill();

        // Overexposed point
        const r4 = 2 + coreP * 10;
        const g4 = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, r4);
        g4.addColorStop(0, `rgba(255,255,255,${coreP})`);
        g4.addColorStop(0.5, `rgba(255,255,255,${coreP * 0.6})`);
        g4.addColorStop(1, 'rgba(220,240,255,0)');
        ctx.fillStyle = g4;
        ctx.beginPath();
        ctx.arc(dotX, dotY, r4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function drawBeam(dotX, dotY, p, t) {
      if (p < 0.05) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const ease = 1 - Math.pow(1 - Math.min(p, 1), 4);
      const beamLen = w * 0.6 * ease;
      const alpha = p * 0.85;

      // Sharp core line
      const coreGrad = ctx.createLinearGradient(dotX, dotY, dotX - beamLen, dotY);
      coreGrad.addColorStop(0, `rgba(160,210,255,${alpha * 0.95})`);
      coreGrad.addColorStop(0.04, `rgba(100,170,255,${alpha * 0.8})`);
      coreGrad.addColorStop(0.12, `rgba(60,130,250,${alpha * 0.55})`);
      coreGrad.addColorStop(0.3, `rgba(35,90,220,${alpha * 0.3})`);
      coreGrad.addColorStop(0.55, `rgba(20,60,180,${alpha * 0.1})`);
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.moveTo(dotX + 2, dotY - 1.2);
      ctx.lineTo(dotX - beamLen * 0.08, dotY - 2);
      ctx.lineTo(dotX - beamLen * 0.35, dotY - 1);
      ctx.lineTo(dotX - beamLen, dotY);
      ctx.lineTo(dotX - beamLen * 0.35, dotY + 1);
      ctx.lineTo(dotX - beamLen * 0.08, dotY + 2);
      ctx.lineTo(dotX + 2, dotY + 1.2);
      ctx.closePath();
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Medium glow
      const midGrad = ctx.createLinearGradient(dotX, dotY, dotX - beamLen, dotY);
      midGrad.addColorStop(0, `rgba(70,140,255,${alpha * 0.4})`);
      midGrad.addColorStop(0.08, `rgba(50,110,240,${alpha * 0.3})`);
      midGrad.addColorStop(0.25, `rgba(30,80,210,${alpha * 0.12})`);
      midGrad.addColorStop(0.5, `rgba(15,50,170,${alpha * 0.04})`);
      midGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.moveTo(dotX + 8, dotY - 7);
      ctx.lineTo(dotX - beamLen * 0.15, dotY - 5.5);
      ctx.lineTo(dotX - beamLen * 0.5, dotY - 2);
      ctx.lineTo(dotX - beamLen, dotY);
      ctx.lineTo(dotX - beamLen * 0.5, dotY + 2);
      ctx.lineTo(dotX - beamLen * 0.15, dotY + 5.5);
      ctx.lineTo(dotX + 8, dotY + 7);
      ctx.closePath();
      ctx.fillStyle = midGrad;
      ctx.fill();

      // Wide atmospheric glow
      const wideGrad = ctx.createLinearGradient(dotX, dotY, dotX - beamLen, dotY);
      wideGrad.addColorStop(0, `rgba(40,90,230,${alpha * 0.15})`);
      wideGrad.addColorStop(0.15, `rgba(25,65,190,${alpha * 0.08})`);
      wideGrad.addColorStop(0.4, `rgba(12,40,150,${alpha * 0.03})`);
      wideGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.moveTo(dotX + 12, dotY - 25);
      ctx.lineTo(dotX - beamLen * 0.25, dotY - 15);
      ctx.lineTo(dotX - beamLen * 0.65, dotY - 5);
      ctx.lineTo(dotX - beamLen, dotY);
      ctx.lineTo(dotX - beamLen * 0.65, dotY + 5);
      ctx.lineTo(dotX - beamLen * 0.25, dotY + 15);
      ctx.lineTo(dotX + 12, dotY + 25);
      ctx.closePath();
      ctx.fillStyle = wideGrad;
      ctx.fill();

      // Right streak — longer, thinner
      const rightLen = w * 0.35 * ease;
      const rGrad = ctx.createLinearGradient(dotX, dotY, dotX + rightLen, dotY);
      rGrad.addColorStop(0, `rgba(120,180,255,${alpha * 0.4})`);
      rGrad.addColorStop(0.05, `rgba(80,150,250,${alpha * 0.3})`);
      rGrad.addColorStop(0.15, `rgba(50,110,230,${alpha * 0.15})`);
      rGrad.addColorStop(0.35, `rgba(25,70,200,${alpha * 0.05})`);
      rGrad.addColorStop(0.6, `rgba(12,40,160,${alpha * 0.015})`);
      rGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.moveTo(dotX, dotY - 0.8);
      ctx.lineTo(dotX + rightLen * 0.1, dotY - 1);
      ctx.lineTo(dotX + rightLen * 0.4, dotY - 0.4);
      ctx.lineTo(dotX + rightLen, dotY);
      ctx.lineTo(dotX + rightLen * 0.4, dotY + 0.4);
      ctx.lineTo(dotX + rightLen * 0.1, dotY + 1);
      ctx.lineTo(dotX, dotY + 0.8);
      ctx.closePath();
      ctx.fillStyle = rGrad;
      ctx.fill();

      ctx.restore();
    }

    function drawNebula(dotX, dotY, p, t) {
      if (p < 0.03) return;

      const nebulaP = Math.min(1, p / 0.5);
      const ease = 1 - Math.pow(1 - nebulaP, 2);
      const beamLen = w * 0.6 * ease;

      // Large nebula area
      const nebCX = dotX - beamLen * 0.42;
      const nebCY = dotY - 25 * ease;
      const nebulaW = 700 * ease;
      const nebulaH = 500 * ease;

      const imgData = nebCtx.createImageData(NEB_RES, NEB_RES);
      const data = imgData.data;
      const slowT = t * 0.05;

      for (let py = 0; py < NEB_RES; py++) {
        for (let px = 0; px < NEB_RES; px++) {
          const u = (px / NEB_RES) * 2 - 1;
          const v = (py / NEB_RES) * 2 - 1;

          // Asymmetric — wider right toward orb, mass above beam
          const dx = (u + 0.05) * 0.75;
          const dy = (v + 0.18) * 1.2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let falloff = Math.max(0, 1 - dist * 0.8);
          falloff *= falloff;

          // Smooth edge vignette — fade to zero at all buffer edges
          const edgeX = 1 - Math.pow(Math.abs(u), 4);
          const edgeY = 1 - Math.pow(Math.abs(v), 4);
          falloff *= edgeX * edgeY;

          if (falloff <= 0.001) {
            const idx = (py * NEB_RES + px) * 4;
            data[idx] = data[idx + 1] = data[idx + 2] = data[idx + 3] = 0;
            continue;
          }

          const scale = 2.6;
          const n1 = fbm(noise, u * scale + slowT * 1.3, v * scale + slowT * 0.8, 5);
          const n2 = fbm(noise, u * scale * 1.4 - slowT * 0.65 + 5, v * scale * 1.4 + slowT * 0.5, 4);
          const n3 = fbm(noise, u * scale * 0.7 + slowT * 0.3 + 12, v * scale * 0.7 - slowT * 0.4, 3);
          const n4 = fbm(noise, u * scale * 2.0 + slowT * 0.15 + 20, v * scale * 2.0 + slowT * 0.25, 3);

          let density = (n1 * 0.4 + n2 * 0.3 + n3 * 0.2 + n4 * 0.1);
          density = Math.max(0, density + 0.22) * falloff;

          // Prominent wispy tendrils
          const tendril = Math.pow(Math.max(0, n1 * 0.5 + 0.5), 2.5) * falloff;
          const wisps = Math.pow(Math.max(0, n2 * 0.5 + 0.35), 2.0) * falloff * 0.8;
          const swirl = Math.pow(Math.max(0, Math.sin(n3 * 3.5 + slowT) * 0.5 + 0.5), 1.8) * falloff * 0.4;
          density = density * 0.35 + tendril * 0.3 + wisps * 0.2 + swirl * 0.15;

          // Dark voids
          const hole = Math.max(0, -n3 * 0.35 + 0.06);
          density = Math.max(0, density - hole * 0.2);

          const i = Math.min(1, density * 3.5);

          const idx = (py * NEB_RES + px) * 4;
          data[idx] = Math.floor(15 + i * 75);
          data[idx + 1] = Math.floor(50 + i * 130);
          data[idx + 2] = Math.floor(140 + i * 115);
          data[idx + 3] = Math.floor(i * ease * p * 255 * 0.7);
        }
      }

      nebCtx.putImageData(imgData, 0, 0);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(
        nebBuf,
        nebCX - nebulaW / 2,
        nebCY - nebulaH / 2,
        nebulaW,
        nebulaH
      );

      // Secondary glow patches
      if (p > 0.2) {
        const secP = (p - 0.2) / 0.8;
        // Bottom-left patch
        const s1X = dotX - beamLen * 0.72;
        const s1Y = dotY + 40 * ease;
        const s1R = 80 * secP;
        const s1G = ctx.createRadialGradient(s1X, s1Y, 0, s1X, s1Y, s1R);
        s1G.addColorStop(0, `rgba(50,130,255,${secP * 0.18})`);
        s1G.addColorStop(0.5, `rgba(30,80,200,${secP * 0.07})`);
        s1G.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = s1G;
        ctx.beginPath();
        ctx.arc(s1X, s1Y, s1R, 0, Math.PI * 2);
        ctx.fill();

        // Upper-left patch
        const s2X = dotX - beamLen * 0.55;
        const s2Y = dotY - 60 * ease;
        const s2R = 65 * secP;
        const s2G = ctx.createRadialGradient(s2X, s2Y, 0, s2X, s2Y, s2R);
        s2G.addColorStop(0, `rgba(40,110,240,${secP * 0.14})`);
        s2G.addColorStop(0.5, `rgba(25,70,190,${secP * 0.05})`);
        s2G.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = s2G;
        ctx.beginPath();
        ctx.arc(s2X, s2Y, s2R, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function render(now) {
      if (!startTime) startTime = now;
      const t = (now - startTime) / 1000;
      const dt = 1 / 60;

      ctx.clearRect(0, 0, w, h);

      // Ambient nebula — always visible
      drawAmbientNebula(t);

      const ds = dotRef.current;
      if (!ds || ds.x === 0) {
        animRef.current = requestAnimationFrame(render);
        return;
      }

      // Track dot position (keep last known for burst)
      if (ds.x > 0) {
        lastDotX = ds.x;
        lastDotY = ds.y;
      }

      const target = ds.proximity;

      // Detect transition from bright to leaving — trigger burst
      if (prevProximity > 0.4 && target < 0.15 && !wasBright) {
        wasBright = true;
        burstIntensity = 1.3; // boost above normal max
        burstTimer = 2.0;
      }
      prevProximity = target;

      // Burst decay
      if (burstTimer > 0) {
        burstTimer -= dt;
        if (burstTimer <= 0) {
          wasBright = false;
          burstTimer = 0;
        }
        // Smooth burst decay
        const burstLife = Math.max(0, burstTimer / 2.0);
        burstIntensity = 1.3 * burstLife * burstLife; // quadratic falloff
      }

      // Smooth proximity — combine with burst
      if (target > smoothProximity) {
        smoothProximity += (target - smoothProximity) * 0.1;
      } else {
        smoothProximity += (target - smoothProximity) * 0.04;
      }

      // Effective intensity = max of smooth proximity and burst
      const effectiveP = Math.max(smoothProximity, burstIntensity);

      if (effectiveP < 0.003) {
        animRef.current = requestAnimationFrame(render);
        return;
      }

      const dotX = lastDotX;
      const dotY = lastDotY;

      drawNebula(dotX, dotY, effectiveP, t);
      drawBeam(dotX, dotY, effectiveP, t);
      drawOrb(dotX, dotY, effectiveP, t);

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
