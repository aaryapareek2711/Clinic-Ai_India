import { useCallback, useEffect, useRef, useState } from 'react'

import ClinicalAssistantMarkdown from '../../components/ClinicalAssistantMarkdown'
import { getApiErrorMessage } from '../../lib/apiClient'
import { postClinicalAssistantChat, type ClinicalAssistantMessage } from '../../services/visitWorkflowApi'

const INTRO_MESSAGE =
  "Hello! I'm your AI clinical assistant. I can help with differential diagnoses, lab recommendations, treatment options, and red flags. How can I assist you with this patient's care?"

const SUGGESTION_CHIPS = [
  { label: 'What labs should I order?', icon: 'science' },
  { label: 'What are the differential diagnoses?', icon: 'stethoscope' },
  { label: 'What are the red flags?', icon: 'flag' },
] as const

const SUGGESTION_CHIP_CLASS =
  'border-gray-200 bg-gray-100 text-[#575e70] hover:border-gray-300 hover:bg-gray-200/80'

const PANEL_WIDTH_DEFAULT = 400
const PANEL_WIDTH_MIN = 300
const PANEL_WIDTH_MAX = 720
const PANEL_HEIGHT_MIN = 360

function defaultPanelHeight() {
  if (typeof window === 'undefined') return 520
  return Math.round(Math.min(window.innerHeight * 0.65 + 100, window.innerHeight - 80))
}

function clampPanelWidth(w: number) {
  return Math.min(PANEL_WIDTH_MAX, Math.max(PANEL_WIDTH_MIN, w))
}

function clampPanelHeight(h: number) {
  const maxH = typeof window !== 'undefined' ? window.innerHeight - 80 : 900
  return Math.min(maxH, Math.max(PANEL_HEIGHT_MIN, h))
}

