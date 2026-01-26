-- Insert all 17 March challenges
-- Clear existing challenges first
DELETE FROM challenges;

-- Challenge 1: Student to Professional 1
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 1: Intro to Cyborg Habits & Augmented Working',
  1,
  true,
  'Partner Test: Take a real task you completed today (an email, a decision, a plan). Ask AI: "I just did this task alone. Explain how the result would be different if I had used you as a thinking partner, not just a faster way to get it done."',
  'Explain It',
  'Approach Shift: Take that same task. Ask AI: "Suggest 3 different ways I could approach this task tomorrow if I treated you as a collaborator who challenges my thinking, not just executes my instructions."',
  'Suggest It',
  'When you used Explain It to see the difference between AI as a tool vs. thinking partner, what did Suggest It reveal about what changes when you invite AI to challenge your approach instead of just follow it?',
  ARRAY['I''ve been using AI like a faster Google - I''m missing the whole point.', 'When I let AI question my approach, I see blind spots I couldn''t see alone.']
);

-- Challenge 2: Student to Professional 2
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 2: Technology Proficiency for the Future of Work',
  2,
  true,
  'Daily Tool Audit: Pick one tool you use every day (your calendar, email, Slack, etc.). Ask AI: "I use this tool daily. Explain what I''m probably missing - what features exist that would solve a frustration I currently just accept?"',
  'Explain It',
  'Friction Solver: Pick the feature AI identified that addresses your biggest frustration. Ask AI: "Guide me through using this feature for the first time. What''s the 3-step process to make it part of my daily workflow?"',
  'Guide It',
  'When you used Explain It to discover features you didn''t know existed, what did Guide It reveal about the gap between "using tools" and "mastering tools you already have"?',
  ARRAY['I''ve been frustrated by a problem this tool already solves - I just never looked.', 'I assumed I knew my tools, but I''m using maybe 10% of what''s there.']
);

-- Challenge 3: Student to Professional 3
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 3: Storytelling & Professional Communication',
  3,
  true,
  'Sameness Detector: Take your current "Tell me about yourself" pitch (or LinkedIn summary). Ask AI: "Critique this. Point out every part where I sound exactly like every other CCBA student. What makes me forgettable?"',
  'Critique It',
  'Memory Maker: Pick the one detail AI says makes you different. Ask AI: "Improve this pitch by starting with that detail, cutting everything generic, and keeping only what someone would actually remember tomorrow."',
  'Improve It',
  'When you used Critique It to see where you sound like everyone else, what did Improve It teach you about the difference between "professional-sounding" and "memorable"?',
  ARRAY['I was trying so hard to sound impressive that I erased what makes me interesting.', 'The thing I''m embarrassed about is actually the story people remember.']
);

-- Challenge 4: Student to Professional 4
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 4: Crafting Your Personal Brand in CCBA, Workplace Etiquette & Meeting Discipline',
  4,
  true,
  'Reality Check: Think of how you want colleagues at CCBA to describe you (e.g., "reliable," "curious," "collaborative"). Ask AI: "Based on my actual recent behaviors (when I show up to meetings, how I participate, what I say in Slack), critique what brand I''m actually showing vs. what I claim."',
  'Critique It',
  'Visible Shift: Look at the biggest gap AI found. Ask AI: "Suggest one small, concrete behavior I can do consistently this week that people will actually notice and that closes this gap."',
  'Suggest It',
  'When you used Critique It to see the gap between your intended brand and visible behaviors, what did Suggest It reveal about how reputation is built through what people see you do, not what you say you are?',
  ARRAY['I say I''m "collaborative" but I''ve barely spoken in meetings for two weeks - that''s not what people see.', 'One visible micro-habit repeated all week beats one big impressive gesture.']
);

