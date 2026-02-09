import { useEffect } from 'react'
import Layout from '../components/Layout'

function HomePage() {
  useEffect(() => {
    // Scroll to top immediately when home page loads
    window.scrollTo(0, 0)
  }, [])

  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-6 py-12 min-h-[calc(100vh-200px)] flex items-center">
        <div className="grid md:grid-cols-2 gap-12 items-center w-full">
          {/* Left Content */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-black leading-tight">
              Why Cyborg<br />Habits?
            </h1>
            
            <p className="text-base md:text-lg mb-8 leading-relaxed text-black/80">
              Cyborg Habits is a behavior change program designed to
              transform how employees interact with AI in their daily
              work. Unlike traditional AI training that focuses on technical
              skills, this program uses behavioral science principles to
              develop sustainable habits through brief activities.
            </p>
            
            <a
              href="/challenges"
              className="inline-flex items-center gap-2 bg-[#F40009] px-8 py-4 rounded-full text-white font-semibold hover:bg-[#d00008] transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 border-2 border-[#F40009]/30"
            >
              Get Started
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="space-y-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-[#F40009]/10">
              <p className="text-gray-800 text-base leading-relaxed">
                A behavior change platform designed to help people effectively
                adopt AI in their workflow.
              </p>
            </div>
            
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-[#F40009]/10">
              <p className="text-gray-800 text-base leading-relaxed">
                A self-paced program focused on creating habits for interacting
                with AI rather than teaching technical skills.
              </p>
            </div>
            
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-[#F40009]/10">
              <p className="text-gray-800 text-base leading-relaxed">
                Stay ahead in your field by mastering AI collaboration techniques.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default HomePage 