import * as core from '@actions/core';
import {context, getOctokit} from '@actions/github';
import { v4 as uuid } from 'uuid';

async function main(): Promise<void> {
  const token = core.getInput('github-token', {required: true});
  const owner = core.getInput('owner', {required: true});
  const repo = core.getInput('repo', {required: true});
  const workflow_id = core.getInput('workflow_id', {required: true});
  const ref = core.getInput('ref') || context.ref;
  const inputs = JSON.parse(core.getInput('inputs') || '{}');

  const github = getOctokit(token);

  const uid = uuid();

  await github.rest.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id,
    ref,
    inputs: {
      ...inputs,
      uid,
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  let runId: number | null = null;
  let conclusion: string | null = null;

  let attempts = 0;
  const maxAttempts = 12;
  while (!runId && attempts < maxAttempts) {
    const runs = await github.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id,
    });
    for (const run of runs.data.workflow_runs) {
      if (run.name?.includes(uid)) {
        runId = run.id;
        conclusion = run.conclusion;
        break;
      }
    }
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  if (!runId) {
    throw new Error('Failed to find workflow run');
  }

  attempts = 0;
  while (!conclusion) {
    if (attempts > 0) {
      // Pseudo-exponential backoff, capped at 2 minutes, where the first 2
      // attempts are 30 seconds apart, the next 5 are 60 seconds apart, and
      // the rest are 120 seconds apart.
      // This is to help avoid hitting rate limits on the GitHub API, while
      // still trying to get the status in a reasonable amount of time between
      // the workflow finishing upstream and us getting that status here.
      const waitTime = attempts <= 2 ? 30000 : attempts <= 7 ? 60000 : 120000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    const run = await github.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });
    conclusion = run.data.conclusion;
    attempts++;
  }

  core.info(`Workflow run ${runId} completed with conclusion: ${conclusion}`);

  if (conclusion !== 'success') {
    throw new Error(`Workflow run failed with conclusion: ${conclusion}`);
  }
}

function handleError(err: unknown): void {
  console.error(err);
  core.setFailed(`Error: ${err}`);
}

process.on('unhandledRejection', handleError);
main().catch(handleError);
