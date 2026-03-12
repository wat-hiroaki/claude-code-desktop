import { Component, type ReactNode, type ErrorInfo } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, RotateCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackMessage?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

function ErrorFallback({
  error,
  fallbackMessage,
  onReset
}: {
  error: Error | null
  fallbackMessage?: string
  onReset: () => void
}): JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <AlertTriangle size={32} className="text-yellow-500" />
      <div>
        <h3 className="text-sm font-semibold mb-1">
          {t('error.somethingWrong', 'Something went wrong')}
        </h3>
        <p className="text-xs text-muted-foreground max-w-[300px]">
          {fallbackMessage ?? error?.message ?? t('error.unexpected', 'An unexpected error occurred')}
        </p>
      </div>
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
      >
        <RotateCw size={12} />
        {t('error.tryAgain', 'Try Again')}
      </button>
    </div>
  )
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          fallbackMessage={this.props.fallbackMessage}
          onReset={this.handleReset}
        />
      )
    }
    return this.props.children
  }
}
