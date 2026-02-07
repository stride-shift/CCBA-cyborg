import { useState } from 'react'

function LikertScale({ 
  question, 
  value, 
  onChange, 
  name, 
  options = [
    { value: 1, label: 'Never' },
    { value: 2, label: 'Rarely' },
    { value: 3, label: 'Sometimes' },
    { value: 4, label: 'Often' },
    { value: 5, label: 'Always' }
  ]
}) {
  const [hoveredValue, setHoveredValue] = useState(null)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">{question}</h3>
      
      <div className="space-y-3">
        {/* Mobile: Vertical stack */}
        <div className="md:hidden space-y-2">
          {options.map((option) => (
            <label
              key={option.value}
              className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                value === option.value
                  ? 'bg-[#C41E3A] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full mr-3 border-2 flex items-center justify-center ${
                value === option.value
                  ? 'border-white bg-white'
                  : 'border-gray-400'
              }`}>
                {value === option.value && (
                  <div className="w-2 h-2 rounded-full bg-[#C41E3A]"></div>
                )}
              </div>
              <span className="font-medium">{option.label}</span>
            </label>
          ))}
        </div>

        {/* Desktop: Horizontal scale */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between mb-2">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                onMouseEnter={() => setHoveredValue(option.value)}
                onMouseLeave={() => setHoveredValue(null)}
                className={`flex flex-col items-center p-3 rounded-lg transition-all min-w-[80px] ${
                  value === option.value
                    ? 'bg-[#C41E3A] text-white shadow-lg transform scale-105'
                    : hoveredValue === option.value
                    ? 'bg-red-100 text-[#C41E3A] shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2 ${
                  value === option.value
                    ? 'border-white bg-white'
                    : hoveredValue === option.value
                    ? 'border-[#C41E3A] bg-red-50'
                    : 'border-gray-400'
                }`}>
                  <span className={`text-sm font-bold ${
                    value === option.value ? 'text-[#C41E3A]' : 'text-gray-600'
                  }`}>
                    {option.value}
                  </span>
                </div>
                <span className="text-xs font-medium text-center">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Scale line */}
          <div className="relative mt-4">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full -translate-y-1/2"></div>
            <div className="flex justify-between relative">
              {options.map((option) => (
                <div
                  key={option.value}
                  className={`w-3 h-3 rounded-full transition-all ${
                    value === option.value
                      ? 'bg-[#C41E3A] shadow-lg'
                      : 'bg-gray-300'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LikertScale 