-- Updated challenges from cyborg-challenges-bulk-2026-02-24
-- March: 15 challenges (order_index 1-15)
-- April: 10 challenges (order_index 16-25)
-- May: 8 challenges (order_index 26-33)
-- Total: 33 challenges

-- Clear existing challenges first
DELETE FROM challenges;

-- Challenge 1: First Impressions (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 1: Intro to Cyborg Habits & Augmented Working',
  1,
  true,
  'Decode Habits
Think about the "Intro to Cyborg Habits" session. Use Explain It to describe one habit to a friend. Make it clear and simple, as if they''ve never heard of it. Once it feels easy to understand, you''re done.',
  'Explain It',
  'Refine the Intro
Consider the same "Intro to Cyborg Habits" session. What part of the intro could be better? Use Improve It to suggest one clear change. How can you make the intro more engaging for future leaders? Stop when you have one strong improvement.',
  'Improve It',
  'In what ways did using Explain It to clarify the habits change what Improve It revealed about how to make the intro session better?',
  ARRAY['Wow, I didn''t realize how much jargon I was using until I tried to explain it simply.', 'I focused so much on content that I didn''t think about making it more fun and engaging.']
);

-- Challenge 2: Tech Clarity Check (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 2: Technology Proficiency for the Future of Work',
  2,
  true,
  'Tech Jargon Decoder
Think of a tech term related to your career that you find confusing. Use the Explain It habit and ask AI to explain it simply. Stop when the explanation feels easy for anyone to grasp.',
  'Explain It',
  'Hidden Risk Radar
Consider the simple explanation you just received. Use the Critique It habit and ask AI to list potential risks of oversimplifying it. Stop after reviewing three potential downsides.',
  'Critique It',
  'In what ways did using Explain It to simplify the tech term change what Critique It revealed about the potential risks of that simplification?',
  ARRAY['Wow, I thought I understood the term, but I couldn''t explain it simply!', 'I didn''t realize how much nuance gets lost when you oversimplify complex tech ideas.']
);

-- Challenge 3: Narrative Roadmap (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 3: Storytelling & Professional Communication',
  3,
  true,
  'Polish the Pitch
Think of a story you might share in a job interview. Use the Improve It habit to refine this story with AI. Stop when the AI''s feedback makes your story feel much stronger.',
  'Improve It',
  'Craft the Cascade
Take the improved story and envision sharing it with your team. Use the Plan It habit to create a strategy for communicating effectively. Stop when you have a clear sequence of steps for telling your story.',
  'Plan It',
  'In what ways did using Improve It to refine your story change what Plan It revealed about sharing it effectively?',
  ARRAY['I thought my story was good, but AI helped me highlight the important details.', 'I realize now that just telling the story isn''t enough. I need a strategy for it to really land.']
);

-- Challenge 4: Brand Navigator (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 4: Crafting Your Personal Brand in CCBA, Workplace Etiquette & Meeting Discipline',
  4,
  true,
  'Polish Your Pitch
Imagine you''re introducing yourself at a networking event. Use Improve It to refine your personal brand statement. Keep iterating until it feels both authentic and compelling.',
  'Improve It',
  'Navigate the Network
Picture attending a professional CCBA conference. Use Guide It to anticipate networking challenges. Ask how to handle different scenarios to build connections.',
  'Guide It',
  'In what ways did using Improve It to refine your brand change how Guide It helped you navigate networking challenges?',
  ARRAY['Wow, I realized my initial statement was too generic. It didn''t highlight what makes me unique.', 'I hadn''t considered how to gracefully exit a conversation. Now I have a plan!']
);

-- Challenge 5: Financial Growth Path (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 5: Personal Finance',
  5,
  true,
  'Budget Booster
Think of a money habit you want to build. Use the Improve It habit. Ask AI how to make it stronger. Refine its advice until you feel confident.',
  'Improve It',
  'Investment Navigator
Consider your long-term financial goals. Use the Suggest It habit. Ask AI to suggest an investment strategy. Pick one idea you can start researching today.',
  'Suggest It',
  'In what ways did using Improve It to refine a money habit change what Suggest It revealed about your investment options?',
  ARRAY['I realized my savings goal was too vague. Making it specific made a big difference!', 'I never thought about real estate as an investment option. Now I want to learn more.']
);

