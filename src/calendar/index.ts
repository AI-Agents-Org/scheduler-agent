import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import path from 'path';

const SERVICE_ACCOUNT_KEY_FILE = path.resolve(__dirname, '../../service-account.json');

const CALENDAR_IDS = ['pt-br.brazilian#holiday@group.v.calendar.google.com', 'gabriel.ritter99@gmail.com']
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

export async function listEventsParallel(auth: JWT, maxResults: number = 7, specificDate?: string) {
    const calendar = google.calendar({ version: 'v3', auth });

    // Handle date filtering
    let timeMin = new Date();
    let timeMax: Date | undefined;

    if (specificDate) {
        if (specificDate.toLowerCase() === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            timeMin = tomorrow;

            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
            timeMax = dayAfterTomorrow;
        } else if (specificDate.toLowerCase() === 'today') {
            timeMin.setHours(0, 0, 0, 0);

            const tomorrow = new Date(timeMin);
            tomorrow.setDate(tomorrow.getDate() + 1);
            timeMax = tomorrow;
        } else if (specificDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Format: YYYY-MM-DD
            timeMin = new Date(`${specificDate}T00:00:00`);

            const nextDay = new Date(timeMin);
            nextDay.setDate(nextDay.getDate() + 1);
            timeMax = nextDay;
        }
    }

    const promises = CALENDAR_IDS.map(calendarId =>
        calendar.events
            .list({
                calendarId,
                timeMin: timeMin.toISOString(),
                ...(timeMax && { timeMax: timeMax.toISOString() }),
                maxResults: maxResults,
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