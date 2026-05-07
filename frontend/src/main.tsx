import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initDebugLogger } from './lib/debugLogger';

initDebugLogger();
document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(<App />);
