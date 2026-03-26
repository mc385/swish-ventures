import { useRef, useCallback, useState } from 'react';
import ParticleCanvas from './components/ParticleCanvas';
import LogoReveal from './components/LogoReveal';
import './App.css';

export default function App() {
  const dotRef = useRef(null);
  const [dotState, setDotState] = useState({ x: 0, y: 0, proximity: 0 });
  const [dotVisible, setDotVisible] = useState(true);

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
  }, []);

  return (
    <div onMouseMove={handleMouseMove}>
      <ParticleCanvas dotState={dotState} />
      <LogoReveal dotState={dotState} />
      <div className="ui-layer">
        <h1 className="title">
          <span>swish</span>
          <span>ventures<span ref={dotRef} className="dot" style={{ opacity: dotVisible ? 1 : 0, transition: 'opacity 0.4s ease' }}>.</span></span>
        </h1>
      </div>
    </div>
  );
}
