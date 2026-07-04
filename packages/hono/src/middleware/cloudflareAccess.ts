import { Context } from 'hono';

const jwksCache = new Map<string, { keys: any[]; cachedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getJwks(teamDomain: string): Promise<{ keys: any[] }> {
  const now = Date.now();
  const cached = jwksCache.get(teamDomain);
  if (cached && now - cached.cachedAt < CACHE_TTL) {
    return { keys: cached.keys };
  }
  const certsUrl = `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const res = await fetch(certsUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch Cloudflare Access certificates from ${certsUrl}`);
  }
  const data = (await res.json()) as { keys: any[] };
  jwksCache.set(teamDomain, { keys: data.keys, cachedAt: now });
  return data;
}

function normalizeOrigin(value: string): string {
  return value.replace(/\/$/, '');
}

async function importJwk(jwk: any): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' },
    },
    true,
    ['verify']
  );
}

export async function verifyAccessJwt(token: string, teamDomain: string, audience: string): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  // 1. Decode header to find kid
  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
  const kid = header.kid;
  if (!kid) {
    throw new Error('JWT header missing kid');
  }

  // 2. Fetch JWKS and match kid
  const jwks = await getJwks(teamDomain);
  const jwk = jwks.keys.find((k: any) => k.kid === kid);
  if (!jwk) {
    throw new Error(`No certificate found for kid: ${kid}`);
  }

  // 3. Import JWK to CryptoKey
  const publicKey = await importJwk(jwk);

  // 4. Verify signature using hono/jwt
  const { verify } = await import('hono/jwt');
  const payload = await verify(token, publicKey as any, 'RS256');

  // 5. Verify audience
  if (payload.aud !== audience) {
    throw new Error(`Audience mismatch. Expected: ${audience}, Got: ${payload.aud}`);
  }

  // 6. Verify issuer
  const expectedIssuer = normalizeOrigin(`https://${teamDomain}.cloudflareaccess.com`);
  if (payload.iss && normalizeOrigin(String(payload.iss)) !== expectedIssuer) {
    throw new Error(`Issuer mismatch. Expected: ${expectedIssuer}, Got: ${payload.iss}`);
  }

  // 7. Verify expiration / not before
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('JWT token expired');
  }
  if (payload.nbf && payload.nbf > now) {
    throw new Error('JWT token is not active yet');
  }

  return payload;
}

export interface CloudflareAccessOptions {
  teamDomain: string;
  audience: string;
  allowMock?: boolean;
  allowCookie?: boolean;
}

/**
 * Cloudflare Access Token Validation Middleware.
 * Can be used as a standalone Hono middleware or as a Cape auth.guard hook.
 */
export function cloudflareAccess(options: CloudflareAccessOptions) {
  return async (c: Context, next?: () => Promise<void>) => {
    const { getCookie } = await import('hono/cookie');
    const tokenFromHeader = c.req.header('Cf-Access-Jwt-Assertion');
    const tokenFromCookie = options.allowCookie ? getCookie(c, 'Cf-Access-Jwt-Assertion') : undefined;
    const token = tokenFromHeader || tokenFromCookie;

    // Local/Dev environment bypass support
    if (options.allowMock && token === 'mock-cf-assertion') {
      const mockPayload = {
        email: 'admin@example.com',
        name: 'Mock Admin User',
        aud: options.audience,
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      c.set('cfAccessUser', mockPayload);
      if (next) {
        await next();
      }
      return true;
    }

    if (!token) {
      const res = c.json({ error: 'Missing Cloudflare Access assertion' }, 401);
      if (next) {
        return res;
      }
      return res;
    }

    try {
      const payload = await verifyAccessJwt(token, options.teamDomain, options.audience);
      c.set('cfAccessUser', payload);
      if (next) {
        await next();
      }
      return true;
    } catch (err: any) {
      const res = c.json({ error: `Unauthorized: ${err.message}` }, 401);
      if (next) {
        return res;
      }
      return res;
    }
  };
}
