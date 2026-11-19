/** One labelled block on the /_kit page. */
export function KitSection({ id, title, note, children }) {
  return (
    <section className="kit-section" id={id} aria-labelledby={`${id}-title`}>
      <header className="kit-section__header">
        <h2 id={`${id}-title`} className="kit-section__title">
          {title}
        </h2>
        {note && <p className="kit-section__note">{note}</p>}
      </header>
      <div className="kit-section__body">{children}</div>
    </section>
  );
}

export function KitRow({ label, children, wrap = true }) {
  return (
    <div className="kit-row">
      {label && <span className="kit-row__label">{label}</span>}
      <div className={`kit-row__items${wrap ? ' kit-row__items--wrap' : ''}`}>{children}</div>
    </div>
  );
}