-- Challenge 6: Model Navigator (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Leading the Business: CCBA Strategy & Operating Model',
  6,
  true,
  'Strategy Compass
Think of a CCBA strategy goal you find unclear. Use the Guide It habit and ask AI to outline the steps to reach it. Refine the outline until the path feels clear and achievable.',
  'Guide It',
  'Future Scenario
Consider the strategy outline from the first challenge. Use the Imagine It habit to brainstorm three future events that could disrupt it. Choose the most likely one and adapt the plan. Stop when you have a backup plan.',
  'Imagine It',
  'In what ways did using Guide It to map the strategy change what Imagine It revealed about possible future disruptions and solutions?',
  ARRAY['Wow, I didn''t realize how many steps were involved until I broke it down. It seemed daunting before.', 'Seeing how one future event could derail the whole plan makes me feel more prepared and less stressed.']
);

-- Challenge 7: Strategy Compass (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Leading the Business: Commercial Strategy',
  7,
  true,
  'Scope the Terrain
Think about a new commercial strategy project you''re facing. Use the Guide It habit to identify the three main steps. Stop when you have a clear, simple path forward.',
  'Guide It',
  'Navigate Alternatives
Consider one step from the plan you just created. Use the Suggest It habit to find three different ways to complete that step. Pick the suggestion that seems most practical for your team.',
  'Suggest It',
  'In what ways did using Guide It to map the process change what Suggest It revealed about the choices available at each step?',
  ARRAY['I was overwhelmed. Breaking it down made the project feel doable.', 'I had tunnel vision on one solution. Now I see better options!']
);

-- Challenge 8: Manufacturing Roadmap (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Leading the Business: Manufacturing, Quality & Supply Planning',
  8,
  true,
  'Chart the Course
Think of a quality issue slowing down manufacturing. Use the Plan It habit. Ask AI to create a 3-step plan to fix it. Stop after you have a clear, simple plan.',
  'Plan It',
  'Anticipate Obstacles
Consider the plan AI made for the quality issue. Use the Guide It habit. Ask AI: what problems might come up at each step? Note one potential problem for each step.',
  'Guide It',
  'In what ways did using Plan It to map the quality process change what Guide It revealed about likely roadblocks and delays?',
  ARRAY['I thought the quality fix was simple, but planning showed me it has many steps.', 'I hadn''t thought about equipment failures, but now I can plan for them.']
);

-- Challenge 9: Circular Clarity (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Leading the Business: ESG, Sustainability & Circular Packaging',
  9,
  true,
  'Options Unveiled
Think of a barrier to circular packaging your company faces. Use the Suggest It habit to get three alternative solutions. Pick the most interesting idea for the next challenge.',
  'Suggest It',
  'Simplify the Sell
Take the circular packaging solution you chose. Use the Explain It habit to make it easy to understand. Ask AI to explain the idea like you''re speaking to a new employee. Refine it once until it feels clear and convincing.',
  'Explain It',
  'In what ways did using Suggest It to explore options change how you approached simplifying the chosen circular packaging idea with Explain It?',
  ARRAY['I didn''t realize there were so many ways to tackle that packaging problem. It felt impossible before!', 'Explaining it simply helped me see the real benefits. I can get others excited now too.']
);

-- Challenge 10: Orientation Boost (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Commercial Immersion Orientation (Group Session)',
  10,
  true,
  'Session Ideas
Think about your upcoming Commercial Immersion Orientation group session. Use the Suggest It habit to get fresh ideas for making it more engaging. Stop when you have three new ideas to consider.',
  'Suggest It',
  'Action Plan
Pick one idea from the suggestions you just got. Use the Improve It habit to create a brief action plan for making that idea happen. Stop when you have three clear steps.',
  'Improve It',
  'In what ways did using Suggest It to brainstorm session ideas change what Improve It revealed about the steps needed to make one idea a reality?',
  ARRAY['I didn''t realize how many creative options were possible for the orientation session!', 'Breaking it down into action steps made that fun idea feel much more achievable and less overwhelming.']
);

-- Challenge 11: Orientation Innovation (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Commercial Immersion Orientation (Country Capability Team)',
  11,
  true,
  'Future Orientation
Think about the upcoming Commercial Immersion Orientation. Use the Imagine It habit to brainstorm three unexpected benefits. You''re done when you have three distinct possibilities.',
  'Imagine It',
  'Recommend Content
Consider the benefits you imagined in the first challenge. Use the Suggest It habit to ask AI for content recommendations. These should help achieve one of the benefits. You are done when you have one concrete suggestion.',
  'Suggest It',
  'In what ways did using Imagine It to uncover hidden benefits change what Suggest It recommended to improve the Commercial Immersion Orientation?',
  ARRAY['I hadn''t considered how the orientation could build stronger cross-team relationships.', 'I would never have thought to add a session on local market trends, but it makes perfect sense now.']
);

