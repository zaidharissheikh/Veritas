import './Card.css';

/**
 * Surface container. `padding` md | lg | none; `interactive` adds hover lift
 * and press feedback for cards that act as links or buttons.
 */
export function Card({
  as: Tag = 'section',
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...rest
}) {
  const classes = ['card', `card--pad-${padding}`, interactive && 'card--interactive', className]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
