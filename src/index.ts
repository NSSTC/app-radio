/**
 * A channel is a path-like construct, which denotes the exact (sub-)channel to which a message is sent
 */
export type TChannel = string;
type TChannelNode = {
    children: Map<string, TChannelNode>
    currentInfo: TMessage|null
    listeners: TListener[]
};
export type TListener = (payload: any) => void;
export type TMessage = {
    channel: TChannel
    payload?: any
};

export interface IAppRadio {
    /**
     * Broadcast info to all listeners in a channel once
     */
    broadcast(message: TMessage|string): void;

    /**
     * Check if a channel is streaming at the moment
     *
     * @param channel
     */
    isStreaming(channel: TChannel): boolean;

    /**
     * Only get news one time, once they are available. Instant, if news are already available
     * The handler is called asynchronously, always
     */
    listenOnce(channel: TChannel, handler: TListener): void;

    /**
     * Stop broadcasting certain events on a certain channel and all of its sub-channels
     * By default, silences everything everywhere
     */
    silence(channelPath: TChannel): void;

    /**
     * Broadcast info to all listeners in a channel and keep broadcasting for future subscribers
     */
    stream(message: TMessage|string): void;

    /**
     * Subscribe to Radio
     * The handler is called asynchronously, always
     */
    subscribe(channelPath: TChannel, handler: TListener): void;

    /**
     * Remove handler from listeners
     */
    unsubscribe(channelPath: TChannel, handler: TListener): void;
}

const listenersRoot: TChannelNode = {
    children: new Map(),
    currentInfo: null,
    listeners: [],
};
const AppRadio: IAppRadio = class AppRadio {
    private static _spreadOnSubtree(node: TChannelNode, onNode: (node: TChannelNode) => void = () => {}) {
        onNode(node);
        for (let child of node.children.values()) {
            AppRadio._spreadOnSubtree(child, onNode);
        }
    }

    /**
     * Returns the channel node at the bottom of a channel path
     * Creates all branches necessary
     *
     * @param channelPath
     * @private
     */
    private static _traverseChannelTree(channelPath: TChannel) : TChannelNode {
        channelPath = channelPath.toLowerCase();

        // split the path into tokens in order to traverse the channel tree
        const channels = channelPath.split('/');

        // if the channel-path begins with a slash, the tokens will have an empty string at position one
        // we need to remove it to process the rest of the string below
        if (channelPath[0] === '/') {
            channels.shift();
        }

        // find the node at the end of the channel path
        let channel = channels.shift();
        let currentNode = listenersRoot;
        for (;;) {
            if (channel === '' || typeof channel === 'undefined') break;
            if (!currentNode.children.has(channel)) {
                currentNode.children.set(channel, {
                    children: new Map(),
                    listeners: [],
                    currentInfo: null,
                });
            }

            currentNode = <TChannelNode>currentNode.children.get(channel);
            channel = channels.shift();
        }

        return currentNode;
    }

    static broadcast(message: TMessage|string) {
        // if there's no explicit message, just send it as generic event to everyone, duh
        if (typeof message === 'string') {
            message = {
                channel: '/',
                payload: message,
            };
        }

        AppRadio
            ._traverseChannelTree(message.channel.toLowerCase())
            .listeners
            .forEach(l => setTimeout(() => l((<TMessage>message).payload), 0))
        ;
    }

    static isStreaming(channel: TChannel): boolean {
        return AppRadio._traverseChannelTree(channel).currentInfo !== null;
    }

    static listenOnce(channelPath: TChannel, handler: TListener) {
        channelPath = channelPath.toLowerCase();
        const listener = (info: TMessage) => {
            handler(info);
            AppRadio.unsubscribe(channelPath, listener);
        };

        AppRadio.subscribe(channelPath, listener);
    }

    static silence(channelPath: TChannel = '/') {
        channelPath = channelPath.toLowerCase();
        AppRadio._spreadOnSubtree(
            AppRadio._traverseChannelTree(channelPath),
            node => { node.currentInfo = null }
        );
    }

    static stream(message: TMessage|string) {
        // if there's no explicit message, just stream it as generic message for everyone, duh
        if (typeof message === 'string') {
            message = {
                channel: '/',
                payload: message,
            };
        }

        const node = AppRadio._traverseChannelTree(message.channel.toLowerCase());

        node.currentInfo = <TMessage>message;
        node.listeners.forEach(l => setTimeout(() => l((<TMessage>message).payload), 0));
    }

    static subscribe(channelPath: TChannel, handler: TListener) {
        channelPath = channelPath.toLowerCase();
        const node = AppRadio._traverseChannelTree(channelPath);
        const listeners = node.listeners;

        if (!listeners.includes(handler)) {
            listeners.push(handler);
        }

        setTimeout(() => {
            if (node.currentInfo) {
                handler(node.currentInfo.payload);
            }
        });
    }

    static unsubscribe(channelPath: TChannel, handler: TListener) {
        channelPath = channelPath.toLowerCase();
        const listeners = AppRadio._traverseChannelTree(channelPath).listeners;
        const listenerIndex = listeners.indexOf(handler);

        if (listenerIndex >= 0) {
            listeners.splice(listenerIndex, 1);
        }
    }
};

export AppRadio;
export default AppRadio;
