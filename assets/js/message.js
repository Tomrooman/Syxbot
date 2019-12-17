class Message {

    constructor(message, words, all = false) {
        if (all) {
            this.remove(message, 'all')
        }
        else if (words[1] && Number.isFinite(parseInt(words[1])) && parseInt(words[1]) > 0) {
            this.remove(message, parseInt(words[1]))
        }
        else {
            message.channel.send('> Vous devez écrire le nombre de messages que vous voulez supprimé.')
        }
    }

    remove(message, howMany) {
        if (howMany > 99) {
            message.channel.send('> Écrivez un chiffre inférieur ou égal à 99')
        }
        else {
            let limit = {}
            if (howMany !== 'all') {
                limit = {
                    limit: parseInt(howMany) + 1
                }
            }
            message.channel.messages.fetch(limit)
                .then(messages => {
                    message.channel.bulkDelete(messages)
                        .catch(() => messages.map(oneMessage => {
                            oneMessage.delete()
                                .catch(() => {
                                    console.log('Erreur de suppression du message')
                                })
                        }))
                })
                .catch(console.error);
        }
    }

}

module.exports = Message