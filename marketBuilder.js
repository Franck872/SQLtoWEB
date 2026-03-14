import { pool } from "./db.js";

export async function buildMarkets() {

  const client = await pool.connect();

  try {

    const res = await client.query(`
      SELECT
        e.id,
        e.title,
        e.artist,
        e.source,
        e.current_views,
        e.target_views,
        e.deadline,

        i.idx,
        i.min_value,
        i.max_value,

        o.probability,
        o.odds,
        o.blocked

      FROM events e

      JOIN intervals i 
        ON i.event_id = e.id

      JOIN offers o 
        ON o.event_id = e.id
       AND o.interval_id = i.idx

      WHERE e.status = 'active'

      ORDER BY e.deadline ASC, i.idx ASC
    `);

    const marketsMap = {};

    for (const row of res.rows) {

      if (!marketsMap[row.id]) {

        marketsMap[row.id] = {

          id: row.id,
          title: row.title,
          artist: row.artist,
          source: row.source,

          current_views: Number(row.current_views),
          target_views: Number(row.target_views),

          deadline: row.deadline,

          offers: []

        };

      }

      marketsMap[row.id].offers.push({

        interval_index: row.idx,

        min_views: Number(row.min_value),
        max_views: Number(row.max_value),

        odds: Number(row.odds),
        probability: Number(row.probability),

        blocked: row.blocked

      });

    }

    const markets = Object.values(marketsMap);

    return {

      timestamp: Date.now(),

      active_events: markets.length,

      markets

    };

  } finally {

    client.release();

  }

}
