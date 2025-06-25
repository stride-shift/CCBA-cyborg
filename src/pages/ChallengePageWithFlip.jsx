import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'

const mockHabitData = {
  'explain-it': {
    name: 'Explain It',
    tag: 'Explain It',
    challenges: [
      {
        id: 1,
        title: 'Explain It',
        image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Explain a complex idea simply.',
        reflectionPrompt: 'How did you simplify the idea?'
      },
      {
        id: 2,
        title: 'Get the Memo',
        image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Summarize a memo for your team.',
        reflectionPrompt: 'What was the key message?'
      },
      {
        id: 3,
        title: 'Simple Sticky',
        image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Make a sticky note summary of a topic.',
        reflectionPrompt: 'How did condensing the topic help you?'
      },
      {
        id: 4,
        title: 'Power Pitch',
        image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Pitch an idea in under 60 seconds.',
        reflectionPrompt: 'What was most challenging about being concise?'
      },
      {
        id: 5,
        title: 'Simple Shift',
        image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Reframe a technical topic for a non-expert.',
        reflectionPrompt: 'How did your explanation change?'
      }
    ]
  },
  'guide-it': {
    name: 'Guide It',
    tag: 'Guide It',
    challenges: [
      {
        id: 1,
        title: 'Step Navigator',
        image: 'https://images.unsplash.com/photo-1506818144585-74b29c980d4b?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Guide your team step by step.',
        reflectionPrompt: 'How did this experience help your team?'
      },
      {
        id: 2,
        title: 'Path Finder',
        image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Find the best path forward.',
        reflectionPrompt: 'What new perspectives did you gain?'
      },
      {
        id: 3,
        title: 'Route Master',
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Map out a process for a new task.',
        reflectionPrompt: 'What did you learn about the process?'
      },
      {
        id: 4,
        title: 'Journey Guide',
        image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Guide someone through a workflow.',
        reflectionPrompt: 'How did guiding help your understanding?'
      },
      {
        id: 5,
        title: 'Direction Setter',
        image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Set clear directions for a project.',
        reflectionPrompt: 'What was most important in setting direction?'
      }
    ]
  },
  'suggest-it': {
    name: 'Suggest It',
    tag: 'Suggest It',
    challenges: [
      {
        id: 1,
        title: 'Option Explorer',
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Explore multiple options for a decision.',
        reflectionPrompt: 'How did considering options help your choice?'
      },
      {
        id: 2,
        title: 'Choice Advisor',
        image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Advise a friend on a tough choice.',
        reflectionPrompt: 'What advice did you find most useful?'
      },
      {
        id: 3,
        title: 'Decision Helper',
        image: 'https://images.unsplash.com/photo-1560439514-4e9645039924?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Use AI to help make a decision.',
        reflectionPrompt: 'How did AI influence your decision?'
      },
      {
        id: 4,
        title: 'Alternative Finder',
        image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Find alternatives to a current plan.',
        reflectionPrompt: 'What new alternatives did you discover?'
      },
      {
        id: 5,
        title: 'Solution Scout',
        image: 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Scout for solutions to a problem.',
        reflectionPrompt: 'Which solution was most promising?'
      }
    ]
  },
  'critique-it': {
    name: 'Critique It',
    tag: 'Critique It',
    challenges: [
      {
        id: 1,
        title: 'Risk Spotter',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Spot risks in a new idea.',
        reflectionPrompt: 'What risks did you identify?'
      },
      {
        id: 2,
        title: 'Assumption Challenger',
        image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Challenge assumptions in a plan.',
        reflectionPrompt: 'Which assumption was most surprising?'
      },
      {
        id: 3,
        title: 'Blind Spot Finder',
        image: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Find blind spots in your thinking.',
        reflectionPrompt: 'How will you address these blind spots?'
      },
      {
        id: 4,
        title: 'Weakness Hunter',
        image: 'https://images.unsplash.com/photo-1552581234-26160f608093?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Hunt for weaknesses in a proposal.',
        reflectionPrompt: 'What did you learn from the weaknesses?'
      },
      {
        id: 5,
        title: 'Flaw Detector',
        image: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Detect flaws in a process.',
        reflectionPrompt: 'How can you improve the process?'
      }
    ]
  },
  'plan-it': {
    name: 'Plan It',
    tag: 'Plan It',
    challenges: [
      {
        id: 1,
        title: 'Strategy Builder',
        image: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Build a strategy for a project.',
        reflectionPrompt: 'What was your biggest insight?'
      },
      {
        id: 2,
        title: 'Goal Mapper',
        image: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Map out your goals for the month.',
        reflectionPrompt: 'Which goal is most important to you?'
      },
      {
        id: 3,
        title: 'Milestone Setter',
        image: 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Set milestones for a long-term plan.',
        reflectionPrompt: 'How will you track your progress?'
      },
      {
        id: 4,
        title: 'Timeline Creator',
        image: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Create a timeline for your project.',
        reflectionPrompt: 'What could delay your timeline?'
      },
      {
        id: 5,
        title: 'Action Planner',
        image: 'https://images.unsplash.com/photo-1434626881859-194d67b2b86f?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Plan the next actions for your team.',
        reflectionPrompt: 'What is your first step?'
      }
    ]
  },
  'imagine-it': {
    name: 'Imagine It',
    tag: 'Imagine It',
    challenges: [
      {
        id: 1,
        title: 'Possibility Explorer',
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Explore new possibilities for a project.',
        reflectionPrompt: 'What was the most creative idea?'
      },
      {
        id: 2,
        title: 'Scenario Tester',
        image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Test different scenarios for a plan.',
        reflectionPrompt: 'Which scenario surprised you most?'
      },
      {
        id: 3,
        title: 'Innovation Lab',
        image: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Brainstorm innovative solutions.',
        reflectionPrompt: 'What made your solution unique?'
      },
      {
        id: 4,
        title: 'Idea Generator',
        image: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Generate ideas for a challenge.',
        reflectionPrompt: 'Which idea are you most excited about?'
      },
      {
        id: 5,
        title: 'Vision Creator',
        image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Create a vision for your project.',
        reflectionPrompt: 'How will you bring your vision to life?'
      }
    ]
  },
  'improve-it': {
    name: 'Improve It',
    tag: 'Improve It',
    challenges: [
      {
        id: 1,
        title: 'Weakness Finder',
        image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Find weaknesses in your plan.',
        reflectionPrompt: 'How will you address these weaknesses?'
      },
      {
        id: 2,
        title: 'Strength Builder',
        image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Build on your strengths.',
        reflectionPrompt: 'What strengths did you discover?'
      },
      {
        id: 3,
        title: 'Clarity Enhancer',
        image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Enhance clarity in your work.',
        reflectionPrompt: 'How did you make things clearer?'
      },
      {
        id: 4,
        title: 'Confidence Booster',
        image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Boost your confidence in a skill.',
        reflectionPrompt: 'What helped you feel more confident?'
      },
      {
        id: 5,
        title: 'Excellence Driver',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
        reflectionImage: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&h=400&fit=crop',
        description: 'Drive for excellence in your work.',
        reflectionPrompt: 'What will you do to maintain excellence?'
      }
    ]
  }
}

