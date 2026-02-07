function DayTile({ day, isCompleted }) {
  // Generate a consistent colorful background based on day number - Coca-Cola themed
  const getGradientBackground = (dayNumber) => {
    const backgrounds = [
      'from-red-600 to-red-800',        // Day 1
      'from-red-500 to-rose-700',       // Day 2
      'from-rose-600 to-pink-700',      // Day 3
      'from-red-700 to-orange-600',     // Day 4
      'from-orange-500 to-red-600',     // Day 5
      'from-red-600 to-rose-600',       // Day 6
      'from-rose-500 to-red-700',       // Day 7
      'from-red-800 to-rose-600',       // Day 8
      'from-rose-700 to-red-500',       // Day 9
      'from-red-500 to-pink-600',       // Day 10
      'from-pink-600 to-red-600',       // Day 11
      'from-red-600 to-rose-800',       // Day 12
      'from-rose-600 to-red-700',       // Day 13
      'from-red-700 to-pink-600',       // Day 14
      'from-pink-500 to-red-600',       // Day 15
    ]
    return backgrounds[(dayNumber - 1) % backgrounds.length]
  }

  return (
    <div className="relative group cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10">
      <div className={`w-full h-40 rounded-xl overflow-hidden relative shadow-lg group-hover:shadow-2xl transition-all duration-300 bg-gradient-to-br ${getGradientBackground(day.day_number)}`}>
        
        {/* Completion Badge */}
        {isCompleted && (
          <div className="absolute top-2 right-2 z-30">
            <div className="bg-white text-[#C41E3A] rounded-full p-1.5 shadow-lg">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}

        {/* Decorative bubbles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-2 left-4 w-8 h-8 bg-white/10 rounded-full"></div>
          <div className="absolute bottom-4 right-6 w-12 h-12 bg-white/5 rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-6 h-6 bg-white/10 rounded-full"></div>
        </div>

        {/* Central Day Number - Always visible */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-6xl font-bold text-white drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              {day.day_number}
            </div>
            {day.title && (
              <p className="text-white/90 text-xs mt-1 px-2 font-medium truncate max-w-[150px]">
                {day.title.replace(`Day ${day.day_number}: `, '').replace(`Day ${day.day_number}`, '')}
              </p>
            )}
          </div>
        </div>

        {/* Hover Overlay with Details */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 z-20">
          <div className="absolute inset-0 p-3 flex flex-col justify-center items-center text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <h3 className="text-white font-bold text-sm mb-2">{day.title || `Day ${day.day_number}`}</h3>
            <div className="flex items-center text-white bg-white/20 px-3 py-1.5 rounded-full">
              <span className="text-xs font-medium">Start Challenge</span>
              <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Completed overlay - red tint */}
        {isCompleted && (
          <div className="absolute inset-0 bg-white/20 border-2 border-white/60 rounded-xl z-5"></div>
        )}
      </div>
    </div>
  )
}

export default DayTile 