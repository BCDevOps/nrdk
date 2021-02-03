import { expect, test } from "@oclif/test";

describe("greetings", () => {
  test
    .stdout()
    .command(["greetings"])
    .it("runs greetings", (ctx) => {
      expect(ctx.stdout).to.contain("Hello World");
    });

  test
    .stdout()
    .command(["greetings", "--name", "Earth"])
    .it("runs greetings --name Earth", (ctx) => {
      expect(ctx.stdout).to.contain("Hello Earth");
    });

  test
    .stdout()
    .command(["greetings", "Earth"])
    .it("runs greetings Earth", (ctx) => {
      expect(ctx.stdout).to.contain("Hello Earth");
    });
});
