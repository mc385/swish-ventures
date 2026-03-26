import { useRef, useCallback, useState, useEffect } from 'react';
import ParticleCanvas from './components/ParticleCanvas';
import LogoReveal from './components/LogoReveal';
import './App.css';

export default function App() {
  const dotRef = useRef(null);
  const cursorRef = useRef(null);
  const cursorGlowRef = useRef(null);
  const [dotState, setDotState] = useState({ x: 0, y: 0, proximity: 0 });
  const [dotVisible, setDotVisible] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!dotRef.current) return;
    const rect = dotRef.current.getBoundingClientRect();
    const dotX = rect.left + rect.width / 2;
    const dotY = rect.top + rect.height / 2;
    const dx = e.clientX - dotX;
    const dy = e.clientY - dotY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = 250;
    const proximity = Math.max(0, 1 - dist / radius);
    setDotState({ x: dotX, y: dotY, proximity });
    setDotVisible(proximity < 0.15);

    if (cursorRef.current) {
      cursorRef.current.style.left = e.clientX + 'px';
      cursorRef.current.style.top = e.clientY + 'px';
    }
    if (cursorGlowRef.current) {
      cursorGlowRef.current.style.left = e.clientX + 'px';
      cursorGlowRef.current.style.top = e.clientY + 'px';
    }
  }, []);

  return (
    <div onMouseMove={handleMouseMove} className="app-root">
      <ParticleCanvas dotState={dotState} />
      <LogoReveal dotState={dotState} />

      <div ref={cursorGlowRef} className="cursor-glow" />
      <div ref={cursorRef} className="cursor-dot" />

      <div className={`ui-layer ${revealed ? 'revealed' : ''}`}>
        <div className="content">
          <h1 className="title reveal-fade reveal-1">
            <span>swish</span>
            <span>ventures<span ref={dotRef} className="dot" style={{ opacity: dotVisible ? 1 : 0 }}>.</span></span>
          </h1>

          <p className="tagline reveal-fade reveal-2">we help the <span className="underline-accent">winners win</span>.</p>
        </div>
      </div>
    </div>
  );
}
