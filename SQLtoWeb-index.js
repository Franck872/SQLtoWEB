import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());

// Connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Fonction SQLtoWeb pour récupérer et fusionner les tables
async function SQLtoWeb_getData() {
  try {
    const [eventsRes, table2Res, table3Res] = await Promise.all([
      pool.query("SELECT * FROM events WHERE status='open'"),
      pool.query("SELECT * FROM table2"),
      pool.query("SELECT * FROM table3")
    ]);

    const events = eventsRes.rows;
    const table2Map = Object.fromEntries(table2Res.rows.map(t => [t.event_id, t]));
    const table3Map = Object.fromEntries(table3Res.rows.map(t => [t.event_id, t]));

    return events.map(e => ({
      id: e.id,
      artiste: e.artiste,
      titre: e.titre,
      date: e.date,
      status: e.status,
      offres: e.offres || [],
      extra1: table2Map[e.id] || null,
      extra2: table3Map[e.id] || null
    }));

  } catch (err) {
    console.error("SQLtoWeb Error:", err);
    return [];
  }
}

// Cache SQLtoWeb
let SQLtoWeb_cache = null;
async function SQLtoWeb_updateCache() {
  SQLtoWeb_cache = await SQLtoWeb_getData();
}
setInterval(SQLtoWeb_updateCache, 15_000);
SQLtoWeb_updateCache();

// Endpoint JSON pour front
app.get("/SQLtoWeb-data", (req, res) => {
  res.json(SQLtoWeb_cache || []);
});

// Serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SQLtoWeb Service en écoute sur le port ${PORT}`);
});
