import { useState } from 'react'

function YouTubeVideo({ videoId, title, description, challengeType }) {
  const [isLoaded, setIsLoaded] = useState(false)

  if (!videoId) {
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