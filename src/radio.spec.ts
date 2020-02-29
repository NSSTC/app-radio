/**
 * A channel is a path-like construct, which denotes the exact (sub-)channel to which a message is sent
 */
export type TChannel = string;
export type TChannelNode = {
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
