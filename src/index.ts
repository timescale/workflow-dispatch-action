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
  const maxAttempts = 12; // 1 minute timeout (12 * 5 seconds)
  while (!runId && attempts < maxAttempts) {
    if (attempts > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
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
  }

  if (!runId) {
    throw new Error('Failed to find workflow run');
  }

  attempts = 0;
  while (!conclusion) {
    if (attempts > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    const run = await github.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });
    conclusion = run.data.conclusion;
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
