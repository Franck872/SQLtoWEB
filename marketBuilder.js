// buildMarkets.js
import { pool } from "./db.js";

// ------------------------------------------------------------
// Fonction utilitaire : calcul des probabilités et cotes
// ------------------------------------------------------------
function calculateOverUnder(event) {
  const now = Date.now();
  const deadline = new Date(event.deadline).getTime();
  const totalTime = deadline - new Date(event.created_at ?? now - 3600000).getTime(); // fallback 1h
  const remainingTime = Math.max(deadline - now, 0);
  const elapsedPercent = 1 - remainingTime / (totalTime || 1);

  const current = Number(event.current_views ?? 0);
  const target = Number(event.target_views ?? current * 2 || 1000);

  const speed = Number(event.speed ?? 0);
  const trend = Number(event.trend ?? 0);

  // estimation de probabilité pour atteindre target
  let overProb = Math.min(1, current / target + speed / 1000 + trend / target + remainingTime / (totalTime || 1));
  let underProb = 1 - overProb;

  // blocage selon règle
  const overBlocked = overProb >= 0.7 || (overProb >= 0.5 && elapsedPercent > 0.25);
  const underBlocked = underProb >= 0.7 || (underProb >= 0.5 && elapsedPercent > 0.25);

  // distribution des cotes (somme des cotes = 3)
  const totalOdds = 3;
  const overOdds = overBlocked ? 0 : (overProb > 0 ? totalOdds * (underProb / (overProb + underProb)) : totalOdds / 2);
  const underOdds = underBlocked ? 0 : (underProb > 0 ? totalOdds * (overProb / (overProb + underProb)) : totalOdds / 2);

  return [
    { type: "Over", probability: Number(overProb.toFixed(2)), odds: Number(overOdds.toFixed(2)), blocked: overBlocked },
    { type: "Under", probability: Number(underProb.toFixed(2)), odds: Number(underOdds.toFixed(2)), blocked: underBlocked }
  ];
}

// ------------------------------------------------------------
// Fonction principale : construction des marchés
// ------------------------------------------------------------
export async function buildMarkets() {
  const client = await pool.connect();

  try {
    const res = await client.query(`
      SELECT id, title, external_id AS video_id,
             current_views, views_n1, views_n2,
             target_views, expected_speed AS speed,
             deadline, created_at
      FROM events
      WHERE status='active'
      ORDER BY deadline ASC
    `);

    const markets = res.rows.map(ev => {
      const current = Number(ev.current_views ?? 0);
      const targetRaw = Number(ev.target_views ?? current * 2 || 1000);
      const target = Math.max(current + 10, targetRaw); // minimum +10 pour éviter 0

      // calcul des offres Over/Under
      const offers = calculateOverUnder({
        ...ev,
        current_views: current,
        target_views: target,
        trend: current - Number(ev.views_n1 ?? 0),
        speed: Number(ev.speed ?? 0)
      });

      return {
        id: ev.id,
        title: ev.title,
        video_id: ev.video_id,
        current_views: current,
        target_views: target,
        deadline: ev.deadline,
        timestamp: Date.now(),
        offers
      };
    });

    return {
      timestamp: Date.now(),
      active_count: markets.length,
      events: markets
    };

  } catch (err) {
    console.error("❌ buildMarkets error:", err);
    throw err;
  } finally {
    client.release();
  }
}
