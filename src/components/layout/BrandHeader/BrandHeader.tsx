// Müşteri sayfalarının üstündeki logo ve dükkân adı
export function BrandHeader() {
  return (
    <div className="mb-8 flex items-center gap-4">
      <img
        src="/icons/mustafaAkkurthair.png"
        alt="Mustafa Akkurt"
        className="w-16 h-16 rounded-2xl object-cover shadow-sm"
      />
      <div>
        <h1 className="font-serif text-gray-900 text-3xl font-bold tracking-tight leading-tight">
          Mustafa Akkurt
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Online Randevu</p>
      </div>
    </div>
  )
}
