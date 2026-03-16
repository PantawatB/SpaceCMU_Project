import "dotenv/config";

// Support DATABASE_URL directly (e.g. from Supabase dashboard)
// or fall back to individual POSTGRES_* variables
let connectionString: string;

if (process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
} else {
  const dbUser = process.env.POSTGRES_APP_USER;
  const dbPassword = process.env.POSTGRES_APP_PASSWORD;
  const dbHost = process.env.POSTGRES_HOST;
  const dbPort = process.env.POSTGRES_PORT;
  const dbName = process.env.POSTGRES_DB;

  if (!dbUser || !dbPassword || !dbHost || !dbName) {
    throw new Error("Invalid DB env: set DATABASE_URL or POSTGRES_APP_USER/PASSWORD/HOST/DB");
  }

  connectionString = `postgres://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
}

console.log("DB connecting to host:", new URL(connectionString).hostname);

export { connectionString };