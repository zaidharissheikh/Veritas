import { useId } from 'react';
import { Icon } from '../Icon/Icon.jsx';
import './DemoChip.css';

const TIP = 'Scores on this screen are simulated by a mock analysis service, not real results.';

/** Honest "Demo data" marker required on every screen that shows scores. */
export function DemoChip({ className = '' }) {
  const tipId = useId();
  return (
    <span className={`demo-chip ${className}`.trim()} tabIndex={0} aria-describedby={tipId}>
      <Icon name="sparkles" size={13} />
      <span>Demo data</span>
      <span role="tooltip" id={tipId} className="demo-chip__tip">
        {TIP}
      </span>
    </span>
  );
}
