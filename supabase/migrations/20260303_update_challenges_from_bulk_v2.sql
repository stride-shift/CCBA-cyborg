-- Updated challenges from update-new-cyborg-challenges-bulk-2026-03-02.xlsx
-- Generated on 2026-03-03
-- March: 17 challenges (order_index 1-17)
-- April: 8 challenges (order_index 18-25)
-- May: 10 challenges (order_index 26-35)
-- Total: 35 challenges

-- Clear existing challenges first
DELETE FROM challenges;

-- Challenge 1: Career Roadmap
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 1: Intro to Cyborg Habits & Augmented Working',
  1,
  true,
  'Decode the Leap
Think about the transition from future leader to emerging professional. Use the Explain It habit to clarify the key differences between these two roles. Stop when you have a simple, clear description of the shift.',
  'Explain It',
  'Bridge the Gap
Consider your own journey in the intro to Cyborg Habits & Augmented Working. Use the Plan It habit to create a 3-step plan that applies something you learned to your professional development. Stop when you have three concrete actions to take.',
  'Plan It',
  'In what ways did using Explain It to clarify the transition from future leader to emerging professional change what Plan It revealed about your next steps?',
  ARRAY['Wow, I thought I understood the difference between the two roles, but Explain It showed me I was missing the mindset shift.', 'I never thought about applying Cyborg Habits this specifically, but now I have a concrete plan to improve my workflow!']
);

-- Challenge 2: Tech Roadmap
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 2: Technology Proficiency for the Future of Work',
  2,
  true,
  'Skill GPS
Think about a technology skill you''d like to master to excel as a future leader. Use the Guide It habit and ask AI to create a step-by-step learning plan for you. The plan should be practical and easy to follow so that you can start immediately.',
  'Guide It',
  'Boundary Breaker
Consider the tech skill you mapped out in the previous challenge. Use the Imagine It habit and ask AI to brainstorm five unconventional ways you could apply that skill in your early career to create real impact. Review the AI''s suggestions and pick the one that excites you the most.',
  'Imagine It',
  'In what ways did using Guide It to map your learning path shift what Imagine It revealed about the potential of that skill to drive meaningful impact in your early career?',
  ARRAY['I never thought about breaking down a complex skill into such manageable steps – now it feels way less daunting and much more achievable.', 'I was so focused on the ''right'' way to use that tech skill, but now I see a whole range of creative possibilities I never considered!']
);

-- Challenge 3: Narrative Navigator
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 3: Storytelling & Professional Communication',
  3,
  true,
  'Visualize Success
Think of a time you want to communicate a story to peers to make a point. Use the Imagine It habit and ask AI to generate three distinct scenarios of how that conversation could unfold. Pick the one that feels most impactful for your goal.',
  'Imagine It',
  'Feedback Forecast
Take the scenario you chose from the previous step and ask for ways to improve your storytelling approach. Use the Suggest It habit to get three specific recommendations on how to make it more compelling. Choose the suggestion that you think would resonate best with future leaders.',
  'Suggest It',
  'In what ways did using Imagine It to explore different communication scenarios change what Suggest It revealed about how to refine your storytelling for maximum impact?',
  ARRAY['I realized the story wasn''t the problem, it was how I was framing it. I was focusing on the wrong details.', 'Getting concrete suggestions made me realize the story needed a stronger call to action to truly resonate with future leaders.']
);

-- Challenge 4: Brand Amplifier
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 4: Crafting Your Personal Brand in CCBA, Workplace Etiquette & Meeting Discipline',
  4,
  true,
  'Polish Your Pitch
Think of a sentence you currently use to describe your personal brand or CCBA leadership style. Use the Improve It habit to refine this sentence with AI, focusing on making it more impactful and memorable for potential connections. Stop when you have a version that feels both authentic and attention-grabbing.',
  'Improve It',
  'Brand Extension
Take your refined personal brand statement from the previous challenge. Use the Imagine It habit to brainstorm three unconventional ways you could showcase this brand beyond your resume. Consider creative approaches that highlight your unique value as a CCBA leader. Stop after you have three distinct ideas.',
  'Imagine It',
  'In what ways did using Improve It to polish your personal brand statement change the types of unconventional approaches you could Imagine It to showcase your brand?',
  ARRAY['I didn''t realize how generic my initial brand statement was until I asked AI to make it more impactful. Now it actually sounds like me.', 'Thinking beyond the usual resume really opened my eyes. A quick video or a contribution to a professional forum is way more memorable.']
);

