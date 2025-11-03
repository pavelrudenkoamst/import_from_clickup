import styles from './Header.module.css';

export const Header = () => {
  return (
    <header className={styles.header}>
      <h1>GitHub → YouTrack Sync</h1>
      <p>Import and synchronize GitHub issues with YouTrack</p>
    </header>
  );
};

