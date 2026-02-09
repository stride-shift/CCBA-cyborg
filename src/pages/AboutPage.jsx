import Layout from '../components/Layout'

function AboutPage() {
  return (
    <Layout>
      <div className="container mx-auto px-6 py-16">
        {/* Our Mission Badge */}
        <div className="mb-8">
          <div className="inline-block glassmorphism px-6 py-3 rounded-full">
            <span className="text-[#C41E3A] font-medium">Our Mission</span>
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-6xl font-bold mb-8" style={{ color: '#0a1628' }}>
          About Cyborg Habits
        </h1>

        {/* Description */}
        <p className="text-lg leading-relaxed max-w-4xl mb-16" style={{ color: '#0a1628' }}>
          Cyborg Habits isn't a traditional learning intervention targeted to a specific skill level or audience. Instead, Cyborg Habits are universally beneficial behaviors that anyone—regardless of their seniority, role, or familiarity with AI—can apply in their unique context for immediate and meaningful benefit. From entry-level staff to seasoned executives, everyone gains clarity and insight by embedding these habits into their daily workflow.
        </p>

        {/* The Science Behind Section */}
        <div className="mt-24 mb-20 relative">
          {/* Circle Decoration - positioned behind the title */}
          <div className="absolute left-0 top-0 w-64 h-64 rounded-full glassmorphism opacity-50"></div>
          
          {/* Title - centered and overlapping the circle */}
          <div className="relative z-10 text-center mb-16 pt-16">
            <h2 className="text-5xl md:text-6xl font-bold" style={{ color: '#0a1628' }}>
              The Science Behind Cyborg Habits
            </h2>
          </div>

          {/* Three Feature Cards */}
          <div className="grid md:grid-cols-3 gap-3 md:gap-4">
            {/* Habit-Based Learning */}
            <div className="glassmorphism rounded-2xl p-8">
              <div className="w-16 h-16 bg-[#F40009]/10 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-[#C41E3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#0a1628' }}>Habit-Based Learning</h3>
              <p className="text-gray-700">
                We focus on habit development rather than just skill acquisition, creating sustainable, automatic behaviors.
              </p>
            </div>

            {/* Cognitive Enhancement */}
            <div className="glassmorphism rounded-2xl p-8">
              <div className="w-16 h-16 bg-[#F40009]/10 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-[#C41E3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#0a1628' }}>Cognitive Enhancement</h3>
              <p className="text-gray-700">
                Our approach centers on enhancing your natural cognitive abilities with complementary AI capabilities.
              </p>
            </div>

            {/* Practical Application */}
            <div className="glassmorphism rounded-2xl p-8">
              <div className="w-16 h-16 bg-[#F40009]/10 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-[#C41E3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#0a1628' }}>Practical Application</h3>
              <p className="text-gray-700">
                Every habit is developed through real-world challenges and immediate practical application.
              </p>
            </div>
          </div>
        </div>

        {/* From Research to Reality */}
        <div className="mb-24">
          <h2 className="text-4xl font-bold text-center mb-16" style={{ color: '#0a1628' }}>
            From Research to Reality
          </h2>

          {/* Timeline */}
          <div className="relative max-w-4xl mx-auto">
            {/* Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gray-300"></div>

            {/* 2023 - Initial Research */}
            <div className="relative mb-16">
              <div className="flex items-center justify-end w-1/2 pr-8">
                <div className="glassmorphism rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#0a1628' }}>The Initial Research</h3>
                  <p className="text-gray-700">
                    Our team began researching patterns in how people interacted with early AI systems, identifying common challenges.
                  </p>
                </div>
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2 w-16 h-16 bg-white border-4 border-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">2023</span>
              </div>
            </div>

            {/* 2024 - Habit Framework */}
            <div className="relative mb-16">
              <div className="flex items-center justify-start w-full">
                <div className="w-1/2"></div>
                <div className="w-1/2 pl-8">
                  <div className="glassmorphism rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-2" style={{ color: '#0a1628' }}>Habit Framework</h3>
                    <p className="text-gray-700">
                      We developed the initial framework of essential habits for effective AI collaboration, based on cognitive and behavioral science.
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2 w-16 h-16 bg-white border-4 border-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">2024</span>
              </div>
              <div className="absolute right-0 top-1/2 transform translate-y-1/2 w-32 h-32 rounded-full glassmorphism opacity-30"></div>
            </div>

            {/* 2025 - Platform Launch */}
            <div className="relative">
              <div className="flex items-center justify-end w-1/2 pr-8">
                <div className="glassmorphism rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#0a1628' }}>Platform Launch</h3>
                  <p className="text-gray-700">
                    Cyborg Habits platform launched with interactive challenges to help users develop effective AI collaboration habits.
                  </p>
                </div>
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2 w-16 h-16 bg-white border-4 border-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">2025</span>
              </div>
            </div>

            {/* Bottom Circle Decoration */}
            <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full w-64 h-64 rounded-full glassmorphism opacity-20"></div>
          </div>
        </div>

        {/* Meet Our Team */}
        <div className="mt-32 mb-16">
          <h2 className="text-4xl font-bold text-center mb-16" style={{ color: '#0a1628' }}>
            Meet Our Team
          </h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Justin Germishuys */}
            <div className="glassmorphism rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-4">
                <img src="/api/placeholder/80/80" alt="Justin Germishuys" className="w-20 h-20 rounded-lg bg-gray-300" />
                <div>
                  <h3 className="text-2xl font-bold" style={{ color: '#0a1628' }}>Justin Germishuys</h3>
                  <p className="text-gray-600">AI Systems Reasoning Architect. Behavioral scientist and systems architect. Expert in human-AI collaboration. Designer of advanced reasoning systems.</p>
                </div>
              </div>
            </div>
            {/* Alison Jacobson */}
            <div className="glassmorphism rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-4">
                <img src="/api/placeholder/80/80" alt="Alison Jacobson" className="w-20 h-20 rounded-lg bg-gray-300" />
                <div>
                  <h3 className="text-2xl font-bold" style={{ color: '#0a1628' }}>Alison Jacobson</h3>
                  <p className="text-gray-600">AI-Enabled Strategist. Led digital transformation for global enterprises. Pioneer in outcomes-based strategy. Expert in organizational learning and human-AI augmentation.</p>
                </div>
              </div>
            </div>
            {/* Barbara Dale-Jones */}
            <div className="glassmorphism rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-4">
                <img src="/api/placeholder/80/80" alt="Barbara Dale-Jones" className="w-20 h-20 rounded-lg bg-gray-300" />
                <div>
                  <h3 className="text-2xl font-bold" style={{ color: '#0a1628' }}>Barbara Dale-Jones</h3>
                  <p className="text-gray-600">AI & Learning Systems Designer. Specialist in capability building. Leader in organizational development.</p>
                </div>
              </div>
            </div>
            {/* Stephen Green */}
            <div className="glassmorphism rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-4">
                <img src="/api/placeholder/80/80" alt="Stephen Green" className="w-20 h-20 rounded-lg bg-gray-300" />
                <div>
                  <h3 className="text-2xl font-bold" style={{ color: '#0a1628' }}>Stephen Green</h3>
                  <p className="text-gray-600">Enterprise AI & Customer Success Expert. Former CTO of Dimension Data, then NTT UK/Ireland. 30 years of enterprise technology experience. Expert in AI-enhanced decision systems.</p>
                </div>
              </div>
            </div>
            {/* Johannes Backer */}
            <div className="glassmorphism rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-4">
                <img src="/api/placeholder/80/80" alt="Johannes Backer" className="w-20 h-20 rounded-lg bg-gray-300" />
                <div>
                  <h3 className="text-2xl font-bold" style={{ color: '#0a1628' }}>Johannes Backer</h3>
                  <p className="text-gray-600">AI Analyst Developer. Changing the world one prompt at a time. Cyborg Skills coach.</p>
                </div>
              </div>
            </div>
            {/* Fanyana Nkosi */}
            <div className="glassmorphism rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-4">
                <img src="/api/placeholder/80/80" alt="Fanyana Nkosi" className="w-20 h-20 rounded-lg bg-gray-300" />
                <div>
                  <h3 className="text-2xl font-bold" style={{ color: '#0a1628' }}>Fanyana Nkosi</h3>
                  <p className="text-gray-600">Junior AI Analyst Developer. Rapid AI prototyping & automation. Cyborg Skills coach.</p>
                </div>
              </div>
            </div>
            {/* Kiyasha Singh */}
            <div className="glassmorphism rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-4">
                <img src="/api/placeholder/80/80" alt="Kiyasha Singh" className="w-20 h-20 rounded-lg bg-gray-300" />
                <div>
                  <h3 className="text-2xl font-bold" style={{ color: '#0a1628' }}>Kiyasha Singh</h3>
                  <p className="text-gray-600">Junior AI Analyst Developer. Rapid AI prototyping & automation. Cyborg Skills coach.</p>
                </div>
              </div>
            </div>
            {/* Shanne Saunders */}
            <div className="glassmorphism rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-4">
                <img src="/api/placeholder/80/80" alt="Shanne Saunders" className="w-20 h-20 rounded-lg bg-gray-300" />
                <div>
                  <h3 className="text-2xl font-bold" style={{ color: '#0a1628' }}>Shanne Saunders</h3>
                  <p className="text-gray-600">Client liaison. AI project controls and reporting.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AboutPage 