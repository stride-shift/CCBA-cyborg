import { useState } from 'react'

function DayTile({ day, isCompleted }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(true)
  }

  // Generate a consistent placeholder background based on day number
  const getPlaceholderBackground = (dayNumber) => {
    const backgrounds = [
      // Day 1 - Foundation (Purple/Blue)
      { gradient: 'from-purple-600 via-blue-600 to-indigo-700', pattern: 'foundation' },
      // Day 2 - Momentum (Blue/Cyan)
      { gradient: 'from-blue-600 via-cyan-500 to-teal-600', pattern: 'momentum' },
      // Day 3 - Consistency (Cyan/Teal)
      { gradient: 'from-cyan-500 via-teal-500 to-emerald-600', pattern: 'consistency' },
      // Day 4 - Resilience (Teal/Green)
      { gradient: 'from-teal-600 via-green-500 to-lime-600', pattern: 'resilience' },
      // Day 5 - Focus (Green/Lime)
      { gradient: 'from-green-600 via-lime-500 to-yellow-500', pattern: 'focus' },
      // Day 6 - Energy (Lime/Yellow)
      { gradient: 'from-lime-500 via-yellow-500 to-amber-600', pattern: 'energy' },
      // Day 7 - Reflection (Yellow/Orange)
      { gradient: 'from-yellow-500 via-amber-500 to-orange-600', pattern: 'reflection' },
      // Day 8 - Growth (Orange/Red)
      { gradient: 'from-orange-500 via-red-500 to-pink-600', pattern: 'growth' },
      // Day 9 - Connection (Red/Pink)
      { gradient: 'from-red-500 via-pink-500 to-rose-600', pattern: 'connection' },
      // Day 10 - Purpose (Pink/Purple)
      { gradient: 'from-pink-500 via-purple-500 to-violet-600', pattern: 'purpose' },
      // Day 11 - Creativity (Purple/Indigo)
      { gradient: 'from-purple-600 via-indigo-500 to-blue-700', pattern: 'creativity' },
      // Day 12 - Balance (Indigo/Blue)
      { gradient: 'from-indigo-600 via-blue-600 to-cyan-700', pattern: 'balance' },
      // Day 13 - Gratitude (Blue/Emerald)
      { gradient: 'from-blue-600 via-emerald-500 to-teal-700', pattern: 'gratitude' },
      // Day 14 - Integration (Emerald/Orange)
      { gradient: 'from-emerald-600 via-orange-500 to-red-700', pattern: 'integration' },
      // Day 15 - Transformation (Multi-color celebration)
      { gradient: 'from-purple-600 via-pink-500 via-orange-500 to-yellow-500', pattern: 'transformation' }
    ]
    return backgrounds[(dayNumber - 1) % backgrounds.length]
  }

  return (
    <div className="relative group cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10">
      <div className="w-80 h-48 bg-gray-800 rounded-xl overflow-hidden relative shadow-lg group-hover:shadow-2xl transition-shadow duration-300">
        {/* Completion Badge */}
        {isCompleted && (
          <div className="absolute top-3 right-3 z-20">
            <div className="bg-green-500 text-white rounded-full p-2 shadow-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}

        {/* Background Image or Placeholder */}
        {!imageError && day.image_url ? (
          <img
            src={day.image_url}
            alt={day.title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getPlaceholderBackground(day.day_number).gradient} relative`}>
            {/* Decorative pattern overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="w-full h-full" style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 2px, transparent 2px),
                  radial-gradient(circle at 80% 80%, rgba(255,255,255,0.2) 1px, transparent 1px),
                  linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)
                `,
                backgroundSize: '60px 60px, 40px 40px, 100px 100px'
              }}></div>
            </div>
            {/* Additional texture overlay */}
            <div className="absolute inset-0 opacity-5">
              <div className="w-full h-full" style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 2px,
                  rgba(255,255,255,0.1) 2px,
                  rgba(255,255,255,0.1) 4px
                )`
              }}></div>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {!imageLoaded && !imageError && day.image_url && (
          <div className="absolute inset-0 bg-gray-700 animate-pulse flex items-center justify-center">
            <div className="text-gray-400">Loading...</div>
          </div>
        )}

        {/* Always visible overlay for better text contrast */}
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>

        {/* Central Day Number - Visible when not hovering */}
        <div className="absolute inset-0 flex items-center justify-center z-20 group-hover:opacity-0 transition-opacity duration-300">
          <div className="text-center">
            <div className="text-8xl font-bold text-white drop-shadow-2xl">
              {day.day_number}
            </div>
          </div>
        </div>

        {/* Hover Overlay with Details */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 z-10">
          <div className="absolute inset-0 p-4 flex flex-col justify-center items-center text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <h3 className="text-white font-bold text-lg mb-3">{day.title}</h3>
            {day.description && (
              <p className="text-gray-200 text-sm leading-tight mb-4 px-2 line-clamp-3">
                {day.description.length > 80 ? day.description.substring(0, 80) + '...' : day.description}
              </p>
            )}
            <div className="flex items-center text-blue-400">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Start Challenge</span>
            </div>
          </div>
        </div>

        {/* Completion Overlay */}
        {isCompleted && (
          <div className="absolute inset-0 bg-green-500 bg-opacity-10 border-2 border-green-400 rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-transparent"></div>
          </div>
        )}

        {/* Progress indicator */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700">
          <div 
            className={`h-full transition-all duration-500 ${
              isCompleted ? 'bg-green-500 w-full' : 'bg-blue-500 w-0'
            }`}
          ></div>
        </div>
      </div>
    </div>
  )
}

export default DayTile 