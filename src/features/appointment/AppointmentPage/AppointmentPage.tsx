import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { ServiceStep } from '@/features/appointment/ServiceStep/ServiceStep'
import { DateTimeStep } from '@/features/appointment/DateTimeStep/DateTimeStep'
import { CustomerFormStep } from '@/features/appointment/CustomerFormStep/CustomerFormStep'
import { ConfirmationStep } from '@/features/appointment/ConfirmationStep/ConfirmationStep'
import { SuccessStep } from '@/features/appointment/SuccessStep/SuccessStep'
import { supabase } from '@/lib/supabase'
import { formatDateLong, formatTime, formatDuration, normalizePhone } from '@/utils/dateUtils'
import type { Service, WizardStep, AppointmentFormData } from '@/types/appointment'

interface WizardState {
  step: WizardStep
  service: Service | null
  date: string | null
  time: string | null
  customerName: string
  customerPhone: string
  appointmentId: string | null
}

const INITIAL_STATE: WizardState = {
  step: 'service',
  service: null,
  date: null,
  time: null,
  customerName: '',
  customerPhone: '',
  appointmentId: null,
}

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
  const [wizard, setWizard] = useState<WizardState>(INITIAL_STATE)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    const active = wizard.step === 'datetime' || wizard.step === 'form' || wizard.step === 'confirmation'
    onBookingFlowChange?.(active)
  }, [wizard.step, onBookingFlowChange])

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

  const handleFormSubmit = (customerName: string, customerPhone: string): void => {
    setWizard(prev => ({ ...prev, customerName, customerPhone, step: 'confirmation' }))
    setSubmitError(null)
  }

  const handleConfirm = async (): Promise<void> => {
    const { service, date, time, customerName, customerPhone } = wizard
    if (!service || !date || !time) return

    setIsSubmitting(true)
    setSubmitError(null)

    const { data: inserted, error } = await supabase.from('appointments').insert({
      customer_name: customerName,
      customer_phone: normalizePhone(customerPhone),
      service_id: service.id,
      appointment_date: date,
      appointment_time: time,
      status: 'pending',
    }).select('id').single()

    setIsSubmitting(false)

    if (error) {
      if (error.code === '23505') {
        setSubmitError('Bu saat az önce doldu. Lütfen başka bir saat seçin.')
        setWizard(prev => ({ ...prev, step: 'datetime', time: null }))
      } else {
        setSubmitError('Randevu oluşturulamadı. Lütfen tekrar deneyin.')
      }
      return
    }

    setWizard(prev => ({ ...prev, step: 'success', appointmentId: inserted?.id ?? null }))

    // Browser push notification
    if ('Notification' in window && Notification.permission !== 'denied') {
      const body = `${service.name} · ${formatDateLong(date)} ${formatTime(time)}`
      const show = () => {
        new Notification('Randevunuz Alındı! ✓', {
          body,
          icon: '/icons/icon-192x192.png',
        })
      }
      if (Notification.permission === 'granted') {
        show()
      } else {
        void Notification.requestPermission().then(perm => {
          if (perm === 'granted') show()
        })
      }
    }
  }

  const handleNewAppointment = (): void => {
    setWizard(INITIAL_STATE)
    setSubmitError(null)
  }

  const renderStep = (): ReactElement => {
    switch (wizard.step) {
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
            initialPhone={wizard.customerPhone}
            onSubmit={handleFormSubmit}
            onBack={() => { setWizard(prev => ({ ...prev, step: 'datetime' })) }}
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
