// Beklenmeyen bir hata ekranı çökertirse beyaz sayfa yerine bu gösterilir.
// Hata Sentry'ye ayrıca raporlanır (main.tsx'teki ErrorBoundary).
export function CrashScreen() {
  return (
    <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center px-6 text-center">
      <p className="text-gray-900 font-semibold text-lg">Bir sorun oluştu</p>
      <p className="text-gray-500 text-sm mt-2 max-w-xs">
        Sayfayı yeniden yükleyin. Sorun devam ederse uygulamayı kapatıp tekrar açın.
      </p>
      <button
        type="button"
        onClick={() => { window.location.reload() }}
        className="mt-6 bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold text-sm cursor-pointer"
      >
        Yeniden Yükle
      </button>
    </div>
  )
}
