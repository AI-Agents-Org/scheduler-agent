import { Mastra } from "@mastra/core/mastra"
import { createLogger } from "@mastra/core/logger"
import { healthFlowAgent } from "./agents"
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { randomUUID } from 'crypto';

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
    const rl = readline.createInterface({ input, output });

    const chatThreadId = randomUUID();
    const chatResourceId = "user_terminal_chat";
    console.log(`[INFO] Chat session started. Thread ID: ${chatThreadId}, Resource ID: ${chatResourceId}`);
    console.log("Starting chat with HealthFlow AI. Type 'exit' or 'quit' to end.");

    while (true) {
        const userInput = await rl.question("You: ");
        if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
            console.log("Exiting chat.");
            break;
        }
        const result = await agent.generate(userInput, {
            threadId: chatThreadId,
            resourceId: chatResourceId
        });
        console.log(`Agent: ${result.text}`);


    }
    rl.close();
}

main().catch(console.error);
