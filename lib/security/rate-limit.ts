interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const tracker = new Map<string, RateLimitRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of tracker.entries()) {
    if (now > record.resetAt) {
      tracker.delete(key);
    }
  }
}, 60000);

export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const record = tracker.get(identifier);

  if (!record || now > record.resetAt) {
    tracker.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetInMs: windowMs,
    };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, record.resetAt - now),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetInMs: Math.max(0, record.resetAt - now),
  };
}
