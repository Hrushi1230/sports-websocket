import { Router } from "express";
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
        return res.status(400).json({ errors: result.error.errors });
    }

    const limit = Math.min(result.data.limit ?? 50, MAX_LIMIT);
    try {
        const data = await db.select.from(matches).orderBy((desc(matches.createdAt))).limit(limit);
        res.json({ data })
    } catch (error) {
        res.status(500).json({ error: 'Failed to list matches.' });
    }
    res.status(200).json({ message: 'Matches List', query: result.data });
});

// POST /matches - Create a new match with body validation
matchRouter.post('/', async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload', details: JSON.stringify(parsed.error) });
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

        res.status(201).json({ data: event });

    } catch (e) {
        res.status(500).json({ error: 'Failed to create match', details: JSON.stringify(e) });
    }

});
