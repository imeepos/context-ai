import * as readline from "readline";
import { agent } from "./agent.js";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Subscribe to agent events
agent.subscribe((event: any) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
        process.stdout.write(event.assistantMessageEvent.delta);
    }
    if (event.type === "tool_execution_start") {
        console.log("🔧 Tool call:", event.toolName, event.args);
    }
});

async function chatLoop() {
    console.log("🤖 Chat started! Type your messages and press Enter. Press Ctrl+D to quit.\n");

    return new Promise<void>((resolve) => {
        const promptUser = () => {
            rl.question("> ", async (input) => {
                if (input.trim() === "") {
                    promptUser();
                    return;
                }
                console.log("");

                rl.pause();

                try {
                    process.stdout.write("🤖 Assistant: ");
                    await agent.prompt(input.trim());
                    console.log("\n");
                } catch (error) {
                    console.error("❌ Error running agent:", error);
                }

                rl.resume();
                promptUser();
            });
        };

        rl.on("close", () => {
            console.log("\n👋 Goodbye!");
            resolve();
        });

        promptUser();
    });
}

async function main() {
    await chatLoop();
}

main().catch(console.error);
