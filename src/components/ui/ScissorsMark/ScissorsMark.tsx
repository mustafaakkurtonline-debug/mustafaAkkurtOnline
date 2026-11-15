// Açılış animasyonundaki makasın (index.html #app-splash) uygulama içi hali:
// ince altın halka içinde, göründüğünde bir kez keser ve açık kalır; kesişte
// noktalı bir halka yayılır. Hareket azaltma açıksa açık halde sabit durur.
export function ScissorsMark() {
  return (
    <div className="mx-auto w-16 h-16 rounded-full border border-brand-400/40 flex items-center justify-center text-gray-900">
      <svg
        viewBox="0 0 120 120"
        className="w-10 h-10 overflow-visible"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle
          cx="60"
          cy="60"
          r="18"
          className="text-brand-400 [transform-box:fill-box] origin-center opacity-0 animate-welcome-ring motion-reduce:animate-none"
          strokeWidth="3"
          strokeDasharray="0.5 9"
        />
        <g className="[transform-box:view-box] origin-[60px_60px] [transform:rotate(14deg)] animate-welcome-snip-a motion-reduce:animate-none">
          <circle cx="24" cy="40" r="11" />
          <path d="M33.5 45 L60 60 L114 61.5 L62 64" />
        </g>
        <g className="[transform-box:view-box] origin-[60px_60px] [transform:rotate(-14deg)] animate-welcome-snip-b motion-reduce:animate-none">
          <circle cx="24" cy="80" r="11" />
          <path d="M33.5 75 L60 60 L114 58.5 L62 56" />
        </g>
        <circle cx="60" cy="60" r="4.5" className="text-brand-500" fill="currentColor" stroke="none" />
      </svg>
    </div>
  )
}
