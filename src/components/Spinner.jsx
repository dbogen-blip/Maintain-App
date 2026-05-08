import './Spinner.css'

export default function Spinner({ size = 'md' }) {
  return (
    <div className={`spinner spinner-${size}`} aria-label="Laster">
      <div className="spinner-dot"></div>
      <div className="spinner-dot"></div>
      <div className="spinner-dot"></div>
    </div>
  )
}
