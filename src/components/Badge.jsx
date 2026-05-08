import './Badge.css'

export default function Badge({ variant = 'neutral', children, icon, ...rest }) {
  return (
    <span className={`badge badge-${variant}`} {...rest}>
      {children}
    </span>
  )
}
