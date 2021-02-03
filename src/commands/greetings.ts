import { Command, flags } from "@oclif/command";

export default class Greetings extends Command {
  static description = "Hello World test";

  static examples = ["$ nrdk greetings", "$ nrdk greetings Earth"];

  static strict = false;

  static flags = {
    help: flags.help({ char: "h" }),
    // flag with a value (-n, --name=VALUE)
    name: flags.string({ char: "n", description: "name to print" }),
    // flag with no value (-f, --force)
    force: flags.boolean({ char: "f" }),
  };

  static args = [{ name: "file" }];

  async run() {
    const { args, flags } = this.parse(Greetings);
    const name = args.file ?? flags.name ?? "World";
    this.log(`Hello ${name}`);
  }
}
