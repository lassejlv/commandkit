// src/utils/get-paths.ts
import path from "path";
import fs from "fs";
function getFilePaths(directory, nesting) {
  let filePaths = [];
  if (!directory)
    return filePaths;
  const files = fs.readdirSync(directory, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(directory, file.name);
    if (file.isFile()) {
      filePaths.push(filePath);
    }
    if (nesting && file.isDirectory()) {
      filePaths = [...filePaths, ...getFilePaths(filePath, true)];
    }
  }
  return filePaths;
}
function getFolderPaths(directory, nesting) {
  let folderPaths = [];
  if (!directory)
    return folderPaths;
  const folders = fs.readdirSync(directory, { withFileTypes: true });
  for (const folder of folders) {
    const folderPath = path.join(directory, folder.name);
    if (folder.isDirectory()) {
      folderPaths.push(folderPath);
      if (nesting) {
        folderPaths = [...folderPaths, ...getFolderPaths(folderPath, true)];
      }
    }
  }
  return folderPaths;
}

// src/utils/resolve-file-url.ts
import path2 from "path";
function toFileURL(filePath) {
  const resolvedPath = path2.resolve(filePath);
  return "file://" + resolvedPath.replace(/\\/g, "/");
}

// src/handlers/command-handler/validations/botPermissions.ts
function botPermissions_default({ interaction, targetCommand }) {
  const botMember = interaction.guild?.members.me;
  let commandPermissions = targetCommand.options?.botPermissions;
  if (!botMember || !commandPermissions)
    return;
  if (!Array.isArray(commandPermissions)) {
    commandPermissions = [commandPermissions];
  }
  const missingPermissions = [];
  for (const permission of commandPermissions) {
    const hasPermission = botMember.permissions.has(permission);
    if (!hasPermission) {
      missingPermissions.push(`\`${permission.toString()}\``);
    }
  }
  if (missingPermissions.length) {
    interaction.reply({
      content: `\u274C I do not have enough permissions to execute this command. Missing: ${missingPermissions.join(
        ", "
      )}`,
      ephemeral: true
    });
    return true;
  }
}

// src/handlers/command-handler/validations/devOnly.ts
function devOnly_default({ interaction, targetCommand, handlerData }) {
  if (targetCommand.options?.devOnly) {
    if (interaction.inGuild() && !handlerData.devGuildIds.includes(interaction.guildId)) {
      interaction.reply({
        content: "\u274C This command can only be used inside development servers.",
        ephemeral: true
      });
      return true;
    }
    const guildMember = interaction.guild?.members.cache.get(interaction.user.id);
    const memberRoles = guildMember?.roles.cache;
    let hasDevRole = false;
    memberRoles?.forEach((role) => {
      if (handlerData.devRoleIds?.includes(role.id)) {
        hasDevRole = true;
      }
    });
    const isDevUser = handlerData.devUserIds.includes(interaction.user.id) || hasDevRole;
    if (!isDevUser) {
      interaction.reply({
        content: "\u274C This command can only be used by developers.",
        ephemeral: true
      });
      return true;
    }
  }
}

// src/handlers/command-handler/validations/guildOnly.ts
function guildOnly_default({ interaction, targetCommand }) {
  if (targetCommand.options?.guildOnly && !interaction.inGuild()) {
    interaction.reply({
      content: "\u274C This command can only be used inside a server.",
      ephemeral: true
    });
    return true;
  }
}

// src/handlers/command-handler/validations/userPermissions.ts
function userPermissions_default({ interaction, targetCommand }) {
  const memberPermissions = interaction.memberPermissions;
  let commandPermissions = targetCommand.options?.userPermissions;
  if (!memberPermissions || !commandPermissions)
    return;
  if (!Array.isArray(commandPermissions)) {
    commandPermissions = [commandPermissions];
  }
  const missingPermissions = [];
  for (const permission of commandPermissions) {
    const hasPermission = memberPermissions.has(permission);
    if (!hasPermission) {
      missingPermissions.push(`\`${permission.toString()}\``);
    }
  }
  if (missingPermissions.length) {
    interaction.reply({
      content: `\u274C You do not have enough permissions to run this command. Missing: ${missingPermissions.join(
        ", "
      )}`,
      ephemeral: true
    });
    return true;
  }
}

// src/handlers/command-handler/validations/index.ts
var validations_default = [botPermissions_default, devOnly_default, guildOnly_default, userPermissions_default];

// src/handlers/command-handler/utils/areSlashCommandsDifferent.ts
function areSlashCommandsDifferent(appCommand, localCommand) {
  if (!appCommand.options)
    appCommand.options = [];
  if (!localCommand.options)
    localCommand.options = [];
  if (!appCommand.description)
    appCommand.description = "";
  if (!localCommand.description)
    localCommand.description = "";
  if (localCommand.description !== appCommand.description || localCommand.options.length !== appCommand.options.length) {
    return true;
  }
}