-- Challenge 5: Financial Roadmap
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 5: Personal Finance',
  5,
  true,
  'Financial Tune-Up
Think about a personal finance goal you''re currently pursuing (e.g., saving, investing, debt reduction). Use the Improve It habit and ask AI to critique your current approach to that goal. Refine your approach based on the AI''s feedback until you feel it''s significantly stronger.',
  'Improve It',
  'Milestone Mapping
Building on the improved approach from Challenge 1, use the Plan It habit to map out the milestones needed to achieve your goal. Ask AI to create a step-by-step plan with specific, measurable actions for each milestone. Adjust the plan until it feels realistic and actionable.',
  'Plan It',
  'In what ways did using Improve It to refine your initial financial approach change what Plan It revealed about the steps and milestones needed to achieve your goal?',
  ARRAY['Wow, I thought my savings plan was solid, but the AI pointed out a major risk I hadn''t considered. Glad I caught that now!', 'Seeing the milestones laid out like that makes the goal seem way less daunting and much more achievable. I finally have a real roadmap!']
);

-- Challenge 6: Model Navigator
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

-- Challenge 7: Strategy Compass
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

-- Challenge 8: Manufacturing Roadmap
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

-- Challenge 9: Circular Clarity
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

-- Challenge 10: Visibility Blueprint
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 6: Digital Identity, LinkedIn & Internal Visibility',
  10,
  true,
  'Outline Visibility
Think about growing your digital identity and internal visibility. Use the Plan It habit to create a 3-step plan for enhancing your LinkedIn profile to better reflect your professional aspirations. Finalize your plan when you feel each step is concrete and actionable.',
  'Plan It',
  'Visibility Enhancers
Consider the plan you just created for enhancing your LinkedIn profile. Use the Suggest It habit to get 3 specific suggestions to make each step more impactful. Complete the challenge when you have a revised plan with actionable enhancements.',
  'Suggest It',
  'In what ways did using Plan It to create your initial LinkedIn enhancement strategy change the suggestions that Suggest It provided to make it even more impactful?',
  ARRAY['I hadn''t thought about breaking it down into manageable steps; I was just overwhelmed by the whole thing.', 'I realized my original plan was too vague. The suggestions helped me focus on specific actions that would make a real difference.']
);

-- Challenge 11: Orientation Boost
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Commercial Immersion Orientation (Group Session)',
  11,
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

-- Challenge 12: Orientation Innovation
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Commercial Immersion Orientation (Country Capability Team)',
  12,
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

-- Challenge 13: Field Guide
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  13,
  true,
  'Options Generator
Think of an Area Sales Manager (ASM) in-trade learning initiative you’re planning. Use the Suggest It habit and ask AI to brainstorm 5 alternative approaches you haven’t considered. Stop when you have a list of fresh possibilities to consider.',
  'Suggest It',
  'Pitfall Detector
Pick one of the suggested approaches from the previous step. Use the Critique It habit and ask AI to identify 3 potential pitfalls or unintended consequences of implementing that approach. Finalize after you have a clearer view of what could go wrong.',
  'Critique It',
  'In what ways did using Suggest It to expand your options change what Critique It revealed about the potential risks and challenges of your in-trade learning initiative?',
  ARRAY['I hadn''t thought about gamification as a learning tool, but it could really drive engagement.', 'I didn''t realize how much extra support the ASMs might need to implement that new approach effectively in the field.']
);

-- Challenge 14: Learning Boost
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  14,
  true,
  'Ideas Wanted
Think of a skill you want to develop in your role as an Area Sales Manager related to in-trade learning. Use the Suggest It habit and ask AI for three specific learning activities to boost that skill. Review the suggestions and choose one that feels most actionable for you right now.',
  'Suggest It',
  'Action Optimizer
Take the learning activity you chose in the previous challenge. Use the Improve It habit and ask AI to optimize that specific activity to maximize its impact. Refine the suggestions once to make it even more practical for your specific retail context.',
  'Improve It',
  'In what ways did using Suggest It to brainstorm learning activities change what Improve It revealed about the potential impact of a focused improvement strategy?',
  ARRAY['I was thinking about broad areas, but the AI''s specific suggestions made it feel way less abstract and overwhelming.', 'I hadn''t thought about tweaking the activity to fit my specific team — that makes it much more likely to actually get used.']
);