export default function ChallengePageWithFlip() {
  const { habitId, challengeId } = useParams()
  const [flipped, setFlipped] = useState(false)
  const [reflection, setReflection] = useState('')
  const habit = mockHabitData[habitId] || mockHabitData['guide-it']
  const challenge = habit.challenges.find(c => String(c.id) === String(challengeId)) || habit.challenges[0]

  return (
    <Layout>
      <style>{`
        .flip-card {
          perspective: 2000px;
        }
        .flip-card-inner {
          transition: transform 0.7s cubic-bezier(.4,2,.6,1);
          transform-style: preserve-3d;
          position: relative;
        }
        .flip-card.flipped .flip-card-inner {
          transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          display: flex;
        }
        .flip-card-front {
          z-index: 2;
        }
        .flip-card-back {
          transform: rotateY(180deg);
          z-index: 3;
        }
      `}</style>
      <div className="w-full max-w-6xl mx-auto px-4 pt-12 pb-24 z-10">
        <Link to={`/habits/${habitId}`} className="inline-flex items-center text-white/80 hover:text-white mb-8 transition-colors group">
          <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-lg font-medium">Back to {habit.name} Habit</span>
        </Link>

        <div className={(flipped ? 'flip-card flipped' : 'flip-card') + " w-full h-[420px] md:h-[360px] bg-transparent relative"} style={{maxWidth:'100%'}}>
          <div className="flip-card-inner w-full h-full">
            {/* Front Side */}
            <div className="flip-card-front w-full h-full bg-white/20 backdrop-blur-lg rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
              {/* Image Section */}
              <div className="md:w-1/2 flex items-center justify-center bg-white/10 p-8">
                <img
                  src={challenge.image}
                  alt={challenge.title}
                  className="rounded-2xl shadow-lg w-full object-cover max-h-80"
                  style={{ minHeight: 220 }}
                />
              </div>
              {/* Content Section */}
              <div className="md:w-1/2 flex flex-col justify-center p-8">
                <div className="mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white/90">
                    {challenge.title}
                  </h2>
                </div>
                <div className="mb-8">
                  <p className="text-xl text-white/90 leading-relaxed">
                    {challenge.description}
                  </p>
                </div>
                <button onClick={() => setFlipped(true)} className="glassmorphism px-8 py-4 rounded-full text-white font-semibold hover:bg-white/25 transition-all mt-4">
                  Next
                </button>
              </div>
            </div>
            {/* Back Side */}
            <div className="flip-card-back w-full h-full bg-white/20 backdrop-blur-lg rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
              {/* Image Section */}
              <div className="md:w-1/2 flex items-center justify-center bg-white/10 p-8">
                <img
                  src={challenge.reflectionImage}
                  alt="Reflection"
                  className="rounded-2xl shadow-lg w-full object-cover max-h-80"
                  style={{ minHeight: 220 }}
                />
              </div>
              {/* Content Section */}
              <div className="md:w-1/2 flex flex-col justify-center p-8">
                <div className="mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white/90">
                    Reflection
                  </h2>
                </div>
                <div className="mb-8">
                  <p className="text-xl text-white/90 leading-relaxed">
                    {challenge.reflectionPrompt}
                  </p>
                </div>
                <textarea
                  className="w-full rounded-xl p-4 bg-white/60 text-gray-900 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-500"
                  rows={4}
                  placeholder="Type your reflection here..."
                  value={reflection}
                  onChange={e => setReflection(e.target.value)}
                />
                <div className="flex gap-4 w-full">
                  <button onClick={() => setFlipped(false)} className="flex-1 glassmorphism px-6 py-3 rounded-full text-white font-semibold hover:bg-white/25 transition-all">
                    Flip Back
                  </button>
                  <button className="flex-1 glassmorphism px-6 py-3 rounded-full text-white font-semibold hover:bg-white/25 transition-all">
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 