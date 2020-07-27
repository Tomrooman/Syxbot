'use strict';

import axios from 'axios';
import dateFormat from 'dateformat';

type dofusInfosType = {
    notif: string
}

const dofusInfos: dofusInfosType[] = [];

const controller = (message, words) => {
    if (words[1]) {
        if (words[1] === 'notif') {
            return notif(message, words);
        }
    }
    return message.channel.send('❌ Commande incomplète !');
};

const notif = async (message, words) => {
    if (!words[2] || words[2] === 'status') {
        const status = dofusInfos[message.author.id] ? dofusInfos[message.author.id].notif.toUpperCase() : 'OFF';
        return message.channel.send('> ** Dragodindes ** \n > `Notifications` : `' + status + '`');
    }
    if (words[2].toLowerCase() === 'on' || words[2].toLowerCase() === 'off') {
        const status = words[2].toLowerCase() === 'on' ? 'on' : 'off';
        if ((!dofusInfos[message.author.id] && status === 'on') || (dofusInfos[message.author.id] && dofusInfos[message.author.id].notif !== status)) {
            const { data } = await axios.post('/api/dofus/dragodindes/notif', {
                userId: message.author.id,
                status: status
            });
            dofusInfos[message.author.id] = {
                notif: data.notif ? 'on' : 'off'
            };
            return message.channel.send('> ** Dragodindes ** \n > `Notifications` : `' + status.toUpperCase() + '`');
        }
        return message.channel.send('❌ Vous devez écrire une valeur différente de celle actuelle');
    }
};

const getInfos = userId => {
    return dofusInfos[userId];
};

const update = async () => {
    console.log('Updating dragodindes settings ... | ' + dateFormat(Date.now(), 'HH:MM:ss'));
    const { data } = await axios.post('/api/dofus/dragodindes/notif/all');
    if (data) {
        data.map(setting => {
            dofusInfos[setting.userId] = {
                notif: setting.notif ? 'on' : 'off'
            }
        });
        console.log(' - Dragodindes settings updated !');
        return true;
    }
    setTimeout(() => {
        update()
    }, 1000);
}

export {
    controller,
    notif,
    getInfos,
    update
}