-- Challenge 15: Productive Paths
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 7: Productivity Systems & Task Management (with AI)',
  15,
  true,
  'System Starter
Think about a task management approach you''ve been considering for your productivity. Use the Suggest It habit to ask AI for three different approaches to try. Pick the one that resonates most to get started.',
  'Suggest It',
  'Risk Radar
Consider the task management approach you selected in the previous challenge. Use the Critique It habit to ask AI to identify three potential drawbacks or risks of that approach. Select one risk and explain how you might mitigate it.',
  'Critique It',
  'In what ways did using Suggest It to explore different task management approaches change what Critique It revealed about the potential downsides and how to navigate them?',
  ARRAY['I realized I was only considering one type of task management, and there are others that better suit my working style!', 'I hadn''t thought about the risk of that approach becoming too rigid, but now I have a plan to adapt it as needed.']
);

-- Challenge 16: Learning Roadmap
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  16,
  true,
  'Isolate Key Steps
Think about the "In-Trade Learning" process for Area Sales Managers at CCBA. Use the Explain It habit and ask AI to break down that training into its 3-5 most essential steps. Stop when you have a clear, simple sequence of actions.',
  'Explain It',
  'Anticipate Barriers
Now, take those steps and consider how Area Sales Managers may struggle with each. Use the Plan It habit to brainstorm one potential barrier for each step, and a quick workaround. You''re done once each step has a barrier and workaround.',
  'Plan It',
  'In what ways did using Explain It to simplify the training process change how you approached planning for potential barriers with Plan It?',
  ARRAY['Wow, I was so focused on the overall goal that I missed breaking the process into manageable steps.', 'I hadn''t thought about how something as simple as ''shadowing an experienced manager'' could be blocked by scheduling conflicts. Good to have a backup!']
);

-- Challenge 17: Learning Edge
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  17,
  true,
  'Assumption Check
Consider a recent in-trade learning session led by an Area Sales Manager. Use the Critique It habit to identify three assumptions the Area Sales Manager might be making about the team’s existing knowledge. Stop when you have three distinct assumptions the manager might not realize they are making.',
  'Critique It',
  'Remix Learning
Building on those assumptions, think about how those assumptions might limit the effectiveness of the in-trade learning session. Use the Imagine It habit and brainstorm three alternative approaches that address the assumptions you identified in Challenge 1. Stop when you have three distinct approaches that creatively address those assumptions.',
  'Imagine It',
  'In what ways did using Critique It to uncover hidden assumptions about the team''s knowledge change what Imagine It revealed about potential new approaches to in-trade learning?',
  ARRAY['I didn''t realize how much I was assuming everyone had the same baseline knowledge. It''s no wonder some people weren''t fully engaged!', 'By challenging those assumptions, I came up with some really creative ways to make the learning session more effective and inclusive.']
);

-- Challenge 18: Cultural Compass
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 8: Cross-cultural Communication across African Markets',
  18,
  true,
  'Decode Nuance
Think of a cross-cultural communication challenge you''ve observed in African markets. Use the Explain It habit to ask AI to break down the potential cultural nuances at play. Stop when the explanation feels clear and actionable for future leaders.',
  'Explain It',
  'Action Navigator
Consider a specific project where you need to improve cross-cultural communication in an African market. Use the Guide It habit to ask AI for a step-by-step guide to navigating the communication successfully, incorporating insights from "Decode Nuance". Mark complete when you have a practical plan.',
  'Guide It',
  'In what ways did using Explain It to decode the cultural nuances shift the steps you included when using Guide It to map out your communication plan?',
  ARRAY['Wow, I didn''t realize how much unspoken context was influencing the team dynamic – it’s not just about language.', 'I see now that a proactive approach, informed by cultural understanding, can prevent so many misunderstandings down the line.']
);

-- Challenge 19: Learning Accelerator
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  19,
  true,
  'Sharpen The Pitch
Think about a current challenge with in-trade learning for Area Sales Managers. Use the Improve It habit to refine a proposed solution to that challenge. Keep iterating with AI until your solution feels rock solid.',
  'Improve It',
  'Wildcard Learning
