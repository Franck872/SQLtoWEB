import { pool } from "./db.js";

export async function buildMarkets() {

  const client = await pool.connect();

  try {

const res = await client.query(`
  SELECT
    e.id,
    e.title,
    e.external_id AS video_id,

    e.current_views,
    e.target_views,
    e.expected_speed AS speed,

    e.deadline,

    i.idx AS interval_index,
    i.min_value,
    i.max_value,

    o.probability,
    o.odds,
    o.blocked

  FROM events e

  LEFT JOIN intervals i ON i.event_id = e.id
  LEFT JOIN offers o ON o.interval_id = i.id

  WHERE e.status = 'active'

  ORDER BY e.deadline ASC, i.idx ASC
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
