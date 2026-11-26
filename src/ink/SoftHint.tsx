import { useEffect, useState } from 'react';
import { onSoftware } from './quality.ts';
import './softhint.css';

const KEY = 'ebru-soft-hint';

function dismissed(): boolean {
  try {
    return sessionStorage.getItem(KEY) === 'off';
  } catch {
    return false;
  }
}

/** Says why the pictures are softer when a computer draws them without its graphics card. */
export function SoftHint() {
  const [on, setOn] = useState(false);
  useEffect(() => onSoftware(() => setOn(!dismissed() && window.matchMedia('(pointer: fine)').matches)), []);
  if (!on) return null;
  return (
    <p className="soft-hint" role="status">
      <span>
        This browser is drawing without the graphics card, so the ink is softer. Close the browser completely and open it again, or turn on hardware acceleration in its settings.
      </span>
      <button
        type="button"
        aria-label="Hide this note"
        onClick={() => {
          setOn(false);
          try {
            sessionStorage.setItem(KEY, 'off');
          } catch {
            // It only comes back with the next page.
          }
        }}
      >
        ×
      </button>
    </p>
  );
}