-- Challenge 12: Learning Launchpad (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  12,
  true,
  'Focus First
Think about an In-Trade Learning topic with your Area Sales Manager. Use the Plan It habit to create a simple 3-step action plan. Stop when you have a clear plan to start your learning.',
  'Plan It',
  'Roadblock Radar
Consider your plan for learning with your Area Sales Manager. Use the Guide It habit to list three possible roadblocks. Ask AI for a quick tip to overcome each roadblock. Stop when you have a tip for each challenge.',
  'Guide It',
  'In what ways did using Plan It to map out your learning change the roadblocks Guide It helped you anticipate?',
  ARRAY['I realized my plan was too vague. I needed a clear first step to make it real.', 'I was so focused on the goal, I hadn''t thought about what might get in my way.']
);

-- Challenge 13: Learning Launchpad (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  13,
  true,
  'Training Ideas
Think of an Area Sales Manager (ASM) skill you want to improve. Use the Suggest It habit to get three training ideas. Stop once you have three diverse and interesting options.',
  'Suggest It',
  'Weekly Roadmap
Pick one training idea from the previous challenge. Use the Plan It habit to create a simple weekly plan. The plan should include specific actions for the next four weeks. Stop when your roadmap feels actionable.',
  'Plan It',
  'In what ways did using Suggest It to find training ideas change your approach when you used Plan It to make a learning roadmap?',
  ARRAY['I realized some training ideas were better suited for my schedule.', 'Breaking the training into weekly steps made it feel less overwhelming.']
);

-- Challenge 14: Workflow Navigator (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 7: Productivity Systems & Task Management (with AI)',
  14,
  true,
  'Prioritize Like a Pro
Think of a major task you are managing right now. Use the Guide It habit. Ask AI to create a step-by-step plan. Stop when the plan feels clear and actionable.',
  'Guide It',
  'AI''s Top Three
Consider the plan AI made in the first challenge. Use the Suggest It habit. Ask AI for three tools or strategies to boost your efficiency. Pick one that feels right.',
  'Suggest It',
  'In what ways did using Guide It to map out your task change which specific efficiency tools Suggest It recommended for you?',
  ARRAY['I was stuck because I didn''t know where to start. Now I have a clear first step.', 'I didn''t realize how many options were out there. AI helped me narrow it down.']
);

-- Challenge 15: Sales Clarity (March)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  15,
  true,
  'Unpack Jargon
Think of a term used in Area Sales Manager in-trade learning. It might be something you find hard to grasp. Use the Explain It habit and ask AI to explain it simply. Keep refining until the explanation feels clear.',
  'Explain It',
  'Idea Generator
Think about a hurdle in in-trade learning for Area Sales Managers. Use the Suggest It habit to get ideas from AI. Ask for three quick, simple ways to solve the hurdle. Pick one idea to use this week.',
  'Suggest It',
  'In what ways did using Explain It to simplify a term change what Suggest It revealed about solving hurdles?',
  ARRAY['I never realized that term had so many parts! No wonder I was confused.', 'Wow, AI gave me an idea I can use right away. I will try it this week!']
);

-- Challenge 16: Learning Roadmap (April)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  16,
  true,
  'Deconstruct Learning
Think of an in-trade learning goal for Area Sales Managers (ASMs). Use the Explain It habit. Ask AI to break down this goal into its simplest steps. Stop when the steps feel very clear.',
  'Explain It',
  'Map ASM Growth
Consider the learning steps from the last challenge. Use the Plan It habit. Ask AI to create a 3-month plan for implementing these steps. The plan should help ASMs improve in-trade learning skills. Stop when the plan feels achievable.',
  'Plan It',
  'In what ways did using Explain It to simplify the learning goal change the plan you created with Plan It?',
  ARRAY['Wow, I was trying to do too much at once. Breaking it down made it seem less scary.', 'I see now that I need to focus on one small step each month. It’s much more doable.']
);

-- Challenge 17: Decode & Navigate (April)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 8: Cross-cultural Communication across African Markets',
  17,
  true,
  'Cultural Clarity
