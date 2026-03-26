import styles from './Header.module.css';

const navLinks = ['Portfolio', 'Thesis', 'Network', 'Contact'];

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={`${styles.logo} interactive`}>
        <div className={styles.logoMark} />
        <span>Swish Ventures</span>
      </div>
      <nav className={`${styles.nav} interactive`}>
        {navLinks.map((link) => (
          <a key={link} href={`#${link.toLowerCase()}`} className={styles.navLink}>
            {link}
          </a>
        ))}
      </nav>
    </header>
  );
}
