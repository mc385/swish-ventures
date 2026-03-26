import styles from './Hero.module.css';

export default function Hero() {
  return (
    <main className={styles.hero}>
      <h1 className={styles.title}>
        <span>swish</span>
        <span>ventures.</span>
      </h1>
      <p className={styles.subtitle}>Illuminating the Future</p>
    </main>
  );
}
