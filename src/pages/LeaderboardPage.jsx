import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useUserProfile } from "../hooks/useUserProfile";
import { supabase } from "../lib/supabase";

function LeaderboardPage() {
  const {
    profile,
    loading: profileLoading,
    isAdmin,
    isSuperAdmin,
  } = useUserProfile();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [fullLeaderboardData, setFullLeaderboardData] = useState([]);
  const [cohortInfo, setCohortInfo] = useState(null);
  const [availableCohorts, setAvailableCohorts] = useState([]);
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blockedByCohort, setBlockedByCohort] = useState(false);

  const BLOCKED_COHORT_NAME = "WITS-ALL-20250717-C1";

  useEffect(() => {
    if (profile) {
      loadAvailableCohorts();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedCohortId) {
      loadLeaderboard(selectedCohortId);
    }
  }, [selectedCohortId]);

  const loadAvailableCohorts = async () => {
    try {
      setLoading(true);
      setError(null);
      let cohorts = [];

      if (isSuperAdmin() || isAdmin()) {
        const { data, error } = await supabase.rpc("get_safe_accessible_cohorts");
        if (error) throw error;
        cohorts = (data || [])
          .filter((cohort) => cohort.is_active)
          .map((cohort) => ({ id: cohort.id, name: cohort.name, organization_name: cohort.organization_name }))
          .sort((a, b) => a.name.localeCompare(b.name));
      } else {
        if (profile?.cohort_id) {
          const { data, error } = await supabase
            .from("cohorts")
            .select("id, name, organization_name, is_active")
            .eq("id", profile.cohort_id)
            .eq("is_active", true)
            .single();

          if (error) {
            cohorts = [];
            setBlockedByCohort(false);
          } else {
            if (data && data.name === BLOCKED_COHORT_NAME) {
              setBlockedByCohort(true);
              cohorts = [];
            } else {
              setBlockedByCohort(false);
              cohorts = data ? [data] : [];
            }
          }
        } else {
          cohorts = [];
          setBlockedByCohort(false);
        }
      }

      setAvailableCohorts(cohorts);
      if (cohorts.length > 0) {
        const defaultCohort =
          profile?.cohort_id && cohorts.find((c) => c.id === profile.cohort_id)
            ? profile.cohort_id
            : cohorts[0].id;
        setSelectedCohortId(defaultCohort);
      }
    } catch (err) {
      console.error("Error loading available cohorts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async (cohortId) => {
    try {
      setLoading(true);
      setError(null);

      const { data: cohortData, error: cohortError } = await supabase
        .from("cohorts")
        .select("id, name, organization_name, start_date, end_date")
        .eq("id", cohortId)
        .single();

      if (cohortError) throw cohortError;
      setCohortInfo(cohortData);

      let fetched;
      let leaderboardError;
      try {
        const v2 = await supabase.rpc("get_enhanced_cohort_leaderboard_v2", { target_cohort_id: cohortId });
        if (v2.error) throw v2.error;
        fetched = v2.data || [];
      } catch (e) {
        const v1 = await supabase.rpc("get_enhanced_cohort_leaderboard", { target_cohort_id: cohortId });
        fetched = v1.data || [];
        leaderboardError = v1.error;
      }

      if (leaderboardError) throw leaderboardError;
      setFullLeaderboardData(fetched);
      setLeaderboardData(fetched.slice(0, 4));
    } catch (err) {
      console.error("Error loading leaderboard:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMedalEmoji = (rank) => {
    if (rank === 1) return "👑";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    if (rank === 4) return "🏅";
    return `#${rank}`;
  };

  const getMedalBg = (rank) => {
    if (rank === 1) return "bg-gradient-to-br from-amber-300 to-yellow-500 border-amber-200";
    if (rank === 2) return "bg-gradient-to-br from-slate-300 to-gray-400 border-slate-200";
    if (rank === 3) return "bg-gradient-to-br from-orange-300 to-amber-500 border-orange-200";
    return "bg-gradient-to-br from-purple-300 to-indigo-400 border-purple-200";
  };

  const renderProgressCircle = (percentage, surveysCompleted) => {
    const pct = Math.round(parseFloat(percentage));
    return (
      <div className="relative w-16 h-16 md:w-[72px] md:h-[72px] flex-shrink-0">
        <div className="absolute inset-0 bg-white rounded-full" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.18)' }}></div>
        <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e5e7eb" strokeWidth="2.8" />
          <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#C41E3A" strokeWidth="2.8"
            strokeDasharray={`${pct} 100`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className="text-sm md:text-base font-bold text-gray-800">{pct}%</span>
          <span className="text-[6px] md:text-[7px] text-gray-400">{surveysCompleted}/2 surveys</span>
        </div>
      </div>
    );
  };

  const renderCardDecorations = () => (
    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
      <svg className="absolute left-0 top-0 w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
        <path d="M-20,120 C30,105 80,45 150,60 C220,75 270,15 350,25 C380,20 400,30 420,20 L420,120 Z" fill="rgba(180,20,30,0.5)" />
      </svg>
      <svg className="absolute left-0 top-0 w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
        <path d="M-10,120 C40,110 100,55 170,68 C240,81 290,25 370,35 L420,120 Z" fill="rgba(200,35,45,0.35)" />
      </svg>
      <svg className="absolute left-0 top-0 w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
        <path d="M0,120 C60,112 110,65 190,78 C260,88 310,40 400,50 L420,120 Z" fill="rgba(220,50,55,0.2)" />
      </svg>
      <div className="absolute w-2.5 h-2.5 bg-white/[0.15] rounded-full top-3 left-[6%]"></div>
      <div className="absolute w-4 h-4 bg-white/[0.08] rounded-full top-6 left-[15%]"></div>
      <div className="absolute w-1.5 h-1.5 bg-white/[0.2] rounded-full top-2 left-[25%]"></div>
      <div className="absolute w-3 h-3 bg-white/[0.1] rounded-full bottom-4 left-[10%]"></div>
      <div className="absolute w-2 h-2 bg-white/[0.15] rounded-full bottom-3 left-[22%]"></div>
      <div className="absolute w-1.5 h-1.5 bg-white/[0.2] rounded-full top-4 left-[35%]"></div>
      <div className="absolute w-3.5 h-3.5 bg-white/[0.07] rounded-full top-2 left-[45%]"></div>
      <div className="absolute w-5 h-5 bg-white/[0.05] rounded-full top-5 left-[55%]"></div>
      <div className="absolute w-2 h-2 bg-white/[0.12] rounded-full bottom-5 left-[40%]"></div>
      <div className="absolute w-1.5 h-1.5 bg-white/[0.18] rounded-full top-3 left-[65%]"></div>
      <div className="absolute w-2.5 h-2.5 bg-white/[0.1] rounded-full bottom-2 left-[58%]"></div>
      <div className="absolute w-1 h-1 bg-white/[0.22] rounded-full top-5 right-[18%]"></div>
      <div className="absolute w-3 h-3 bg-white/[0.06] rounded-full bottom-6 right-[12%]"></div>
      <div className="absolute w-2 h-2 bg-white/[0.13] rounded-full top-2 right-[8%]"></div>
    </div>
  );

  const renderLeaderboardCard = (user, rank) => {
    const isCurrentUser = user.user_id === profile?.user_id;

    return (
      <div
        key={user.user_id}
        className="relative rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.005]"
        style={{ background: 'linear-gradient(135deg, #B71C1C 0%, #D32F2F 40%, #E53935 100%)' }}
      >
        {renderCardDecorations()}
        <div className="relative z-10 px-5 py-4 md:px-8 md:py-5 flex items-center gap-4 md:gap-6">
          {/* Medal */}
          <div className={`w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 flex-shrink-0 shadow-lg ${getMedalBg(rank)}`}>
            <span className="text-xl md:text-2xl">{getMedalEmoji(rank)}</span>
          </div>

          {/* Name + Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-base md:text-lg font-bold text-white truncate">
                {user.first_name} {user.last_name}
              </h3>
              {isCurrentUser && (
                <span className="flex-shrink-0 px-2.5 py-0.5 bg-red-500 text-white text-[10px] md:text-xs font-bold rounded-full shadow">
                  You
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 md:gap-8 text-xs md:text-sm text-white/70">
              <div><span className="font-bold text-white text-sm md:text-base">{user.total_days_completed}</span> days</div>
              <div><span className="font-bold text-white text-sm md:text-base">{user.total_challenges_completed}</span> challenges</div>
              <div><span className="font-bold text-white text-sm md:text-base">{user.total_reflections_submitted}</span> reflections</div>
            </div>
          </div>

          {/* Progress Circle */}
          {renderProgressCircle(user.journey_completion_percentage, user.surveys_completed)}
        </div>
      </div>
    );
  };

  const getCurrentUserFullEntry = () => {
    if (!profile?.user_id || fullLeaderboardData.length === 0) return null;
    return fullLeaderboardData.find((e) => e.user_id === profile.user_id) || null;
  };

  if (profileLoading || loading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-12 max-w-3xl">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-white/20 rounded-xl w-48 mx-auto mb-8"></div>
            <div className="h-20 bg-white/10 rounded-2xl"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white/10 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-12 max-w-3xl">
          <div className="relative rounded-2xl overflow-hidden p-10 text-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #B71C1C 0%, #D32F2F 40%, #E53935 100%)' }}>
            {renderCardDecorations()}
            <div className="relative z-10">
              <h1 className="text-3xl font-bold text-white mb-3">Leaderboard</h1>
              <p className="text-white/80">Please log in to view the leaderboard.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (availableCohorts.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-12 max-w-3xl">
          <div className="relative rounded-2xl overflow-hidden p-10 text-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #B71C1C 0%, #D32F2F 40%, #E53935 100%)' }}>
            {renderCardDecorations()}
            <div className="relative z-10">
              <h1 className="text-3xl font-bold text-white mb-3">Leaderboard</h1>
              <p className="text-white/80">
                {blockedByCohort
                  ? "The leaderboard is currently under construction."
                  : isSuperAdmin() || isAdmin()
                    ? "No cohorts available to view."
                    : "You need to be assigned to a cohort to view the leaderboard."}
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-12 max-w-3xl">
          <div className="relative rounded-2xl overflow-hidden p-10 text-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #B71C1C 0%, #D32F2F 40%, #E53935 100%)' }}>
            {renderCardDecorations()}
            <div className="relative z-10">
              <h1 className="text-3xl font-bold text-white mb-3">Leaderboard</h1>
              <p className="text-white/80 mb-5">Error loading leaderboard: {error}</p>
              <button
                onClick={() => loadLeaderboard(selectedCohortId)}
                className="px-6 py-3 bg-white text-[#C41E3A] font-semibold rounded-xl hover:bg-white/90 transition-all shadow-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const me = getCurrentUserFullEntry();

  return (
    <Layout>
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-2">
            Leaderboard
          </h1>

          {availableCohorts.length > 1 && (
            <div className="mt-4 mb-2">
              <div className="relative max-w-sm mx-auto">
                <select
                  value={selectedCohortId}
                  onChange={(e) => setSelectedCohortId(e.target.value)}
                  className="w-full bg-white/90 text-black text-sm rounded-xl px-4 py-2.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/50 appearance-none cursor-pointer shadow-md"
                >
                  {availableCohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id} className="bg-white text-black">
                      {cohort.name} - {cohort.organization_name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-black/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {cohortInfo && (
            <p className="text-black/50 text-sm mt-1">
              {cohortInfo.name} &middot; {cohortInfo.organization_name}
            </p>
          )}
        </div>

        {/* Your Rank Banner */}
        {me && (
          <div className="mb-6 relative rounded-2xl overflow-hidden shadow-xl border-2 border-white/30"
            style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)' }}>
            {renderCardDecorations()}
            <div className="relative z-10 px-5 py-4 md:px-8 md:py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 flex-shrink-0 shadow-lg ${getMedalBg(me.rank_position)}`}>
                  <span className="text-xl md:text-2xl">{getMedalEmoji(me.rank_position)}</span>
                </div>
                <div>
                  <p className="text-white/60 text-[10px] md:text-xs font-medium uppercase tracking-wider">Your Rank</p>
                  <p className="text-white font-bold text-2xl md:text-3xl leading-tight">
                    #{me.rank_position}
                    <span className="text-white/50 text-sm md:text-base font-normal ml-1.5">of {fullLeaderboardData.length}</span>
                  </p>
                </div>
              </div>
              {renderProgressCircle(me.journey_completion_percentage, me.surveys_completed)}
            </div>
          </div>
        )}

        {/* Leaderboard Cards */}
        {leaderboardData.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-black/70 text-lg">No participants found yet.</p>
            <p className="text-black/50 text-sm mt-2">Be the first to start your journey!</p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {/* Top 3 */}
            {leaderboardData.slice(0, 3).map((user) =>
              renderLeaderboardCard(user, user.rank_position)
            )}

            {/* Honorable Mention */}
            {leaderboardData.length >= 4 && (
              <>
                <div className="flex items-center gap-4 py-2">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#C41E3A]/25 to-transparent"></div>
                  <span className="text-[#C41E3A]/70 text-xs font-semibold uppercase tracking-wider">Honorable Mention</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#C41E3A]/25 to-transparent"></div>
                </div>
                {renderLeaderboardCard(leaderboardData[3], 4)}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center">
          <span className="text-xs text-black/35">
            Showing top 3 performers + honorable mention
          </span>
        </div>
      </div>
    </Layout>
  );
}

export default LeaderboardPage;
