import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";


const app = express();
app.use(express.json());

// A map of String, StreamableHTTPServerTransport objects to store each client connection
const transports: Record<string, StreamableHTTPServerTransport> = {};

app.post("/mcp", async (req: ExpressRequest, res: ExpressResponse) => {

    // MCP says this header should be a string, but its possible that a misbehaving client sends an
    // array of strings instead. Since Im going to be the only one using this, Im going to skip an input validation
    // and just say I trust myself to only send string or nothing
    const sessionId = req.headers["mcp-session-id"] as string | undefined; 
    let transport: StreamableHTTPServerTransport;

    // Check if its an existing session or a new session
    if (sessionId && transports[sessionId]) {
        // If its an existing session, then use the transport we already have
        transport = transports[sessionId];
    }
    // Else if its a new initialize session
    else if (!sessionId && isInitializeRequest(req.body)) {

        // Create new mcp server object to handle session state
        const server = new McpServer({ name: "Minecraft Server Hosting", version: "1.0.0"});
        
        // Adding dummy tool for testing
        server.registerTool( "get-secret",
            {
                description: "Gets a secret minecraft value",
                inputSchema: z.object({})
            },
            async () => ({
                content: [{type: "text", text: "xyzzy"}]
            })
        );

        // Create new transport for this connection
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID()
        });

        // Add the transport to the map of transports and link it to the server
        transports[transport.sessionId!] = transport;
        await server.connect(transport);
    }
    // Else theres been a problem with this request
    else {
        res.status(400).json({ error: "Invalid MCP request: missing or invalid session ID, or missing initialize request body" });
        return;
    }

    // Transport is now initialized, it'll forward requests to the mcp server
    await transport.handleRequest(req, res);
});

// Now set up graceful connection termination
app.delete("/mcp", async (req: ExpressRequest, res: ExpressResponse) => {
    
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    
    // check if the session ID was provided and exists in transports
    if (!sessionId || !transports[sessionId]) {
        res.status(400).json({ error: "Invalid session ID" });
        return;
    }

    // Remove the transport from the map
    await transports[sessionId].handleRequest(req, res);
    delete transports[sessionId];
});

// MCP compliance means I need to handle GET requests to the same endpoint
// even if its just to return a 405 to tell the client Im not supporting server initiated messages
app.get("/mcp", (req: ExpressRequest, res: ExpressResponse) => {
    res.status(405).json({ error: "Method Not Allowed" });
});

// Set the port
if (!process.env.PORT) {
    throw new Error("PORT environment variable not set in .env file");
}
const PORT = process.env.PORT;

// Start the server
app.listen(PORT, () => {
    console.log(`MCP Server is running on port ${PORT}`);
});