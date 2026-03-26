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
  particleCount: 250,
  baseRadius: 1.5,
  nodeRadius: 3,
  maxHoverRadius: 45,
  interactionRadius: 80,
  baseSpeed: 0.3,
  colors: {
    bg: '#07050A',
    particle: 'rgba(139, 92, 246, 0.12)',
    nodeIdle: 'rgba(139, 92, 246, 0.4)',
    textPrimary: '#FFFFFF',
    textSecondary: '#8E8D98',
  },
};

class Particle {
  constructor(width, height, isNode, data = null) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * config.baseSpeed;
    this.vy = (Math.random() - 0.5) * config.baseSpeed;
    this.angle = Math.random() * Math.PI * 2;
    this.angleSpeed = Math.random() * 0.02 + 0.005;
    this.isNode = isNode;
    this.data = data;
    this.currentRadius = isNode ? config.nodeRadius : config.baseRadius;
    this.targetRadius = this.currentRadius;
    this.alpha = isNode ? 0.8 : Math.random() * 0.5 + 0.1;
  }

  update(width, height, mouse, hoveredRef) {
    this.angle += this.angleSpeed;
    this.x += this.vx + Math.sin(this.angle) * 0.2;
    this.y += this.vy + Math.cos(this.angle) * 0.2;

    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;

    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (this.isNode) {
      if (distance < config.interactionRadius) {
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
      if (distance < config.interactionRadius) {
        const force = (config.interactionRadius - distance) / config.interactionRadius;
        this.x -= dx * force * 0.02;
        this.y -= dy * force * 0.02;
        this.alpha = Math.min(1, this.alpha + 0.05);
      } else {
        this.alpha = Math.max(0.1, this.alpha - 0.01);
      }
    }
  }

  draw(ctx) {
    ctx.beginPath();

    if (this.isNode && this.currentRadius > config.nodeRadius + 1) {
      // Expanded node
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

      // Glow border
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.filter = 'blur(6px)';
      ctx.stroke();
      ctx.restore();

      // Sharp border
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text labels
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
      // Default particle/node
      ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
      if (this.isNode) {
        ctx.fillStyle = config.colors.nodeIdle;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(139, 92, 246, ${this.alpha * 0.3})`;
        ctx.fill();
      }
    }
  }
}

export default function ParticleCanvas() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const hoveredNodeRef = useRef(null);
  const animFrameRef = useRef(null);

  const initParticles = useCallback((w, h) => {
    const particles = [];
    portfolio.forEach((company) => {
      particles.push(new Particle(w, h, true, company));
    });
    const remaining = config.particleCount - portfolio.length;
    for (let i = 0; i < remaining; i++) {
      particles.push(new Particle(w, h, false));
    }
    particlesRef.current = particles;
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

    function animate() {
      ctx.fillStyle = config.colors.bg;
      ctx.fillRect(0, 0, width, height);

      drawConnections();

      particlesRef.current.sort((a, b) => {
        if (a === hoveredNodeRef.current) return 1;
        if (b === hoveredNodeRef.current) return -1;
        return 0;
      });

      particlesRef.current.forEach((particle) => {
        particle.update(width, height, mouseRef.current, hoveredNodeRef);
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
    animate();

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