Think of a common business term that might be confusing in some African cultures. Use the Explain It habit and ask AI to explain it as if you were talking to a new colleague. Refine the explanation until it feels very clear and easy to understand.',
  'Explain It',
  'Navigate Nuances
Consider a miscommunication you''ve seen in a cross-cultural setting in African markets. Use the Suggest It habit to ask AI for three tips on how to avoid that issue in the future. Choose the most helpful tip and think about how you can use it.',
  'Suggest It',
  'In what ways did using Explain It to simplify a term change the insights Suggest It gave you about preventing miscommunication?',
  ARRAY['I realized the business term I use daily has a lot of hidden assumptions.', 'I see now that small changes in how I speak can have a big impact on understanding.']
);

-- Challenge 18: Learning Rx (April)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  18,
  true,
  'Unpack the "Why"
Think about a key skill for Area Sales Managers (ASMs). Use the Explain It habit to break it down into simple steps. Keep refining it until even a new hire could understand it.',
  'Explain It',
  'Level Up Plan
Use the simple steps from Challenge 1 to improve. Use the Suggest It habit to get ideas on how to get better at each step. Pick one idea you can try this week to level up.',
  'Suggest It',
  'In what ways did using Explain It to simplify the ASM skill change what Suggest It revealed about how to improve it?',
  ARRAY['Wow, I thought that skill was one thing, but it''s really several smaller steps.', 'I didn''t realize how easy it would be to improve. I can try one of those ideas right away.']
);

-- Challenge 19: Tool Navigator (April)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 9: Navigating Hybrid & Remote Collaboration Tools',
  19,
  true,
  'Clarity Compass
Think about a remote collaboration tool you find confusing. Use the Explain It habit. Ask AI to explain it like you are teaching a child. Stop when the explanation feels very simple to you.',
  'Explain It',
  'Features Forecast
Consider the tool you simplified with Explain It. Use the Suggest It habit. Ask AI for three ways to use a hidden feature. Pick one idea that seems useful for your team.',
  'Suggest It',
  'In what ways did using Explain It to simplify the tool change the suggestions that Suggest It gave you?',
  ARRAY['Wow, I thought I understood the tool, but I couldn''t explain it simply. That showed me where my real gaps were.', 'I never thought of using that feature in that way! It could solve a real problem we have.']
);

-- Challenge 20: ASM Breakthrough (April)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  20,
  true,
  'Reframe In-Trade
Think about the in-trade learning approach for Area Sales Managers. Use the Imagine It habit to brainstorm five unexpected ways to improve it. Stop when you have five new ideas that feel different and fresh.',
  'Imagine It',
  'Design Implementation
Pick one Imagine It idea that excites you the most. Use the Plan It habit to create three clear steps to make it real. Stop when you have a simple plan ready to share.',
  'Plan It',
  'In what ways did using Imagine It to explore new possibilities change how you approached Plan It when designing the implementation steps?',
  ARRAY['I realized we are stuck in the same old training loop. We need to think bigger.', 'Breaking it down into three steps made my ''out there'' idea feel achievable and not so scary.']
);

-- Challenge 21: Strategic Moves (April)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Leading the Business: CCBA Strategy & Operating Model',
  21,
  true,
  'Chart the Course
Think of a change to your business''s operating model. Use the Plan It habit to break down the steps to make it happen. Keep going until the plan seems actionable.',
  'Plan It',
  'Spot the Risk
Look at the plan that AI made for you. Use the Suggest It habit to find weak spots in the plan. Refine your plan based on one AI suggestion.',
  'Suggest It',
  'In what ways did using Plan It to map the project change what Suggest It revealed about the plan''s weak points?',
  ARRAY['I didn''t think about how many steps were needed. No wonder it felt stuck!', 'I was so focused on the goal. I missed a big risk that could derail everything.']
);

-- Challenge 22: ASM Onboarding (April)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  22,
  true,
  'Roadmap Builder
Think of a new Area Sales Manager (ASM) joining your team. Use the Plan It habit and map out the first 30 days. Break it into weekly goals for their onboarding. Stop when you have a clear 4-week plan.',
  'Plan It',
  'Confidence Booster
Imagine the ASM feels unsure about a new product line. Use the Guide It habit to create a FAQ guide. Include five questions the ASM might have. Finish when the ASM feels ready to answer them.',
  'Guide It',
  'In what ways did using Plan It to structure the onboarding process change what Guide It revealed about the ASM''s potential challenges?',
  ARRAY['I realized I was overloading week one. I''ve spaced it out for better learning.', 'I hadn''t thought about those specific questions. Now I have clear, quick answers ready.']
);