// src/handlers/command-handler/functions/registerCommands.ts
import colors from "colors/safe";
async function registerCommands(commandHandler) {
  const client = commandHandler._data.client;
  const devGuildIds = commandHandler._data.devGuildIds;
  const commands = commandHandler._data.commands;
  client.once("ready", async () => {
    const devGuilds = [];
    for (const devGuildId of devGuildIds) {
      const guild = client.guilds.cache.get(devGuildId);
      if (!guild) {
        console.log(
          colors.yellow(
            `\u23E9 Ignoring: Guild ${devGuildId} does not exist or client isn't in this guild.`
          )
        );
        continue;
      }
      devGuilds.push(guild);
    }
    const appCommands = client.application?.commands;
    await appCommands?.fetch();
    const devGuildCommands = [];
    for (const guild of devGuilds) {
      const guildCommands = guild.commands;
      await guildCommands?.fetch();
      devGuildCommands.push(guildCommands);
    }
    for (const command of commands) {
      let commandData = command.data;
      if (command.options?.deleted) {
        const targetCommand = appCommands?.cache.find(
          (cmd) => cmd.name === commandData.name
        );
        if (!targetCommand) {
          console.log(
            colors.yellow(
              `\u23E9 Ignoring: Command "${commandData.name}" is globally marked as deleted.`
            )
          );
        } else {
          targetCommand.delete().then(() => {
            console.log(
              colors.green(`\u{1F6AE} Deleted command "${commandData.name}" globally.`)
            );
          });
        }
        for (const guildCommands of devGuildCommands) {
          const targetCommand2 = guildCommands.cache.find(
            (cmd) => cmd.name === commandData.name
          );
          if (!targetCommand2) {
            console.log(
              colors.yellow(
                `\u23E9 Ignoring: Command "${commandData.name}" is marked as deleted for ${guildCommands.guild.name}.`
              )
            );
          } else {
            targetCommand2.delete().then(() => {
              console.log(
                colors.green(
                  `\u{1F6AE} Deleted command "${commandData.name}" in ${guildCommands.guild.name}.`
                )
              );
            });
          }
        }
        continue;
      }
      let editedCommand = false;
      const appGlobalCommand = appCommands?.cache.find(
        (cmd) => cmd.name === commandData.name
      );
      if (appGlobalCommand) {
        const commandsAreDifferent = areSlashCommandsDifferent(
          appGlobalCommand,
          commandData
        );
        if (commandsAreDifferent) {
          appGlobalCommand.edit(commandData).then(() => {
            console.log(
              colors.green(`\u2705 Edited command "${commandData.name}" globally.`)
            );
          }).catch((error) => {
            console.log(
              colors.red(
                `\u274C Failed to edit command "${commandData.name}" globally.`
              )
            );
            console.error(error);
          });
          editedCommand = true;
        }
      }
      for (const guildCommands of devGuildCommands) {
        const appGuildCommand = guildCommands.cache.find(
          (cmd) => cmd.name === commandData.name
        );
        if (appGuildCommand) {
          const commandsAreDifferent = areSlashCommandsDifferent(
            appGuildCommand,
            commandData
          );
          if (commandsAreDifferent) {
            appGuildCommand.edit(commandData).then(() => {
              console.log(
                colors.green(
                  `\u2705 Edited command "${commandData.name}" in ${guildCommands.guild.name}.`
                )
              );
            }).catch((error) => {
              console.log(
                colors.red(
                  `\u274C Failed to edit command "${commandData.name}" in ${guildCommands.guild.name}.`
                )
              );
              console.error(error);
            });
            editedCommand = true;
          }
        }
      }
      if (editedCommand)
        continue;
      if (command.options?.devOnly) {
        if (!devGuilds.length) {
          console.log(
            colors.yellow(
              `\u23E9 Ignoring: Cannot register command "${commandData.name}" as no valid "devGuildIds" were provided.`
            )
          );
          continue;
        }
        for (const guild of devGuilds) {
          const cmdExists = guild.commands.cache.some(
            (cmd) => cmd.name === commandData.name
          );
          if (cmdExists)
            continue;
          guild?.commands.create(commandData).then(() => {
            console.log(
              colors.green(
                `\u2705 Registered command "${commandData.name}" in ${guild.name}.`
              )
            );
          }).catch((error) => {
            console.log(
              colors.red(
                `\u274C Failed to register command "${commandData.name}" in ${guild.name}.`
              )
            );
            console.error(error);
          });
        }
      } else {
        const cmdExists = appCommands?.cache.some((cmd) => cmd.name === commandData.name);
        if (cmdExists)
          continue;
        appCommands?.create(commandData).then(() => {
          console.log(
            colors.green(`\u2705 Registered command "${commandData.name}" globally.`)
          );
        }).catch((error) => {
          console.log(
            colors.red(
              `\u274C Failed to register command "${commandData.name}" globally.`
            )
          );
          console.error(error);
        });
      }
    }
  });
}

