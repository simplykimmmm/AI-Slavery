type Fields = Record<string, unknown>;

const write = (level: string, message: string, fields: Fields = {}) => {
  const line = { level, time: new Date().toISOString(), message, ...fields };
  const output = JSON.stringify(line);
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
};

export const logger = {
  info: (message: string, fields?: Fields) => write("info", message, fields),
  warn: (message: string, fields?: Fields) => write("warn", message, fields),
  error: (message: string, fields?: Fields) => write("error", message, fields),
};
