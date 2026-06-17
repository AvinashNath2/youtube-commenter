import { useState, useEffect, useRef } from 'react'
import {
  Youtube, AlertCircle, MessageSquarePlus, CheckCircle,
  RefreshCw, Zap, Clock, ExternalLink, Pencil, Trash2,
  Plus, Home, MessageSquare,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
type Tab = 'home' | 'messages'
type CommentStatus = 'idle' | 'posting' | 'posted' | 'error'

interface CommentEntry {
  videoTitle: string
  videoUrl: string
  comment: string
  timestamp: number
}

// ── Defaults (used when storage is empty) ────────────────────────────────────
const STORE_LINKS = '\n\nAndroid: https://play.google.com/store/apps/details?id=com.gntfamily.timeline.net.in\niPhone: https://apps.apple.com/in/app/timeline-social-app/id6765680749'

export const DEFAULT_COMMENTS = [
  '🇮🇳 Building an Indian social network. Try it: timeline.net.in' + STORE_LINKS,
  '🇮🇳 Made in India social media. Check out timeline.net.in' + STORE_LINKS,
  "🇮🇳 Join India's new social platform at timeline.net.in" + STORE_LINKS,
  '🇮🇳 Building social media for India. Visit timeline.net.in' + STORE_LINKS,
  '🇮🇳 A social network built for Indians — timeline.net.in' + STORE_LINKS,
  "🇮🇳 India's own social platform is here: timeline.net.in" + STORE_LINKS,
  '🇮🇳 Creating the next Indian social network. Try timeline.net.in' + STORE_LINKS,
  '🇮🇳 Explore a homegrown Indian social app: timeline.net.in' + STORE_LINKS,
  '🇮🇳 Connecting India through social media. Visit timeline.net.in' + STORE_LINKS,
  '🇮🇳 Building India\'s social timeline. Join at timeline.net.in' + STORE_LINKS,
]

function timeAgo(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Page-injected function (self-contained, no outer-scope refs) ─────────────
async function injectYouTubeComment(comment: string): Promise<{
  success: boolean; error?: string; videoTitle?: string; videoUrl?: string
}> {
  const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

  const titleSelectors = [
    'h1.ytd-video-primary-info-renderer yt-formatted-string',
    '#above-the-fold #title h1 yt-formatted-string',
    'ytd-watch-metadata h1 yt-formatted-string',
    'ytd-video-primary-info-renderer h1 yt-formatted-string',
  ]
  let videoTitle = ''
  for (const s of titleSelectors) {
    const t = document.querySelector(s)?.textContent?.trim()
    if (t) { videoTitle = t; break }
  }
  if (!videoTitle) videoTitle = document.title.replace(' - YouTube', '').trim()
  const videoUrl = window.location.href

  window.scrollTo({ top: 900, behavior: 'smooth' })
  await delay(2000)

  const findPlaceholder = () =>
    document.querySelector<HTMLElement>('#simplebox #placeholder-area') ||
    document.querySelector<HTMLElement>('ytd-comment-simplebox-renderer #placeholder-area') ||
    document.querySelector<HTMLElement>('#placeholder-area')

  let placeholder = findPlaceholder()
  if (!placeholder) {
    window.scrollTo({ top: 1500, behavior: 'smooth' })
    await delay(2000)
    placeholder = findPlaceholder()
  }
  if (!placeholder) return { success: false, error: 'Comment section not visible. Scroll down first.', videoTitle, videoUrl }

  placeholder.click()
  await delay(1000)

  const editor =
    document.querySelector<HTMLElement>('#contenteditable-root[contenteditable="true"]') ||
    document.querySelector<HTMLElement>('ytd-comment-simplebox-renderer #contenteditable-root')

  if (!editor) return { success: false, error: 'Comment box did not open. Are you signed in?', videoTitle, videoUrl }

  editor.focus()
  const sel = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(editor)
  sel?.removeAllRanges()
  sel?.addRange(range)
  document.execCommand('insertText', false, comment)
  await delay(600)

  const submitBtn =
    document.querySelector<HTMLButtonElement>('#submit-button button') ||
    document.querySelector<HTMLButtonElement>('#submit-button yt-button-shape button') ||
    document.querySelector<HTMLButtonElement>('ytd-comment-simplebox-renderer #submit-button button')

  if (!submitBtn) return { success: false, error: 'Submit button not found.', videoTitle, videoUrl }
  submitBtn.click()
  return { success: true, videoTitle, videoUrl }
}
// ─────────────────────────────────────────────────────────────────────────────

// ══ Messages Tab ═════════════════════════════════════════════════════════════
function MessagesTab() {
  const [messages, setMessages] = useState<string[]>([])
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const addRef = useRef<HTMLTextAreaElement>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    chrome.storage.local.get('promoComments', (res) => {
      setMessages(res.promoComments?.length ? res.promoComments : DEFAULT_COMMENTS)
    })
  }, [])

  useEffect(() => {
    if (adding) addRef.current?.focus()
  }, [adding])

  useEffect(() => {
    if (editIdx !== null) editRef.current?.focus()
  }, [editIdx])

  function persist(updated: string[]) {
    setMessages(updated)
    chrome.storage.local.set({ promoComments: updated })
  }

  function startEdit(idx: number) {
    setAdding(false)
    setEditIdx(idx)
    setEditText(messages[idx])
  }

  function saveEdit() {
    if (!editText.trim() || editIdx === null) return
    const updated = [...messages]
    updated[editIdx] = editText.trim()
    persist(updated)
    setEditIdx(null)
  }

  function deleteMsg(idx: number) {
    persist(messages.filter((_, i) => i !== idx))
    if (editIdx === idx) setEditIdx(null)
  }

  function addMessage() {
    if (!newText.trim()) return
    persist([...messages, newText.trim()])
    setNewText('')
    setAdding(false)
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Promo Messages
        </p>
        <span className="text-[10px] bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
          {messages.length}
        </span>
      </div>

      {/* Message list */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
        {messages.map((msg, idx) =>
          editIdx === idx ? (
            /* ── Edit mode ── */
            <div key={idx} className="space-y-2 bg-gray-800/80 border border-red-500/40 rounded-xl p-2.5">
              <textarea
                ref={editRef}
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) saveEdit() }}
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-gray-100 resize-none focus:outline-none focus:border-red-500 leading-relaxed transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditIdx(null)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={!editText.trim()}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            /* ── View mode ── */
            <div key={idx} className="flex items-start gap-2 bg-gray-800/50 border border-gray-700/40 rounded-xl p-2.5">
              <p className="flex-1 text-xs text-gray-300 leading-relaxed whitespace-pre-line min-w-0">
                {msg}
              </p>
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => startEdit(idx)}
                  title="Edit"
                  className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:text-blue-400 hover:bg-gray-700 transition-all"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteMsg(idx)}
                  title="Delete"
                  className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        )}

        {messages.length === 0 && (
          <div className="text-center py-6 text-gray-600 text-xs">
            No messages yet. Add one below.
          </div>
        )}
      </div>

      {/* Add new */}
      {adding ? (
        <div className="space-y-2 bg-gray-800/60 border border-dashed border-gray-600 rounded-xl p-2.5">
          <textarea
            ref={addRef}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) addMessage() }}
            rows={3}
            placeholder="Type your promo message…"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:border-red-500 leading-relaxed transition-colors"
          />
          <p className="text-[10px] text-gray-600">⌘ + Enter to save</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setAdding(false); setNewText('') }}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addMessage}
              disabled={!newText.trim()}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setAdding(true); setEditIdx(null) }}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-dashed border-gray-700 text-gray-500 hover:border-red-500/50 hover:text-red-400 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add New Message
        </button>
      )}
    </div>
  )
}

