import 'antd/dist/reset.css';
import { Header } from './components/Header.jsx';
import { ImportForm } from './modules/ImportForm.jsx';
import './styles/index.css';
import styles from './App.module.css';

export const App = () => {
  return (
    <div className={styles.app}>
      <Header />
      <main className={styles.mainContent}>
        <div className={styles.container}>
          <ImportForm />
        </div>
      </main>
    </div>
  );
};

