# @timescale/workflow-dispatch-action

Dispatch a workflow action and wait for it to finish.

When using the [Workflow Dispatch](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)
via the REST API, it's not regularly possible to know if the given dispatch
actually succeed or not, as it's run via an asynchronous webhook. This can
make it annoying to coordinate running multiple dispatches in sequence where
each relies on the previous having succeeded. This action allows for that,
wherein it dispatches a workflow, passing a UID to it that is then put into the
run name, finds that workflow on searching for it, and then polls until the
workflow has finished, suceeding or fail the step as makes sense.

## Usage

See [action.yml](action.yml)

```yaml
  - name: Dispatch Workflow
    uses: timescale/workflow-dispatch-action@v1
    with:
      # Optional, the github token to use to authenticate with the
      # GitHub REST API, defaults to ${{ secrets.GITHUB_TOKEN }}
      github-token: ''
      # Required, the account owner of the repository. The name is not case
      # sensitive. E.g. 'timescale'
      owner: ''
      # Required, the name of the repository without the .git extension. The
      # name is not case sensitive. E.g. 'workflow-dispatch-action'
      repo: ''
      # Required, the ID of the workflow. You can also pass the workflow file
      # name as a string.
      workflow_id: ''
      # Required, the git reference for the workflow. The reference can be a
      # branch or tag name.
      ref: ''
      # Optional, JSON string of the inputs to pass to the workflow
      inputs: '{}'
```

For the workflow you plan to dispatch, you will want to add an `uid` input:

```yaml
      uid:
        description: 'UID to use for finding the workflow run'
        required: true
        type: string
```

you need to add a
[run-name](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#run-name)
that prints out the `uid` input:

```yaml
run-name: Build - ${{ inputs.uid }}
``
