import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";

import type { IncomingMessage } from "http";

import { getRequiredFromEnv } from "./helper-functions.js";
import { requireAuth, authDiscoveryHandler, checkAdminPermissions } from "./auth.js"
import { registerCapabilities } from "./tools.js";

// ============================ CREATE CONSTANTS ============================

// All of the values needed from the .env file
const PORT = getRequiredFromEnv("PORT");

// Express to handle network
const app = express();
app.use(express.json());

// A map of String, StreamableHTTPServerTransport objects to store each client connection
const transports: Record<string, StreamableHTTPServerTransport> = {};

// ========================== DEFINE EXPRESS ROUTES ==========================

//======== TYPICAL POST CALL DURING OPERATION ========
app.post("/mcp", requireAuth, async (req: ExpressRequest, res: ExpressResponse) => {

    // MCP says this header should be a string, but its possible that a misbehaving client sends an
    // array of strings instead. Since Im going to be the only one using this, Im going to skip an input validation
    // and just say I trust myself to only send string or nothing
    const sessionId = req.headers["mcp-session-id"] as string | undefined; 
    let transport: StreamableHTTPServerTransport;

    console.log("Received request at /mcp endpoint with sessionId: ", sessionId);
    console.log("Current transports map: ", Object.keys(transports));

    // Check if its an existing session or a new session
    if (sessionId && transports[sessionId]) {
        // If its an existing session, then use the transport we already have
        transport = transports[sessionId];
        await transport.handleRequest(req as unknown as IncomingMessage, res, req.body);
    }
    // Else if its a new initialize session
    else if (!sessionId && isInitializeRequest(req.body)) {

        // Create new mcp server object to handle session state
        const server = new McpServer({ name: "Minecraft Server Hosting", version: "1.0.0"});

        console.log("Initializing new MCP session with new McpServer instance, now adding capabilities...");
        
        // Add the capabilities this server should handle (depends on admin or regular user)
        const isAdmin: boolean = checkAdminPermissions(req);
        registerCapabilities(server, isAdmin);

        console.log("Finished registering capabilities, user is admin: ", isAdmin);

        // Create new transport for this connection
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID()
        });

        // Link to the server and handle request
        await server.connect(transport);
        await transport.handleRequest(req as unknown as IncomingMessage, res, req.body);

        // ONLY AFTER CONNECTING AND HANDLING REQUEST DO WE STORE TRANSPORT
        // Otherwise sessionId will be undefined
        transports[transport.sessionId!] = transport;
    }
    // Else theres been a problem with this request
    else {
        res.status(400).json(
            { error: "Invalid MCP request: missing or invalid session ID,\
                or missing initialize request body" });
        return;
    }

    // Transport is now initialized, it'll forward requests to the mcp server
    
});


// GRACEFUL CONNECTION TERMINATION REQUESTS
app.delete("/mcp", requireAuth, async (req: ExpressRequest, res: ExpressResponse) => {
    
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    
    console.log("Received request to terminate MCP session with sessionId: ", sessionId);

    // check if the session ID was provided and exists in transports
    if (!sessionId || !transports[sessionId]) {
        res.status(400).json({ error: "Invalid session ID" });
        return;
    }

    // Remove the transport from the map
    await transports[sessionId].handleRequest(req as unknown as IncomingMessage, res, req.body);
    delete transports[sessionId];

    console.log("Terminated MCP session with sessionId: ", sessionId);
});


// REQUESTS FOR AUTHENTICATION SERVER DISCOVERY
app.get("/.well-known/oauth-protected-resource", authDiscoveryHandler);

// REQUESTS FOR SERVER INITIATED MESSAGES
// MCP compliance means I need to handle GET requests to the same endpoint
// even if its just to return a 405 to tell the client Im not supporting server initiated messages
app.get("/mcp", requireAuth, (req: ExpressRequest, res: ExpressResponse) => {
    res.status(405).json({ error: "Method Not Allowed" });
});


// Start the server
app.listen(PORT, () => {
    console.log(`MCP Server is running on port ${PORT}`);
});