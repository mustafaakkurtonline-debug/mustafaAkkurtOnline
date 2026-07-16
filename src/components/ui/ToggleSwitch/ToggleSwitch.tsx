interface ToggleSwitchProps {
  checked: boolean
  onChange: () => void
  label: string
}

// Erişilebilir aç/kapa anahtarı. Görsel boyut 44×24; before katmanı
// dokunma hedefini 44px yüksekliğe tamamlar (mobil dokunma kuralı).
export function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full shrink-0 cursor-pointer transition-colors duration-200 before:absolute before:-inset-x-1 before:-inset-y-2.5 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
        checked ? 'bg-brand-500' : 'bg-gray-300'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
