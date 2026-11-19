import { Card, Icon } from '../../components';
import './StatTile.css';

/**
 * One Overview stat. `children` is the value area (a big number, a Gauge…),
 * `detail` the quiet line underneath.
 */
export function StatTile({ label, icon, detail, className = '', children, ...rest }) {
  return (
    <Card className={`stat-tile ${className}`.trim()} {...rest}>
      <div className="stat-tile__head">
        <h2 className="stat-tile__label">{label}</h2>
        {icon && <Icon name={icon} size={18} className="stat-tile__icon" />}
      </div>
      <div className="stat-tile__value">{children}</div>
      {detail && <div className="stat-tile__detail">{detail}</div>}
    </Card>
  );
}

/** Large tabular number used by the simple count tiles. */
export function StatNumber({ value, unit }) {
  return (
    <span className="stat-number">
      <span className="stat-number__value tabular">{value}</span>
      {unit && <span className="stat-number__unit">{unit}</span>}
    </span>
  );
}