Now, consider how you might approach in-trade learning completely differently. Use the Imagine It habit to brainstorm unconventional or "blue sky" ideas. Aim for something that feels a bit outside the box but could be highly engaging.',
  'Imagine It',
  'In what ways did using Improve It reveal practical refinements, and how did using Imagine It open up entirely new avenues for in-trade learning that you hadn''t considered?',
  ARRAY['Wow, I was so focused on fixing the obvious problems that I missed some key underlying assumptions that could have derailed the whole thing.', 'I hadn''t even considered gamification, but framing it as a competition could solve our engagement issues.']
);

-- Challenge 20: Tech Navigator
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 9: Navigating Hybrid & Remote Collaboration Tools',
  20,
  true,
  'Tool Recommender
Think of a collaboration tool your team uses inefficiently, or doesn''t use at all. Use the Suggest It habit and ask AI to recommend 3 alternative tools that could address the issue. Review the suggestions and pick one that seems promising for your team''s needs.',
  'Suggest It',
  'Implementation Roadmap
Using the tool you chose in the previous challenge, develop a rollout plan. Use the Plan It habit and ask AI to create a phased implementation strategy for introducing the new tool to your team. The plan should include 3-5 distinct steps with clear objectives for each.',
  'Plan It',
  'In what ways did using Suggest It to surface new collaboration tools change your perspective when you used Plan It to create an implementation strategy?',
  ARRAY['I realized we''ve been sticking with familiar tools instead of exploring options that could be a much better fit for our evolving needs.', 'Breaking the rollout into phases made it feel way less overwhelming. I can see how smaller wins will build momentum with the team.']
);

-- Challenge 21: Sales Boost
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  21,
  true,
  'Polish Training
Think of an In-Trade Learning session that could be more effective. Use the Improve It habit to ask AI for three specific ways to boost engagement for future leaders. Stop when you have three actionable changes to try next time.',
  'Improve It',
  'Deploy Improvements
Take one of the engagement boosts from the previous challenge. Use the Plan It habit to outline the first three steps to put that change into action. Stop when you have three concrete next actions.',
  'Plan It',
  'In what ways did using Improve It to refine your training ideas change the scope or focus of the plan you developed using Plan It?',
  ARRAY['I thought just adding one game would be enough, but the AI pointed out the need for pre-session prep too.', 'I was focused on the big picture, but Plan It helped me see the small, actionable steps I can take immediately.']
);

-- Challenge 22: Strategic Moves
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Leading the Business: CCBA Strategy & Operating Model',
  22,
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

-- Challenge 23: Field-Ready Feedback
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  23,
  true,
  'Landscape Scan
Think of an upcoming in-trade learning session you''re leading as an Area Sales Manager. Use the Guide It habit to create a checklist of the key topics you need to cover to ensure success in that session. You’re done once you have a list of 5-7 essential areas.',
  'Guide It',
  'Sharpen the Session
Take the checklist from the previous challenge. Use the Improve It habit to identify any potential gaps or weaknesses in your learning session plan. Revise your checklist based on AI''s feedback until you feel confident in the session''s overall impact on the team.',
  'Improve It',
  'In what ways did using Guide It to structure the in-trade learning session change what Improve It revealed about the session''s strengths and weaknesses, and how did this inform your confidence as an Area Sales Manager?',
  ARRAY['I realized I was focusing too much on product features and not enough on practical sales techniques that the team can use immediately in the field.', 'I thought my session was comprehensive, but the AI pointed out that I hadn''t included any strategies for overcoming common objections, which is crucial for success.']
);

-- Challenge 24: Strategy Sketch
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Leading the Business: Commercial Strategy',
  24,
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

-- Challenge 25: Sales Navigator
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  25,
  true,
  'Options Generator
Think of a key in-trade learning objective for your Area Sales Managers. Use the Suggest It habit and ask AI to propose three different training methods to achieve this objective. Pick the one that initially sounds best to you.',
  'Suggest It',
  'Risk Radar
Using the training method you chose in the first challenge, employ the Critique It habit. Ask AI to identify three potential risks or challenges in implementing that method within your specific region. Consider logistical, financial, and personnel-related factors.',
  'Critique It',
  'In what ways did using Suggest It to generate training options change what Critique It revealed about the potential pitfalls of your preferred method?',
  ARRAY['I realized my first-choice training method sounds good in theory but has logistical issues in my area that I hadn''t considered.', 'I was so focused on the benefits of the training that I didn''t fully think through the potential resistance from the sales team.']
);

-- Challenge 26: Field Focus
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  26,
  true,
  'Terrain Scout
