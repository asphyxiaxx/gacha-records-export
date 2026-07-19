class Message {}

class SentinelMessage extends Message {
  constructor(message) {
    super();
    this.message = message;
  }
}

export { Message, SentinelMessage };
