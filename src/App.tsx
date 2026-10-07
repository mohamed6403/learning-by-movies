import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useSettings } from './db/settings';
import { useTheme } from './hooks/useTheme';
import { ImportPage } from './pages/ImportPage';
import { LibraryPage } from './pages/LibraryPage';
import { ReviewPage } from './pages/ReviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';
import { TitlePage } from './pages/TitlePage';

export function App() {
  const { theme } = useSettings();
  useTheme(theme);

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LibraryPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="title/:id" element={<TitlePage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
