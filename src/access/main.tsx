import { createRoot } from 'react-dom/client';
import '../brand/fonts.ts';
import '../brand/ebru.css';
import './access.css';
import { Access } from './Access.tsx';

createRoot(document.getElementById('root')!).render(<Access />);
