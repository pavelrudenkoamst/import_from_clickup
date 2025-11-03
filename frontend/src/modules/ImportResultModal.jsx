import { Modal } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';
import styles from './ImportResultModal.module.css';

export const ImportResultModal = ({
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
              <span className={styles.statLabel}>Imported:</span>
              <span className={styles.statValue}>{result.imported}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Skipped:</span>
              <span className={styles.statValue}>{result.skipped}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Errors:</span>
              <span className={styles.statValue}>{result.errors}</span>
            </div>
          </div>
        </div>
      ) : result.noIssues ? (
        <div className={styles.warning}>
          <p>{result.message || 'There isn\'t any issues to import'}</p>
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