Think of a situation where you need to coach a new Area Sales Manager (ASM) on In-Trade Learning. Use the Guide It habit and ask AI to generate a checklist of key points to cover in that training. Once you have the checklist, you''re all set for the next step.',
  'Guide It',
  'Sharpen the Scope
Take the checklist you generated using Guide It. Now, use the Improve It habit to ask AI to refine the checklist so it''s more practical and actionable for the ASM in the field. Consider things like time constraints, available resources, and common challenges. You''re done when the checklist is optimized for real-world use.',
  'Improve It',
  'In what ways did using Guide It to create the initial checklist change what Improve It revealed about the gap between an ideal training plan and what''s actually feasible in the field?',
  ARRAY['I realized I was focusing too much on theory and not enough on practical application for the ASM.', 'I hadn''t considered how much time each step would realistically take in a busy retail environment until I tried to improve it.']
);

-- Challenge 27: Immersion Compass
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Commercial Immersion Reflection',
  27,
  true,
  'Immersion Roadmap
Think of a key goal you want to achieve from your commercial immersion. Use the Guide It habit to create a step-by-step roadmap to achieve it. When you have a clear, actionable plan with at least 3 steps, you''re done.',
  'Guide It',
  'Anticipate Obstacles
Take the roadmap you created in the first challenge. Use the Improve It habit to identify potential obstacles at each step, and suggest solutions. Once you''ve anticipated at least one obstacle per step and added solutions, you''re finished.',
  'Improve It',
  'In what ways did using Guide It to map out your immersion goals change what Improve It revealed about the potential challenges and your readiness to address them?',
  ARRAY['I was so focused on the big picture that I hadn''t thought through the small steps to get there. Guide It really broke it down.', 'I realized I was underestimating how much preparation I needed. Anticipating those obstacles makes me feel way more prepared.']
);

-- Challenge 28: Field Tactics
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  28,
  true,
  'Polish the Pitch
Think of a recent learning point you want your Area Sales Managers (ASMs) to grasp during in-trade visits. Use the Improve It habit and ask AI to make your explanation more compelling and memorable for ASMs. Refine it until you think it will truly resonate with your team.',
  'Improve It',
  'Tactics Toolkit
Consider the improved learning point from the previous challenge. Use the Suggest It habit and ask AI to recommend three specific field tactics ASMs could use to reinforce this learning during their in-trade visits. Choose the tactic that best fits your current sales strategy.',
  'Suggest It',
  'In what ways did using Improve It to refine your ASM learning point change what Suggest It revealed about the most effective field tactics for reinforcing that learning?',
  ARRAY['Wow, I hadn''t considered how the language I used could be a turn-off for some of my ASMs; now it''s much more relatable.', 'I was so focused on the big picture that I missed some really simple, practical ways my ASMs could bring this learning to life in the field!']
);

-- Challenge 29: Insight Clarity
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Customer Insight Presentation to CMT Prep',
  29,
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

-- Challenge 30: Learning Amplifier
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  30,
  true,
  'Clarity Compass
Think about a recent in-trade learning interaction with an Area Sales Manager that felt confusing or unclear. Use the Explain It habit and ask AI to explain the core concept of that interaction in 3 simple bullet points. Stop when the bullet points capture the essence in a way that''s instantly understandable.',
  'Explain It',
  'Action Accelerator
Take the simple bullet points you generated using Explain It. Now, use the Improve It habit to suggest 3 specific actions a new sales rep could take to immediately apply this learning in the field. Stop when you have three concrete actions that feel practical and impactful.',
  'Improve It',
  'In what ways did using Explain It to simplify the ASM interaction change what Improve It revealed about how to quickly translate learning into on-the-job action?',
  ARRAY['Wow, I thought I understood the ASM''s explanation, but breaking it down like that made me realize how much jargon I was just accepting.', 'Seeing those concrete action steps, I realize how much faster new reps could learn if we focused on practical application from the start.']
);

-- Challenge 31: Insights Amplifier
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Final Phase 1 Insights',
  31,
  true,
  'Possibility Generator
Think about one of your Phase 1 insights that feels especially promising. Using the Imagine It habit, ask AI to brainstorm five unconventional applications of that insight in a different sector. Pick the wildest idea that sparks your interest.',
  'Imagine It',
  'Stress Test
