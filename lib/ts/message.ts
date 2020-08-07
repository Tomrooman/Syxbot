'use strict';

import { Message as DMessage, Message } from 'discord.js';

const removeInfos: number[] = [];

export const instantiate = (message: DMessage, words: string[], all: string = ''): void | Promise<DMessage> => {
    if (all !== '') {
        return remove(message, 0, true);
    }
    if (words[1] && Number.isFinite(parseInt(words[1])) && parseInt(words[1]) > 0) {
        return remove(message, parseInt(words[1]));
    }
    return message.channel.send('❌ Vous devez écrire le nombre de messages que vous voulez supprimer.');
};

const remove = (message: DMessage, howMany: number, all: boolean = false): void | Promise<Message> => {
    if (message && message.guild) {
        if (howMany > 99) {
            return message.channel.send('❌ Écrivez un chiffre inférieur ou égal à 99');
        }
        if (removeInfos[Number(message.guild.id)]) {
            return message.channel.send('❌ Vous devez attendre la confirmation de suppression des messages');
        }
        removeInfos[Number(message.guild.id)] = 0;
        let limit = {};
        if (!all) {
            limit = {
                limit: howMany + 1
            };
        }
        removeMessages(message, limit);
    }
    return;
};

const removeMessages = (message: DMessage, limit: { limit?: number }): void => {
    if (message && message.guild) {
        message.channel.messages.fetch(limit)
            .then(messages => {
                message.channel.bulkDelete(messages)
                    .then(() => {
                        message.channel.send('✅ **' + (messages.size - 1) + '** ' + (messages.size - 1 > 1 ? 'messages supprimés' : 'message supprimé'));
                        delete removeInfos[Number(message.guild?.id)];
                    })
                    .catch(() => messages.map(oneMessage => {
                        oneMessage.delete({ timeout: 4000 })
                            .then(() => {
                                removeInfos[Number(message.guild?.id)]++;
                                if (removeInfos[Number(message.guild?.id)] === messages.size) {
                                    message.channel.send('✅ **' + (messages.size - 1) + '** ' + (messages.size - 1 > 1 ? 'messages supprimés' : 'message supprimé'));
                                    delete removeInfos[Number(message.guild?.id)];
                                }
                            })
                            .catch((e) => {
                                console.log('Erreur de suppression du message : ', e.message);
                            });
                    }));
            })
            .catch(console.error);
    }
};