-- Challenge 5: Student to Professional 5
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 5: Personal Finance',
  5,
  true,
  'Money Archaeology: Look at your actual spending from last week (bank statement, transactions, anything you bought). Ask AI: "Explain what my real spending reveals about my actual priorities. Where''s the biggest gap between what I say matters and where my money goes?"',
  'Explain It',
  'One-Week Fix: Take the biggest mismatch AI found. Ask AI: "Suggest one specific spending change I can make this week that moves my money toward what I actually care about, not just what''s easy."',
  'Suggest It',
  'When you used Explain It to see what your spending actually says about you, what did Suggest It teach you about the difference between "having a budget" and "spending like you mean it"?',
  ARRAY['I say I care about my future but I''m spending like I only care about this weekend.', 'My money is going to comfort and convenience, not to what I claim is important.']
);

-- Challenge 6: CH Challenge 1
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'CH Challenge 1',
  6,
  true,
  'Win Archaeology: Think of something that went well for you today (any small win - a good conversation, finishing a task, solving a problem). Ask AI: "Explain which cyborg habit I unconsciously used to make this go well, even if I didn''t realize I was using it."',
  'Explain It',
  'Tomorrow''s Stack: Look at the habit AI identified. Ask AI: "Plan how I could intentionally use that same habit tomorrow, plus suggest one more habit I could pair with it to create an even better outcome."',
  'Plan It',
  'When you used Explain It to see which habit you were already using naturally, what did Plan It reveal about the difference between accidentally doing something well and intentionally repeating it?',
  ARRAY['Using Explain It, I realized I''ve been using these habits without knowing it - I just need to do it on purpose.', 'Using Plan It showed me that stacking two habits creates way more value than stumbling through with one.']
);

-- Challenge 7: CH Challenge 2
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'CH Challenge 2',
  7,
  true,
  'Stuck Point Finder: Think of something you''re currently stuck on (a decision, a task you''re avoiding, a problem with no clear answer). Ask AI: "Suggest which cyborg habit would most help me get unstuck right now and why that specific habit fits this specific stuck point."',
  'Suggest It',
  'Immediate Application: Take the habit AI suggested. Ask AI: "Guide me through using this habit on my stuck point right now - walk me through the first question I should ask you to get started."',
  'Guide It',
  'When you used Suggest It to match a habit to your specific stuck point, what did Guide It teach you about how different habits solve different kinds of problems?',
  ARRAY['Using Suggest It, I learned that being stuck isn''t the problem - using the wrong habit for the situation is.', 'Using Guide It showed me I don''t need to know everything - I just need to know which habit fits which moment.']
);

-- Challenge 8: CH Challenge 3
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'CH Challenge 3',
  8,
  true,
  'Week in Review: Think back over the last few days at CCBA. Ask AI: "Based on the challenges I''ve faced this week (meetings, tasks, decisions, conversations), explain which cyborg habit I needed most but probably didn''t use."',
  'Explain It',
  'Future Application: Take the habit AI identified as missing. Ask AI: "Imagine I face that same type of challenge again next week. Plan the exact moment when I should pause and use this habit - what''s the trigger signal I should watch for?"',
  'Plan It',
  'When you used Explain It to see which habit you were missing this week, what did Plan It reveal about turning challenges into habit triggers instead of just problems?',
  ARRAY['Using Explain It, I realized I keep hitting the same wall because I''m not using the right habit at the right time.', 'Using Plan It showed me I can train myself to recognize the moment a habit is needed before I''m already stuck.']
);

-- Challenge 9: CH Challenge 4
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'CH Challenge 4',
  9,
  true,
  'Current Approach Audit: Pick a type of task you do regularly (writing emails, making decisions, planning your day, having difficult conversations). Ask AI: "Critique my current approach. Which cyborg habit am I overusing and which am I avoiding? What''s the imbalance?"',
  'Critique It',
  'Balance Builder: Look at the habit you''re avoiding. Ask AI: "Suggest how pairing that avoided habit with my overused habit would create a better result. Give me a specific example using something I''m working on right now."',
  'Suggest It',
  'When you used Critique It to see your habit imbalance, what did Suggest It teach you about how pairing complementary habits creates stronger outcomes than using your favorite habit alone?',
  ARRAY['Using Critique It, I realized I keep using the comfortable habit (Explain It) and avoiding the challenging one (Critique It) - that''s why I stay stuck.', 'Using Suggest It showed me my avoided habit is exactly what my comfortable habit is missing - they work better together.']
);

