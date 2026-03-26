import ParticleCanvas from './components/ParticleCanvas';
import LogoReveal from './components/LogoReveal';
import './App.css';

export default function App() {
  return (
    <>
      <ParticleCanvas />
      <LogoReveal />
      <div className="ui-layer">
        <h1 className="title">
          <span>swish</span>
          <span>ventures.</span>
        </h1>
      </div>
    </>
  );
}
