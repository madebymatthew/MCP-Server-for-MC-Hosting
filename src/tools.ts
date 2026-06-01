import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// ================ DEFINE ALL TOOLS SCOPED TO PUBLIC LEVEL ================
const publicTools = [
    {
        name: "Get-public-minecraft-secret",
        config: {
            description: "Gets a secret minecraft value",
            inputSchema: z.object({})
        },
        handler: async () => ({
            content: [{
                type: "text" as "text",
                text: "xyzzy"
            }]
        })
    }
]

// ================ DEFINE ALL TOOLS SCOPED TO ADMIN LEVEL ================
const adminTools = [
    {
        name: "Get-Admin-minecraft-secret",
        config: {
            description: "Gets a secret admin only minecraft value",
            inputSchema: z.object({})
        },
        handler: async () => ({
            content: [{
                type: "text" as "text",
                text: "odyssey"
            }]
        })
    }
]

/**
 * Registers to the McpServer object all capabilities this user has access to
 * @param server McpServer object
 * @param isAdmin boolean representing if user is admin or not
 */
function registerCapabilities(server: McpServer, isAdmin: boolean) {

    // Add all public tools to the server
    publicTools.forEach(tool => server.registerTool(tool.name, tool.config, tool.handler));

    // Add all admin tools ONLY if they have access
    if (isAdmin) {
        adminTools.forEach(tool => server.registerTool(tool.name, tool.config, tool.handler));
    }
}

export { registerCapabilities }