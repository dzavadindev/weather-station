export function SectionHeading({ eyebrow, title, description, id, variant = 'section' }: {
  eyebrow: string
  title: string
  description: string
  id?: string
  variant?: 'section' | 'selected'
}) {
  return (
    <div className={variant === 'selected' ? 'selected-heading' : 'section-heading'}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}{variant === 'section' && <span className="heading-period">.</span>}</h2>
      </div>
      {variant === 'selected' ? <span className="selected-caption">{description}</span> : <p>{description}</p>}
    </div>
  )
}