-- Challenge 10: Student to Professional 6
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 6: Digital Identity, LinkedIn & Internal Visibility',
  10,
  true,
  'Sameness Scan: Open your LinkedIn profile right now (or draft if you don''t have one). Ask AI: "Critique this profile honestly. Which parts could belong to literally any other CCBA student? What sounds like I copied a template?"',
  'Critique It',
  'Real Person Rewrite: Take the most generic part AI identified (probably your headline or About section). Ask AI: "Improve this by rewriting it to sound like a real person with a specific story, not a professional template. Use something true and specific about me."',
  'Improve It',
  'When you used Critique It to see where your LinkedIn sounds like everyone else''s, what did Improve It reveal about the difference between "professional polish" and "professional authenticity"?',
  ARRAY['Using Critique It, I realized my LinkedIn is so polished it''s invisible - no one would remember me.', 'Using Improve It showed me being specific and real beats being vague and impressive every time.']
);

-- Challenge 11: In-Trade Learning 1
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning 1',
  11,
  true,
  'Assumption Breaker: Think about what you assumed sales work would be like before starting in-trade. Ask AI: "Based on what I''m actually seeing sales managers do every day, explain where my assumptions were completely wrong. What''s the biggest gap between what I imagined and what''s real?"',
  'Explain It',
  'Transferable Skills Finder: Look at what sales managers actually do (not what you imagined). Ask AI: "Suggest 3 specific skills I''m watching sales managers use that matter in any professional role, not just sales. What am I seeing that I need to develop?"',
  'Suggest It',
  'When you used Explain It to see the gap between your assumptions and sales reality, what did Suggest It reveal about which professional skills show up everywhere, not just in sales?',
  ARRAY['Using Explain It, I realized I thought sales was about talking - it''s actually about listening and solving problems I didn''t know existed.', 'Using Suggest It showed me the skills I''m watching (reading people, handling rejection, asking better questions) matter in every job I''ll ever have.']
);

-- Challenge 12: In-Trade Learning 2
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning 2',
  12,
  true,
  'Trust Archaeology: Think of a customer interaction you observed this week (in person, on a call, in an email). Ask AI: "Explain what the sales manager actually did that built trust with that customer vs. what I assumed would build trust."',
  'Explain It',
  'Trust Transfer: Look at that specific trust-building behavior you observed. Ask AI: "Plan how I could use that same trust-building approach in my next meeting, presentation, or even email at CCBA - not in a sales context, just in professional interaction."',
  'Plan It',
  'When you used Explain It to understand what actually builds professional trust, what did Plan It teach you about applying sales wisdom to non-sales situations you face every day?',
  ARRAY['Using Explain It, I learned trust isn''t built by being impressive or having all the answers - it''s built by being genuinely curious about the other person''s problem.', 'Using Plan It showed me I can use this customer-first thinking in every professional conversation, not just when I''m "selling" something.']
);

-- Challenge 13: In-Trade Learning 3
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning 3',
  13,
  true,
  'Resilience Observation: Think about a moment you saw a sales manager face rejection or a difficult customer this week. Ask AI: "Explain what they did in the 60 seconds right after that rejection that kept them going. What did I notice about how they handled it?"',
  'Explain It',
  'Personal Resilience Plan: Look at that specific resilience behavior you observed. Ask AI: "Suggest how I could apply that same resilience approach when I face rejection or failure at CCBA (a bad grade, critical feedback, a mistake in front of colleagues)."',
  'Suggest It',
  'When you used Explain It to see how sales managers actually handle rejection, what did Suggest It reveal about resilience being a practiced skill, not just natural toughness?',
  ARRAY['Using Explain It, I realized resilient people don''t feel rejection less - they just have a specific process for moving through it faster.', 'Using Suggest It showed me I can borrow their exact 60-second recovery routine for my own failures - it''s not magic, it''s method.']
);

