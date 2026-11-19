import { useState } from 'react';
import { Button, SearchField, Segmented } from '../../components';
import { PERIOD_OPTIONS as PERIODS } from '../../lib/dates.js';
import { TYPE_OPTIONS as TYPES } from '../../features/history/filterOptions.js';
import { KitRow, KitSection } from '../KitSection.jsx';

export function ControlsKit() {
  const [period, setPeriod] = useState('30d');
  const [type, setType] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fakeSubmit = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1400);
  };

  return (
    <>
      <KitSection id="buttons" title="Button" note="Primary pill, secondary fill, plain. 44px targets, pressed scale 0.97.">
        <KitRow label="Variants">
          <Button>Sign in</Button>
          <Button variant="secondary">View history</Button>
          <Button variant="plain">Cancel</Button>
        </KitRow>
        <KitRow label="With icon / link">
          <Button icon="sparkles">Analyze page</Button>
          <Button variant="secondary" icon="chevron-left" to="/_kit">
            Back
          </Button>
          <Button variant="plain" icon="external-link">
            Open source
          </Button>
        </KitRow>
        <KitRow label="Small">
          <Button size="sm">Save</Button>
          <Button size="sm" variant="secondary">
            Filter
          </Button>
          <Button size="sm" variant="plain" icon="log-out">
            Log out
          </Button>
        </KitRow>
        <KitRow label="States">
          <Button loading={loading} onClick={fakeSubmit}>
            {loading ? 'Signing in' : 'Click to load'}
          </Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </KitRow>
      </KitSection>

      <KitSection id="segmented" title="Segmented" note="Radio semantics; arrow keys move the thumb.">
        <KitRow label="Period">
          <Segmented options={PERIODS} value={period} onChange={setPeriod} ariaLabel="Time period" />
        </KitRow>
        <KitRow label="Small">
          <Segmented options={TYPES} value={type} onChange={setType} ariaLabel="Content type" size="sm" />
        </KitRow>
      </KitSection>

      <KitSection id="search" title="SearchField" note="Clear button appears with text; Escape clears.">
        <KitRow>
          <div className="kit-search">
            <SearchField value={query} onChange={setQuery} placeholder="Search titles or sources" ariaLabel="Search history" />
          </div>
        </KitRow>
      </KitSection>
    </>
  );
}