// src/handlers/command-handler/functions/handleCommands.ts
function handleCommands(commandHandler) {
  const client = commandHandler._data.client;
  const handler = commandHandler._data.commandKitInstance;
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand())
      return;
    const targetCommand = commandHandler._data.commands.find(
      (cmd) => cmd.data.name === interaction.commandName
    );
    if (!targetCommand)
      return;
    const { data, options, run, ...rest } = targetCommand;
    const commandObj = {
      data: targetCommand.data,
      options: targetCommand.options,
      ...rest
    };
    let canRun = true;
    for (const validationFunction of commandHandler._data.customValidations) {
      const stopValidationLoop = await validationFunction({
        interaction,
        client,
        commandObj,
        handler
      });
      if (stopValidationLoop) {
        canRun = false;
        break;
      }
    }
    if (!canRun)
      return;
    if (!commandHandler._data.skipBuiltInValidations) {
      for (const validation of commandHandler._data.builtInValidations) {
        const stopValidationLoop = validation({
          targetCommand,
          interaction,
          handlerData: commandHandler._data
        });
        if (stopValidationLoop) {
          canRun = false;
          break;
        }
      }
    }
    if (!canRun)
      return;
    targetCommand.run({ interaction, client, handler });
  });
}

// src/handlers/command-handler/CommandHandler.ts
import colors2 from "colors/safe";
var CommandHandler = class {
  _data;
  constructor({ ...options }) {
    this._data = {
      ...options,
      builtInValidations: [],
      commands: []
    };
  }
  async init() {
    await this.#buildCommands();
    this.#buildValidations();
    await this.#registerCommands();
    this.#handleCommands();
  }
  async #buildCommands() {
    const commandFilePaths = getFilePaths(this._data.commandsPath, true).filter(
      (path3) => path3.endsWith(".js") || path3.endsWith(".ts")
    );
    for (const commandFilePath of commandFilePaths) {
      const modulePath = toFileURL(commandFilePath);
      let commandObj = await import(modulePath);
      const compactFilePath = commandFilePath.split(process.cwd())[1] || commandFilePath;
      if (commandObj.default)
        commandObj = commandObj.default;
      if (!commandObj.data) {
        console.log(
          colors2.yellow(
            `\u23E9 Ignoring: Command ${compactFilePath} does not export "data".`
          )
        );
        continue;
      }
      if (!commandObj.run) {
        console.log(
          colors2.yellow(`\u23E9 Ignoring: Command ${compactFilePath} does not export "run".`)
        );
        continue;
      }
      commandObj.filePath = commandFilePath;
      let commandCategory = commandFilePath.split(this._data.commandsPath)[1]?.replace(/\\\\|\\/g, "/").split("/")[1] || null;
      if (commandCategory?.endsWith(".js") || commandCategory?.endsWith(".ts")) {
        commandObj.category = null;
      } else {
        commandObj.category = commandCategory;
      }
      this._data.commands.push(commandObj);
    }
  }
  #buildValidations() {
    for (const validationFunction of validations_default) {
      this._data.builtInValidations.push(validationFunction);
    }
  }
  async #registerCommands() {
    await registerCommands(this);
  }
  #handleCommands() {
    handleCommands(this);
  }
  get commands() {
    return this._data.commands;
  }
};

// src/handlers/event-handler/EventHandler.ts
import colors3 from "colors/safe";
var EventHandler = class {
  #data;
  constructor({ ...options }) {
    this.#data = {
      ...options,
      events: []
    };
  }
  async init() {
    await this.#buildEvents();
    this.#registerEvents();
  }
  async #buildEvents() {
    const eventFolderPaths = getFolderPaths(this.#data.eventsPath);
    for (const eventFolderPath of eventFolderPaths) {
      const eventName = eventFolderPath.replace(/\\/g, "/").split("/").pop();
      const eventFilePaths = getFilePaths(eventFolderPath, true).filter(
        (path3) => path3.endsWith(".js") || path3.endsWith(".ts")
      );
      const eventObj = {
        name: eventName,
        functions: []
      };
      this.#data.events.push(eventObj);
      for (const eventFilePath of eventFilePaths) {
        const modulePath = toFileURL(eventFilePath);
        let eventFunction = (await import(modulePath)).default;
        if (eventFunction?.default) {
          eventFunction = eventFunction.default;
        }
        const compactFilePath = eventFilePath.split(process.cwd())[1] || eventFilePath;
        if (typeof eventFunction !== "function") {
          console.log(
            colors3.yellow(
              `\u23E9 Ignoring: Event ${compactFilePath} does not export a function.`
            )
          );
          continue;
        }
        eventObj.functions.push(eventFunction);
      }
    }
  }
  #registerEvents() {
    const client = this.#data.client;
    const handler = this.#data.commandKitInstance;
    for (const eventObj of this.#data.events) {
      client.on(eventObj.name, async (...params) => {
        for (const eventFunction of eventObj.functions) {
          const stopEventLoop = await eventFunction(...params, client, handler);
          if (stopEventLoop) {
            break;
          }
        }
      });
    }
  }
  get events() {
    return this.#data.events;
  }
};

