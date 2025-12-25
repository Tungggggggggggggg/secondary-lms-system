// Logger đơn giản cho server, có thể nâng cấp sang pino/winston khi cần
export type LogFields = Record<string, unknown>;

function fmt(level: string, msg: string, fields?: LogFields) {
  const base = { level, msg, time: new Date().toISOString(), ...fields };
  try {
    // Tránh log metadata quá lớn
    return JSON.stringify(base);
  } catch {
    return `[${level}] ${msg}`;
  }
}

export const logger = {
  info(msg: string, fields?: LogFields) {
    console.log(fmt("info", msg, fields));
  },
  warn(msg: string, fields?: LogFields) {
    console.warn(fmt("warn", msg, fields));
  },
  error(msg: string, fields?: LogFields) {
    console.error(fmt("error", msg, fields));
  },
  start(action: string, fields?: LogFields) {
    const t0 = Date.now();
    this.info(`${action}:start`, fields);
    return {
      end: (more?: LogFields) => this.info(`${action}:end`, { durationMs: Date.now() - t0, ...fields, ...more }),
    };
  },
};


