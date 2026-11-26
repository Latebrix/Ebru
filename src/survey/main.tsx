import { createRoot } from 'react-dom/client';
import '../brand/fonts.ts';
import '../site/site.css';
import './survey.css';
import { Survey } from './Survey.tsx';

createRoot(document.getElementById('root')!).render(<Survey />);