// src/handlers/validation-handler/ValidationHandler.ts
import colors4 from "colors/safe";
var ValidationHandler = class {
  #data;
  constructor({ ...options }) {
    this.#data = {
      ...options,
      validations: []
    };
  }
  async init() {
    await this.#buildValidations();
  }
  async #buildValidations() {
    const validationFilePaths = getFilePaths(this.#data.validationsPath, true).filter(
      (path3) => path3.endsWith(".js") || path3.endsWith(".ts")
    );
    for (const validationFilePath of validationFilePaths) {
      const modulePath = toFileURL(validationFilePath);
      let validationFunction = (await import(modulePath)).default;
      if (validationFunction?.default) {
        validationFunction = validationFunction.default;
      }
      const compactFilePath = validationFilePath.split(process.cwd())[1] || validationFilePath;
      if (typeof validationFunction !== "function") {
        console.log(
          colors4.yellow(
            `\u23E9 Ignoring: Validation ${compactFilePath} does not export a function.`
          )
        );
        continue;
      }
      this.#data.validations.push(validationFunction);
    }
  }
  get validations() {
    return this.#data.validations;
  }
};

// src/CommandKit.ts
import colors5 from "colors/safe";
var CommandKit = class {
  #data;
  constructor({ ...options }) {
    if (!options.client) {
      throw new Error(colors5.red('"client" is required when instantiating CommandKit.'));
    }
    if (options.validationsPath && !options.commandsPath) {
      throw new Error(
        colors5.red('"commandsPath" is required when "validationsPath" is set.')
      );
    }
    this.#data = {
      ...options,
      commands: []
    };
    this.#init();
  }
  async #init() {
    if (this.#data.eventsPath) {
      const eventHandler = new EventHandler({
        client: this.#data.client,
        eventsPath: this.#data.eventsPath,
        commandKitInstance: this
      });
      await eventHandler.init();
    }
    let validationFunctions = [];
    if (this.#data.validationsPath) {
      const validationHandler = new ValidationHandler({
        validationsPath: this.#data.validationsPath
      });
      await validationHandler.init();
      validationHandler.validations.forEach((v) => validationFunctions.push(v));
    }
    if (this.#data.commandsPath) {
      const commandHandler = new CommandHandler({
        client: this.#data.client,
        commandsPath: this.#data.commandsPath,
        devGuildIds: this.#data.devGuildIds || [],
        devUserIds: this.#data.devUserIds || [],
        devRoleIds: this.#data.devRoleIds || [],
        customValidations: validationFunctions,
        skipBuiltInValidations: this.#data.skipBuiltInValidations || false,
        commandKitInstance: this
      });
      await commandHandler.init();
      this.#data.commands = commandHandler.commands;
    }
  }
  /** @returns An array of objects of all the commands that CommandKit is handling. */
  get commands() {
    const commands = this.#data.commands.map((cmd) => {
      const { run, ...command } = cmd;
      return command;
    });
    return commands;
  }
  /** @returns The path to the commands folder which was set when instantiating CommandKit. */
  get commandsPath() {
    return this.#data.commandsPath;
  }
  /** @returns The path to the events folder which was set when instantiating CommandKit. */
  get eventsPath() {
    return this.#data.eventsPath;
  }
  /** @returns The path to the validations folder which was set when instantiating CommandKit. */
  get validationsPath() {
    return this.#data.validationsPath;
  }
  /** @returns An array of all the developer user IDs which was set when instantiating CommandKit. */
  get devUserIds() {
    return this.#data.devUserIds || [];
  }
  /** @returns An array of all the developer guild IDs which was set when instantiating CommandKit. */
  get devGuildIds() {
    return this.#data.devGuildIds || [];
  }
  /** @returns An array of all the developer role IDs which was set when instantiating CommandKit. */
  get devRoleIds() {
    return this.#data.devRoleIds || [];
  }
};

// src/types/index.ts
var CommandType = /* @__PURE__ */ ((CommandType2) => {
  CommandType2[CommandType2["ChatInput"] = 1] = "ChatInput";
  CommandType2[CommandType2["Message"] = 3] = "Message";
  CommandType2[CommandType2["User"] = 2] = "User";
  return CommandType2;
})(CommandType || {});
export {
  CommandKit,
  CommandType
};
