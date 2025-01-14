import { CommandHandlerData, CommandHandlerOptions } from './typings';
import { getFilePaths } from '../../utils/get-paths';
import { toFileURL } from '../../utils/resolve-file-url';
import builtInValidations from './validations';
import registerCommands from './functions/registerCommands';
import handleCommands from './functions/handleCommands';
import colors from 'colors/safe';

export class CommandHandler {
    _data: CommandHandlerData;

    constructor({ ...options }: CommandHandlerOptions) {
        this._data = {
            ...options,
            builtInValidations: [],
            commands: [],
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
            (path) => path.endsWith('.js') || path.endsWith('.ts'),
        );

        for (const commandFilePath of commandFilePaths) {
            const modulePath = toFileURL(commandFilePath);

            let commandObj = await import(modulePath);

            const compactFilePath = commandFilePath.split(process.cwd())[1] || commandFilePath;

            if (commandObj.default) commandObj = commandObj.default;

            if (!commandObj.data) {
                console.log(
                    colors.yellow(
                        `⏩ Ignoring: Command ${compactFilePath} does not export "data".`,
                    ),
                );
                continue;
            }

            if (!commandObj.run) {
                console.log(
                    colors.yellow(`⏩ Ignoring: Command ${compactFilePath} does not export "run".`),
                );
                continue;
            }

            commandObj.filePath = commandFilePath;

            let commandCategory =
                commandFilePath
                    .split(this._data.commandsPath)[1]
                    ?.replace(/\\\\|\\/g, '/')
                    .split('/')[1] || null;

            if (commandCategory?.endsWith('.js') || commandCategory?.endsWith('.ts')) {
                commandObj.category = null;
            } else {
                commandObj.category = commandCategory;
            }

            this._data.commands.push(commandObj);
        }
    }

    #buildValidations() {
        for (const validationFunction of builtInValidations) {
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
}
