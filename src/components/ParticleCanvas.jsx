import { useEffect, useRef, useCallback } from 'react';

const portfolio = [
  { name: "COGNITION", sector: "AI Agents" },
  { name: "UPWIND", sector: "Cloud Security" },
  { name: "EON", sector: "Storage & Recovery" },
  { name: "POINTFIVE", sector: "Cost Optimization" },
  { name: "TURNOUT", sector: "Gov Infrastructure" },
  { name: "GLOW", sector: "Beauty Tech" },
  { name: "JOON", sector: "Enterprise AI" },
  { name: "BLISS", sector: "Endpoint Security" },
  { name: "OAKIE.AI", sector: "Pen Testing" },
  { name: "IRREGULAR", sector: "AI Safety" },
  { name: "EDELBYTE", sector: "RL as a Service" },
  { name: "ACCOMPLISH", sector: "Analytics" },
  { name: "FIRESIDE", sector: "Computer-Use" },
  { name: "BUZZ SECURITY", sector: "Cyber Security" },
  { name: "TENZAI", sector: "RL Infrastructure" },
  { name: "APPLIED COMPUTE", sector: "Customer Support" },
  { name: "WONDERFUL.IO", sector: "AI Research" },
];

const config = {
  particleCount: 200,
  ambientCount: 500,
  baseRadius: 1.5,
  nodeRadius: 3,
  maxHoverRadius: 45,
  interactionRadius: 80,
  baseSpeed: 0.3,
  colors: {
    bg: '#07050A',
    textPrimary: '#FFFFFF',
    textSecondary: '#8E8D98',
  },
};

// Ambient dots — never attracted, always visible
class AmbientDot {
  constructor(width, height) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.15;
    this.vy = (Math.random() - 0.5) * 0.15;
    this.angle = Math.random() * Math.PI * 2;
    this.angleSpeed = Math.random() * 0.008 + 0.002;
    this.radius = Math.random() * 2.0 + 0.8;
    this.alpha = Math.random() * 0.5 + 0.2;
    this.pulseOffset = Math.random() * Math.PI * 2;
    this.pulseSpeed = Math.random() * 0.5 + 0.3;
  }

  update(width, height, t) {
    this.angle += this.angleSpeed;
    this.x += this.vx + Math.sin(this.angle) * 0.08;
    this.y += this.vy + Math.cos(this.angle) * 0.08;

    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;
  }

  draw(ctx, t) {
    const pulse = Math.sin(t * this.pulseSpeed + this.pulseOffset) * 0.5 + 0.5;
    const a = this.alpha * (0.7 + pulse * 0.3);
    // Outer glow
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(139, 92, 246, ${a * 0.6})`;
    ctx.fill();
    // Bright center for larger dots
    if (this.radius > 1.2) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.5})`;
      ctx.fill();
    }
  }
}

// Find a position that doesn't overlap with existing particles
function findNonOverlappingPos(width, height, existingParticles, minDist = 100) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    let ok = true;
    for (const p of existingParticles) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < minDist) {
        ok = false;
        break;
      }
    }
    if (ok) return { x, y };
  }
  return { x: Math.random() * width, y: Math.random() * height };
}

class Particle {
  constructor(width, height, isNode, data = null, existingParticles = []) {
    if (isNode) {
      const pos = findNonOverlappingPos(width, height, existingParticles);
      this.x = pos.x;
      this.y = pos.y;
    } else {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
    }
    this.vx = (Math.random() - 0.5) * config.baseSpeed;
    this.vy = (Math.random() - 0.5) * config.baseSpeed;
    this.angle = Math.random() * Math.PI * 2;
    this.angleSpeed = Math.random() * 0.02 + 0.005;
    this.isNode = isNode;
    this.data = data;
    this.currentRadius = isNode ? config.nodeRadius : config.baseRadius;
    this.targetRadius = this.currentRadius;
    this.alpha = isNode ? 0.8 : Math.random() * 0.5 + 0.1;
    this.baseAlpha = this.alpha;
    this.attracted = false;
    this.releasing = false;
  }

