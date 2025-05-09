import { Mastra } from "@mastra/core/mastra"
import { createLogger } from "@mastra/core/logger"
import { healthFlowAgent } from "./agents"

export const mastra = new Mastra({
    logger: createLogger({
        name: "Mastra",
        level: "info",
    }),
    agents: {
        healthFlowAgent
    }
})

async function main() {
    const agent = await mastra.getAgent("healthFlowAgent")
    const result = await agent.generate("Tem horário de atendimento disponível amanhã? Se não tiver, agende uma consulta médica para às 10h40min com 2h de duração")
    console.log(result.text)
}

main()
