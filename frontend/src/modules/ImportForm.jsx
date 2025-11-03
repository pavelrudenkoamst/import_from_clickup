import { useState } from 'react';
import { Spin } from 'antd';
import { AutocompleteInput } from '../components/AutocompleteInput.jsx';
import { Button } from '../components/Button.jsx';
import { importIssues } from '../services/import-api.js';
import { syncIssues } from '../services/sync-api.js';
import { ImportResultModal } from './ImportResultModal.jsx';
import { SyncResultModal } from './SyncResultModal.jsx';
import styles from './ImportForm.module.css';

export const ImportForm = () => {
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [formData, setFormData] = useState({
    owner: '',
    repo: ''
  });

  const handleOwnerChange = (value) => {
    setFormData({ owner: value, repo: '' });
  };

  const handleOwnerSelect = (value) => {
    setFormData(prev => ({ ...prev, owner: value, repo: '' }));
  };

  const handleRepoChange = (value) => {
    setFormData(prev => ({ ...prev, repo: value }));
  };

  const handleRepoSelect = (value) => {
    setFormData(prev => ({ ...prev, repo: value }));
  };

  const handleImport = async (e) => {
    e.preventDefault();
    setImporting(true);
    setImportResult(null);

    try {
      const data = await importIssues(formData.owner, formData.repo);
      setImportResult(data);
      setShowImportModal(true);
      setFormData({ owner: '', repo: '' });
    } catch (error) {
      setImportResult({
        success: false,
        error: error.message
      });
      setShowImportModal(true);
    } finally {
      setImporting(false);
    }
  };

  const handleSync = async (e) => {
    e.preventDefault();
    setSyncing(true);
    setSyncResult(null);

    try {
      const data = await syncIssues(formData.owner, formData.repo);
      
      if (data.needsImport) {
        setSyncResult({
          success: false,
          needsImport: true,
          message: data.message || 'You need to import issues before syncing. Please import issues first.'
        });
        setShowSyncModal(true);
      } else {
        setSyncResult(data);
        setShowSyncModal(true);
        setFormData({ owner: '', repo: '' });
      }
    } catch (error) {
      setSyncResult({
        success: false,
        error: error.message
      });
      setShowSyncModal(true);
    } finally {
      setSyncing(false);
    }
  };

  const isLoading = importing || syncing;

  return (
    <>
      <div className={styles.spinnerWrapper}>
        {isLoading && (
          <div className={styles.spinnerOverlay}>
            <Spin size="large" className={styles.customSpinner} />
          </div>
        )}
        <section className={styles.formSection}>
          <h2>Configuration</h2>
          <form onSubmit={handleImport}>
            <AutocompleteInput
              label="GitHub Owner/Organization:"
              id="owner"
              value={formData.owner}
              onChange={handleOwnerChange}
              onSelect={handleOwnerSelect}
              placeholder="e.g., JetBrains"
              type="owner"
            />

            <AutocompleteInput
              label="Repository Name:"
              id="repo"
              value={formData.repo}
              onChange={handleRepoChange}
              onSelect={handleRepoSelect}
              placeholder="e.g., youtrack-workflows"
              disabled={!formData.owner}
              owner={formData.owner}
              type="repo"
            />

            <div className={styles.buttonGroup}>
              <Button type="submit" disabled={importing || syncing}>
                {importing ? 'Importing...' : 'Import Issues'}
              </Button>
              <Button
                type="button"
                onClick={handleSync}
                disabled={syncing || importing || !formData.owner || !formData.repo}
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
          </form>
        </section>
      </div>

      <ImportResultModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        result={importResult}
      />

      <SyncResultModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        result={syncResult}
      />
    </>
  );
};

