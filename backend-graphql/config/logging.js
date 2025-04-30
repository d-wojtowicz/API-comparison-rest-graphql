const getTimestamp = () => new Date().toISOString();

const log = (level, namespace, message, object) => {
  const BASE = `[${getTimestamp()}] [${level.toUpperCase()}] [${namespace}] ${message}`;
  if (object) {
    console[level](BASE, object);
  } else {
    console[level](BASE);
  }
};

export default {
  info: (ns, msg, obj) => log('info', ns, msg, obj),
  warn: (ns, msg, obj) => log('warn', ns, msg, obj),
  error: (ns, msg, obj) => log('error', ns, msg, obj),
  debug: (ns, msg, obj) => log('debug', ns, msg, obj),
};
