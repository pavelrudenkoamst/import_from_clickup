import { Modal } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';
import styles from './SyncResultModal.module.css';

export const SyncResultModal = ({
  isOpen,
  onClose,
  result,
}) => {
  if (!result) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {result.success ? (
        <div className={styles.success}>
          <p>Success!</p>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Issues:</span>
              <span className={styles.statValue}>{result.total}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Updated:</span>
              <span className={styles.statValue}>{result.updated}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Skipped:</span>
              <span className={styles.statValue}>{result.skipped || 0}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Created:</span>
              <span className={styles.statValue}>{result.created}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Errors:</span>
              <span className={styles.statValue}>{result.errors}</span>
            </div>
          </div>
        </div>
      ) : result.needsImport ? (
        <div className={styles.warning}>
          <p>{result.message || 'You need to import issues before syncing.'}</p>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            Please use the "Import Issues" button first to import issues from GitHub to YouTrack.
          </p>
        </div>
      ) : (
        <div className={styles.error}>
          <p>Error!</p>
        </div>
      )}
      <div className={styles.modalActions}>
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};

