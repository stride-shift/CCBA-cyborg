import { useState } from 'react'

function YouTubeVideo({ videoId, title, description, challengeType }) {
  const [isLoaded, setIsLoaded] = useState(false)

  if (!videoId) {
    return (
      <div className="p-4 text-center">
        <div className="text-white/40 mb-3">
          <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-white/80 mb-2">{title}</h3>
        {description && (
          <p className="text-white/50 text-sm mb-2">{description}</p>
        )}
        <p className="text-white/40 text-xs">Video coming soon</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden">
      {/* Habit Type Badge */}
      {challengeType && (
        <div className="flex items-center justify-between px-3 py-2 bg-slate-700/80">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-white/40"></div>
            <span className="text-white text-sm font-medium">{challengeType}</span>
          </div>
          <button className="text-white/60 hover:text-white">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
      )}
      
      <div className="relative aspect-video bg-gray-800">
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-700/50 animate-pulse flex items-center justify-center">
            <div className="text-white/50 text-sm">Loading video...</div>
          </div>
        )}
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&controls=1&disablekb=1&fs=1&iv_load_policy=3`}
          title={title}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsLoaded(true)}
        />
      </div>
      <div className="p-3 bg-slate-700/60">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description && (
          <p className="text-white/60 text-xs mt-1 line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  )
}

export default YouTubeVideo 