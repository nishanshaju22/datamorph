const variants = {
  primary: 'bg-accent text-white hover:opacity-90 font-semibold',
  ghost: 'bg-transparent text-text-muted border border-border hover:border-accent hover:text-text-primary',
  danger: 'bg-red-950 text-danger hover:opacity-90 font-semibold',
}

export default function Button({ children, onClick, variant = 'primary', disabled, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-md text-sm transition-all duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${className}
      `}
    >
      {children}
    </button>
  )
}