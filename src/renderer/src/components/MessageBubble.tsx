import type { Message } from '@shared/types'
import { cn } from '../lib/utils'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps): JSX.Element {
  const isManager = message.role === 'manager'
  const isSystem = message.role === 'system'
  const isTool = message.role === 'tool'

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex', isManager ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
          isManager && 'bg-primary text-primary-foreground rounded-br-md',
          !isManager && !isTool && 'bg-secondary text-secondary-foreground rounded-bl-md',
          isTool && 'bg-muted text-muted-foreground rounded-bl-md text-xs font-mono'
        )}
      >
        {message.contentType === 'code' || isTool ? (
          <pre className="whitespace-pre-wrap break-words overflow-x-auto">
            <code>{message.content}</code>
          </pre>
        ) : (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        )}
        <div className={cn(
          'text-[10px] mt-1',
          isManager ? 'text-primary-foreground/60' : 'text-muted-foreground'
        )}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}
