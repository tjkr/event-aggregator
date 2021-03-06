import * as LogManager from 'aurelia-logging';

const logger = LogManager.getLogger('event-aggregator');

class Handler {
  constructor(messageType, callback) {
    this.messageType = messageType;
    this.callback = callback;
  }

  handle(message) {
    if (message instanceof this.messageType) {
      this.callback.call(null, message);
    }
  }
}

interface Subscription {
  dispose(): void;
}

export class EventAggregator {
  constructor() {
    this.eventLookup = {};
    this.messageHandlers = [];
  }

  publish(event: string | any, data?: any): void {
    let subscribers;
    let i;

    if (typeof event === 'string') {
      subscribers = this.eventLookup[event];
      if (subscribers) {
        subscribers = subscribers.slice();
        i = subscribers.length;

        try {
          while (i--) {
            subscribers[i](data, event);
          }
        } catch (e) {
          logger.error(e);
        }
      }
    } else {
      subscribers = this.messageHandlers.slice();
      i = subscribers.length;

      try {
        while (i--) {
          subscribers[i].handle(event);
        }
      } catch (e) {
        logger.error(e);
      }
    }
  }

  subscribe(event: string | Function, callback: Function): Subscription {
    let handler;
    let subscribers;

    if (typeof event === 'string') {
      handler = callback;
      subscribers = this.eventLookup[event] || (this.eventLookup[event] = []);
    } else {
      handler = new Handler(event, callback);
      subscribers = this.messageHandlers;
    }

    subscribers.push(handler);

    return {
      dispose() {
        let idx = subscribers.indexOf(handler);
        if (idx !== -1) {
          subscribers.splice(idx, 1);
        }
      }
    };
  }

  subscribeOnce(event: string | Function, callback: Function): Subscription {
    let sub = this.subscribe(event, (a, b) => {
      sub.dispose();
      return callback(a, b);
    });

    return sub;
  }
}

export function includeEventsIn(obj: Object): EventAggregator {
  let ea = new EventAggregator();

  obj.subscribeOnce = function(event, callback) {
    return ea.subscribeOnce(event, callback);
  };

  obj.subscribe = function(event, callback) {
    return ea.subscribe(event, callback);
  };

  obj.publish = function(event, data) {
    ea.publish(event, data);
  };

  return ea;
}

export function configure(config: Object): void {
  config.instance(EventAggregator, includeEventsIn(config.aurelia));
}
