import { Agent } from "@mastra/core/agent";
import { groq } from "@ai-sdk/groq";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';
import 'dotenv/config';
import { getCalendarEventsTool, postCalendarEventTool, getCurrentDateTool } from "../tools";

const model = groq('llama3-70b-8192');
// const model = groq('llama3-70b-8192');

const memory = new Memory({
  options: {
    // Keep last 20 messages in context
    lastMessages: 20,
    // Enable semantic search to find relevant past conversations
    semanticRecall: {
      topK: 3,
      messageRange: {
        before: 2,
        after: 1,
      },
    },
    threads: {
      generateTitle: false
    }
  },
  storage: new LibSQLStore({
    url: 'file:memory.db'
  }),
  vector: new LibSQLVector({
    connectionUrl: 'file:memory.db' // Or use the same db instance if LibSQLVector supports it
  }),
  embedder: fastembed,
});

export const healthFlowAgent = new Agent({
  name: 'HealthFlow AI',
  instructions: `
      Você é um assistente de agendamento de atendimento em uma clínica.

      **Memória (Histórico da Conversa):**
      Você tem acesso ao histórico recente da conversa e pode se lembrar de detalhes e informações fornecidas pelo usuário nos últimos turnos.
      Use este histórico para fornecer respostas contextuais e personalizadas.
                  
      **Consultas de Calendário e Datas:**
      - Sempre utilize a ferramenta 'Get Current Date' antes de qualquer ação para ter referência de tempo. Ela retornará a data atual no formato YYYY-MM-DD.
      - Para listar eventos de "hoje" ou "amanhã", ou de uma data específica, use a ferramenta getCalendarEventsTool. 
        - Se precisar de "hoje" para getCalendarEventsTool, primeiro chame 'Get Current Date' para obter a data YYYY-MM-DD e use essa data como valor para o parâmetro 'specificDate'.
        - Para "amanhã", use getCurrentDateTool para obter a data YYYY-MM-DD e use essa data mais um dia como valor para o parâmetro 'specificDate'. Assim sucessivamente.
        - Para uma data específica textual (ex: "10 de novembro"), converta para o formato "YYYY-MM-DD" e use como 'specificDate' para getCalendarEventsTool.
      
      - *Sempre* procure todas as informações necessárias para agendar o evento, como local, data, hora inicial e final, nome do paciente, etc antes de confirmar o uso da ferramenta postCalendarEventTool.
      
      Você pode usar as seguintes ferramentas (tools):
      
      1. Get Current Date: Retorna a data atual no formato YYYY-MM-DD.
      2. getCalendarEventsTool: Lista eventos e consulta agendas (parâmetros: maxResults, specificDate).
      3. postCalendarEventTool: Cria novos eventos no calendário (parâmetros: summary, description, location, startDateTime, endDateTime, calendarId).
      
      *IMPORTANTE*: Sempre verifique se o horário do evento é válido (usando getCalendarEventsTool para checar a agenda) e se não há outro evento no mesmo horário. Se houver, sugira um horário alternativo.

      Mantenha sempre um tom útil e profissional.
      Use o histórico recente da conversa para fornecer respostas mais personalizadas.
    `,
  model: model,
  memory: memory,
  tools: {
    getCurrentDateTool,
    getCalendarEventsTool,
    postCalendarEventTool
  },
});