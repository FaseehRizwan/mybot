// utils/replyHelper.js

function safeReply(sock, jid, content) {
    let message;
    if (typeof content === 'string') {
        message = { text: content };
    } else if (typeof content === 'object' && content !== null && 'text' in content) {
        message = content;
    } else {
        message = { text: '⚠️ An unexpected error occurred while replying.' };
    }

    return sock.sendMessage(jid, message);
}

module.exports = { safeReply };
