import Icon from './Icon'
import './Button.css'

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled,
  children,
  ...rest
}) {
  const cls = `btn btn-${variant} btn-${size}${loading ? ' btn-loading' : ''}`
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} />}
    </button>
  )
}
