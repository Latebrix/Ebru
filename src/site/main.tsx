import { createRoot } from 'react-dom/client';
import '../brand/fonts.ts';
import './site.css';
import { Site } from './Site.tsx';

// Headlines are measured and split into letters, so the display face has to be there first.
const faces = Promise.all([
  document.fonts.load('500 80px "Stack Sans Headline Variable"'),
  document.fonts.load('400 17px "Stack Sans Text Variable"'),
]);
const patience = new Promise((done) => setTimeout(done, 1500));

void Promise.race([faces, patience])
  .catch(() => undefined)
  .then(() => createRoot(document.getElementById('root')!).render(<Site />));
