import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { PhoneStep } from '@/features/appointment/PhoneStep/PhoneStep'
import { WelcomeStep } from '@/features/appointment/WelcomeStep/WelcomeStep'
import { ServiceStep } from '@/features/appointment/ServiceStep/ServiceStep'
import { DateTimeStep } from '@/features/appointment/DateTimeStep/DateTimeStep'
import { CustomerFormStep } from '@/features/appointment/CustomerFormStep/CustomerFormStep'
import { ConfirmationStep } from '@/features/appointment/ConfirmationStep/ConfirmationStep'
import { SuccessStep } from '@/features/appointment/SuccessStep/SuccessStep'
import { supabase } from '@/lib/supabase'
import { formatDateLong, formatTime, formatDuration, normalizePhone } from '@/utils/dateUtils'
import { readSavedPhone, savePhone } from '@/utils/savedPhone'
import type { Service, WizardStep, AppointmentFormData } from '@/types/appointment'

interface WizardState {
  step: WizardStep
  service: Service | null
  date: string | null
  time: string | null
  customerName: string
  customerPhone: string
  // Karşılama ekranı için; müşteri listesindeki adın ilk kelimesi
  customerFirstName: string
  appointmentId: string | null
}

const INITIAL_STATE: WizardState = {
  step: 'phone',
  service: null,
  date: null,
  time: null,
  customerName: '',
  customerPhone: '',
  customerFirstName: '',
  appointmentId: null,
}

// Supabase'in satır güvenliği reddi: kayıtlı olmayan numarayla randevu (migration 015)
const RLS_VIOLATION_CODE = '42501'

// Progress percentage per step for the summary bar
const STEP_PROGRESS: Partial<Record<WizardStep, number>> = {
  datetime: 33,
  form: 66,
  confirmation: 100,
}

interface BookingSummaryBarProps {
  service: Service
  date: string | null
  time: string | null
  progress: number
}

