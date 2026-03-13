import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, RefreshCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type UpdateState = 'idle' | 'available' | 'downloading' | 'ready'

export function UpdateBanner(): JSX.Element | null {
  const { t } = useTranslation()
  const [state, setState] = useState<UpdateState>('idle')
  const [version, setVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsubAvailable = window.api.onUpdateAvailable((v) => {
      setVersion(v)
      setState('available')
      setDismissed(false)
    })

    const unsubProgress = window.api.onUpdateProgress((p) => {
      setProgress(p)
      setState('downloading')
    })

    const unsubDownloaded = window.api.onUpdateDownloaded((v) => {
      setVersion(v)
      setState('ready')
      setDismissed(false)
    })

    return () => {
      unsubAvailable()
      unsubProgress()
      unsubDownloaded()
    }
  }, [])

  const handleInstall = useCallback(() => {
    window.api.installUpdate()
  }, [])

  if (state === 'idle' || dismissed) return null

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-2 text-xs border-b',
      state === 'ready'
        ? 'bg-primary/10 border-primary/20 text-primary'
        : 'bg-muted/50 border-border/50 text-muted-foreground'
    )}>
      {state === 'available' && (
        <>
          <Download size={14} />
          <span>{t('update.available', 'Update v{{version}} is available. Downloading...', { version })}</span>
        </>
      )}

      {state === 'downloading' && (
        <>
          <RefreshCw size={14} className="animate-spin" />
          <span>{t('update.downloading', 'Downloading update... {{progress}}%', { progress })}</span>
          <div className="flex-1 max-w-[200px] h-1.5 bg-border/50 rounded-full overflow-hidden">
            <div className="h-full bg-primary/60 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      {state === 'ready' && (
        <>
          <Download size={14} />
          <span className="font-medium">{t('update.ready', 'v{{version}} is ready to install', { version })}</span>
          <button
            onClick={handleInstall}
            className="ml-auto px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            {t('update.installNow', 'Restart & Update')}
          </button>
        </>
      )}

      {state !== 'ready' && (
        <button
          onClick={() => setDismissed(true)}
          className="ml-auto p-0.5 hover:bg-accent rounded"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}
