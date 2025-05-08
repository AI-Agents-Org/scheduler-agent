import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { authenticate, listEventsParallel } from "../../calendar";

export const getCalendarTool = createTool({
    id: "List Calendar Events",
    description: "Lists upcoming events from connected calendars",
    inputSchema: z.object({
        maxResults: z.number().optional().describe("Maximum number of events to return per calendar. Defaults to 7."),
        specificDate: z.string().optional().describe("Optional specific date to filter events (format: 'YYYY-MM-DD' or 'tomorrow', 'today', etc.)")
    }),
    execute: async ({ context }) => {
        try {
            console.log('contexto: --------------------------------------------------------------------', context)
            const auth = await authenticate();
            const maxResults = context.maxResults || 7;
            const specificDate = context.specificDate;

            // Call the function and get the formatted results
            const calendars = await listEventsParallel(auth, maxResults, specificDate);

            return {
                success: true,
                calendars
            };
        } catch (error) {
            console.error('Error listing calendar events:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}); 