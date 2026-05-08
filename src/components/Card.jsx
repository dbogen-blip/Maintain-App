import './Card.css'

export default function Card({ padding = 5, children, className = '', ...rest }) {
  return (
    <div className={`card card-pad-${padding} ${className}`} {...rest}>
      {children}
    </div>
  )
}