type PageState = 'loading' | 'youtube-video' | 'youtube-other' | 'not-youtube'

// ══ Home Tab ═════════════════════════════════════════════════════════════════
function HomeTab() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [autoComment, setAutoComment] = useState(false)
  const [commentStatus, setCommentStatus] = useState<CommentStatus>('idle')
  const [lastComment, setLastComment] = useState('')
  const [lastTitle, setLastTitle] = useState('')
  const [commentError, setCommentError] = useState('')
  const [commentLog, setCommentLog] = useState<CommentEntry[]>([])

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      const url = tab?.url ?? ''
      if (url.includes('youtube.com/watch')) setPageState('youtube-video')
      else if (url.includes('youtube.com'))  setPageState('youtube-other')
      else                                   setPageState('not-youtube')
    })
    chrome.storage.local.get(['autoComment', 'commentLog'], (res) => {
      setAutoComment(!!res.autoComment)
      setCommentLog(res.commentLog ?? [])
    })
    const handler = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.commentLog) setCommentLog(changes.commentLog.newValue ?? [])
      if (changes.autoComment) setAutoComment(!!changes.autoComment.newValue)
    }
    chrome.storage.onChanged.addListener(handler)
    return () => chrome.storage.onChanged.removeListener(handler)
  }, [])

  function toggleAutoComment() {
    const next = !autoComment
    setAutoComment(next)
    chrome.storage.local.set({ autoComment: next })
  }

  async function postComment() {
    const res = await chrome.storage.local.get('promoComments')
    const pool: string[] = res.promoComments?.length ? res.promoComments : DEFAULT_COMMENTS
    const comment = pool[Math.floor(Math.random() * pool.length)]
    setLastComment(comment)
    setCommentStatus('posting')
    setCommentError('')
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error('No active tab')
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: injectYouTubeComment,
        args: [comment],
      })
      const data = result?.result as {
        success: boolean; error?: string; videoTitle?: string; videoUrl?: string
      } | undefined
      if (data?.success) {
        setLastTitle(data.videoTitle ?? '')
        setCommentStatus('posted')
        const entry: CommentEntry = {
          videoTitle: data.videoTitle ?? 'Unknown Video',
          videoUrl: data.videoUrl ?? '',
          comment,
          timestamp: Date.now(),
        }
        const stored = await chrome.storage.local.get('commentLog')
        const updated = [entry, ...(stored.commentLog ?? [])].slice(0, 30)
        chrome.storage.local.set({ commentLog: updated })
        setCommentLog(updated)
      } else {
        throw new Error(data?.error ?? 'Failed to post.')
      }
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Unknown error')
      setCommentStatus('error')
    }
  }

  const onVideo = pageState === 'youtube-video'

  return (
    <div className="p-4 space-y-3">

      {/* ── Page-state error banners (shown above everything when not on a video) ── */}
      {pageState === 'not-youtube' && (
        <div className="rounded-xl border border-red-800/60 bg-red-950/50 p-3.5 flex gap-3">
          <div className="w-8 h-8 rounded-full bg-red-900/60 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-red-300 mb-0.5">Wrong page</p>
            <p className="text-[11px] text-red-400/80 leading-relaxed">
              This extension only works on <span className="font-semibold text-red-300">YouTube</span>.
              Please open YouTube and navigate to a video.
            </p>
            <button
              onClick={() => chrome.tabs.create({ url: 'https://www.youtube.com' })}
              className="mt-2 text-[10px] font-semibold text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
            >
              Open YouTube →
            </button>
          </div>
        </div>
      )}

      {pageState === 'youtube-other' && (
        <div className="rounded-xl border border-yellow-800/50 bg-yellow-950/40 p-3.5 flex gap-3">
          <div className="w-8 h-8 rounded-full bg-yellow-900/50 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-yellow-300 mb-0.5">No video open</p>
            <p className="text-[11px] text-yellow-400/80 leading-relaxed">
              You're on YouTube but not on a video page. Open any video to post a comment.
            </p>
            <button
              onClick={() => chrome.tabs.create({ url: 'https://www.youtube.com/feed/trending' })}
              className="mt-2 text-[10px] font-semibold text-yellow-400 hover:text-yellow-300 underline underline-offset-2 transition-colors"
            >
              Browse trending →
            </button>
          </div>
        </div>
      )}

      {/* ── Auto-comment toggle — always visible ── */}
      <div
        onClick={toggleAutoComment}
        className="flex items-center justify-between bg-gray-800/60 border border-gray-700/50 rounded-xl px-3.5 py-3 cursor-pointer hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Zap className={`w-4 h-4 shrink-0 transition-colors ${autoComment ? 'text-red-400' : 'text-gray-500'}`} />
          <div>
            <p className="text-xs font-semibold text-gray-200 leading-tight">Auto Comment</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
              {autoComment ? 'ON — fires on every new video' : 'OFF — post manually below'}
            </p>
          </div>
        </div>
        <div className={`relative w-9 h-5 rounded-full shrink-0 transition-colors duration-200 ${autoComment ? 'bg-red-600' : 'bg-gray-700'}`}>
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${autoComment ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
      </div>

      {/* ── Comment history ── */}
      {commentLog.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 px-0.5">
            <Clock className="w-3 h-3 text-gray-600" />
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">History</p>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {commentLog.map((entry, i) => (
              <div key={i} className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-2.5">
                <div className="flex items-start gap-1.5">
                  <CheckCircle className="w-3 h-3 text-green-400 shrink-0 mt-px" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-xs text-gray-200 font-medium truncate leading-tight flex-1 min-w-0">
                        {entry.videoTitle}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] text-gray-600 whitespace-nowrap">{timeAgo(entry.timestamp)}</span>
                        {entry.videoUrl && (
                          <button
                            onClick={e => { e.stopPropagation(); chrome.tabs.create({ url: entry.videoUrl }) }}
                            className="text-gray-600 hover:text-red-400 transition-colors"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 italic leading-snug line-clamp-1">
                      "{entry.comment.replace('\n', ' ')}"
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Manual post — only when on a YouTube video ── */}
      {onVideo && (
        <>
          <div className="border-t border-gray-800/80" />
          <div className="space-y-2.5">

            {commentStatus === 'posting' && (
              <div className="flex items-start gap-2.5 bg-gray-800/60 rounded-xl p-3 border border-gray-700/40">
                <RefreshCw className="w-3.5 h-3.5 text-red-400 animate-spin mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Posting comment…</p>
                  <p className="text-[10px] text-gray-500 italic leading-snug line-clamp-2">
                    "{lastComment.replace('\n', ' ')}"
                  </p>
                </div>
              </div>
            )}

            {commentStatus === 'posted' && (
              <div className="bg-green-950/60 border border-green-700/40 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <p className="text-xs font-bold text-green-400">Comment posted!</p>
                </div>
                {lastTitle && <p className="text-[10px] text-gray-400 truncate">📺 {lastTitle}</p>}
                <p className="text-[10px] text-gray-400 italic leading-snug line-clamp-2">
                  "{lastComment.replace('\n', ' ')}"
                </p>
              </div>
            )}

            {commentStatus === 'error' && (
              <div className="bg-red-950/60 border border-red-700/40 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <p className="text-xs font-bold text-red-400">Failed to post</p>
                </div>
                <p className="text-[10px] text-gray-400 leading-snug">{commentError}</p>
              </div>
            )}

            <button
              onClick={postComment}
              disabled={commentStatus === 'posting'}
              className="w-full bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20"
            >
              {commentStatus === 'posting'
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Posting…</>
                : <><MessageSquarePlus className="w-3.5 h-3.5" /> Post Random Comment</>}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ══ Root App ═════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <div className="w-80 bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-700 to-red-500 px-4 py-3 flex items-center gap-2.5">
        <Youtube className="w-5 h-5 shrink-0" strokeWidth={2.5} />
        <span className="font-bold text-sm tracking-wide">YouTube Commenter</span>
      </div>

      {/* Tab bar */}
      <div className="flex bg-gray-900 border-b border-gray-800">
        <button
          onClick={() => setTab('home')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all border-b-2 ${
            tab === 'home'
              ? 'text-white border-red-500 bg-gray-900'
              : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/50'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          Home
        </button>
        <button
          onClick={() => setTab('messages')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all border-b-2 ${
            tab === 'messages'
              ? 'text-white border-red-500 bg-gray-900'
              : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Messages
        </button>
      </div>

      {/* Content */}
      {tab === 'home'     && <HomeTab />}
      {tab === 'messages' && <MessagesTab />}
    </div>
  )
}
