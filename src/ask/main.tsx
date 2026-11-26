import { createRoot } from 'react-dom/client';
import '../brand/fonts.ts';
import '../brand/ebru.css';
import './ask.css';
import { Ask } from './Ask.tsx';

createRoot(document.getElementById('root')!).render(<Ask />);
