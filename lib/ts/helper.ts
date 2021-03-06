'use strict';

import commands from '../json/commands.json';
import { VoiceChannel, Message, Guild, User, TextChannel, VoiceConnection, PartialUser } from 'discord.js';
import { commandType } from 'lib/@types/helper';

export const instantiate = (message: Message, words: string[]): void | Promise<Message> => {
    if (words[1]) {
        return getCommandInfos(message, words[1].toLowerCase());
    }
    return showCommandlist(message);
};

export const take_user_voiceChannel = (message: Message): VoiceChannel => {
    let voiceChannel = {};
    if (message.guild) {
        message.guild.channels.cache.map(channel => {
            if (channel.type === 'voice') {
                if (channel.members) {
                    channel.members.map(member => {
                        if (member.user.id === message.author.id) {
                            voiceChannel = channel;
                        }
                    });
                }
            }
        });
    }
    return voiceChannel as VoiceChannel;
};

export const take_user_voiceChannel_by_reaction = (message: Message, author: User | boolean | PartialUser): VoiceChannel => {
    let voiceChannel = {};
    (message.guild as Guild).channels.cache.map(channel => {
        if (channel.type === 'voice') {
            if (channel.members) {
                channel.members.map(member => {
                    if (member.user.id === (author as User).id) {
                        voiceChannel = channel;
                    }
                });
            }
        }
    });
    return voiceChannel as VoiceChannel;
};

// static getBot(message, choice) {
//     let botMember = false;
//     message.guild.channels.map(channel => {
//         if (channel.type === 'voice') {
//             if (channel.members) {
//                 channel.members.map(member => {
//                     if (member.user.bot && member.user.id === config.clientId) {
//                         if (choice === 'bot') {
//                             botMember = member;
//                         }
//                         else if (choice === 'channel') {
//                             botMember = channel;
//                         }
//                     }
//                 });
//             }
//         }
//     });
//     return botMember;
// }

export const getFirstAuthorizedChannel = (guild: Guild): TextChannel | undefined => {
    if (guild.channels.cache.has(guild.id)) return guild.channels.cache.get(guild.id) as TextChannel;

    // Check for a "general" channel
    const generalChannel = guild.channels.cache.find(channel => channel.name === 'general');
    if (generalChannel) return generalChannel as TextChannel;

    // If there is no "general" channel, get the first authorized text channel
    // "guild.client.user" is the bot object
    return guild.channels.cache
        .filter(c => c.type === 'text')
        .first() as TextChannel;
};

export const verifyBotLocation = (message: Message, connectedGuild: VoiceConnection | string | undefined, userChannel: VoiceChannel, sendMessage = true): boolean => {
    if (connectedGuild) {
        if (connectedGuild === userChannel.id) {
            return true;
        }
        if (sendMessage) {
            message.channel.send('❌ Vous n\'êtes pas dans le même salon que le bot !');
        }
        return false;
    }
    if (sendMessage) {
        message.channel.send('❌ Je ne suis pas connecté dans un salon !');
    }
    return false;
};

const showCommandlist = (message: Message): void => {
    let embedDescription = '';
    commands.map(item => {
        embedDescription += item.command + item.exemple;
    });
    message.author.send({
        'embed': {
            'color': 3493780,
            'description': embedDescription,
            'author': {
                'name': 'Liste des commandes'
            },
            'footer': {
                'text': 'Détails d\'une commande: `!!help +COMMANDE`'
            }
        }
    });
};

const getCommandInfos = (message: Message, command: string): void | Promise<Message> => {
    const commandObj: commandType[] = commands.filter(c => c.name.split(' | ')[0] === command || c.name.split(' | ')[1] === command || c.name.split(' | ')[2] === command);
    if (!commandObj && !commandObj[0]) {
        return message.channel.send('> La commande `' + command + '` n\'existe pas !');
    }
    let joinedInfos = '';
    commandObj[0].infos.map(info => {
        joinedInfos += info;
    });
    message.author.send({
        'embed': {
            'color': 3493780,
            'description': joinedInfos,
            'author': {
                'name': commandObj[0].name
            }
        }
    });

};
