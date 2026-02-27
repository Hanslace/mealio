// src/lib/observability/logger.ts

import { ENV } from "@/config/env";

export type LogCategory =
  | 'SECURITY'
  | 'AUTH'
  | 'SYSTEM'
  | 'BUSINESS';

export type LogSeverity =
  | 'DEBUG'
  | 'INFO'
  | 'WARN'
  | 'ERROR'
  | 'CRITICAL';

export interface Log<T = unknown> {
  code: string;              
  category: LogCategory;     
  severity: LogSeverity;    
  trace_id?: string;      
  user_id?: string;
  device_id?: string;
  note?: string;            
  payload?: T;                  
}


export function recordLog<T>(
  log: Log<T>
): void {
  if (!log.code) return;
  if (!log.category) return;
  if (!log.severity) return;

  const enriched = {
    ...log,
    service: ENV.SERVICE_NAME,
    timestamp: new Date().toISOString(),
  };

  console.log('[LOG]', JSON.stringify(enriched));
}
