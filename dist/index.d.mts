import { Client, Interaction, CommandInteraction, ChatInputCommandInteraction, ContextMenuCommandInteraction, PermissionResolvable, APIApplicationCommandOption } from 'discord.js';

interface CommandKitOptions {
    client: Client;
    commandsPath?: string;
    eventsPath?: string;
    validationsPath?: string;
    devGuildIds?: string[];
    devUserIds?: string[];
    devRoleIds?: string[];
    skipBuiltInValidations?: boolean;
}

interface CommandFileObject {
    data: CommandData;
    options?: CommandOptions;
    run: ({}: { interaction: Interaction; client: Client; handler: CommandKit }) => void;
    filePath: string;
    category?: string;
}

interface CommandProps {
    interaction: CommandInteraction;
    client: Client<true>;
    handler: CommandKit;
}
interface SlashCommandProps {
    interaction: ChatInputCommandInteraction;
    client: Client<true>;
    handler: CommandKit;
}
interface ContextMenuCommandProps {
    interaction: ContextMenuCommandInteraction;
    client: Client<true>;
    handler: CommandKit;
}
interface ValidationFunctionProps {
    interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction;
    client: Client<true>;
    commandObj: CommandObject;
    handler: CommandKit;
}
interface CommandOptions {
    guildOnly?: boolean;
    devOnly?: boolean;
    deleted?: boolean;
    userPermissions?: PermissionResolvable;
    botPermissions?: PermissionResolvable;
    [key: string]: any;
}
declare enum CommandType {
    'ChatInput' = 1,
    'Message' = 3,
    'User' = 2
}
type LocaleString = 'id' | 'en-US' | 'en-GB' | 'bg' | 'zh-CN' | 'zh-TW' | 'hr' | 'cs' | 'da' | 'nl' | 'fi' | 'fr' | 'de' | 'el' | 'hi' | 'hu' | 'it' | 'ja' | 'ko' | 'lt' | 'no' | 'pl' | 'pt-BR' | 'ro' | 'ru' | 'es-ES' | 'sv-SE' | 'th' | 'tr' | 'uk' | 'vi';
type BaseCommandData = {
    name: string;
    type?: CommandType;
    name_localizations?: Partial<Record<LocaleString, string | null>>;
    dm_permission?: boolean;
    default_member_permissions?: string;
    nsfw?: boolean;
};
type ChatInputCommandData = BaseCommandData & {
    type?: CommandType.ChatInput;
    description: string;
    description_localizations?: Partial<Record<LocaleString, string | null>>;
    options?: Array<APIApplicationCommandOption>;
};
type UserOrMessageCommandData = BaseCommandData & {
    type: CommandType.User | CommandType.Message;
};
type CommandData = ChatInputCommandData | UserOrMessageCommandData;
type CommandObject = Omit<CommandFileObject, 'run'>;

declare class CommandKit {
    #private;
    constructor({ ...options }: CommandKitOptions);
    /** @returns An array of objects of all the commands that CommandKit is handling. */
    get commands(): CommandObject[];
    /** @returns The path to the commands folder which was set when instantiating CommandKit. */
    get commandsPath(): string | undefined;
    /** @returns The path to the events folder which was set when instantiating CommandKit. */
    get eventsPath(): string | undefined;
    /** @returns The path to the validations folder which was set when instantiating CommandKit. */
    get validationsPath(): string | undefined;
    /** @returns An array of all the developer user IDs which was set when instantiating CommandKit. */
    get devUserIds(): string[];
    /** @returns An array of all the developer guild IDs which was set when instantiating CommandKit. */
    get devGuildIds(): string[];
    /** @returns An array of all the developer role IDs which was set when instantiating CommandKit. */
    get devRoleIds(): string[];
}

export { CommandData, CommandKit, CommandObject, CommandOptions, CommandProps, CommandType, ContextMenuCommandProps, SlashCommandProps, ValidationFunctionProps };
