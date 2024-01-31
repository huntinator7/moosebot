
import SpotifyWebApi from "spotify-web-api-node";
import Discord from "discord.js";
import { MooseConfig } from "../../config";

async function BinaryBot(
    dc: Discord.Client,
    sp: SpotifyWebApi,
    config: MooseConfig
) {
    dc.on('message', (msg) => {
        if (isAscii(msg.content)) {
            const parsedString = readAsciiString(msg.content)
            msg.channel.send(`Ascii translator says: ${parsedString}`)
        }
    })
}

export default BinaryBot;

function isAscii(msg: string) {
    const charsInMessage = getCharsInMessage(msg)
    const isAsciiFormat = msg.search(/^(\S{8} ?)+$/u) === 0
    if (charsInMessage.length <= 3 && isAsciiFormat) return true
    return false
}

function readAsciiString(msg: string) {
    const charsInMessage = getCharsInMessage(msg)
    const [charA, charB] = charsInMessage
    const rep01 = msg.replaceAll(charA, '0').replaceAll(charB, '1')

    const parsed01 = rep01.split(' ').map(c => parseInt(c, 2)).map(c => String.fromCharCode(c)).join('')

    return parsed01
}

function getCharsInMessage(msg: string) {
    return Object.keys(msg.split('').reduce((a, c) => ({ ...a, [c]: true }), {} as Record<string, boolean>))
}