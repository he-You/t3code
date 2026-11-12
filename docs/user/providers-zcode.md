# ZCode

ZCode runs the ZCode app-server through the community
[`zcode-acp`](https://www.npmjs.com/package/zcode-acp) bridge, which speaks ACP. Your GLM Coding
Plan and ZCode skills, MCP servers, and session history come along unchanged.

## Set up

1. Install the [ZCode app](https://zcode.z.ai) and sign in, so credentials exist in `~/.zcode`.
2. Install the ACP bridge on the server: `npm install -g zcode-acp`. It provides the
   `zcode-acp-server` executable.
3. Open **Settings → Providers → Add provider → ZCode**. Set **Bridge path** if
   `zcode-acp-server` is not on the server's `PATH`.
4. Point the bridge at the ZCode CLI when it is not auto-discovered, by adding `ZCODE_BIN` (for
   example `/Applications/ZCode.app/Contents/Resources/glm/zcode.cjs`) to the instance's
   environment variables.

The bridge is third-party software, separate from ZCode and T3 Code. Review its source and license
before running it.

## Models and options

The model picker lists what the bridge reports from ZCode, and session options such as thinking
level appear beside it. Add **Custom models** if the bridge hides one.

## Limits

- ZCode handles its own sign-in; the bridge reads credentials from `~/.zcode` (or `ZCODE_HOME`).
- Thread titles, commit messages, and other text T3 Code writes itself need a text generator or a
  different coding agent.
- Checkpoint rollback restores your files, but the ZCode conversation cannot be rewound; the next
  turn starts a fresh ZCode session.
