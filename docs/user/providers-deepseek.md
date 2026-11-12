# DeepSeek

DeepSeek runs DeepSeek Harness (`dsh`) as an ACP agent. T3 Code starts the
harness with its `acp` profile, so DeepSeek's own models, tools, sandbox, and sign-in stay in the
harness.

## Set up

1. Install DeepSeek Harness on the machine that hosts your T3 Code server. Its CLI is `dsh`; the
   macOS app installs it at
   `/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh`.
2. Make `dsh` reachable, or set **Binary path** under the provider instance. An absolute path is
   fine; T3 Code launches the executable without a shell.
3. Open **Settings → Providers → Add provider → DeepSeek**, then keep or change the instance name.
4. Sign in to DeepSeek Harness with its own app or CLI, or paste a **DeepSeek API key** in the
   instance settings. The key is stored on the environment as a secret and passed to the harness as
   `DEEPSEEK_API_KEY`; without it, the account already signed in to the harness is used.

The harness profile defaults to `acp`. Change **Harness profile** only if you keep a custom profile
that serves ACP.

## Models

The model picker lists what the harness reports, including DeepSeek's reasoning levels. If the
harness hides a model, add its ID under the instance's **Custom models**.

## Usage

[Usage](./usage.md) reads DeepSeek Harness session files under `~/.dsh/sessions`, or `$DSH_HOME/sessions`.
The harness records tokens but no cost, so DeepSeek models appear unpriced until you set model prices.

## Limits

- Thread titles, commit messages, and other text T3 Code writes itself need a text generator or a
  coding agent that supports them; this provider serves chats only.
- The harness does not accept image attachments.
- Checkpoint rollback restores your files, but the next turn starts a fresh harness session.
- Instances share the account signed in to `~/.dsh`; use the harness's own configuration if you need
  separate accounts.
- Updates come from DeepSeek Harness, not T3 Code.
