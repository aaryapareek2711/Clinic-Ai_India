import { useCallback, useEffect, useRef, useState } from 'react'

import { getApiErrorMessage } from '../../lib/apiClient'
import { postClinicalAssistantChat, type ClinicalAssistantMessage } from '../../services/visitWorkflowApi'

const INTRO_MESSAGE =
  "Hello! I'm your AI clinical assistant. I can help with differential diagnoses, lab recommendations, treatment options, and red flags. How can I assist you with this patient's care?"

const SUGGESTIONS = [
  'What are the differential diagnoses?',
  'What labs should I order?',
  'Suggest treatment options',
  'What are the red flags?',
] as const

export type VisitClinicalAssistantDrawerProps = {
  open: boolean
  onClose: () => void
  visitId: string
  patientName: string
  /** Increment (e.g. header button) to expand from docked chip. */
  expandSignal?: number
  minimized: boolean
  onMinimizedChange: (minimized: boolean) => void
}

export default function VisitClinicalAssistantDrawer({
  open,
  onClose,
  visitId,
  patientName,
  expandSignal = 0,
  minimized,
  onMinimizedChange,
}: VisitClinicalAssistantDrawerProps) {
  const [maximized, setMaximized] = useState(false)
  const [messages, setMessages] = useState<ClinicalAssistantMessage[]>([
    { role: 'assistant', content: INTRO_MESSAGE },
  ])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      onMinimizedChange(false)
      setMaximized(false)
    }
  }, [open, onMinimizedChange])

  useEffect(() => {
    if (expandSignal > 0) {
      onMinimizedChange(false)
      setMaximized(false)
    }
  }, [expandSignal, onMinimizedChange])

  useEffect(() => {
    if (!open || minimized) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, minimized, onClose])

  useEffect(() => {
    setMessages([{ role: 'assistant', content: INTRO_MESSAGE }])
    setDraft('')
    setError(null)
  }, [visitId])

  useEffect(() => {
    if (!open || minimized) return
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, open, minimized, sending])

  const sendTurn = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim()
      if (!trimmed || !visitId || sending) return

      const nextHistory: ClinicalAssistantMessage[] = [...messages, { role: 'user', content: trimmed }]
      setMessages(nextHistory)
      setDraft('')
      setError(null)
      setSending(true)
      try {
        const { reply } = await postClinicalAssistantChat(visitId, nextHistory)
        setMessages([...nextHistory, { role: 'assistant', content: reply || '—' }])
      } catch (e) {
        setError(getApiErrorMessage(e))
        setMessages(nextHistory)
      } finally {
        setSending(false)
      }
    },
    [messages, visitId, sending],
  )

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      void sendTurn(draft)
    },
    [draft, sendTurn],
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendTurn(draft)
    }
  }

  const handleMinimize = () => {
    setMaximized(false)
    onMinimizedChange(true)
  }

  if (!open) return null

  if (minimized) {
    return (
      <div
        className="pointer-events-auto fixed bottom-6 right-6 z-[110] flex items-stretch overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
        role="region"
        aria-label="AI Clinical Assistant minimized"
      >
        <button
          className="flex items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-gray-50"
          onClick={() => onMinimizedChange(false)}
          type="button"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-white">
            <span className="material-symbols-outlined text-[22px]">smart_toy</span>
          </span>
          <span className="pr-1">
            <span className="block text-sm font-semibold text-[#171d16]">AI Assistant</span>
            <span className="block max-w-[200px] truncate text-xs text-[#575e70]">{patientName || 'Patient'}</span>
          </span>
          {sending ? (
            <span className="material-symbols-outlined ml-1 animate-pulse text-[20px] text-[#2563eb]">progress_activity</span>
          ) : null}
        </button>
        <button
          aria-label="Expand AI assistant"
          className="border-l border-gray-200 px-2 text-[#575e70] hover:bg-gray-50 hover:text-[#2563eb]"
          onClick={() => onMinimizedChange(false)}
          type="button"
        >
          <span className="material-symbols-outlined text-[22px]">unfold_more</span>
        </button>
        <button
          aria-label="Close AI assistant"
          className="border-l border-gray-200 px-3 text-[#575e70] hover:bg-red-50 hover:text-red-700"
          onClick={onClose}
          type="button"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
      </div>
    )
  }

  const asideHeight = maximized
    ? 'h-[calc(100dvh-5rem)] max-h-[calc(100dvh-5rem)] lg:h-[calc(100vh-5rem)] lg:max-h-[calc(100vh-5rem)]'
    : 'h-[calc(60vh+6.25rem)] max-h-[min(calc(60vh+6.25rem),calc(100dvh-5rem))] lg:h-[calc(60vh+6.25rem)] lg:max-h-[min(calc(60vh+6.25rem),calc(100vh-5rem))]'

  return (
    <>
      <button
        aria-label="Dismiss AI assistant"
        className="fixed inset-0 z-[105] bg-black/35 lg:hidden"
        onClick={onClose}
        type="button"
      />
      <aside
        className={`fixed bottom-3 left-3 right-3 z-[110] flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#bdcaba] bg-white shadow-lg lg:inset-x-auto lg:left-auto lg:right-3 lg:top-auto lg:bottom-4 lg:z-30 lg:w-[min(32vw,400px)] lg:max-w-[400px] ${asideHeight}`}
        role="complementary"
        aria-label="AI Clinical Assistant"
        aria-labelledby="clinical-assistant-title"
      >
        <div className="flex shrink-0 items-center justify-between bg-[#2563eb] px-3 py-2 text-white">
          <div className="flex min-w-0 items-center gap-2 pr-2">
            <span className="material-symbols-outlined shrink-0 text-[20px] leading-none">smart_toy</span>
            <h2 className="truncate text-sm font-semibold leading-tight tracking-tight" id="clinical-assistant-title">
              AI Clinical Assistant
            </h2>
          </div>
          <div
            className="flex shrink-0 items-center justify-center gap-0.5 rounded bg-black/15 px-0.5 py-0.5"
            role="toolbar"
            aria-label="Window controls"
          >
            <button
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-white/95 hover:bg-white/15"
              onClick={() => setMaximized((m) => !m)}
              type="button"
              aria-label={maximized ? 'Restore down' : 'Maximize'}
              title={maximized ? 'Restore' : 'Maximize'}
            >
              <span className="material-symbols-outlined text-[16px] leading-none">
                {maximized ? 'close_fullscreen' : 'open_in_full'}
              </span>
            </button>
            <button
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-white/95 hover:bg-white/15"
              onClick={handleMinimize}
              type="button"
              aria-label="Minimize"
              title="Minimize"
            >
              <span className="material-symbols-outlined text-[18px] leading-none relative top-px">horizontal_rule</span>
            </button>
            <button
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-white/95 hover:bg-red-500/80"
              onClick={onClose}
              type="button"
              aria-label="Close"
              title="Close"
            >
              <span className="material-symbols-outlined text-[16px] leading-none">close</span>
            </button>
          </div>
        </div>

        <p className="shrink-0 border-b border-gray-100 px-4 py-2 text-xs text-[#575e70]">
          Context: <span className="font-semibold text-[#171d16]">{patientName || 'Patient'}</span> · visit{' '}
          <span className="font-mono text-[11px]">{visitId}</span>
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" ref={listRef}>
          <div className="space-y-4">
            {messages.map((m, idx) => (
              <div
                key={`${idx}-${m.role}-${m.content.slice(0, 24)}`}
                className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {m.role === 'assistant' ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2563eb]">
                    <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                  </div>
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                    <span className="material-symbols-outlined text-[20px]">stethoscope</span>
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'assistant' ? 'bg-gray-100 text-[#171d16]' : 'bg-[#2563eb] text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-2 text-sm text-[#575e70]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2563eb]">
                  <span className="material-symbols-outlined animate-pulse text-[20px]">smart_toy</span>
                </div>
                <div className="rounded-2xl bg-gray-100 px-3 py-2">Thinking…</div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-gray-50/80 px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#575e70]">
            <span className="material-symbols-outlined text-[16px] text-amber-600">lightbulb</span>
            Suggestions:
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((label) => (
              <button
                key={label}
                className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-left text-xs font-medium text-[#171d16] transition-colors hover:border-[#2563eb] hover:text-[#2563eb] disabled:opacity-50"
                disabled={sending}
                onClick={() => void sendTurn(label)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
          <form className="flex gap-2" onSubmit={onSubmit}>
            <textarea
              className="min-h-[44px] flex-1 resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-[#171d16] placeholder:text-gray-400 focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
              disabled={sending}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about diagnoses, labs, treatments…"
              rows={2}
              value={draft}
            />
            <button
              className={`flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl text-white transition-colors disabled:opacity-40 ${
                draft.trim() && !sending ? 'bg-[#2563eb] hover:bg-blue-700' : 'bg-gray-300'
              }`}
              disabled={sending || !draft.trim()}
              type="submit"
              aria-label="Send"
            >
              <span className="material-symbols-outlined text-[22px]">send</span>
            </button>
          </form>
          <p className="mt-2 text-[11px] text-[#575e70]">Press Enter to send, Shift+Enter for new line</p>
          <p className="mt-1 text-[10px] leading-snug text-gray-400">
            AI suggestions are not medical advice. The treating clinician is solely responsible for decisions and
            documentation.
          </p>
        </div>
      </aside>
    </>
  )
}
