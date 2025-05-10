import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import path from 'path';

const SERVICE_ACCOUNT_KEY_FILE = path.resolve(__dirname, '../../service-account.json');

const CALENDAR_IDS = ['pt-br.brazilian#holiday@group.v.calendar.google.com', 'gabriel.ritter99@gmail.com', 'tainagomesaragao@gmail.com']
// const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

export async function authenticate(): Promise<JWT> {
    const auth = new google.auth.JWT({
        keyFile: SERVICE_ACCOUNT_KEY_FILE,
        scopes: SCOPES,
    });
    await auth.authorize();
    return auth;
}

export async function listEventsParallel(auth: JWT, specificDate: string) {
    const calendar = google.calendar({ version: 'v3', auth });

    let timeMinDate: Date | undefined;
    let timeMaxDate: Date | undefined;

    if (specificDate) {
        const now = new Date();
        if (specificDate.toLowerCase() === 'amanhã' || specificDate.toLowerCase() === 'amanha') {
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            timeMinDate = tomorrow;

            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(tomorrow.getDate() + 1);
            timeMaxDate = dayAfterTomorrow;
        } else if (specificDate.toLowerCase() === 'hoje') {
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            timeMinDate = today;

            const tomorrowFromToday = new Date(today);
            tomorrowFromToday.setDate(today.getDate() + 1);
            timeMaxDate = tomorrowFromToday;
        } else if (specificDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Format: YYYY-MM-DD
            // Ensure dates are parsed in UTC to avoid timezone issues with just YYYY-MM-DD
            const parts = specificDate.split('-').map(Number);
            timeMinDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0));

            timeMaxDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1, 0, 0, 0));
        }
    }

    // Se timeMinDate e timeMaxDate não foram definidos (specificDate inválido ou não fornecido de forma esperada),
    // não buscar eventos ou retornar array vazio para evitar busca infinita.
    if (!timeMinDate || !timeMaxDate) {
        console.log('[INFO] specificDate inválido ou não fornecido para listEventsParallel. Nenhum evento será buscado.');
        // Retorna um formato que a ferramenta espera (array de objetos com calendarId e events vazios)
        return CALENDAR_IDS.map(id => ({ calendarId: id, items: [], events: [] }));
    }

    const promises = CALENDAR_IDS.map(calendarId =>
        calendar.events
            .list({
                calendarId,
                timeMin: timeMinDate.toISOString(),
                timeMax: timeMaxDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            })
            .then(res => ({ calendarId, items: res.data.items || [] }))
    );

    const results = await Promise.all(promises);

    // Log the results for debugging
    for (const { calendarId, items } of results) {
        console.log(`\nEventos do calendário ${calendarId}:`);
        if (items.length === 0) {
            console.log('  (nenhum evento encontrado)');
        } else {
            items.forEach(evt => {
                const when = evt.start?.dateTime || evt.start?.date;
                const to = evt.end?.dateTime || evt.end?.date;
                console.log(`  ${when} — ${to} — ${evt.summary}`);
            });
        }
    }

    // Format the results for the tool to return
    const formattedResults = results.map(({ calendarId, items }) => {
        const events = items.map(evt => {
            const when = evt.start?.dateTime || evt.start?.date;
            const to = evt.end?.dateTime || evt.end?.date;
            return {
                initialDate: when,
                finalDate: to,
                summary: evt.summary || 'No title',
                calendarId,
            };
        });

        return {
            calendarId,
            events
        };
    });

    return formattedResults;
}

export async function postEvent(auth: JWT, eventData: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    calendarId?: string;
}) {
    try {
        const calendar = google.calendar({ version: 'v3', auth });
        const { summary, description, location, startDateTime, endDateTime } = eventData;

        // Use the first calendar ID as default if not specified
        const calendarId = eventData.calendarId || CALENDAR_IDS[1]; // Use the user calendar as default

        // Format the event according to Google Calendar API requirements
        const event = {
            summary,
            description,
            location,
            start: {
                dateTime: new Date(startDateTime).toISOString(),
                timeZone: 'America/Sao_Paulo',
            },
            end: {
                dateTime: new Date(endDateTime).toISOString(),
                timeZone: 'America/Sao_Paulo',
            },
        };

        // Insert the event into the calendar
        const response = await calendar.events.insert({
            calendarId,
            requestBody: event,
        });

        console.log(`Evento criado: ${response.data.htmlLink}`);

        return {
            success: true,
            eventId: response.data.id,
            htmlLink: response.data.htmlLink,
        };
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        };
    }
}

//funcao para testar o postEvent
function testPostEvent() {
    authenticate()
        .then(auth => {
            const eventData = {
                summary: "Jogo do inter",
                startDateTime: "2025-05-08T21:40:00",
                endDateTime: "2025-05-08T23:00:00",
                calendarId: CALENDAR_IDS[1]
            };

            return postEvent(auth, eventData);
        })
        .then(result => {
            console.log(result);
        })
        .catch(error => {
            console.error("Erro ao testar postEvent:", error);
        });
}

// Only run the test if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    testPostEvent();
}