const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres:password@localhost:5432/lawph"
  });
  await client.connect();
  const res = await client.query('SELECT id, title, type, date_time, client_email, status, google_event_id, google_link FROM events ORDER BY date_time DESC');
  console.log(res.rows);
  await client.end();
}

run().catch(console.error);
