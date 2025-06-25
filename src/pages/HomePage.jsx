import { useEffect } from 'react'
import Layout from '../components/Layout'

function HomePage() {
  useEffect(() => {
    // Scroll to top immediately when home page loads
    window.scrollTo(0, 0)
    
    // Prevent scrolling on homepage - standard approach
    document.body.style.overflow = 'hidden'
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-6 py-8 h-full flex items-center">
        <div className="grid md:grid-cols-2 gap-8 items-center w-full">
          {/* Left Content */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Why Cyborg<br />Habits?
            </h1>
            
            <p className="text-base mb-6 leading-relaxed text-white/80">
              Cyborg Habits is a behavior change program designed to
              transform how employees interact with AI in their daily
              work. Unlike traditional AI training that focuses on technical
              skills, this program uses behavioral science principles to
              develop sustainable habits through brief activities.
            </p>
            
            <a
              href="/challenges"
              className="inline-flex items-center gap-2 glassmorphism px-8 py-3 rounded-full text-white font-semibold hover:bg-white/25 transition-all"
            >
              Get Started
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="space-y-3">
            <div className="glassmorphism rounded-2xl p-4">
              <p className="text-white text-base">
                A behavior change platform designed to help people effectively
                adopt AI in their workflow.
              </p>
            </div>
            
            <div className="glassmorphism rounded-2xl p-4">
              <p className="text-white text-base">
                A self-paced program focused on creating habits for interacting
                with AI rather than teaching technical skills.
              </p>
            </div>
            
            <div className="glassmorphism rounded-2xl p-4">
              <p className="text-white text-base">
                Stay ahead in your field by mastering AI collaboration techniques.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Circle Decoration */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
        <div className="w-96 h-96 rounded-full glassmorphism"></div>
      </div>
    </Layout>
  )
}

export default HomePage 