import { Mastra } from "@mastra/core/mastra"
import { createLogger } from "@mastra/core/logger"
import { healthFlowAgent } from "./agents"

export const mastra = new Mastra({
    logger: createLogger({
        name: "Mastra",
        level: "debug",
    }),
    agents: {
        healthFlowAgent
    }
})

async function main() {
    const agent = await mastra.getAgent("healthFlowAgent")
    const result = await agent.generate("Tenho compromissos amanha?")
    console.log(result)
}

main()
