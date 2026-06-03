import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { getRequiredFromEnv } from "./helper-functions.js";

// Constants from ENV file
const OAUTH_ISSUER = getRequiredFromEnv("OAUTH_ISSUER");
// A bug in claude desktop was adding a trailing slash to the 'resource' returned from the auth discovery endpoint,
// Github says the issue has been open for a month. So until they fix this, I have to add 2 audiences to account for
// both my normal audience, and one with a trailing slash appended.
const OAUTH_AUDIENCES = getRequiredFromEnv("OAUTH_AUDIENCES").split(",");
const ALLOWED_ORIGINS = getRequiredFromEnv("ALLOWED_ORIGINS").split(",");

/**
 * Define oauth token validator to use in middleware function
 */
const validateToken = auth({
    audience: OAUTH_AUDIENCES,
    issuerBaseURL: OAUTH_ISSUER
});

/**
 * Middleware function added into Express routes to check oAuth2 bearer tokens
 */
const requireAuth = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    validateToken(req, res, (err) => {
        if (err) {
            res.status(401)
            .set("WWW-Authenticate",`Bearer resource_metadata="${OAUTH_AUDIENCES[0]}/.well-known/oauth-protected-resource"`)
            .json({error: "Unauthorized"});
        } else {
            console.log("Authentication successful for user: ", req.auth?.payload?.sub);
            next();
        }
    });
}

/**
 * Middleware function to check the origin header
 */
const checkOrigin = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    
    const origin = req.headers.origin;

    if (origin !== undefined && !ALLOWED_ORIGINS.includes(origin)) {
        res.status(403).json({ error: "Forbidden: Invalid origin" });
        return;
    }
    next();

}

/**
 * Handles responding to calls made at /.well-known/oauth-protected-resource for auth server discovery
 */
const authDiscoveryHandler = (_req: ExpressRequest, res: ExpressResponse) => {
    console.log("Received request at auth discovery endpoint, responding with auth metadata");
    res.json({
        resource: OAUTH_AUDIENCES[0],
        authorization_servers: [OAUTH_ISSUER],
        registration_endpoint: `${OAUTH_ISSUER}/oidc/register`
    })
}

/**
 * @returns true/false for whether this user is an admin
 */
const checkAdminPermissions = (req: ExpressRequest): boolean => {
    return ((req.auth?.payload?.permissions as string[] ?? []).includes("admin"));
}

export { requireAuth, authDiscoveryHandler, checkAdminPermissions, checkOrigin }