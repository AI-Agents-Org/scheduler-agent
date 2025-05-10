import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { authenticate, listEventsParallel, postEvent } from "../../calendar";
import { parseNaturalDate } from "./helpers";

export const getCalendarEventsTool = createTool({
    id: "List Calendar Events",
    description: "Lista eventos próximos dos calendários conectados",
    inputSchema: z.object({
        maxResults: z.number().optional().describe("Número máximo de eventos para retornar por calendário. Padrão é 7."),
        specificDate: z.string().optional().describe("Data específica opcional para filtrar eventos (formato: 'YYYY-MM-DD' ou 'amanhã', 'hoje', 'semana que vem', etc.)")
    }),
    execute: async ({ context }) => {
        try {
            console.log('contexto: --------------------------------------------------------------------', context)
            const auth = await authenticate();
            const specificDate = context.specificDate;

            // Call the function and get the formatted results
            if (specificDate) {

                const calendars = await listEventsParallel(auth, specificDate);

                return {
                    success: true,
                    calendars
                };
            }
        } catch (error) {
            console.error('Erro ao listar eventos do calendário:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    }
});

export const postCalendarEventTool = createTool({
    id: "Post Calendar Event",
    description: "Adiciona um novo evento aos calendários conectados",
    inputSchema: z.object({
        summary: z.string().describe("Título do evento"),
        description: z.string().optional().describe("Descrição ou detalhes do evento"),
        location: z.string().optional().describe("Local do evento"),
        startDateTime: z.string().describe("Data e hora de início no formato ISO ou linguagem natural (ex: '2023-11-15T14:00:00' ou 'amanhã às 14h')"),
        endDateTime: z.string().describe("Data e hora de término no formato ISO ou linguagem natural (ex: '2023-11-15T15:00:00' ou 'amanhã às 15h')"),
        calendarId: z.string().optional().describe("ID do calendário para adicionar o evento. Se não fornecido, usa o calendário principal do usuário"),
    }),
    execute: async ({ context }) => {
        try {
            console.log('Criando evento com contexto: ', context);
            const auth = await authenticate();

            // Parse dates if needed (supporting natural language)
            let startDateTime = context.startDateTime;
            let endDateTime = context.endDateTime;

            // Handle natural language dates
            if (!startDateTime.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                startDateTime = parseNaturalDate(startDateTime);
            }

            if (!endDateTime.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                endDateTime = parseNaturalDate(endDateTime);
            }

            const result = await postEvent(auth, {
                summary: context.summary,
                description: context.description,
                location: context.location,
                startDateTime,
                endDateTime,
                calendarId: context.calendarId
            });

            return result;
        } catch (error) {
            console.error('Erro ao criar evento no calendário:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    }
});

export const getCurrentDateTool = createTool({
    id: "Get Current Date",
    description: "Retorna a data atual no formato YYYY-MM-DD.",
    inputSchema: z.object({}), // Sem input necessário
    execute: async () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Meses são 0-indexados
        const day = now.getDate().toString().padStart(2, '0');
        const currentDate = `${year}-${month}-${day}`;
        return {
            success: true,
            currentDate: currentDate,
            fullDateTime: now.toISOString()
        };
    }
});




