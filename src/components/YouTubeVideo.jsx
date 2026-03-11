import { useState, useRef } from 'react'

const SUPABASE_VIDEO_BASE = 'https://mkvczghwutluguygixhx.supabase.co/storage/v1/object/public/videos'

// Map habit types and video scopes to self-hosted MP4 filenames
const SELF_HOSTED_VIDEOS = {
  'imagine_it': `${SUPABASE_VIDEO_BASE}/imagine-it.mp4`,
  'explain_it': `${SUPABASE_VIDEO_BASE}/explain-it.mp4`,
  'suggest_it': `${SUPABASE_VIDEO_BASE}/suggest-it.mp4`,
  'improve_it': `${SUPABASE_VIDEO_BASE}/improve-it.mp4`,
  'critique_it': `${SUPABASE_VIDEO_BASE}/critique-it.mp4`,
  'plan_it': `${SUPABASE_VIDEO_BASE}/plan-it.mp4`,
  'guide_it': `${SUPABASE_VIDEO_BASE}/guide-it.mp4`,
  'intro': `${SUPABASE_VIDEO_BASE}/cyborg-habits-introduction-1.mp4`,
}

function YouTubeVideo({ videoId, videoUrl, title, description, challengeType }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const videoRef = useRef(null)

  // Normalize challengeType: "Explain It" → "explain_it"
  const normalizedType = challengeType?.toLowerCase().replace(/\s+/g, '_')
  const selfHostedUrl = videoUrl || (normalizedType && SELF_HOSTED_VIDEOS[normalizedType]) || null

  if (!selfHostedUrl) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-900/40 mb-3">
          <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900/80 mb-2">{title}</h3>
        {description && (
          <p className="text-gray-900/50 text-sm mb-2">{description}</p>
        )}
        <p className="text-gray-900/40 text-xs">Video coming soon</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl">
      <div className="relative aspect-video bg-gray-100">
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="text-gray-400 text-sm">Loading video...</div>
          </div>
        )}
        <video
          ref={videoRef}
          src={selfHostedUrl}
          title={title}
          className="w-full h-full"
          controls
          controlsList="nodownload"
          playsInline
          preload="metadata"
          onLoadedData={() => setIsLoaded(true)}
        />
      </div>
      {(title || description) && (
        <div className="px-3 py-2">
          {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
          {description && (
            <p className="text-gray-600 text-xs mt-1 line-clamp-2">{description}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default YouTubeVideo
