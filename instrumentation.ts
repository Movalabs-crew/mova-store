/**
 * Next.js instrumentation hook.
 *
 * `register()` runs once per server process before the application starts
 * serving requests. That makes it the right boundary to fail fast on invalid
 * configuration: `lib/env.ts` has always exported `validateEnv()`, but nothing
 * imported it at runtime, so a deployment with missing variables booted happily
 * and only failed later on the first request that touched the missing
 * dependency.
 *
 * Validation is skipped for the edge runtime and during `next build`, where the
 * runtime secrets are not expected to be present yet.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Imported lazily so the module is only evaluated for the nodejs runtime.
  const { validateEnv } = await import("./lib/env");

  try {
    validateEnv();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      "Startup aborted: the environment configuration is invalid.\n" + detail
    );
  }
}
