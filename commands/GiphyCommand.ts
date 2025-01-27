import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, ISlashCommandPreview, ISlashCommandPreviewItem, SlashCommandContext, SlashCommandPreviewItemType } from '@rocket.chat/apps-engine/definition/slashcommands';
import { Giphy } from '../Giphy';
import { GiphyResult } from '../helpers/GiphyResult';

export class GiphyCommand implements ISlashCommand {
    public command = 'giphy';
    public i18nParamsExample = 'GIPHY_Search_Term';
    public i18nDescription = 'GIPHY_Command_Description';
    public providesPreview = true;
    public poweredByGiphyLabel = "Powered By GIPHY"

    constructor(private readonly app: Giphy) { }

    public executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        // if there are no args or args[0] === 'random'
        // then get a single one

        // otherwise, fetch the results and get a random one
        // as the max amount returned will be ten
        throw new Error('Method not implemented.');
    }

    public async previewer(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<ISlashCommandPreview> {
        let gifs: Array<GiphyResult>;
        let items: Array<ISlashCommandPreviewItem>;

        try {
            gifs = await this.app.getGifGetter().search(this.app.getLogger(), http, context.getArguments().join(' '), read);
            items = gifs.map((gif) => gif.toPreviewItem());
        } catch (e) {
            this.app.getLogger().error('Failed on something:', e);
            return {
                i18nTitle: 'ERROR',
                items: new Array(),
            };
        }

        const attribution: ISlashCommandPreviewItem = {
            id: this.poweredByGiphyLabel,
            type: SlashCommandPreviewItemType.IMAGE,
            value: "https://raw.githubusercontent.com/wholteza/Rocket.Chat.App-Giphy/master/images/inline-attribution.png"
        }

        return {
            i18nTitle: 'GIPHY_Search_Term',
            items: [...items.slice(0,7), attribution],
        };
    }

    public async executePreviewItem(item: ISlashCommandPreviewItem, context: SlashCommandContext, read: IRead,
        modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const builder = modify.getCreator().startMessage().setSender(context.getSender()).setRoom(context.getRoom());

        const tid = context.getThreadId();

        if (tid) {
            builder.setThreadId(tid);
        }

        try {
            let gif: {title: string, originalUrl: string} | null = null
            if (item.id === this.poweredByGiphyLabel)
                gif = {title: this.poweredByGiphyLabel, originalUrl:"https://raw.githubusercontent.com/wholteza/Rocket.Chat.App-Giphy/master/images/message-attribution.gif" }
            else
                gif = await this.app.getGifGetter().getOne(this.app.getLogger(), http, item.id, read);
            const showTitle = await read.getEnvironmentReader().getSettings().getValueById('giphy_show_title');
            const trigger = context.getArguments().join(' ').trim();
            builder.addAttachment({
                title: {
                    value: ((showTitle) ? `${this.poweredByGiphyLabel}: ${gif.title.trim()}` : this.poweredByGiphyLabel),
                },
                author: {
                    icon: 'https://raw.githubusercontent.com/wreiske/Rocket.Chat.App-Giphy/master/images/Giphy-256.png',
                    name: `/giphy ${trigger.trim()}`,
                    link: `https://giphy.com/search/${trigger.trim()}`,
                },
                imageUrl: gif.originalUrl
            });
            await modify.getCreator().finish(builder);
        } catch (e) {
            this.app.getLogger().error('Failed getting a gif', e);
            builder.setText('An error occurred when trying to send the gif :disappointed_relieved:');

            modify.getNotifier().notifyUser(context.getSender(), builder.getMessage());
        }
    }
}