function BookingSummaryBar({ service, date, time, progress }: BookingSummaryBarProps) {
  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center px-4 z-50">
      <div className="w-full max-w-md bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400 text-sm shrink-0">⏱</span>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{service.name}</p>
              <p className="text-gray-400 text-xs">{formatDuration(service.duration_minutes)}</p>
            </div>
          </div>
          {date !== null && time !== null && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-gray-400 text-sm">🗓</span>
              <div className="text-right">
                <p className="text-xs text-gray-300">{formatDateLong(date)}</p>
                <p className="font-semibold text-sm">{formatTime(time)}</p>
              </div>
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-2.5 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

interface AppointmentPageProps {
  onBookingFlowChange?: (active: boolean) => void
}

export function AppointmentPage({ onBookingFlowChange }: AppointmentPageProps = {}) {
  const [wizard, setWizard] = useState<WizardState>(() => ({ ...INITIAL_STATE, customerPhone: readSavedPhone() }))
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    const active = wizard.step === 'datetime' || wizard.step === 'form' || wizard.step === 'confirmation'
    onBookingFlowChange?.(active)
  }, [wizard.step, onBookingFlowChange])

  const handlePhoneVerified = (customerPhone: string, customerFirstName: string): void => {
    savePhone(customerPhone)
    setWizard(prev => ({ ...prev, customerPhone, customerFirstName, step: 'welcome' }))
  }

  const handleChangePhone = (): void => {
    setWizard(prev => ({ ...prev, step: 'phone' }))
  }

  const handleServiceSelect = (service: Service): void => {
    setWizard(prev => ({ ...prev, service, step: 'datetime', time: null }))
  }

  const handleDateChange = (date: string): void => {
    setWizard(prev => ({ ...prev, date, time: null }))
  }

  const handleTimeChange = (time: string): void => {
    setWizard(prev => ({ ...prev, time }))
  }

  const handleDateTimeContinue = (): void => {
    setWizard(prev => ({ ...prev, step: 'form' }))
  }

  const handleFormSubmit = (customerName: string): void => {
    setWizard(prev => ({ ...prev, customerName, step: 'confirmation' }))
    setSubmitError(null)
  }

  const handleConfirm = async (): Promise<void> => {
    const { service, date, time, customerName, customerPhone } = wizard
    if (!service || !date || !time) return

    setIsSubmitting(true)
    setSubmitError(null)

    const appointmentId = crypto.randomUUID()

    const { error } = await supabase.from('appointments').insert({
      id: appointmentId,
      customer_name: customerName,
      customer_phone: normalizePhone(customerPhone),
      service_id: service.id,
      appointment_date: date,
      appointment_time: time,
      status: 'pending',
    })

    setIsSubmitting(false)

    if (error) {
      if (error.code === '23505' || error.code === '23P01') {
        setSubmitError('Bu saat az önce doldu. Lütfen başka bir saat seçin.')
        setWizard(prev => ({ ...prev, step: 'datetime', time: null }))
      } else if (error.code === RLS_VIOLATION_CODE) {
        // Numara, randevu akışı sürerken müşteri listesinden çıkarılmış
        setSubmitError('Bu numara kayıtlı müşteri listemizde değil.')
      } else {
        setSubmitError('Randevu oluşturulamadı. Lütfen tekrar deneyin.')
      }
      return
    }

    // Bildirim izni burada değil, başarı ekranındaki düğmeyle istenir (SuccessStep):
    // iPhone izni yalnızca dokunmaya yanıt olarak sorar.
    setWizard(prev => ({ ...prev, step: 'success', appointmentId }))
  }

  // Numara az önce doğrulandığı için yeni randevu doğrudan hizmet seçimiyle başlar
  const handleNewAppointment = (): void => {
    setWizard(prev => ({
      ...INITIAL_STATE,
      step: 'service',
      customerPhone: prev.customerPhone,
      customerFirstName: prev.customerFirstName,
      customerName: prev.customerName,
    }))
    setSubmitError(null)
  }

  const renderStep = (): ReactElement => {
    switch (wizard.step) {
      case 'phone':
        return <PhoneStep initialPhone={wizard.customerPhone} onVerified={handlePhoneVerified} />

      case 'welcome':
        return (
          <WelcomeStep
            firstName={wizard.customerFirstName}
            phone={wizard.customerPhone}
            onContinue={() => { setWizard(prev => ({ ...prev, step: 'service' })) }}
            onChangePhone={handleChangePhone}
          />
        )

      case 'service':
        return <ServiceStep onSelect={handleServiceSelect} />

      case 'datetime':
        if (!wizard.service) return <ServiceStep onSelect={handleServiceSelect} />
        return (
          <DateTimeStep
            service={wizard.service}
            selectedDate={wizard.date}
            selectedTime={wizard.time}
            onDateChange={handleDateChange}
            onTimeChange={handleTimeChange}
            onContinue={handleDateTimeContinue}
            onBack={() => { setWizard(prev => ({ ...prev, step: 'service' })) }}
          />
        )

      case 'form':
        return (
          <CustomerFormStep
            initialName={wizard.customerName}
            phone={wizard.customerPhone}
            onSubmit={handleFormSubmit}
            onBack={() => { setWizard(prev => ({ ...prev, step: 'datetime' })) }}
            onChangePhone={handleChangePhone}
          />
        )

      case 'confirmation': {
        if (!wizard.service || !wizard.date || !wizard.time) {
          return <ServiceStep onSelect={handleServiceSelect} />
        }
        const formData: AppointmentFormData = {
          service: wizard.service,
          date: wizard.date,
          time: wizard.time,
          customerName: wizard.customerName,
          customerPhone: wizard.customerPhone,
        }
        return (
          <ConfirmationStep
            formData={formData}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onConfirm={() => { void handleConfirm() }}
            onBack={() => { setWizard(prev => ({ ...prev, step: 'form' })) }}
          />
        )
      }

      case 'success': {
        if (!wizard.service || !wizard.date || !wizard.time) {
          return <ServiceStep onSelect={handleServiceSelect} />
        }
        const formData: AppointmentFormData = {
          service: wizard.service,
          date: wizard.date,
          time: wizard.time,
          customerName: wizard.customerName,
          customerPhone: wizard.customerPhone,
        }
        return (
          <SuccessStep
            formData={formData}
            appointmentId={wizard.appointmentId}
            onNewAppointment={handleNewAppointment}
          />
        )
      }
    }
  }

  const summaryProgress = STEP_PROGRESS[wizard.step]

  return (
    <>
      <div key={wizard.step} className="animate-slide-up">
        {renderStep()}
      </div>
      {wizard.service !== null && summaryProgress !== undefined && (
        <BookingSummaryBar
          service={wizard.service}
          date={wizard.date}
          time={wizard.time}
          progress={summaryProgress}
        />
      )}
    </>
  )
}
