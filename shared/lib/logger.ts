export interface ILogger {
  info(message: string, meta?: any): void;
  error(message: string, error?: any, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export class Logger implements ILogger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private log(level: string, message: string, meta?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      level,
      message,
      ...(meta ? { meta } : {})
    };
    
    // In production, forward to stdout so Fluentd/Logstash can ingest into Elasticsearch
    console.log(JSON.stringify(logEntry));
  }

  info(message: string, meta?: any): void {
    this.log('INFO', message, meta);
  }

  error(message: string, error?: any, meta?: any): void {
    this.log('ERROR', message, {
      ...meta,
      ...(error instanceof Error ? { error: error.message, stack: error.stack } : { error })
    });
  }

  warn(message: string, meta?: any): void {
    this.log('WARN', message, meta);
  }

  debug(message: string, meta?: any): void {
    this.log('DEBUG', message, meta);
  }
}
