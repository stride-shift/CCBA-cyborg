const XLSX = require('xlsx')

const emailers = [
  // ═══ MARCH 6 — Pre-programme email ═══
  { month: 'March', label: 'Pre-Programme', date: '2026-03-06', day: 'Friday',    subject: "Your Cyborg Journey Starts Monday — Get Ready!", body: "The Cyborg Habits programme kicks off on Monday! Jump into the platform now and watch the introduction video so you're ready to go when the first challenge drops. See you on the inside.", cta: "Watch The Intro Video" },

  // ═══ MARCH — Daily (Mon–Fri), starting 9 March 2026 — 17 days ═══
  { month: 'March', label: 'Day 1',  date: '2026-03-09', day: 'Monday',    subject: "Your Inner Cyborg Just Woke Up",               body: "Something shifted today. You showed up — and that alone puts you ahead of 90% of people who said they would. The programme is live. Your first challenge is waiting.",                         cta: "Step Into Your Power" },
  { month: 'March', label: 'Day 2',  date: '2026-03-10', day: 'Tuesday',   subject: "The Uncomfortable Truth About Comfort Zones",   body: "That thing you've been avoiding? Your cyborg self already knows it's the exact thing you need to do next. Growth lives on the other side of discomfort.",                                    cta: "Push Past The Edge" },
  { month: 'March', label: 'Day 3',  date: '2026-03-11', day: 'Wednesday', subject: "You're Smarter Than You Were Last Week",        body: "Every challenge you complete isn't just a checkbox — it's proof that you can learn anything. The data doesn't lie. Check your progress and see how far you've come.",                        cta: "See Your Progress" },
  { month: 'March', label: 'Day 4',  date: '2026-03-12', day: 'Thursday',  subject: "The Gap Between Knowing and Doing",             body: "You know what to do. Everyone does. The difference? Cyborgs actually do it. Today's your chance to close that gap. One challenge. Five minutes. Real change.",                               cta: "Close The Gap" },
  { month: 'March', label: 'Day 5',  date: '2026-03-13', day: 'Friday',    subject: "Friday Brain ≠ Weak Brain",                     body: "End-of-week fatigue is real. But your cyborg habits don't take days off. One small action today compounds into something big by Monday. Finish the week strong.",                            cta: "Finish Strong" },
  { month: 'March', label: 'Day 6',  date: '2026-03-16', day: 'Monday',    subject: "Monday Called. Your Cyborg Answered.",           body: "New week. New neural pathways. The habits you're building aren't just tasks — they're rewiring how you think. Log in and keep the momentum going.",                                          cta: "Start Rewiring" },
  { month: 'March', label: 'Day 7',  date: '2026-03-17', day: 'Tuesday',   subject: "Reset. Recharge. Re-engage.",                   body: "New week, same mission. The neural pathways you're building get stronger every time you show up. Don't break the chain — your streak is counting on you.",                                  cta: "Keep Building" },
  { month: 'March', label: 'Day 8',  date: '2026-03-18', day: 'Wednesday', subject: "What If You're Closer Than You Think?",         body: "Progress doesn't always announce itself. Sometimes the breakthrough is happening right now and you just can't see it yet. Trust the process. Log in today.",                                cta: "Trust The Process" },
  { month: 'March', label: 'Day 9',  date: '2026-03-19', day: 'Thursday',  subject: "Your Brain Is Lying to You",                    body: "That voice saying 'skip today' isn't wisdom — it's resistance. Your cyborg self knows the difference. Override it. Today's challenge is waiting for you.",                                  cta: "Override Resistance" },
  { month: 'March', label: 'Day 10', date: '2026-03-20', day: 'Friday',    subject: "Small Moves, Big Shifts",                       body: "You don't need a revolution. You need a habit. The tiny actions you're taking every day are creating tectonic shifts in how you work and think.",                                            cta: "Keep Moving" },
  { month: 'March', label: 'Day 11', date: '2026-03-23', day: 'Monday',    subject: "The Monday Multiplier Effect",                  body: "Every Monday you show up, you multiply last week's gains. Your cyborg habits are compounding. Can you feel the difference? Because the people around you can.",                              cta: "Multiply Your Gains" },
  { month: 'March', label: 'Day 12', date: '2026-03-24', day: 'Tuesday',   subject: "Look How Far You've Come",                      body: "Halfway there. Look back at where you started. Now look where you are. That distance? You covered it one day at a time. Don't stop now.",                                                   cta: "Celebrate & Continue" },
  { month: 'March', label: 'Day 13', date: '2026-03-25', day: 'Wednesday', subject: "What Are You Becoming?",                        body: "Forget the tasks for a second. Who are you turning into? The person finishing this programme isn't the same one who started it. That's the real transformation.",                             cta: "Discover Your Evolution" },
  { month: 'March', label: 'Day 14', date: '2026-03-26', day: 'Thursday',  subject: "The Power of Showing Up (Again)",               body: "Day after day, you keep coming back. That consistency? It's more powerful than any single brilliant move. You are the system. The system is working.",                                       cta: "Be The System" },
  { month: 'March', label: 'Day 15', date: '2026-03-27', day: 'Friday',    subject: "Your Future Self Is Watching",                  body: "Everything you do today is being observed by the person you're becoming. Make them proud. They're counting on you to keep going.",                                                           cta: "Make Them Proud" },
  { month: 'March', label: 'Day 16', date: '2026-03-30', day: 'Monday',    subject: "The Final Stretch Begins",                       body: "You're in the home stretch of the daily challenges. Two days left. The habits you've built this month aren't going anywhere — they're part of you now. Show up one more time.",               cta: "Enter The Final Stretch" },
  { month: 'March', label: 'Day 17', date: '2026-03-31', day: 'Tuesday',   subject: "You Did It. Now Own It.",                         body: "Last daily challenge. You showed up, day after day, and built something real. This isn't the end — it's the launchpad. Your cyborg habits are locked in. Time to fly.",                       cta: "Complete The Journey" },

  // ═══ APRIL — One email per week (Fridays) ═══
  { month: 'April', label: 'Week 1', date: '2026-04-03', day: 'Friday',    subject: "The Habit Didn't Stop When The Programme Did",  body: "It's been a week since the daily challenges ended. But your cyborg doesn't power down. The question is — are you still showing up when nobody's sending you a reminder?",                   cta: "Prove It To Yourself" },
  { month: 'April', label: 'Week 2', date: '2026-04-10', day: 'Friday',    subject: "Nobody's Watching. That's The Point.",           body: "The real test of a habit isn't what you do when someone's tracking you. It's what you do when they stop. Your cyborg habits are yours now. Use them.",                                        cta: "Own Your Habits" },
  { month: 'April', label: 'Week 3', date: '2026-04-17', day: 'Friday',    subject: "You're Not The Same Person Who Started",        body: "Look back at who you were a month ago. The way you think, the way you approach problems, the tools you reach for — something fundamental has shifted. Notice it.",                           cta: "See The Shift" },
  { month: 'April', label: 'Week 4', date: '2026-04-24', day: 'Friday',    subject: "The Compound Effect Is Real",                   body: "Small daily actions. Repeated over weeks. The results are starting to show — in your work, your thinking, your confidence. This is what compounding looks like.",                             cta: "Keep Compounding" },

  // ═══ MAY — One email per week (Fridays) ═══
  { month: 'May',   label: 'Week 1', date: '2026-05-01', day: 'Friday',    subject: "Two Months In. Still Standing.",                body: "Most people quit after two weeks. You're still here, still applying what you learned. That's not discipline — that's identity. You've become someone who shows up.",                         cta: "Stand Tall" },
  { month: 'May',   label: 'Week 2', date: '2026-05-08', day: 'Friday',    subject: "What Would Your Pre-Cyborg Self Think?",        body: "Imagine showing your old self what you can do now. The shortcuts you've found, the clarity you've built, the habits running on autopilot. You'd barely recognise yourself.",                 cta: "Look Back & Smile" },
  { month: 'May',   label: 'Week 3', date: '2026-05-15', day: 'Friday',    subject: "The Invisible Advantage",                       body: "Your colleagues might not know exactly what changed. But they can feel it — in your emails, your decisions, your speed. You have an edge now. Keep sharpening it.",                          cta: "Sharpen Your Edge" },
  { month: 'May',   label: 'Week 4', date: '2026-05-22', day: 'Friday',    subject: "This Isn't The End. It's Your Operating System.",body: "Cyborg Habits was never just a programme. It's how you work now. The tools, the thinking, the habits — they're part of you. Go build something extraordinary with them.",                    cta: "Build Something Extraordinary" },
  { month: 'May',   label: 'Week 5', date: '2026-05-29', day: 'Friday',    subject: "The Cyborg Legacy",                              body: "Three months ago you started something bold. Now look at what you've built — new skills, new habits, a new way of thinking. You're not just a graduate. You're proof that it works.",         cta: "Carry The Legacy Forward" },
]

// Build worksheet data
const headers = ['Month', 'Label', 'Send Date', 'Day of Week', 'Subject Line', 'Email Body', 'CTA Button Text']
const rows = emailers.map(e => [e.month, e.label, e.date, e.day, e.subject, e.body, e.cta])

const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

// Column widths
ws['!cols'] = [
  { wch: 8 },   // Month
  { wch: 10 },  // Label
  { wch: 12 },  // Send Date
  { wch: 12 },  // Day of Week
  { wch: 50 },  // Subject
  { wch: 80 },  // Body
  { wch: 30 },  // CTA
]

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Emailer Schedule')

const outPath = 'CCBA_Cyborg_Habits_Emailers_Mar-May_2026.xls'
XLSX.writeFile(wb, outPath, { bookType: 'xls' })
console.log(`Created: ${outPath}`)
console.log(`Total emailers: ${emailers.length}`)
console.log(`  March:  ${emailers.filter(e => e.month === 'March').length} (daily Mon-Fri)`)
console.log(`  April:  ${emailers.filter(e => e.month === 'April').length} (weekly Fridays)`)
console.log(`  May:    ${emailers.filter(e => e.month === 'May').length} (weekly Fridays)`)
