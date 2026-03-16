import { pool } from "./db.js";

export async function buildMarkets() {

  const client = await pool.connect();

  try {

    const res = await client.query(`
      SELECT
        e.id,
        e.title,
        e.video_id,
        e.views_current,
        e.views_n1,
        e.views_n2,
        e.target_views,
        e.speed,
        e.trend,
        e.deadline,

        o.interval_index,
        o.min_value,
        o.max_value,
        o.probability,
        o.odds,
        o.blocked

      FROM events e

      LEFT JOIN offers o
      ON o.event_id = e.id

      WHERE e.status = 'active'

      ORDER BY e.deadline ASC, o.interval_index ASC
    `);

    const marketsMap = {};

    for (const row of res.rows) {

      if (!marketsMap[row.id]) {

        marketsMap[row.id] = {
          id: row.id,
          title: row.title,
          video_id: row.video_id,

          target_views: Number(row.target_views),

          current_views: Number(row.views_current),
          views_n1: Number(row.views_n1),
          views_n2: Number(row.views_n2),

          speed: Number(row.speed),
          trend: Number(row.trend),

          deadline: row.deadline,

          offers: []
        };

      }

      if (row.interval_index !== null) {

        marketsMap[row.id].offers.push({

          interval_index: row.interval_index,

          min_views: Number(row.min_value),
          max_views: Number(row.max_value),

          probability: Number(row.probability),
          odds: Number(row.odds),

          blocked: row.blocked

        });

      }

    }

    const markets = Object.values(marketsMap);

    return {

      timestamp: Date.now(),

      active_events: markets.length,

      markets

    };

  } catch (err) {

    console.error("❌ buildMarkets error:", err);

    throw err;

  } finally {

    client.release();

  }

}
