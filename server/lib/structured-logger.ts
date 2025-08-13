interface LogFields { [k: string]: any }

type Level = 'info'|'warn'|'error'|'debug';

function base(level: Level, msg: string, fields?: LogFields){
  const ts = new Date().toISOString();
  const out: any = { ts, level, msg, ...fields };
  const cid = (fields && fields.cid) || undefined;
  try {
    // Fallback to console.*
    if (level==='error') console.error(JSON.stringify(out));
    else if (level==='warn') console.warn(JSON.stringify(out));
    else if (level==='debug') console.debug(JSON.stringify(out));
    else console.log(JSON.stringify(out));
  } catch { /* ignore */ }
}

export const slog = {
  info: (msg: string, fields?: LogFields)=> base('info', msg, fields),
  warn: (msg: string, fields?: LogFields)=> base('warn', msg, fields),
  error: (msg: string, fields?: LogFields)=> base('error', msg, fields),
  debug: (msg: string, fields?: LogFields)=> base('debug', msg, fields)
};
