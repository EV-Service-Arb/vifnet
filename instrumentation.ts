/**
 * Runs once when the server starts. A missing prod setting, a lead store that
 * cannot open, or SMTP with no sender fails startup — every request, `/health`
 * included, answers 500 and the pod never turns ready — instead of the first
 * customer's submission. The lead webhook is built here for the same reason,
 * and started so that what a previous process queued is delivered without
 * waiting for the next lead. Then the experiments this build runs are
 * declared to the panel through that webhook (`experiments.declared@1`), so
 * its "Experiments" screen offers their weights and kill switch; that one
 * never fails startup — the panel keeps the last declaration.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { serverEnv, notifier, webhook } = await import("@/shared/config/env");
  const { EXPERIMENTS, EXPERIMENT_SUMMARIES } = await import("@/shared/config/experiments");
  const { checkLeadStore, declareExperiments } = await import("@/shared/lib/sites-tools/server");
  notifier();
  await checkLeadStore(serverEnv());
  webhook()?.start();
  declareExperiments(webhook, EXPERIMENTS, { summaries: EXPERIMENT_SUMMARIES });
}