type PanelResizeEdge = 'top' | 'left' | 'top-left'

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
  const [panelWidth, setPanelWidth] = useState(PANEL_WIDTH_DEFAULT)
  const [panelHeight, setPanelHeight] = useState(defaultPanelHeight)
  const [messages, setMessages] = useState<ClinicalAssistantMessage[]>([
    { role: 'assistant', content: INTRO_MESSAGE },
  ])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [composerFocused, setComposerFocused] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const asideRef = useRef<HTMLElement | null>(null)
  const resizeSessionRef = useRef<{
    edge: PanelResizeEdge
    startX: number
    startY: number
    startW: number
    startH: number
  } | null>(null)

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
    setEditingIndex(null)
    setEditDraft('')
    setComposerFocused(false)
  }, [visitId])

  useEffect(() => {
    if (editingIndex === null) return
    const el = editTextareaRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [editingIndex])

  useEffect(() => {
    if (!open || minimized) return
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, open, minimized, sending])

  const sendTurn = useCallback(
    async (userText: string, baseHistory?: ClinicalAssistantMessage[]) => {
      const trimmed = userText.trim()
      if (!trimmed || !visitId || sending) return

      const history = baseHistory ?? messages
      const nextHistory: ClinicalAssistantMessage[] = [...history, { role: 'user', content: trimmed }]
      setMessages(nextHistory)
      setDraft('')
      setComposerFocused(false)
      setEditingIndex(null)
      setEditDraft('')
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

  const startEditMessage = useCallback(
    (index: number) => {
      if (sending || editingIndex !== null) return
      const msg = messages[index]
      if (!msg || msg.role !== 'user') return
      setEditingIndex(index)
      setEditDraft(msg.content)
      setError(null)
    },
    [messages, sending, editingIndex],
  )

  const cancelEditMessage = useCallback(() => {
    setEditingIndex(null)
    setEditDraft('')
  }, [])

  const submitEditMessage = useCallback(() => {
    if (editingIndex === null) return
    const trimmed = editDraft.trim()
    if (!trimmed) return
    const baseHistory = messages.slice(0, editingIndex)
    void sendTurn(trimmed, baseHistory)
  }, [editingIndex, editDraft, messages, sendTurn])

  const onEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditMessage()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitEditMessage()
    }
  }

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

  const showSuggestionChips = editingIndex === null && !draft.trim() && !composerFocused

  const openComposerForTyping = useCallback(() => {
    setComposerFocused(true)
    requestAnimationFrame(() => composerTextareaRef.current?.focus())
  }, [])

  const applySuggestionChip = useCallback(
    (label: string) => {
      setDraft(label)
      setComposerFocused(true)
      setError(null)
      requestAnimationFrame(() => composerTextareaRef.current?.focus())
    },
    [],
  )

  const handleMinimize = () => {
    setMaximized(false)
    onMinimizedChange(true)
  }

  const startEdgeResize = useCallback(
    (edge: PanelResizeEdge) => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const aside = asideRef.current
      if (!aside) return

      const rect = aside.getBoundingClientRect()
      resizeSessionRef.current = {
        edge,
        startX: e.clientX,
        startY: e.clientY,
        startW: rect.width,
        startH: rect.height,
      }
      setMaximized(false)

      const cursor =
        edge === 'top' ? 'ns-resize' : edge === 'left' ? 'ew-resize' : 'nwse-resize'
      document.body.style.cursor = cursor
      document.body.style.userSelect = 'none'
      e.currentTarget.setPointerCapture(e.pointerId)

      const onPointerMove = (ev: PointerEvent) => {
        const session = resizeSessionRef.current
        if (!session) return
        if (session.edge === 'left' || session.edge === 'top-left') {
          const deltaW = session.startX - ev.clientX
          setPanelWidth(clampPanelWidth(session.startW + deltaW))
        }
        if (session.edge === 'top' || session.edge === 'top-left') {
          const deltaH = session.startY - ev.clientY
          setPanelHeight(clampPanelHeight(session.startH + deltaH))
        }
      }

      const onPointerUp = (ev: PointerEvent) => {
        resizeSessionRef.current = null
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        e.currentTarget.releasePointerCapture(ev.pointerId)
        e.currentTarget.removeEventListener('pointermove', onPointerMove)
        e.currentTarget.removeEventListener('pointerup', onPointerUp)
        e.currentTarget.removeEventListener('pointercancel', onPointerUp)
      }

      e.currentTarget.addEventListener('pointermove', onPointerMove)
      e.currentTarget.addEventListener('pointerup', onPointerUp)
      e.currentTarget.addEventListener('pointercancel', onPointerUp)
    },
    [],
  )

  useEffect(() => {
    if (!open || minimized) return
    const onWindowResize = () => {
      setPanelHeight((h) => clampPanelHeight(h))
      setPanelWidth((w) => clampPanelWidth(w))
    }
    window.addEventListener('resize', onWindowResize)
    return () => window.removeEventListener('resize', onWindowResize)
  }, [open, minimized])

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
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#006b2c] text-white">
            <span className="material-symbols-outlined text-[22px]">smart_toy</span>
          </span>
          <span className="pr-1">
            <span className="block text-sm font-semibold text-[#171d16]">AI Assistant</span>
            <span className="block max-w-[200px] truncate text-xs text-[#575e70]">{patientName || 'Patient'}</span>
          </span>
          {sending ? (
            <span className="material-symbols-outlined ml-1 animate-pulse text-[20px] text-[#006b2c]">progress_activity</span>
          ) : null}
        </button>
        <button
          aria-label="Expand AI assistant"
          className="border-l border-gray-200 px-2 text-[#575e70] hover:bg-gray-50 hover:text-[#006b2c]"
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

  const asideSizeClass = maximized
    ? 'h-[calc(100dvh-5rem)] max-h-[calc(100dvh-5rem)] lg:h-[calc(100vh-5rem)] lg:max-h-[calc(100vh-5rem)] lg:w-[min(92vw,720px)]'
    : ''

  return (
    <>
      <button
        aria-label="Dismiss AI assistant"
        className="fixed inset-0 z-[105] bg-black/35 lg:hidden"
        onClick={onClose}
        type="button"
      />
      <aside
        ref={asideRef}
        className={`fixed bottom-3 left-3 right-3 z-[110] grid min-h-0 grid-rows-[auto_auto_minmax(5rem,1fr)_auto] overflow-hidden rounded-2xl border border-[#bdcaba] bg-white shadow-lg lg:inset-x-auto lg:left-auto lg:right-3 lg:top-auto lg:bottom-4 lg:z-30 lg:w-[var(--ca-panel-w,400px)] lg:max-w-[92vw] ${asideSizeClass}`}
        role="complementary"
        aria-label="AI Clinical Assistant"
        aria-labelledby="clinical-assistant-title"
        style={
          maximized
            ? undefined
            : ({
                height: panelHeight,
                maxHeight: 'calc(100dvh - 5rem)',
                ['--ca-panel-w' as string]: `${panelWidth}px`,
              } as React.CSSProperties)
        }
      >
        {!maximized ? (
          <>
            <div
              aria-label="Resize panel height"
              className="absolute inset-x-0 top-0 z-20 h-2 cursor-ns-resize touch-none hover:bg-[#006b2c]/10"
              onPointerDown={startEdgeResize('top')}
              role="separator"
              title="Drag top edge to resize height"
            />
            <div
              aria-label="Resize panel width"
              className="absolute bottom-0 left-0 top-0 z-20 hidden w-2 cursor-ew-resize touch-none hover:bg-[#006b2c]/10 lg:block"
              onPointerDown={startEdgeResize('left')}
              role="separator"
              title="Drag left edge to resize width"
            />
            <div
              aria-hidden
              className="absolute left-0 top-0 z-30 hidden h-3 w-3 cursor-nwse-resize touch-none lg:block"
              onPointerDown={startEdgeResize('top-left')}
              title="Drag corner to resize"
            />
          </>
        ) : null}
        <div className="flex shrink-0 items-center justify-between bg-[#006b2c] px-3 py-2 text-white">
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

        <div className="min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3" ref={listRef}>
          <div className="space-y-4">
            {messages.map((m, idx) => {
              const isUser = m.role === 'user'
              const isEditing = editingIndex === idx

              return (
              <div
                key={`msg-${idx}`}
                className={`group flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex w-full gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                {m.role === 'assistant' ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#006b2c]">
                    <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                  </div>
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                    <span className="material-symbols-outlined text-[20px]">stethoscope</span>
                  </div>
                )}
                    {isEditing ? (
                      <div className="flex w-full max-w-[85%] flex-col gap-2 rounded-2xl border border-[#006b2c]/40 bg-white p-2 shadow-sm">
                        <textarea
                          ref={editTextareaRef}
                          className="min-h-[72px] w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-[#171d16] focus:border-[#006b2c] focus:outline-none focus:ring-1 focus:ring-[#006b2c]"
                          disabled={sending}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={onEditKeyDown}
                          rows={3}
                          value={editDraft}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#575e70] hover:bg-gray-100 disabled:opacity-50"
                            disabled={sending}
                            onClick={cancelEditMessage}
                            type="button"
                          >
                            Cancel
                          </button>
                          <button
                            className="rounded-lg bg-[#006b2c] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#005a24] disabled:opacity-50"
                            disabled={sending || !editDraft.trim()}
                            onClick={submitEditMessage}
                            type="button"
                          >
                            Save & resend
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          m.role === 'assistant' ? 'bg-gray-100 text-[#171d16]' : 'bg-[#006b2c] text-white'
                        }`}
                      >
                        {m.role === 'assistant' ? (
                          <ClinicalAssistantMarkdown content={m.content} />
                        ) : (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {isUser && !isEditing ? (
                    <button
                      aria-label="Edit question"
                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-[#575e70] opacity-0 transition-opacity hover:bg-gray-100 hover:text-[#006b2c] group-hover:opacity-100 focus:opacity-100 disabled:pointer-events-none disabled:opacity-40"
                      disabled={sending || editingIndex !== null}
                      onClick={() => startEditMessage(idx)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      Edit
                    </button>
                  ) : null}
                </div>
              )
            })}
            {sending && (
              <div className="flex gap-2 text-sm text-[#575e70]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#006b2c]">
                  <span className="material-symbols-outlined animate-pulse text-[20px]">smart_toy</span>
                </div>
                <div className="rounded-2xl bg-gray-100 px-3 py-2">Thinking…</div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-gray-50/90 px-4 pb-4 pt-3">
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
          <div
            className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm focus-within:border-[#006b2c] focus-within:ring-1 focus-within:ring-[#006b2c]"
            id="clinical-assistant-composer"
          >
            <form className="flex items-start gap-2 p-2.5" onSubmit={onSubmit}>
              <button
                aria-label="Type your own question"
                className="mt-2 inline-flex shrink-0 rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-[#006b2c] disabled:opacity-50"
                disabled={sending || editingIndex !== null}
                onClick={openComposerForTyping}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px] leading-none">search</span>
              </button>
              <div
                className="relative min-h-[52px] min-w-0 flex-1"
                id="clinical-assistant-suggestions"
              >
                <textarea
                  ref={composerTextareaRef}
                  className="max-h-28 min-h-[52px] w-full resize-none overflow-y-auto border-0 bg-transparent px-0 py-1 text-sm leading-snug text-[#171d16] placeholder:text-gray-400 focus:outline-none focus:ring-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  disabled={sending || editingIndex !== null}
                  onBlur={() => {
                    if (!draft.trim()) setComposerFocused(false)
                  }}
                  onChange={(e) => setDraft(e.target.value)}
                  onFocus={() => setComposerFocused(true)}
                  onKeyDown={onKeyDown}
                  placeholder="You can click a suggestion or type your own"
                  rows={2}
                  value={draft}
                />
                {showSuggestionChips ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center gap-2 overflow-x-auto overflow-y-hidden bg-white px-0.5 py-1 [scrollbar-width:thin]">
                    {SUGGESTION_CHIPS.map((chip) => (
                      <button
                        key={chip.label}
                        className={`pointer-events-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-[11px] font-medium leading-snug whitespace-nowrap transition-colors disabled:opacity-50 ${SUGGESTION_CHIP_CLASS}`}
                        disabled={sending}
                        onClick={() => applySuggestionChip(chip.label)}
                        type="button"
                      >
                        <span className="material-symbols-outlined shrink-0 text-[16px] leading-none text-[#6d7a77]">
                          {chip.icon}
                        </span>
                        <span>{chip.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                className={`mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-colors disabled:opacity-40 ${
                  draft.trim() && !sending ? 'bg-[#006b2c] hover:bg-[#005a24]' : 'bg-gray-300'
                }`}
                disabled={sending || !draft.trim() || editingIndex !== null}
                type="submit"
                aria-label="Send"
              >
                <span className="material-symbols-outlined text-[22px]">send</span>
              </button>
            </form>
          </div>
          <p className="mt-2 text-[11px] text-[#575e70]">
            Tap a suggestion or type your question · Enter to send · Shift+Enter for new line
          </p>
        </div>
      </aside>
    </>
  )
}
