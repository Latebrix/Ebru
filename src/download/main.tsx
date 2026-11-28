import { createRoot } from 'react-dom/client';
import '../brand/fonts.ts';
import '../brand/ebru.css';
import './download.css';
import { Download } from './Download.tsx';

createRoot(document.getElementById('root')!).render(<Download />);