-- Challenge 23: Strategy Sketch (April)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Leading the Business: Commercial Strategy',
  23,
  true,
  'Sketch Vision
Think about a new commercial strategy your business could try. Use the Imagine It habit. Ask AI to brainstorm 5 unexpected benefits of that strategy. Now you have some surprising new ideas to consider.',
  'Imagine It',
  'Risk Radar
Take one of the benefits you just imagined. Use the Critique It habit. Ask AI to list 3 potential risks that could prevent that benefit from happening. Now you''ve spotted possible problems with your new ideas.',
  'Critique It',
  'In what ways did using Imagine It to explore benefits change what Critique It revealed about the potential downsides and hidden risks?',
  ARRAY['I never thought about how a new strategy could improve employee morale, that''s interesting!', 'I was so focused on the upside that I completely missed a major regulatory risk. Good catch, AI.']
);

-- Challenge 24: Sales Navigator (April)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  24,
  true,
  'Sharpen the Pitch
Think about a training topic for your area sales managers. Use the Improve It habit and ask AI to make the training more engaging. Refine the prompt once based on the first result.',
  'Improve It',
  'Find Hidden Gems
Consider the improved training from Challenge 1. Use the Suggest It habit and ask AI for related topics to add. Pick one suggestion that expands the training in a useful way.',
  'Suggest It',
  'In what ways did using Improve It to refine the training change what Suggest It offered as related skills for sales managers?',
  ARRAY['I realized my original idea was too passive. It needed more active participation.', 'The AI suggested a related topic I hadn''t even considered. It makes the training more complete.']
);

-- Challenge 25: Immersion Navigator (April)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Commercial Immersion Reflection',
  25,
  true,
  'Expand the Horizon
Think about your Commercial Immersion experience. Use the Imagine It habit to brainstorm five totally different ways to apply what you learned. Stop when you have five distinct new possibilities.',
  'Imagine It',
  'Plot the Course
Pick one possibility you generated in Challenge 1. Use the Guide It habit to create a simple 3-step plan to make that possibility real. Stop when you have a clear first draft of the plan.',
  'Guide It',
  'In what ways did using Imagine It to generate possibilities change what Guide It revealed about the practical steps needed?',
  ARRAY['I was stuck thinking about the obvious stuff, but AI helped me jump to some wilder ideas I never would have thought of.', 'Seeing the actual steps made the idea feel less abstract and way more doable. I might actually try this!']
);

-- Challenge 26: Learning Leap (May)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  26,
  true,
  'Future Classroom
Think about in-trade learning for Area Sales Managers. Use the Imagine It habit and brainstorm five unexpected new methods. Stop when you have five unique ideas.',
  'Imagine It',
  'Blueprint Tradecraft
Pick one idea from your Imagine It list. Use the Plan It habit to outline the first three steps. The steps should make the idea real. Finish when you have three concrete steps.',
  'Plan It',
  'In what ways did using Imagine It to expand possibilities change the Plan It steps to make the idea more practical?',
  ARRAY['I never thought of using gamification for learning in the field. It could be very engaging!', 'Breaking down the first steps showed me how easy it is to start. No big changes needed!']
);

-- Challenge 27: Insight Clarity (May)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Customer Insight Presentation to CMT Prep',
  27,
  true,
  'Data Angles
Think of a key data point in your customer insight deck. Use the Suggest It habit and ask AI for three new ways to present it. Pick the suggestion that you like most.',
  'Suggest It',
  'Audience Ready
Take the data visualization idea you chose. Use the Explain It habit and ask AI to simplify the slide for your audience. Rework it until the data is easy to grasp.',
  'Explain It',
  'In what ways did using Suggest It broaden your view of data presentation, and how did Explain It help focus your message for the CMT?',
  ARRAY['I was stuck on the same old chart, but the AI gave me fresh, visual ideas I hadn''t considered.', 'I thought my slides were clear, but explaining it simply showed me where I was using jargon without realizing it.']
);

-- Challenge 28: Learning Launchpad (May)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  28,
  true,
  'Simplify the Sales
Think about in-trade learning for Area Sales Managers. Use Explain It to describe it in one sentence. Make it clear to someone new to the role.',
  'Explain It',
  'Beyond the Basics
