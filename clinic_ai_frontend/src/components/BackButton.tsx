import { useNavigate } from 'react-router-dom'

export type BackButtonProps = {
  /**
   * Forces navigation to this exact path on click and ignores browser history.
   * Use for top-level sidebar pages where "back" should always anchor to a
   * fixed entry point (e.g. always go to `/dashboard`).
   */
  to?: string
  /** Optional explicit fallback path used when there is no browser history to go back to. */
  fallback?: string
  /** Optional CSS classes appended to the default styling. */
  className?: string
  /** Accessible label, defaults to "Go back". */
  ariaLabel?: string
}

/**
 * Generic "go back" button used in page headers.
 *
 * Default behavior is to use the browser history (`navigate(-1)`) so the user
 * always returns to wherever they came from. When the page is opened directly
 * with no history (deep link, fresh tab, refresh), the `fallback` path is used.
 *
 * Set `to` to override history entirely and always navigate to that path —
 * useful for top-level sidebar pages where back should always go to the
 * dashboard regardless of how the user got there.
 */
export default function BackButton({
  to,
  fallback = '/dashboard',
  className = '',
  ariaLabel = 'Go back',
}: BackButtonProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (to) {
      navigate(to)
      return
    }
    const hasHistory =
      typeof window !== 'undefined' && window.history && window.history.length > 1
    if (hasHistory) {
      navigate(-1)
      return
    }
    navigate(fallback)
  }

  return (
    <button
      aria-label={ariaLabel}
      className={`rounded-full p-2 text-[#006b2c] transition-all hover:bg-gray-50 ${className}`.trim()}
      onClick={handleClick}
      type="button"
    >
      <span className="material-symbols-outlined">arrow_back</span>
    </button>
  )
}
