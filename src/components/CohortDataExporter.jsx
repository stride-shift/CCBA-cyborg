import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

const CohortDataExporter = ({ cohortId, cohortName }) => {
  const [isExporting, setIsExporting] = useState(null);
  const [error, setError] = useState(null);

  const escapeCsvField = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const toCsv = (headers, rows) => {
    const headerLine = headers.map(escapeCsvField).join(',');
    const dataLines = rows.map(row => headers.map(h => escapeCsvField(row[h])).join(','));
    return [headerLine, ...dataLines].join('\n');
  };

  const fetchAll = async (table, select, filters = {}) => {
    const PAGE_SIZE = 1000;
    let allData = [];
    let offset = 0;
    while (true) {
      let query = supabase.from(table).select(select).range(offset, offset + PAGE_SIZE - 1);
      if (filters.in) query = query.in(filters.in[0], filters.in[1]);
      if (filters.eq) query = query.eq(filters.eq[0], filters.eq[1]);
      if (filters.order) query = query.order(filters.order);
      const { data, error } = await query;
      if (error) throw error;
      allData = [...allData, ...(data || [])];
      if (!data || data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    return allData;
  };

  const getCohortUserIds = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name')
      .eq('cohort_id', cohortId)
      .eq('role', 'user');
    if (error) throw error;
    return data || [];
  };

  const getUserEmails = async (userIds) => {
    const { data, error } = await supabase.rpc('get_users_with_emails');
    if (error) throw error;
    const emailMap = {};
    if (data) {
      for (const u of data) {
        if (userIds.includes(u.user_id)) emailMap[u.user_id] = u.email;
      }
    }
    return emailMap;
  };

  const exportChallengesReflections = async () => {
    const users = await getCohortUserIds();
    const userIds = users.map(u => u.user_id);
    const emailMap = await getUserEmails(userIds);

    const [completions, customCompletions, reflections, customReflections] = await Promise.all([
      fetchAll('user_challenge_completions', 'user_id, challenge_id, challenge_number, completed_at, notes', { in: ['user_id', userIds], order: 'completed_at' }),
      fetchAll('user_customized_challenge_completions', 'user_id, challenge_id, challenge_number, completed_at, notes', { in: ['user_id', userIds], order: 'completed_at' }),
      fetchAll('user_reflections', 'user_id, challenge_id, reflection_text, word_count, submitted_at', { in: ['user_id', userIds] }),
      fetchAll('user_customized_challenge_reflections', 'user_id, challenge_id, reflection_text, word_count, submitted_at', { in: ['user_id', userIds] }),
    ]);

    const { data: challenges } = await supabase.from('challenges').select('id, title, order_index');
    const { data: customChallenges } = await supabase.from('customized_challenges').select('id, title, order_index').eq('cohort_id', cohortId);

    const allCompletions = [...(completions || []), ...(customCompletions || [])];
    const allReflections = [...(reflections || []), ...(customReflections || [])];

    const challengeMap = {};
    for (const c of (challenges || [])) challengeMap[c.id] = c;
    for (const c of (customChallenges || [])) challengeMap[c.id] = c;

    const reflectionMap = {};
    for (const r of allReflections) {
      reflectionMap[`${r.user_id}_${r.challenge_id}`] = r;
    }

    const rows = allCompletions.map(comp => {
      const user = users.find(u => u.user_id === comp.user_id);
      const challenge = challengeMap[comp.challenge_id] || {};
      const ref = reflectionMap[`${comp.user_id}_${comp.challenge_id}`];
      return {
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: emailMap[comp.user_id] || '',
        day: challenge.order_index || '',
        challenge_title: challenge.title || '',
        challenge_number: comp.challenge_number,
        completed_at: comp.completed_at,
        notes: comp.notes || '',
        reflection_text: ref?.reflection_text || '',
        reflection_word_count: ref?.word_count || '',
        reflection_submitted_at: ref?.submitted_at || ''
      };
    });

    const headers = ['first_name', 'last_name', 'email', 'day', 'challenge_title', 'challenge_number', 'completed_at', 'notes', 'reflection_text', 'reflection_word_count', 'reflection_submitted_at'];
    return toCsv(headers, rows);
  };

  const exportSurveys = async () => {
    const users = await getCohortUserIds();
    const userIds = users.map(u => u.user_id);
    const emailMap = await getUserEmails(userIds);

    const { data: preSurveys } = await supabase
      .from('pre_survey_responses')
      .select('*')
      .in('user_id', userIds);

    const { data: postSurveys } = await supabase
      .from('post_survey_responses')
      .select('*')
      .in('user_id', userIds);

    const preMap = {};
    for (const s of (preSurveys || [])) preMap[s.user_id] = s;
    const postMap = {};
    for (const s of (postSurveys || [])) postMap[s.user_id] = s;

    const rows = users.map(user => {
      const pre = preMap[user.user_id] || {};
      const post = postMap[user.user_id] || {};
      return {
        first_name: user.first_name,
        last_name: user.last_name,
        email: emailMap[user.user_id] || '',
        pre_survey_completed: !!preMap[user.user_id] ? 'Yes' : 'No',
        pre_completed_at: pre.completed_at || '',
        pre_ai_usage_rating: pre.ai_usage_rating || '',
        pre_ai_comfort_level: pre.ai_comfort_level || '',
        pre_habit_frequency: pre.habit_frequency || '',
        post_survey_completed: !!postMap[user.user_id] ? 'Yes' : 'No',
        post_completed_at: post.completed_at || '',
        post_ai_usage_rating: post.ai_usage_rating || '',
        post_ai_comfort_level: post.ai_comfort_level || '',
        post_habit_frequency: post.habit_frequency || ''
      };
    });

    const headers = ['first_name', 'last_name', 'email', 'pre_survey_completed', 'pre_completed_at', 'pre_ai_usage_rating', 'pre_ai_comfort_level', 'pre_habit_frequency', 'post_survey_completed', 'post_completed_at', 'post_ai_usage_rating', 'post_ai_comfort_level', 'post_habit_frequency'];
    return toCsv(headers, rows);
  };

  const exportAnalytics = async () => {
    // Use the leaderboard RPC for accurate counts (avoids 1000-row limit)
    const { data: leaderboard, error: lbErr } = await supabase
      .rpc('get_enhanced_cohort_leaderboard_v2', { target_cohort_id: cohortId });
    if (lbErr) throw lbErr;

    const userIds = leaderboard.map(u => u.user_id);
    const emailMap = await getUserEmails(userIds);

    const { data: analytics } = await supabase
      .from('user_journey_analytics')
      .select('user_id, longest_streak_days, last_activity_at, average_session_duration_minutes')
      .in('user_id', userIds);

    const analyticsMap = {};
    for (const a of (analytics || [])) analyticsMap[a.user_id] = a;

    const rows = leaderboard.map(user => {
      const a = analyticsMap[user.user_id] || {};
      return {
        first_name: user.first_name,
        last_name: user.last_name,
        email: emailMap[user.user_id] || '',
        journey_completion_percentage: user.journey_completion_percentage || 0,
        total_days_completed: user.total_days_completed || 0,
        total_challenges_completed: user.total_challenges_completed || 0,
        total_reflections_submitted: user.total_reflections_submitted || 0,
        current_streak_days: user.current_streak_days || 0,
        longest_streak_days: a.longest_streak_days || 0,
        last_activity_at: a.last_activity_at || '',
        average_session_duration_minutes: a.average_session_duration_minutes || 0
      };
    });

    const headers = ['first_name', 'last_name', 'email', 'journey_completion_percentage', 'total_days_completed', 'total_challenges_completed', 'total_reflections_submitted', 'current_streak_days', 'longest_streak_days', 'last_activity_at', 'average_session_duration_minutes'];
    return toCsv(headers, rows);
  };

  const exportProgressReport = async () => {
    // Get leaderboard data from official RPC
    const { data: leaderboard, error: lbError } = await supabase
      .rpc('get_enhanced_cohort_leaderboard_v2', { target_cohort_id: cohortId });
    if (lbError) throw lbError;

    // Get cohort info
    const { data: cohortInfo } = await supabase
      .from('cohorts')
      .select('start_date, end_date')
      .eq('id', cohortId)
      .single();

    // Get emails
    const userIds = leaderboard.map(u => u.user_id);
    const emailMap = await getUserEmails(userIds);

    // Get pre/post survey status
    const { data: preSurveys } = await supabase
      .from('pre_survey_responses')
      .select('user_id')
      .in('user_id', userIds);
    const { data: postSurveys } = await supabase
      .from('post_survey_responses')
      .select('user_id')
      .in('user_id', userIds);
    const preSet = new Set((preSurveys || []).map(s => s.user_id));
    const postSet = new Set((postSurveys || []).map(s => s.user_id));

    // Calculate current programme day
    const startDate = cohortInfo?.start_date ? new Date(cohortInfo.start_date) : null;
    let currentDay = 0;
    if (startDate) {
      const today = new Date();
      let d = new Date(startDate);
      while (d <= today) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) currentDay++;
        d.setDate(d.getDate() + 1);
      }
    }

    // Get total challenges for denominator
    const { data: challenges } = await supabase
      .from('challenges')
      .select('id, title, order_index')
      .eq('is_active', true)
      .order('order_index');
    const totalDays = (challenges || []).length;

    // Get reflections for reflections sheet (paginated to avoid 1000-row limit)
    const reflections = await fetchAll('user_reflections', 'user_id, challenge_id, reflection_text, word_count, submitted_at', { in: ['user_id', userIds], order: 'submitted_at' });

    const challengeMap = {};
    for (const c of (challenges || [])) challengeMap[c.id] = c;

    // Get day completions for day completions sheet (paginated)
    const dayCompletions = await fetchAll('user_day_completions', 'user_id, challenge_id, both_challenges_completed, reflection_submitted, created_at, updated_at', { in: ['user_id', userIds] });

    // Build name/email lookup
    const nameMap = {};
    for (const u of leaderboard) {
      nameMap[u.user_id] = { first: u.first_name, last: u.last_name, email: emailMap[u.user_id] || '' };
    }

    const wb = XLSX.utils.book_new();

    // ===== SHEET 1: Leaderboard =====
    const lbHeader = [
      [`CCBA Cyborg Habits - Leaderboard Report (${new Date().toISOString().split('T')[0]})`],
      [`Cohort: ${cohortName} | Programme: ${totalDays} days (currently on Day ${currentDay}) | Generated from official platform leaderboard RPC`],
      [],
      ['Rank', 'Name', 'Email', 'Days Completed', `Progress vs Day ${currentDay}`, 'Status', 'Challenges Completed', 'Reflections Submitted', 'Overall Completion %', 'Current Streak', 'Surveys Done', 'Pre-Survey', 'Post-Survey']
    ];

    const lbRows = leaderboard.map(u => {
      const progressVsDay = currentDay > 0 ? Math.round((u.total_days_completed / currentDay) * 100) : 0;
      const status = progressVsDay >= 100 ? 'Ahead' : progressVsDay >= 80 ? 'On Track' : progressVsDay >= 50 ? 'Behind' : 'Needs Support';
      return [
        u.rank_position,
        `${u.first_name} ${u.last_name}`,
        emailMap[u.user_id] || '',
        u.total_days_completed,
        `${progressVsDay}%`,
        status,
        u.total_challenges_completed,
        u.total_reflections_submitted,
        `${u.journey_completion_percentage}%`,
        u.current_streak_days,
        u.surveys_completed,
        preSet.has(u.user_id) ? 'Yes' : 'No',
        postSet.has(u.user_id) ? 'Yes' : 'No'
      ];
    });

    const lbSheet = XLSX.utils.aoa_to_sheet([...lbHeader, ...lbRows]);
    XLSX.utils.book_append_sheet(wb, lbSheet, 'Leaderboard');

    // ===== SHEET 2: Reflections =====
    const refHeader = [
      [`CCBA Cyborg Habits - All Reflections (${(reflections || []).length} total)`],
      [],
      ['Name', 'Email', 'Day', 'Challenge Title', 'Reflection Text', 'Word Count', 'Submitted At']
    ];

    const refRows = (reflections || []).map(r => {
      const user = nameMap[r.user_id] || {};
      const challenge = challengeMap[r.challenge_id] || {};
      return [
        `${user.first || ''} ${user.last || ''}`.trim(),
        user.email || '',
        challenge.order_index || '',
        challenge.title || '',
        r.reflection_text || '',
        r.word_count || 0,
        r.submitted_at || ''
      ];
    });

    const refSheet = XLSX.utils.aoa_to_sheet([...refHeader, ...refRows]);
    XLSX.utils.book_append_sheet(wb, refSheet, 'Reflections');

    // ===== SHEET 3: Analysis =====
    const totalParticipants = leaderboard.length;
    const activeParticipants = leaderboard.filter(u => u.total_days_completed > 0).length;
    const notStarted = totalParticipants - activeParticipants;
    const avgDays = totalParticipants > 0 ? (leaderboard.reduce((s, u) => s + u.total_days_completed, 0) / totalParticipants).toFixed(1) : 0;
    const medianDays = (() => {
      const sorted = leaderboard.map(u => u.total_days_completed).sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) / 2);
    })();
    const maxDays = Math.max(...leaderboard.map(u => u.total_days_completed), 0);
    const minDaysActive = Math.min(...leaderboard.filter(u => u.total_days_completed > 0).map(u => u.total_days_completed), 0);
    const avgCompletion = totalParticipants > 0 ? (leaderboard.reduce((s, u) => s + Number(u.journey_completion_percentage), 0) / totalParticipants).toFixed(1) : 0;
    const totalChallengesAll = leaderboard.reduce((s, u) => s + u.total_challenges_completed, 0);
    const totalReflectionsAll = leaderboard.reduce((s, u) => s + u.total_reflections_submitted, 0);
    const avgReflections = totalParticipants > 0 ? (totalReflectionsAll / totalParticipants).toFixed(1) : 0;

    const ahead = leaderboard.filter(u => currentDay > 0 && u.total_days_completed > currentDay).length;
    const onTrack = leaderboard.filter(u => currentDay > 0 && u.total_days_completed >= currentDay * 0.8 && u.total_days_completed <= currentDay).length;
    const slightlyBehind = leaderboard.filter(u => currentDay > 0 && u.total_days_completed >= currentDay * 0.5 && u.total_days_completed < currentDay * 0.8).length;
    const needsSupport = leaderboard.filter(u => currentDay > 0 && u.total_days_completed > 0 && u.total_days_completed < currentDay * 0.5).length;
    const avgProgressVsDay = currentDay > 0 ? (leaderboard.reduce((s, u) => s + (u.total_days_completed / currentDay) * 100, 0) / totalParticipants).toFixed(1) : 0;

    // Progress distribution buckets
    const buckets = [
      { label: '0 days (Not Started)', count: notStarted, desc: 'Have not engaged with the platform' },
      { label: '1-3 days (Very Early)', count: leaderboard.filter(u => u.total_days_completed >= 1 && u.total_days_completed <= 3).length, desc: 'Started but falling behind' },
      { label: '4-6 days', count: leaderboard.filter(u => u.total_days_completed >= 4 && u.total_days_completed <= 6).length, desc: 'Early progress' },
      { label: '7-9 days', count: leaderboard.filter(u => u.total_days_completed >= 7 && u.total_days_completed <= 9).length, desc: 'Progressing' },
      { label: '10-12 days', count: leaderboard.filter(u => u.total_days_completed >= 10 && u.total_days_completed <= 12).length, desc: 'On track' },
      { label: '13-15 days', count: leaderboard.filter(u => u.total_days_completed >= 13 && u.total_days_completed <= 15).length, desc: 'Ahead' },
      { label: '16-20 days (Well Ahead)', count: leaderboard.filter(u => u.total_days_completed >= 16 && u.total_days_completed <= 20).length, desc: 'Significantly ahead' },
      { label: '21+ days (Exceptional)', count: leaderboard.filter(u => u.total_days_completed >= 21).length, desc: 'Top performers' },
    ];

    // Top 10
    const top10 = leaderboard.slice(0, 10);

    // Users needing support (below 50% of current day)
    const needsSupportUsers = leaderboard
      .filter(u => currentDay > 0 && u.total_days_completed < currentDay * 0.5)
      .sort((a, b) => b.rank_position - a.rank_position);

    const analysisData = [
      ['CCBA Cyborg Habits - Analysis & Insights'],
      [],
      ['OVERALL PROGRAMME SUMMARY'],
      ['Metric', 'Value'],
      ['Report Date', new Date().toISOString().split('T')[0]],
      ['Cohort', cohortName],
      ['Programme Duration', `${totalDays} days (1 challenge per day)`],
      ['Current Programme Day', `Day ${currentDay} of ${totalDays}`],
      [],
      ['PARTICIPATION'],
      ['Total Participants', totalParticipants],
      ['Active Participants (>0 days)', `${activeParticipants} (${totalParticipants > 0 ? ((activeParticipants/totalParticipants)*100).toFixed(1) : 0}%)`],
      ['Not Started (0 days)', `${notStarted} (${totalParticipants > 0 ? ((notStarted/totalParticipants)*100).toFixed(1) : 0}%)`],
      [],
      [`PROGRESS vs DAY ${currentDay}`],
      [`Ahead of Day ${currentDay}`, `${ahead} (${totalParticipants > 0 ? ((ahead/totalParticipants)*100).toFixed(1) : 0}%)`],
      [`On Track (80-100% of Day ${currentDay})`, `${onTrack} (${totalParticipants > 0 ? ((onTrack/totalParticipants)*100).toFixed(1) : 0}%)`],
      ['Slightly Behind (50-80%)', `${slightlyBehind} (${totalParticipants > 0 ? ((slightlyBehind/totalParticipants)*100).toFixed(1) : 0}%)`],
      ['Needs Support (<50%)', `${needsSupport} (${totalParticipants > 0 ? ((needsSupport/totalParticipants)*100).toFixed(1) : 0}%)`],
      [`Avg Progress vs Day ${currentDay}`, `${avgProgressVsDay}%`],
      [],
      ['COMPLETION STATS'],
      ['Average Days Completed', avgDays],
      ['Median Days Completed', medianDays],
      ['Max Days Completed', maxDays],
      ['Min Days Completed (excl. 0)', minDaysActive],
      [`Average Overall Completion %`, `${avgCompletion}% (of ${totalDays}-day programme)`],
      [],
      ['TOTALS'],
      ['Total Challenges Completed (all users)', totalChallengesAll],
      ['Total Reflections Submitted (all users)', totalReflectionsAll],
      ['Average Reflections per User', avgReflections],
      [],
      [],
      [`PROGRESS DISTRIBUTION vs DAY ${currentDay}`],
      ['Progress Bracket', 'Count', '% of Total', 'Visual', 'Interpretation'],
      ...buckets.map(b => [
        b.label,
        b.count,
        `${totalParticipants > 0 ? ((b.count/totalParticipants)*100).toFixed(1) : 0}%`,
        '\u2588'.repeat(b.count),
        b.desc
      ]),
      [],
      [],
      ['TOP 10 PERFORMERS'],
      ['Rank', 'Name', 'Days', `vs Day ${currentDay}`, 'Reflections'],
      ...top10.map(u => [
        u.rank_position,
        `${u.first_name} ${u.last_name}`,
        u.total_days_completed,
        currentDay > 0 ? `${Math.round((u.total_days_completed / currentDay) * 100)}%` : 'N/A',
        u.total_reflections_submitted
      ]),
      [],
      [`USERS NEEDING ENGAGEMENT SUPPORT (below 50% of Day ${currentDay})`],
      ['Rank', 'Name', 'Days', `vs Day ${currentDay}`, 'Reflections'],
      ...needsSupportUsers.map(u => [
        u.rank_position,
        `${u.first_name} ${u.last_name}`,
        u.total_days_completed,
        currentDay > 0 ? `${Math.round((u.total_days_completed / currentDay) * 100)}%` : 'N/A',
        u.total_reflections_submitted
      ])
    ];

    const analysisSheet = XLSX.utils.aoa_to_sheet(analysisData);
    XLSX.utils.book_append_sheet(wb, analysisSheet, 'Analysis');

    // ===== SHEET 4: Day Completions =====
    const dcHeader = [
      [`Per-Day Completion Detail (${(dayCompletions || []).length} entries)`],
      [],
      ['Name', 'Email', 'Day', 'Challenge Title', 'Both Challenges', 'Reflection Done', 'Completed Date']
    ];

    const dcRows = (dayCompletions || []).map(dc => {
      const user = nameMap[dc.user_id] || {};
      const challenge = challengeMap[dc.challenge_id] || {};
      return [
        `${user.first || ''} ${user.last || ''}`.trim(),
        user.email || '',
        challenge.order_index || '',
        challenge.title || '',
        dc.both_challenges_completed ? 'Yes' : 'No',
        dc.reflection_submitted ? 'Yes' : 'No',
        (dc.updated_at || dc.created_at || '').split('T')[0]
      ];
    });

    const dcSheet = XLSX.utils.aoa_to_sheet([...dcHeader, ...dcRows]);
    XLSX.utils.book_append_sheet(wb, dcSheet, 'Day Completions');

    // Generate and download
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    const cleanCohortName = cohortName.replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `${cleanCohortName}_Progress_Report_${timestamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportData = async (exportType) => {
    setIsExporting(exportType);
    setError(null);

    try {
      if (exportType === 'progress_report') {
        await exportProgressReport();
        return;
      }

      let csvData;
      if (exportType === 'challenges_reflections') {
        csvData = await exportChallengesReflections();
      } else if (exportType === 'surveys') {
        csvData = await exportSurveys();
      } else if (exportType === 'analytics') {
        csvData = await exportAnalytics();
      } else {
        throw new Error(`Unknown export type: ${exportType}`);
      }

      // Create blob and download
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const cleanCohortName = cohortName.replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `${cleanCohortName}_${exportType}_${timestamp}.csv`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      console.error('Export error:', err);
      setError(`Failed to export ${exportType}: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  const exportButtons = [
    {
      type: 'progress_report',
      label: 'Full Progress Report',
      description: 'Multi-sheet XLSX with leaderboard, reflections, analysis & day completions',
      icon: '📋',
      highlight: true
    },
    {
      type: 'challenges_reflections',
      label: 'Challenges & Reflections',
      description: 'Complete challenge completion data with reflection text',
      icon: '📝'
    },
    {
      type: 'surveys',
      label: 'Survey Data',
      description: 'Pre and post-survey responses with AI usage metrics',
      icon: '📊'
    },
    {
      type: 'analytics',
      label: 'Analytics & Performance',
      description: 'User journey analytics, completion rates, and progress metrics',
      icon: '📈'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Export Cohort Data
        </h3>
        <p className="text-gray-600">
          Download CSV files for <strong>{cohortName}</strong> cohort data
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Export Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {exportButtons.map((button) => (
          <div
            key={button.type}
            className={`border rounded-lg p-4 transition-colors ${
              button.highlight
                ? 'border-[#C41E3A] bg-red-50 hover:bg-red-100'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl">{button.icon}</span>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">
                  {button.label}
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  {button.description}
                </p>
                <button
                  onClick={() => exportData(button.type)}
                  disabled={isExporting === button.type}
                  className={`
                    w-full px-4 py-2 text-sm font-medium rounded-md transition-colors
                    ${isExporting === button.type
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-gray-900 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                    }
                  `}
                >
                  {isExporting === button.type ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Exporting...
                    </div>
                  ) : (
                    <>
                      <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {button.type === 'progress_report' ? 'Download XLSX' : 'Download CSV'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex">
          <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Export Information</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Files include complete data for all participants in this cohort</li>
                <li>Reflection text is included where available</li>
                <li>Survey data includes both pre and post-survey responses</li>
                <li>Analytics include completion rates, streaks, and progress metrics</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CohortDataExporter;