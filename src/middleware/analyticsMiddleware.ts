/**
 * Analytics Middleware
 * Tracks all API requests for usage analytics
 */

import { Request, Response, NextFunction } from 'express';
import { logAPICall } from '../services/analytics';

/**
 * Identify integration from request
 */
function identifyIntegration(req: Request): string | null {
  // Check custom header first
  const customHeader = req.headers['x-integration-id'];
  if (customHeader) {
    return customHeader as string;
  }

  // Parse user-agent for known integrations
  const ua = (req.headers['user-agent'] || '').toLowerCase();

  // Known integration patterns
  if (ua.includes('agentcasino')) return 'agentcasino';
  if (ua.includes('agentbounty')) return 'agentbounty';
  if (ua.includes('ibrl') || ua.includes('sovereign')) return 'ibrl';
  if (ua.includes('sentinel')) return 'sentinel';
  if (ua.includes('logos')) return 'logos';
  if (ua.includes('claudecraft')) return 'claudecraft';
  if (ua.includes('aegis')) return 'aegis';
  if (ua.includes('treasury')) return 'treasury-manager';

  // Check for common bot/tool patterns (mark as tools, not integrations)
  if (ua.includes('curl')) return 'curl';
  if (ua.includes('postman')) return 'postman';
  if (ua.includes('insomnia')) return 'insomnia';
  if (ua.includes('python')) return 'python-client';
  if (ua.includes('node')) return 'node-client';

  return 'unknown';
}

/**
 * Track request middleware
 */
export function trackRequest(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();

  // Skip tracking for dashboard/static routes
  if (req.path.startsWith('/dashboard') || req.path === '/' || req.path === '/health') {
    return next();
  }

  const integration = identifyIntegration(req);
  const userAgent = req.headers['user-agent'];

  // Listen for response finish
  res.on('finish', () => {
    const duration = performance.now() - start;

    logAPICall({
      timestamp: new Date().toISOString(),
      endpoint: req.path,
      integration,
      responseTime: duration,
      statusCode: res.statusCode,
      userAgent
    });
  });

  next();
}