Take the unconventional application you chose in the previous challenge. Use the Improve It habit and ask AI to identify three potential challenges in implementing it. Consider possible solutions and ways to mitigate each of those challenges. Consider this a "stress test" of your idea.',
  'Improve It',
  'In what ways did using Imagine It to explore alternative applications of your Phase 1 insight shift what Improve It revealed about the idea''s viability and potential impact?',
  ARRAY['Wow, I was so focused on the obvious use case that I completely missed the potential for this insight to solve problems in a completely different field!', 'I realized that my ''wild'' idea actually has some serious limitations I hadn''t considered. Now I see where I need to focus my energy to make it viable.']
);

-- Challenge 32: Field Vision
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  32,
  true,
  'Assumption Check
Think about the current in-trade learning approach for Area Sales Managers (ASMs) at CCBA. Use the Critique It habit to identify three assumptions this approach makes about how ASMs learn best. Paste the assumptions below, ready to move to the next challenge.',
  'Critique It',
  'Targeted Boost
Take the assumptions you identified about the ASM learning approach. Use the Improve It habit to suggest one specific enhancement to each assumption that would make it more realistic and effective. You''re done once you have three improved statements ready for implementation.',
  'Improve It',
  'In what ways did using Critique It to uncover the assumptions of the current ASM learning approach change what Improve It revealed about making it more effective and practical?',
  ARRAY['I didn''t realize we were assuming all ASMs have the same baseline knowledge – that''s clearly not true!', 'Focusing on practical improvements instead of theoretical ideals made me realize how much more impactful our training could be.']
);

-- Challenge 33: Presence Amplifier
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Leading Self: Confident Communication & Personal Presence',
  33,
  true,
  'Chart Your Course
Think of a communication scenario where you want to project more confidence. Use the Guide It habit and ask AI to outline three distinct strategies for approaching this scenario with enhanced presence. Review the strategies and choose one that resonates with you.',
  'Guide It',
  'Polish the Plan
Using the strategy you chose from the previous challenge, leverage the Improve It habit to refine your approach. Ask AI to critique your chosen strategy, suggesting specific enhancements to make your presence even more impactful. Note at least one revision to your strategy based on the AI''s feedback.',
  'Improve It',
  'In what ways did using Guide It to explore different communication strategies change what Improve It revealed about specific refinements to your personal presence?',
  ARRAY['I realized I was only focusing on one approach to communication, and there were other, potentially more effective strategies I hadn''t considered.', 'I thought my chosen strategy was solid, but AI helped me identify subtle nuances in my delivery that could significantly amplify my impact.']
);

-- Challenge 34: Learning Blueprint
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning with Area Sales Managers',
  34,
  true,
  'Envision Impact
Think about your Area Sales Managers'' in-trade learning program. Use the Imagine It habit to brainstorm five completely new ways technology could enhance it. Stop when you have five distinct ideas, no matter how wild.',
  'Imagine It',
  'Prioritize Action
Choose your most exciting idea from Challenge 1. Use the Plan It habit to break it down into three actionable steps you could implement in the next quarter. Stop when you have three concrete steps with owners assigned.',
  'Plan It',
  'In what ways did using Imagine It to explore the possibilities change the focus of your Plan It steps, making them more targeted and effective?',
  ARRAY['I didn''t realize how many assumptions I had about what''s ''realistic'' until I let myself brainstorm freely.', 'Breaking down the big idea into concrete steps made it feel so much less overwhelming and more achievable.']
);

-- Challenge 35: Digital Clarity
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Leading Self: Focus, Attention & Digital Wellbeing in an AI Era',
  35,
  true,
  'Visualize Focus
Think about a time when your attention was scattered across multiple digital distractions. Use the Imagine It habit to brainstorm three unconventional ways you could redesign your digital environment to promote deeper focus. Stop when you have three distinct ideas.',
  'Imagine It',
  'Risk Assessment
Take one of the ideas you generated using Imagine It in the previous challenge. Use the Critique It habit to identify three potential downsides or unintended consequences of implementing that change in your daily routine. Stop when you have three potential risks clearly articulated.',
  'Critique It',
  'In what ways did using Imagine It to generate possibilities change what Critique It revealed about the potential pitfalls of improving your focus and digital wellbeing?',
  ARRAY['Wow, I thought reducing notifications would be great, but it might make me anxious about missing important updates. I hadn''t considered that.', 'I was so focused on the benefits of a digital detox that I overlooked the potential for feeling disconnected from my team.']
);

