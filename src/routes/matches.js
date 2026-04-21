import { Router } from "express";
import { desc } from "drizzle-orm";
import {
    listMatchsQuerySchema,
    createMatchSchema,

} from "../validation/matches.js";
import { matches } from "../db/schema.js"
import { db } from "../db/db.js"
import { getMatchStatus } from "../utils/match-status.js";

export const matchRouter = Router();

const MAX_LIMIT = 100;
// GET /matches - List matches with query validation
matchRouter.get('/', async (req, res) => {
    const result = listMatchsQuerySchema.safeParse(req.query);

    if (!result.success) {
        return res.status(400).json({ errors: result.error.issues });
    }

    const limit = Math.min(result.data.limit ?? 50, MAX_LIMIT);
    try {
        const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);
        return res.json({ data });
    } catch (error) {
        console.error('Error listing matches:', error);
        return res.status(500).json({ error: 'Failed to list matches.', details: error.message || String(error) });
    }
});

// POST /matches - Create a new match with body validation
matchRouter.post('/', async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
    }
    const { data: { startTime, endTime, homeScore, awayScore } } = parsed;
    try {
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startTime, endTime)
        }).returning();

        if (res.app.locals.broadcastMatchCreated) {
            res.app.locals.broadcastMatchCreated(event);
        }

        res.status(201).json({ data: event });

        } catch (e) {
            console.error('Error creating match:', e);
            return res.status(500).json({ error: 'Failed to create match', details: e.message || String(e) });
        }

});
