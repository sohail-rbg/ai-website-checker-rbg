const LOCAL_ARGS = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function isServerlessBrowserRuntime(env = process.env) {
  return Boolean(env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME || env.AWS_EXECUTION_ENV);
}

export async function launchBrowser({ args = [], ...options } = {}) {
  if (isServerlessBrowserRuntime()) {
    const [{ default: puppeteer }, { default: chromium }] = await Promise.all([
      import("puppeteer-core"),
      import("@sparticuz/chromium"),
    ]);
    chromium.setGraphicsMode = false;
    return puppeteer.launch({
      ...options,
      args: unique([...chromium.args, ...LOCAL_ARGS, ...args]),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });
  }

  const { default: puppeteer } = await import("puppeteer");
  return puppeteer.launch({
    headless: true,
    ...options,
    args: unique([...LOCAL_ARGS, ...args]),
  });
}