  update(width, height, mouse, hoveredRef, dotAttract, allParticles) {
    const dotProximity = dotAttract ? dotAttract.proximity : 0;

    // Attraction phase
    if (dotProximity > 0.05 && dotAttract.x > 0) {
      this.attracted = true;

      const dx = dotAttract.x - this.x;
      const dy = dotAttract.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const attractRadius = 500;

      if (dist < attractRadius && dist > 2) {
        const distFactor = 1 - dist / attractRadius;
        const force = dotProximity * 0.06 * distFactor * distFactor;
        this.x += dx * force;
        this.y += dy * force;
      }

      // Fade out near dot center (absorbed into orb)
      const distToDot = Math.sqrt(
        (this.x - dotAttract.x) ** 2 + (this.y - dotAttract.y) ** 2
      );
      if (distToDot < 80) {
        const fadeZone = 1 - distToDot / 80;
        this.alpha = this.baseAlpha * (1 - fadeZone * dotProximity * 0.9);
      } else {
        this.alpha += (this.baseAlpha - this.alpha) * 0.05;
      }
    } else {
      // Release: fade out → teleport → fade in
      if (this.attracted && !this.releasing) {
        this.releasing = true;
        // Start fading out quickly
      }

      if (this.releasing) {
        this.alpha *= 0.85;
        if (this.alpha < 0.01) {
          // Invisible — teleport to non-overlapping position
          const pos = findNonOverlappingPos(width, height, allParticles || [], this.isNode ? 100 : 20);
          this.x = pos.x;
          this.y = pos.y;
          this.releasing = false;
          this.attracted = false;
        }
      } else {
        // Normal: fade back in
        this.alpha += (this.baseAlpha - this.alpha) * 0.03;
      }
    }

    // Normal movement — always active, just quieter when attracted
    const moveFactor = this.attracted ? 0.05 : 1;
    this.angle += this.angleSpeed;
    this.x += (this.vx + Math.sin(this.angle) * 0.2) * moveFactor;
    this.y += (this.vy + Math.cos(this.angle) * 0.2) * moveFactor;

    // Wrap
    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;

    // Mouse hover on nodes (only when not attracted)
    if (!this.attracted) {
      const mdx = mouse.x - this.x;
      const mdy = mouse.y - this.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

      if (this.isNode) {
        if (mDist < config.interactionRadius) {
          this.targetRadius = config.maxHoverRadius;
          hoveredRef.current = this;
          this.x -= (this.vx + Math.sin(this.angle) * 0.2) * 0.9;
          this.y -= (this.vy + Math.cos(this.angle) * 0.2) * 0.9;
        } else {
          this.targetRadius = config.nodeRadius;
          if (hoveredRef.current === this) hoveredRef.current = null;
        }
        this.currentRadius += (this.targetRadius - this.currentRadius) * 0.1;
      } else {
        if (mDist < config.interactionRadius) {
          const force = (config.interactionRadius - mDist) / config.interactionRadius;
          this.x -= mdx * force * 0.02;
          this.y -= mdy * force * 0.02;
        }
      }
    } else {
      if (this.isNode) {
        this.targetRadius = config.nodeRadius;
        this.currentRadius += (this.targetRadius - this.currentRadius) * 0.1;
        if (hoveredRef.current === this) hoveredRef.current = null;
      }
    }
  }

  draw(ctx) {
    if (this.alpha < 0.01) return;

    ctx.beginPath();

    if (this.isNode && this.currentRadius > config.nodeRadius + 1 && !this.attracted) {
      ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0712';
      ctx.fill();

      const gradient = ctx.createLinearGradient(
        this.x, this.y - this.currentRadius,
        this.x, this.y + this.currentRadius
      );
      gradient.addColorStop(0, '#390067');
      gradient.addColorStop(0.5, '#6366f1');
      gradient.addColorStop(1, '#8B5CF6');

      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.filter = 'blur(6px)';
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (this.currentRadius > config.maxHoverRadius * 0.8) {
        ctx.save();
        const textAlpha = (this.currentRadius - config.maxHoverRadius * 0.8) / (config.maxHoverRadius * 0.2);
        ctx.globalAlpha = textAlpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillStyle = config.colors.textPrimary;
        ctx.fillText(this.data.name, this.x, this.y - 4);

        ctx.font = '400 8px Inter, sans-serif';
        ctx.fillStyle = config.colors.textSecondary;
        ctx.fillText(this.data.sector, this.x, this.y + 8);

        ctx.restore();
      }
    } else {
      ctx.arc(this.x, this.y, this.isNode ? this.currentRadius : config.baseRadius, 0, Math.PI * 2);
      if (this.isNode) {
        ctx.fillStyle = `rgba(139, 92, 246, ${this.alpha})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(139, 92, 246, ${this.alpha * 0.3})`;
        ctx.fill();
      }
    }
  }
}

export default function ParticleCanvas({ dotState }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const ambientRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const hoveredNodeRef = useRef(null);
  const animFrameRef = useRef(null);
  const dotStateRef = useRef(dotState);
  const startTimeRef = useRef(null);

  useEffect(() => {
    dotStateRef.current = dotState;
  }, [dotState]);

  const initParticles = useCallback((w, h) => {
    const particles = [];
    portfolio.forEach((company) => {
      particles.push(new Particle(w, h, true, company, particles));
    });
    const remaining = config.particleCount - portfolio.length;
    for (let i = 0; i < remaining; i++) {
      particles.push(new Particle(w, h, false));
    }
    particlesRef.current = particles;

    // Ambient dots — always visible
    const ambient = [];
    for (let i = 0; i < config.ambientCount; i++) {
      ambient.push(new AmbientDot(w, h));
    }
    ambientRef.current = ambient;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    const dpr = window.devicePixelRatio || 1;
    let width, height;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles(width, height);
    }

    function drawConnections() {
      const nodes = particlesRef.current.filter((p) => p.isNode);
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 250) {
            const alpha = (1 - dist / 250) * 0.15;
            ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate(now) {
      if (!startTimeRef.current) startTimeRef.current = now;
      const t = (now - startTimeRef.current) / 1000;

      ctx.fillStyle = config.colors.bg;
      ctx.fillRect(0, 0, width, height);

      // Draw ambient dots first (background layer)
      ambientRef.current.forEach((dot) => {
        dot.update(width, height, t);
        dot.draw(ctx, t);
      });

      drawConnections();

      particlesRef.current.sort((a, b) => {
        if (a === hoveredNodeRef.current) return 1;
        if (b === hoveredNodeRef.current) return -1;
        return 0;
      });

      const allP = particlesRef.current;
      allP.forEach((particle) => {
        particle.update(width, height, mouseRef.current, hoveredNodeRef, dotStateRef.current, allP);
        particle.draw(ctx);
      });

      animFrameRef.current = requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    }

    function onMouseOut() {
      mouseRef.current = { x: -1000, y: -1000 };
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseout', onMouseOut);

    resize();
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseout', onMouseOut);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
      }}
    />
  );
}