-- Challenge 14: In-Trade Learning 4
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning 4',
  14,
  true,
  'Question Audit: Think about questions you heard sales managers ask customers this week. Ask AI: "Critique the difference between the questions I would have asked vs. the questions they actually asked. What makes their questions better?"',
  'Critique It',
  'Question Upgrade: Pick something you need to understand better at CCBA (a concept, a project, someone''s expectations). Ask AI: "Improve the question I would normally ask by making it more like the sales manager questions - what would I ask to really understand, not just check a box?"',
  'Improve It',
  'When you used Critique It to see the gap between your questions and sales manager questions, what did Improve It teach you about how better questions unlock better understanding in any context?',
  ARRAY['Using Critique It, I realized my questions are designed to get quick answers so I can move on - their questions are designed to actually understand the problem.', 'Using Improve It showed me one better question saves me from hours of working on the wrong thing.']
);

-- Challenge 15: Student to Professional 7
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'Student to Professional 7: Productivity Systems & Task Management (with AI)',
  15,
  true,
  'Task List Reality: Look at your actual task list right now (any system you use - notes app, planner, mental list, whatever you have). Ask AI: "Critique this honestly. Rank these tasks by real impact on my CCBA goals, not by urgency or how easy they are. What am I doing first that should be last?"',
  'Critique It',
  'Impact-First Action: Look at the highest-impact task AI identified (probably the one you''ve been avoiding). Ask AI: "Guide me. What''s the single next action for this high-impact task that creates the most clarity or gets me unstuck?"',
  'Guide It',
  'When you used Critique It to see the gap between your task order and actual priorities, what did Guide It reveal about the difference between "staying busy" and "making real progress"?',
  ARRAY['Using Critique It, I realized I''m doing easy tasks first because they feel productive - but I''m making zero progress on what actually matters.', 'Using Guide It showed me the thing I keep avoiding is screaming to be done first - and one small action unsticks the whole thing.']
);

-- Challenge 16: In-Trade Learning 5
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning 5',
  16,
  true,
  'Expectation vs. Reality: Think about a typical day you''ve spent with the Area Sales Manager this week. Ask AI: "Based on what I actually saw them doing hour-by-hour (not what their job title suggests), explain what surprised me most about where their time actually goes."',
  'Explain It',
  'Hidden Skills: Look at what they actually spent time on (the unglamorous stuff - admin, follow-ups, problem-solving, relationship maintenance). Ask AI: "Suggest which of these ''boring'' activities require skills I need to develop for any professional role, not just sales."',
  'Suggest It',
  'When you used Explain It to see where a sales manager''s time actually goes, what did Suggest It reveal about the gap between job titles and real work in any profession?',
  ARRAY['Using Explain It, I realized "sales manager" sounds glamorous but the real job is 70% unglamorous relationship maintenance and problem prevention - just like every other professional role.', 'Using Suggest It showed me the skills behind the "boring" work (follow-through, attention to detail, proactive communication) are what separate good from mediocre in any job.']
);

-- Challenge 17: In-Trade Learning 6
INSERT INTO challenges (title, order_index, is_active, challenge_1, challenge_1_type, challenge_2, challenge_2_type, reflection_question, intended_aha_moments)
VALUES (
  'In-Trade Learning 6',
  17,
  true,
  'Decision Under Pressure: Think of a moment this week when you saw the Area Sales Manager have to make a quick decision under pressure (a customer issue, a sudden problem, a difficult conversation). Ask AI: "Explain what they did in that pressure moment that I would have done differently - what did I notice about how they handled it?"',
  'Explain It',
  'Pressure Practice: Look at the specific approach they used under pressure. Ask AI: "Plan how I could practice that same approach in a low-stakes situation I''ll face this week at CCBA (a difficult question in class, unexpected feedback, a mistake I need to own)."',
  'Plan It',
  'When you used Explain It to see how professionals actually handle pressure, what did Plan It teach you about pressure response being a practiced skill you can develop in low-stakes moments?',
  ARRAY['Using Explain It, I realized they didn''t panic or freeze because they''ve practiced this exact response pattern hundreds of times - it''s muscle memory, not natural talent.', 'Using Plan It showed me I can practice the same pressure responses in my low-stakes CCBA moments so when real pressure comes, I''m ready.']
);
