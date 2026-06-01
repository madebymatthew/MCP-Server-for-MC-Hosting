import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { getRequiredFromEnv } from "./helper-functions.js";

// Constants from ENV file
const OAUTH_ISSUER = getRequiredFromEnv("OAUTH_ISSUER");
const OAUTH_AUDIENCE = getRequiredFromEnv("OAUTH_AUDIENCE");

/**
 * Define oauth token validator to use in middleware function
 */
const validateToken = auth({
    audience: OAUTH_AUDIENCE,
    issuerBaseURL: OAUTH_ISSUER
});

/**
 * Middleware function added into Express routes to check oAuth2 bearer tokens
 */
const requireAuth = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    validateToken(req, res, (err) => {
        if (err) {
            res.status(401)
            .set("WWW-Authenticate",`Bearer resource_metadata="${OAUTH_AUDIENCE}/.well-known/oauth-protected-resource"`)
            .json({error: "Unauthorized"});
        } else {
            next();
        }
    });
}

/**
 * Handles responding to calls made at /.well-known/oauth-authorization-server for auth server discovery
 */
const authDiscoveryHandler = (req: ExpressRequest, res: ExpressResponse) => {
    res.json({
        resource: OAUTH_AUDIENCE,
        authorization_servers: [OAUTH_ISSUER]
    })
}

/**
 * @returns true/false for whether this user is an admin
 */
const checkAdminRole = (req: ExpressRequest): boolean => {
    return ((req.auth?.payload?.["https://mcp-server/roles"] as string[] ?? []).includes("admin"));
}

export { requireAuth, authDiscoveryHandler, checkAdminRole }