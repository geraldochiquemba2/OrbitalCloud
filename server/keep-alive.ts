const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000;

let keepAliveTimer: NodeJS.Timeout | null = null;

export function startKeepAlive(port: number, logFn: (msg: string, source?: string) => void): void {
  if (process.env.NODE_ENV !== "production") {
    logFn("Keep-alive desativado em desenvolvimento", "keep-alive");
    return;
  }

  const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
  
  if (!externalUrl) {
    logFn("⚠️ Keep-alive: RENDER_EXTERNAL_URL ou APP_URL não definido. Configure um serviço externo como UptimeRobot para evitar hibernação.", "keep-alive");
    logFn("📋 Para configurar: https://uptimerobot.com -> Adicionar monitor HTTP -> URL: https://seu-app.onrender.com/api/health", "keep-alive");
    return;
  }

  const selfPing = async () => {
    try {
      const url = `${externalUrl}/api/health`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'User-Agent': 'OrbitalCloud-KeepAlive' }
      });
      clearTimeout(timeout);
      
      if (response.ok) {
        logFn(`Keep-alive ping OK (${externalUrl})`, "keep-alive");
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logFn("Keep-alive ping timeout (10s)", "keep-alive");
      } else {
        logFn(`Keep-alive ping failed: ${error.message}`, "keep-alive");
      }
    }
  };

  setTimeout(selfPing, 5000);

  keepAliveTimer = setInterval(selfPing, KEEP_ALIVE_INTERVAL);

  logFn(`Keep-alive iniciado: ${externalUrl} a cada ${KEEP_ALIVE_INTERVAL / 60000} minutos`, "keep-alive");
}

export function stopKeepAlive(logFn?: (msg: string, source?: string) => void): void {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
    if (logFn) {
      logFn("Keep-alive system stopped", "keep-alive");
    }
  }
}
