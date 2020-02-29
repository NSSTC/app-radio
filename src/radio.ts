import {IAppRadio, TChannel, TChannelNode, TMessage, TListener} from './radio.spec';

const _spreadOnSubtree = function(node: TChannelNode, onNode: (node: TChannelNode) => void = () => {}) {
    onNode(node);
    for (let child of node.children.values()) {
        _spreadOnSubtree(child, onNode);
    }
};

/**
 * Returns the channel node at the bottom of a channel path
 * Creates all branches necessary
 *
 * @param rootNode
 * @param channelPath
 * @private
 */
const _traverseChannelTree = function(rootNode: TChannelNode, channelPath: TChannel): TChannelNode {
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
    let currentNode = rootNode;
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
};

export class AppRadio implements IAppRadio {
    listenersRoot: TChannelNode;

    constructor() {
        this.listenersRoot = {
            children: new Map(),
            currentInfo: null,
            listeners: [],
        };
    }

    broadcast(message: TMessage | string) {
        // if there's no explicit message, just send it as generic event to everyone, duh
        if (typeof message === 'string') {
            message = {
                channel: '/',
                payload: message,
            };
        }

        _traverseChannelTree(this.listenersRoot, message.channel.toLowerCase())
            .listeners
            .forEach(l => setTimeout(() => l((<TMessage>message).payload), 0));
    }

    isStreaming(channel: TChannel): boolean {
        return _traverseChannelTree(this.listenersRoot, channel).currentInfo !== null;
    }

    listenOnce(channelPath: TChannel, handler: TListener) {
        channelPath = channelPath.toLowerCase();
        const listener = (info: TMessage) => {
            handler(info);
            this.unsubscribe(channelPath, listener);
        };

        this.subscribe(channelPath, listener);
    }

    silence(channelPath: TChannel = '/') {
        channelPath = channelPath.toLowerCase();
        _spreadOnSubtree(_traverseChannelTree(this.listenersRoot, channelPath), node => { node.currentInfo = null });
    }

    stream(message: TMessage|string) {
        // if there's no explicit message, just stream it as generic message for everyone, duh
        if (typeof message === 'string') {
            message = {
                channel: '/',
                payload: message,
            };
        }

        const node = _traverseChannelTree(this.listenersRoot, message.channel.toLowerCase());

        node.currentInfo = <TMessage>message;
        node.listeners.forEach(l => setTimeout(() => l((<TMessage>message).payload), 0));
    }

    subscribe(channelPath: TChannel, handler: TListener) {
        channelPath = channelPath.toLowerCase();
        const node = _traverseChannelTree(this.listenersRoot, channelPath);
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

    unsubscribe(channelPath: TChannel, handler: TListener) {
        channelPath = channelPath.toLowerCase();
        const listeners = _traverseChannelTree(this.listenersRoot, channelPath).listeners;
        const listenerIndex = listeners.indexOf(handler);

        if (listenerIndex >= 0) {
            listeners.splice(listenerIndex, 1);
        }
    }
}
