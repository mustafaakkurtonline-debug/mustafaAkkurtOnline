// Admin sayfaları yüklenirken ve oturum kontrol edilirken gösterilen tam ekran yükleme
export function RouteSpinner() {
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