Take your one-sentence explanation from the first challenge. Use Imagine It to add one new idea to it. How can we make it more engaging?',
  'Imagine It',
  'In what ways did using Explain It to simplify in-trade learning change what Imagine It revealed about new possibilities for engaging Area Sales Managers?',
  ARRAY['I thought in-trade learning was just about the basics, but it''s much more than that.', 'By adding new ideas, I see how we can truly make in-trade learning better.']
);

-- Challenge 29: Clarity Roadmap (May)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Final Phase 1 Insights',
  29,
  true,
  'Detail the Path
Think about your Phase 1 insights report you are preparing. Use the Plan It habit and ask AI to outline the next three steps to finalize it. Stop when you have a clear, actionable path forward.',
  'Plan It',
  'Simplify the Core
Focus on one key insight from your Phase 1 report outline. Use the Explain It habit to summarize it in one short, clear sentence for stakeholders. Refine it until it is easily understood by someone new to the project.',
  'Explain It',
  'In what ways did using Plan It to map the steps change what Explain It revealed about the best way to communicate your insights?',
  ARRAY['I was overwhelmed by the report, but breaking it down into three steps made it feel manageable.', 'I thought my insight was clear, but the one-sentence summary helped me cut out all the extra fluff.']
);

-- Challenge 30: Learning Clarity (May)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  30,
  true,
  'Sales Blindspots
Think about a recent In-Trade Learning session with an Area Sales Manager. Use the Critique It habit to find potential blindspots. Ask AI to list three assumptions that might be wrong.',
  'Critique It',
  'Simplify the Message
Pick one blindspot from the first challenge. Use the Explain It habit to make it clear. Ask AI to explain why that blindspot matters in simple terms. Make it easy to understand.',
  'Explain It',
  'In what ways did using Critique It to reveal assumptions change how you used Explain It to simplify the message?',
  ARRAY['I didn''t realize how much we assume new managers already know!', 'Explaining it simply showed me the real impact of that blindspot.']
);

-- Challenge 31: Presence Amplifier (May)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Leading Self: Confident Communication & Personal Presence',
  31,
  true,
  'Role Model Search
Think of a leader whose communication style you admire. Use the Suggest It habit and ask AI for three specific things that make them effective. Pick one suggestion that you can try today.',
  'Suggest It',
  'Clarity Test
Think about a concept in leadership presence you find tricky. Use the Explain It habit and ask AI to explain it to someone with no leadership experience. Read the explanation and note one thing that is now clearer.',
  'Explain It',
  'In what ways did using Suggest It to find role models change what Explain It revealed about your understanding of leadership presence?',
  ARRAY['I never realized how much eye contact my favorite speaker uses. I can try that in my next meeting.', 'I thought ''presence'' was about being loud, but it''s really about being calm and focused. That''s a relief!']
);

-- Challenge 32: Coaching Blindspots (May)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  32,
  true,
  'Best Approach?
Think of a challenge your Area Sales Managers (ASMs) face when coaching. Use the Suggest It habit and ask AI for three different coaching approaches. Pick the one that seems most promising.',
  'Suggest It',
  'Risk Assessment
Take the coaching approach you chose. Use the Critique It habit to identify three potential risks or downsides of using that approach. Adjust the approach to address at least one of those risks.',
  'Critique It',
  'In what ways did using Suggest It to explore different coaching approaches change what Critique It revealed about the potential risks and how to mitigate them?',
  ARRAY['I hadn''t considered how differently my ASMs might respond to different coaching styles. Suggest It helped me see that.', 'Critique It showed me the blind spots in my initial choice. I can refine my plans before rolling them out.']
);

-- Challenge 33: Attention Upgrade (May)
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Leading Self: Focus, Attention & Digital Wellbeing in an AI Era',
  33,
  true,
  'Refocus Routine
Think about a daily task that steals your attention. Use the Improve It habit to make it better. Ask AI for one small change to boost your focus. Stop when you have a clear, simple action.',
  'Improve It',
  'Spotlight Assumptions
Consider the change you identified to improve your focus. Use the Critique It habit to spot any hidden risks. Ask AI to list one possible downside of this change. Stop when you see a new angle.',
  'Critique It',
  'In what ways did using Improve It to identify a change contrast with what Critique It revealed about its potential downsides, and how does this shape your approach to boosting focus?',
  ARRAY['I thought reducing email checks would fix everything, but I didn''t consider missing urgent messages!', 'Seeing the downside helps me plan better. I can now handle the risks.']
);
