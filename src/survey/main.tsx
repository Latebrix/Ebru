import { createRoot } from 'react-dom/client';
import '../brand/fonts.ts';
import '../brand/ebru.css';
import './survey.css';
import { Survey } from './Survey.tsx';

createRoot(document.getElementById('root')!).render(<Survey />);
