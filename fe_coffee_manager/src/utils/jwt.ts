// JWT utility functions
export interface JWTPayload {
  sub: string; // email
  user_id: number;
  scope: string; // role
  iss: string;
  exp: number;
  iat: number;
  jti: string;
}

// Decode JWT token (client-side only, không verify signature)
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT có 3 phần: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (base64url)
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

// Extract user info from JWT payload
export function extractUserFromJWT(payload: JWTPayload) {
  // Convert role from ROLE_ADMIN -> admin
  const role = payload.scope.replace('ROLE_', '').toLowerCase();
  
  return {
    id: payload.user_id.toString(), // Convert number to string
    email: payload.sub,
    role: role as 'admin' | 'manager' | 'staff',
  };
}
