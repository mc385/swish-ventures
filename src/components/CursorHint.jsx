import { useEffect, useState } from 'react';
import styles from './CursorHint.module.css';

export default function CursorHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hide = () => setVisible(false);
    window.addEventListener('mousemove', hide, { once: true });
    return () => window.removeEventListener('mousemove', hide);
  }, []);

  return (
    <div className={styles.hint} style={{ opacity: visible ? 1 : 0 }}>
      Explore the network
    </div>
  );
}
