import type { Message } from './types';

/** Send a message to the background service worker and get a typed response */
export function sendMessage<T extends Message>(message: T): Promise<Message> {
  return chrome.runtime.sendMessage(message);
}

/** Listen for messages from content scripts or popup */
export function onMessage(
  handler: (message: Message, sender: chrome.runtime.MessageSender) => Promise<Message | void> | void
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = handler(message as Message, sender);
    if (result instanceof Promise) {
      result.then(sendResponse);
      return true; // keep channel open for async response
    }
  });
}
