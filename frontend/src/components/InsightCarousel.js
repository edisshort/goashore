import React, { useMemo, useState, useEffect, useCallback } from 'react';
import '../styles/InsightCarousel.css';

// ── Insight generation ───────────────────────────────────────────────────────
function generateInsights(events, beaches) {
  const insights = [];
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const completed = events.filter(e => e.status === 'completed');
  const scheduled = events.filter(e => e.status === 'scheduled');

  // Helper: get completed events for a specific beach
  const beachCompleted = (beach) =>
    completed.filter(e =>
      String(e.beachId) === String(beach._id) ||
      String(e.beachId?._id) === String(beach._id)
    );

  // ── Per-beach insights ────────────────────────────────────────────────────
  beaches.forEach(beach => {
    const bCompleted = beachCompleted(beach);
    const bScheduled = scheduled.filter(e =>
      String(e.beachId) === String(beach._id) ||
      String(e.beachId?._id) === String(beach._id)
    );

    // Days since last cleanup
    const sorted = [...bCompleted].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastCleanup = sorted[0];

    if (!lastCleanup && bScheduled.length === 0) {
      insights.push({
        type: 'alert',
        icon: '🆘',
        headline: `${beach.name} has never been cleaned`,
        sub: 'Be the first to schedule a cleanup here!',
      });
    } else if (lastCleanup) {
      const daysSince = Math.floor((now - new Date(lastCleanup.date)) / 86400000);
      if (daysSince > 20) {
        insights.push({
          type: 'warning',
          icon: '⚠️',
          headline: `${beach.name} needs attention`,
          sub: `No cleanup in ${daysSince} days — volunteers needed!`,
        });
      } else if (daysSince <= 3) {
        insights.push({
          type: 'success',
          icon: '✅',
          headline: `${beach.name} was just cleaned!`,
          sub: `${daysSince === 0 ? 'Today' : daysSince + ' day' + (daysSince > 1 ? 's' : '') + ' ago'} — looking great 🌊`,
        });
      }
    }

    // Upcoming cleanups
    if (bScheduled.length > 0) {
      const next = [...bScheduled].sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      const daysUntil = Math.ceil((new Date(next.date) - now) / 86400000);
      insights.push({
        type: 'info',
        icon: '📅',
        headline: `Cleanup at ${beach.name} in ${daysUntil <= 0 ? 'today!' : daysUntil + ' day' + (daysUntil > 1 ? 's' : '')}`,
        sub: `"${next.title}" — ${next.volunteersJoined || 0}/${next.volunteersNeeded} volunteers joined`,
      });
    }

    // Month-over-month comparison
    const thisMonthTrash = bCompleted
      .filter(e => { const d = new Date(e.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
      .reduce((s, e) => s + (e.trashCollected || 0), 0);

    const lastMonthTrash = bCompleted
      .filter(e => { const d = new Date(e.date); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear; })
      .reduce((s, e) => s + (e.trashCollected || 0), 0);

    if (thisMonthTrash > 0 && lastMonthTrash > 0) {
      const pct = Math.round(((lastMonthTrash - thisMonthTrash) / lastMonthTrash) * 100);
      if (pct >= 20) {
        insights.push({
          type: 'success',
          icon: '🌍',
          headline: `${beach.name} improved by ${pct}% this month`,
          sub: `${lastMonthTrash}kg → ${thisMonthTrash}kg trash collected`,
        });
      } else if (pct <= -30) {
        insights.push({
          type: 'warning',
          icon: '📈',
          headline: `${beach.name} needs more help this month`,
          sub: `Trash up ${Math.abs(pct)}% vs last month — schedule a cleanup!`,
        });
      }
    }

    // Most cleaned beach
    if (bCompleted.length >= 3) {
      insights.push({
        type: 'success',
        icon: '🏅',
        headline: `${beach.name} is a cleanup champion`,
        sub: `${bCompleted.length} successful cleanups completed so far`,
      });
    }
  });

  // ── Global insights ───────────────────────────────────────────────────────

  // This month's overall stats
  const thisMonthAll = completed.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  if (thisMonthAll.length > 0) {
    const monthTrash = thisMonthAll.reduce((s, e) => s + (e.trashCollected || 0), 0);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    insights.push({
      type: 'info',
      icon: '📊',
      headline: `${monthNames[thisMonth]}: ${thisMonthAll.length} cleanups, ${monthTrash} kg removed`,
      sub: 'Keep the momentum going — Goa thanks you 🌴',
    });
  }

  // Record single cleanup (most trash)
  if (completed.length > 0) {
    const record = [...completed].sort((a, b) => (b.trashCollected || 0) - (a.trashCollected || 0))[0];
    if (record.trashCollected > 0) {
      insights.push({
        type: 'success',
        icon: '🏆',
        headline: `Record: ${record.trashCollected} kg at ${record.beachName}`,
        sub: `Organized by ${record.createdBy} — incredible effort!`,
      });
    }
  }

  // Biggest volunteer turnout
  if (completed.length > 0) {
    const bigTurnout = [...completed].sort((a, b) => (b.volunteersJoined || 0) - (a.volunteersJoined || 0))[0];
    if ((bigTurnout.volunteersJoined || 0) >= 3) {
      insights.push({
        type: 'success',
        icon: '👥',
        headline: `${bigTurnout.volunteersJoined} volunteers at ${bigTurnout.beachName}`,
        sub: `Biggest community turnout — organised by ${bigTurnout.createdBy}`,
      });
    }
  }

  // Total volunteers across all time
  const totalVols = completed.reduce((s, e) => s + (e.volunteersJoined || 0), 0);
  if (totalVols >= 5) {
    insights.push({
      type: 'info',
      icon: '🌊',
      headline: `${totalVols} volunteer stints across ${completed.length} cleanups`,
      sub: 'Every pair of hands makes Goa cleaner 🙌',
    });
  }

  // Fallback if no data yet
  if (insights.length === 0) {
    insights.push({
      type: 'info',
      icon: '💡',
      headline: 'Insights will appear as data grows',
      sub: 'Schedule your first cleanup to get started!',
    });
  }

  // Shuffle slightly (put warnings first, then success, then info)
  const order = { alert: 0, warning: 1, success: 2, info: 3 };
  return insights.sort((a, b) => order[a.type] - order[b.type]).slice(0, 12);
}

// ── Component ────────────────────────────────────────────────────────────────
export default function InsightCarousel({ events, beaches }) {
  const insights = useMemo(() => generateInsights(events, beaches), [events, beaches]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() =>
    setActive(i => (i + 1) % insights.length), [insights.length]);
  const prev = useCallback(() =>
    setActive(i => (i - 1 + insights.length) % insights.length), [insights.length]);

  // Auto-advance every 4 s
  useEffect(() => {
    if (paused || insights.length <= 1) return;
    const t = setInterval(next, 4000);
    return () => clearInterval(t);
  }, [paused, next, insights.length]);

  if (insights.length === 0) return null;

  const insight = insights[active];

  return (
    <div
      className="insight-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Label */}
      <div className="insight-label">💡 Live Insights</div>

      {/* Card */}
      <div className={`insight-card type-${insight.type}`} key={active}>
        <div className="insight-icon">{insight.icon}</div>
        <div className="insight-body">
          <p className="insight-headline">{insight.headline}</p>
          <p className="insight-sub">{insight.sub}</p>
        </div>
        {insights.length > 1 && (
          <div className="insight-nav">
            <button className="insight-arrow" onClick={prev} aria-label="Previous">‹</button>
            <button className="insight-arrow" onClick={next} aria-label="Next">›</button>
          </div>
        )}
      </div>

      {/* Dots */}
      {insights.length > 1 && (
        <div className="insight-dots">
          {insights.map((_, i) => (
            <button
              key={i}
              className={`insight-dot ${i === active ? 'active' : ''} dot-${insights[i].type}`}
              onClick={() => setActive(i)}
              aria-label={`Insight ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
