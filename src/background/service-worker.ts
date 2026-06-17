const STORE_LINKS = '\n\nAndroid: https://play.google.com/store/apps/details?id=com.gntfamily.timeline.net.in\niPhone: https://apps.apple.com/in/app/timeline-social-app/id6765680749'

const DEFAULT_COMMENTS = [
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

async function getComments(): Promise<string[]> {
  const res = await chrome.storage.local.get('promoComments')
  return res.promoComments?.length ? res.promoComments : DEFAULT_COMMENTS
}

// Self-contained — serialised and run inside the YouTube page
async function injectYouTubeComment(comment: string): Promise<{
  success: boolean
  error?: string
  videoTitle?: string
  videoUrl?: string
}> {
  const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

  // Grab title while we're in the page context
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
  if (!placeholder) {
    return { success: false, error: 'Comment section not visible. Scroll down first.', videoTitle, videoUrl }
  }

  placeholder.click()
  await delay(1000)

  const editor =
    document.querySelector<HTMLElement>('#contenteditable-root[contenteditable="true"]') ||
    document.querySelector<HTMLElement>('ytd-comment-simplebox-renderer #contenteditable-root')

  if (!editor) {
    return { success: false, error: 'Comment box did not open. Are you signed into YouTube?', videoTitle, videoUrl }
  }

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

  if (!submitBtn) {
    return { success: false, error: 'Submit button not found.', videoTitle, videoUrl }
  }

  submitBtn.click()
  return { success: true, videoTitle, videoUrl }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function isAutoCommentOn(): Promise<boolean> {
  const res = await chrome.storage.local.get('autoComment')
  return !!res.autoComment
}

async function appendLog(entry: {
  videoTitle: string; videoUrl: string; comment: string; timestamp: number
}) {
  const res = await chrome.storage.local.get('commentLog')
  const log: typeof entry[] = res.commentLog ?? []
  await chrome.storage.local.set({ commentLog: [entry, ...log].slice(0, 30) })
}

function showNotification(videoTitle: string, comment: string) {
  try {
    chrome.notifications.create(`yt-comment-${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: '✅ Comment Posted!',
      message: comment.replace('\n', ' '),
      contextMessage: videoTitle || 'YouTube Video',
    })
  } catch (e) {
    console.warn('[YouTube Commenter] Notification failed:', e)
  }
}

async function runAutoComment(tabId: number, url: string) {
  if (!await isAutoCommentOn()) return

  const key = `${tabId}:${url}`
  if ((globalThis as { _pending?: Set<string> })._pending?.has(key)) return
  if (!(globalThis as { _pending?: Set<string> })._pending) {
    (globalThis as { _pending?: Set<string> })._pending = new Set()
  }
  ;(globalThis as { _pending?: Set<string> })._pending!.add(key)

  try {
    const pool = await getComments()
    const comment = pool[Math.floor(Math.random() * pool.length)]
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: injectYouTubeComment,
      args: [comment],
    })
    const res = result?.result
    if (res?.success) {
      await appendLog({
        videoTitle: res.videoTitle ?? 'Unknown Video',
        videoUrl: res.videoUrl ?? url,
        comment,
        timestamp: Date.now(),
      })
      showNotification(res.videoTitle ?? '', comment)
    } else {
      console.warn('[Auto Comment] Failed:', res?.error)
    }
  } catch (err) {
    console.error('[Auto Comment] Error:', err)
  } finally {
    ;(globalThis as { _pending?: Set<string> })._pending!.delete(key)
  }
}

// ── Listeners ─────────────────────────────────────────────────────────────────

// SPA navigation (clicking video links inside YouTube)
chrome.webNavigation.onHistoryStateUpdated.addListener(
  ({ tabId, url }) => {
    if (url?.includes('youtube.com/watch')) runAutoComment(tabId, url)
  },
  { url: [{ hostEquals: 'www.youtube.com' }] },
)

// Fresh page load (opening YouTube in a new tab or hard refresh)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com/watch')) {
    runAutoComment(tabId, tab.url)
  }
})

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  // Always reset promo comments on install or update so new defaults take effect
  if (reason === 'install' || reason === 'update') {
    await chrome.storage.local.set({ promoComments: DEFAULT_COMMENTS })
  }
  console.log('[YouTube Commenter] Installed/Updated.')
})
