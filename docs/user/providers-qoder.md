# Qoder

Qoder runs the [Qoder CLI](https://docs.qoder.com/cli/overview) as an ACP agent. The CLI brings
its own models, tools, subagents, and Qoder sign-in; T3 Code provides projects, threads,
checkpoints, and task delegation.

## Set up

1. Install the Qoder CLI from [Qoder's download page](https://qoder.com/download) and run
   `qoder` once to sign in.
2. Make `qoder` reachable on the server, or set **Binary path** on the provider instance. T3 Code
   launches it with `--acp` to start the ACP server.
3. Open **Settings → Providers → Add provider → Qoder**, then enable the instance.

Qoder CLI is also listed in the ACP Registry; T3 Code's own provider is the same CLI with a
dedicated settings card, so it is left out of the Registry list here.

## Models and options

The model picker lists what Qoder reports, and Qoder's reasoning effort and other session options
appear beside it. If Qoder hides a model, add its ID under the instance's **Custom models**.

## Limits

- Qoder handles its own sign-in; there is no API-key field. Use `qoder` in a terminal on the server
  to switch accounts.
- Thread titles, commit messages, and other text T3 Code writes itself need a text generator or a
  different coding agent.
- Checkpoint rollback restores your files, but Qoder cannot rewind its own conversation, so the next
  turn starts a fresh Qoder session.
