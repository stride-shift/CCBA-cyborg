import { useState } from 'react'

function ChallengeCard({ challenge, isCompleted, onToggleComplete }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(true)
  }

  return (
    <div className="glassmorphism rounded-2xl overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl max-w-xl mx-auto">
      {/* Card Header */}
      <div className="glassmorphism backdrop-blur-md bg-white/20 p-6 border-b border-white/20">
        <h3 className="text-2xl font-bold text-gray-900 drop-shadow-md tracking-wide" style={{textShadow: '0 2px 8px rgba(0,0,0,0.18)'}}>{challenge.title}</h3>
      </div>

      {/* Card Content */}
      <div className="flex flex-col md:flex-row md:h-80">
        {/* Image Section */}
        <div className="w-full md:w-1/2 relative bg-white/10 h-48 md:h-full">
          {!imageError ? (
            <img
              src={challenge.image_url}
              alt={challenge.title}
              className={`w-full h-full object-cover transition-opacity duration-300 rounded-none ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-gray-900/60">
                <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                <div className="text-sm">Challenge Image</div>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-white/20 animate-pulse flex items-center justify-center rounded-none">
              <div className="text-gray-900/60 text-sm">Loading...</div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="w-full md:w-1/2 p-4 md:p-6 flex flex-col justify-between bg-white/15 min-h-[200px] md:min-h-0">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3" style={{textShadow: '0 2px 4px rgba(0,0,0,0.3)'}}>Challenge</h4>
            <p className="text-gray-900/90 leading-relaxed text-base" style={{textShadow: '0 1px 3px rgba(0,0,0,0.2)'}}>{challenge.description}</p>
          </div>

          {/* Completion Button */}
          <button
            onClick={onToggleComplete}
            className={`mt-4 px-6 py-3 rounded-full font-medium transition-all duration-300 w-full md:w-auto ${
              isCompleted
                ? 'bg-green-500 text-black hover:bg-green-600'
                : 'glassmorphism text-black hover:bg-white/25'
            }`}
          >
            {isCompleted ? (
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Completed
              </div>
            ) : (
              `Complete Challenge ${challenge.challenge_number}`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChallengeCard 