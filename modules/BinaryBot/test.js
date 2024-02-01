function convertToAscii(message, char1, char2) {
    const asciiMessage = message.split('')
    .map(c => c.charCodeAt(0))
    .map(c => Number(c).toString(2))
    .map(c => c.replaceAll('0', char1)
    .replaceAll('1', char2))
    .join(' ')

    return asciiMessage
}