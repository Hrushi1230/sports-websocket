
import { drizzle } from "drizzle-orm/node-postgres";
import pg from 'pg';

if (!process.env.DATABASE_URL) {
    throw new Error('Database url not defined');
}

export const pool = new pg.pool({
    connectionString: process.env.DATABASE_URL,
})

export const db = drizzl(pool);