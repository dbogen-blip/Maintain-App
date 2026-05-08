import Icon from './Icon'
import './EmptyState.css'

export default function EmptyState({ icon = 'wrench', title, description, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={32} /></div>
      {title && <h3 className="empty-title">{title}</h3>}
      {description && <p className="empty-desc">{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  )
}
