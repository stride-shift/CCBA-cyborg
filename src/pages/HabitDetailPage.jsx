import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import Layout from '../components/Layout'

function HabitDetailPage() {
  const { habitId } = useParams()
  const [habitData, setHabitData] = useState(null)

  const habitsData = {
    'explain-it': {
      name: 'Explain It',
      title: 'Explain It Habit',
      description: 'Learn to clearly communicate complex ideas with AI assistance. Master the techniques to break down abstract concepts, translate technical jargon, and explain difficult topics to any audience.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Replace with actual video
      gradient: 'from-blue-500/70 to-blue-600/70',
      challenges: [
        { id: 1, title: 'Explain It', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop' },
        { id: 2, title: 'Get the Memo', image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop' },
        { id: 3, title: 'Simple Sticky', image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&h=300&fit=crop' },
        { id: 4, title: 'Power Pitch', image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop' },
        { id: 5, title: 'Simple Shift', image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop' }
      ]
    },
    'guide-it': {
      name: 'Guide It',
      title: 'Guide It Habit',
      description: 'Use AI to provide step-by-step guidance, making even the most complex tasks feel simple and manageable.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Replace with actual video
      gradient: 'from-teal-500/70 to-teal-600/70',
      challenges: [
        { id: 1, title: 'Step Navigator', image: 'https://images.unsplash.com/photo-1506818144585-74b29c980d4b?w=400&h=300&fit=crop' },
        { id: 2, title: 'Path Finder', image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop' },
        { id: 3, title: 'Route Master', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop' },
        { id: 4, title: 'Journey Guide', image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop' },
        { id: 5, title: 'Direction Setter', image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop' }
      ]
    },
    'suggest-it': {
      name: 'Suggest It',
      title: 'Suggest It Habit',
      description: 'With this habit, you will use AI to provide well-reasoned options with pros and cons, helping you make faster, smarter decisions—without the stress.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Replace with actual video
      gradient: 'from-pink-500/70 to-pink-600/70',
      challenges: [
        { id: 1, title: 'Option Explorer', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop' },
        { id: 2, title: 'Choice Advisor', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop' },
        { id: 3, title: 'Decision Helper', image: 'https://images.unsplash.com/photo-1560439514-4e9645039924?w=400&h=300&fit=crop' },
        { id: 4, title: 'Alternative Finder', image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&h=300&fit=crop' },
        { id: 5, title: 'Solution Scout', image: 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=400&h=300&fit=crop' }
      ]
    },
    'critique-it': {
      name: 'Critique It',
      title: 'Critique It Habit',
      description: 'You will use AI to help you challenge assumptions, spot risks, and uncover blind spots—so every idea is stronger before it\'s put into action.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Replace with actual video
      gradient: 'from-orange-500/70 to-orange-600/70',
      challenges: [
        { id: 1, title: 'Risk Spotter', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop' },
        { id: 2, title: 'Assumption Challenger', image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=400&h=300&fit=crop' },
        { id: 3, title: 'Blind Spot Finder', image: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=400&h=300&fit=crop' },
        { id: 4, title: 'Weakness Hunter', image: 'https://images.unsplash.com/photo-1552581234-26160f608093?w=400&h=300&fit=crop' },
        { id: 5, title: 'Flaw Detector', image: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=400&h=300&fit=crop' }
      ]
    },
    'plan-it': {
      name: 'Plan It',
      title: 'Plan It Habit',
      description: 'You\'ll use AI to help you create detailed, multi-step strategies tailored to your needs, ensuring nothing gets missed and every step is optimized.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Replace with actual video
      gradient: 'from-indigo-500/70 to-indigo-600/70',
      challenges: [
        { id: 1, title: 'Strategy Builder', image: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=300&fit=crop' },
        { id: 2, title: 'Goal Mapper', image: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&h=300&fit=crop' },
        { id: 3, title: 'Milestone Setter', image: 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=400&h=300&fit=crop' },
        { id: 4, title: 'Timeline Creator', image: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=400&h=300&fit=crop' },
        { id: 5, title: 'Action Planner', image: 'https://images.unsplash.com/photo-1434626881859-194d67b2b86f?w=400&h=300&fit=crop' }
      ]
    },
    'imagine-it': {
      name: 'Imagine It',
      title: 'Imagine It Habit',
      description: 'This AI habit helps you explore possibilities, test scenarios, and uncover innovative solutions—turning ideas into real opportunities.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Replace with actual video
      gradient: 'from-purple-500/70 to-purple-600/70',
      challenges: [
        { id: 1, title: 'Possibility Explorer', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop' },
        { id: 2, title: 'Scenario Tester', image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop' },
        { id: 3, title: 'Innovation Lab', image: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=400&h=300&fit=crop' },
        { id: 4, title: 'Idea Generator', image: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&h=300&fit=crop' },
        { id: 5, title: 'Vision Creator', image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=300&fit=crop' }
      ]
    },
    'improve-it': {
      name: 'Improve It',
      title: 'Improve It Habit',
      description: 'You\'ll use AI to catch weak spots, strengthen arguments, and make clearer, more confident decisions.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Replace with actual video
      gradient: 'from-green-500/70 to-green-600/70',
      challenges: [
        { id: 1, title: 'Weakness Finder', image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop' },
        { id: 2, title: 'Strength Builder', image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&h=300&fit=crop' },
        { id: 3, title: 'Clarity Enhancer', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=300&fit=crop' },
        { id: 4, title: 'Confidence Booster', image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop' },
        { id: 5, title: 'Excellence Driver', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop' }
      ]
    }
  }

  useEffect(() => {
    if (habitId && habitsData[habitId]) {
      setHabitData(habitsData[habitId])
    }
  }, [habitId])

  if (!habitData) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl text-white">Habit not found</h1>
          <Link to="/products" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
            Back to Products
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Hero Section with Title and Video */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Left Column - Title and Description */}
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${habitData.gradient} opacity-80`}>
                <span className="text-white font-medium text-sm">{habitData.name}</span>
              </div>
              
              <Link
                to="/products"
                className="inline-flex items-center gap-2 glassmorphism px-4 py-2 rounded-full text-white hover:bg-white/25 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm">Back to Habits</span>
              </Link>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight">
              {habitData.title}
            </h1>
            
            <p className="text-xl text-white/80 leading-relaxed">
              {habitData.description}
            </p>
          </div>

          {/* Right Column - Video */}
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-transform duration-500">
              <div className="aspect-w-16 aspect-h-9 glassmorphism">
                <iframe
                  src={`${habitData.videoUrl}?rel=0&modestbranding=1&showinfo=0&controls=1&disablekb=1&fs=1&iv_load_policy=3`}
                  title={`${habitData.name} Introduction`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                  style={{ minHeight: '400px' }}
                ></iframe>
              </div>
            </div>
            
            {/* Decorative element */}
            <div className={`absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-gradient-to-br ${habitData.gradient} opacity-20 blur-xl`}></div>
          </div>
        </div>

        {/* Challenges Section */}
        <div className="relative">
          {/* Section Header */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Complete These {habitData.name} Challenges
            </h2>
            <p className="text-xl text-white/60 leading-relaxed">
              Master each challenge in sequence to build your {habitData.name} habit. Each challenge builds upon the previous one, creating a powerful learning journey.
            </p>
          </div>

          {/* Challenge Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {habitData.challenges.map((challenge, index) => (
              <Link key={challenge.id} to={`/challenge/${habitId}/${challenge.id}`} className="group relative block">
                <div className="relative h-80 rounded-3xl overflow-hidden transform transition-all duration-500 hover:scale-[1.05] hover:shadow-2xl cursor-pointer">
                  {/* Background Image */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center transform transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(${challenge.image})` }}
                  />
                  {/* Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${habitData.gradient} opacity-90`} />
                  {/* Challenge Number */}
                  <div className="absolute top-6 right-6 w-12 h-12 rounded-full glassmorphism flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{index + 1}</span>
                  </div>
                  {/* Completion Check */}
                  <div className="absolute top-6 left-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-8">
                    <h3 className="text-2xl font-bold text-white mb-4 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      {challenge.title}
                    </h3>
                  </div>
                </div>
                {/* Progress indicator */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3/4 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-400 to-green-500 w-0 group-hover:w-full transition-all duration-1000"></div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Background decorations */}
        <div className="absolute top-20 right-0 w-96 h-96 rounded-full glassmorphism opacity-20"></div>
        <div className="absolute bottom-0 left-20 w-64 h-64 rounded-full glassmorphism opacity-30"></div>
      </div>
    </Layout>
  )
}

export default HabitDetailPage 