const ytdl = require('ytdl-core')
const ytpl = require('ytpl')
const ytsr = require('ytsr')
const Helper = require('./helper.js')
const _ = require('lodash')
const config = require('./../../config.json')
const Discord = require('discord.js')

const connectionsArray = []
const streamsArray = []
const playlistArray = []
const playlistInfos = []
const connectedGuild = []
const radioPlayed = []
const cancelArray = []
const loopArray = []
const waitArray = []
const nextSetLoop = []
const tryToNext = []
const searchVideo = []
const searchPlaylist = []
const musicTimes = []

class Player {

    constructor(message, command, words) {
        if (message) {
            if (command === 'next') {
                this.next(message)
            }
            else if (command === 'search') {
                if (words[1]) {
                    this.selectSongOrPlaylistInSearchList(message, words)
                }
                else {
                    this.getSongInSearchList(message)
                }
            }
            else if (command === 'go') {
                this.go(message, words)
            }
            else if (words[1] === 'list') {
                this.showQueuedSongs(message)
            }
            else if (words[1] === 'go') {
                delete words[1]
                words = _.compact(words)
                this.go(message, words)
            }
            else if (words[1] === 'r' || words[1] === 'remove') {
                this.removeSelectedSongsMaster(message, words)
            }
            else if (Number.isFinite(parseInt(words[1]))) {
                this.getSongInPlaylist(message, parseInt(words[1]))
            }
            else {
                this.playSongs(message, command, words)
            }
        }
    }

    static removeArray(message, choice) {
        if (choice === 'loop') {
            delete loopArray[message.guild.id]
        }
        else if (choice === 'trytonext') {
            delete tryToNext[message.guild.id]
        }
        else if (choice === 'playlistArray') {
            delete playlistArray[message.guild.id]
        }
        else if (choice === 'playlistInfos') {
            delete playlistInfos[message.guild.id]
        }
    }

    static getArray(message, choice) {
        if (choice === 'connections') {
            return connectionsArray[message.guild.id]
        }
        else if (choice === 'connected') {
            return connectedGuild[message.guild.id]
        }
    }

    static setArray(message, choice, value) {
        if (choice === 'radio') {
            radioPlayed[message.guild.id] = value
        }
        else if (choice === 'connections') {
            connectionsArray[message.guild.id] = value
        }
        else if (choice === 'connected') {
            connectedGuild[message.guild.id] = value
        }
        else if (choice === 'streams') {
            streamsArray[message.guild.id] = value
        }
    }

    static streamDestroy(message) {
        streamsArray[message.guild.id].destroy()
    }

    playSongs(message, command, words, byReaction = [false, false]) {
        let voiceChannel = Helper.take_user_voiceChannel(message)
        if (byReaction[0]) {
            voiceChannel = Helper.take_user_voiceChannel_by_reaction(message, byReaction[1])
        }
        if (voiceChannel) {
            if (!connectedGuild[message.guild.id]) {
                this.playSongsAndConnectOrNotBot(message, command, words, true, byReaction)
            }
            else if (connectedGuild[message.guild.id] === voiceChannel.id) {
                this.playSongsAndConnectOrNotBot(message, command, words, false, byReaction)
            }
            else {
                message.channel.send('> Vous n\'êtes pas dans le même canal que le bot !')
            }
        }
        else {
            message.channel.send('> Vous devez être connecté dans un salon !');
        }
    }

    playSongsAndConnectOrNotBot(message, command, words, playSongParams = true, byReaction) {
        if (words[1] && words[1].includes('youtu') && (words[1].includes('http://') || words[1].includes('https://'))) {
            if (command === 'playlist' || command === 'pl') {
                if (ytpl.validateURL(words[1])) {
                    this.getPlaylist(message, words, playSongParams, byReaction)
                }
                else {
                    message.channel.send('> Vous devez renseigner une URL de playlist valide !')
                }
            }
            else if (command === 'play' || command === 'p') {
                if (ytdl.validateURL(words[1])) {
                    this.getVideo(message, words, playSongParams, byReaction)
                }
                else {
                    message.channel.send('> Ce n\'est pas une URL de vidéo valide !')
                }
            }
        }
        else if (words[1]) {
            delete words[0];
            const title = words.join(' ')
            if (command === 'playlist' || command === 'pl') {
                delete cancelArray[message.guild.id]
                this.youtubeResearch(message, title, 'playlist')
            }
            else if (command === 'play' || command === 'p') {
                delete cancelArray[message.guild.id]
                this.youtubeResearch(message, title, 'video')
            }
        }
        else {
            message.channel.send('> Vous n\'avez pas écrit de recherche !')
        }
    }

    youtubeResearch(message, title, type, nextPage = false, byReaction = [false, false]) {
        if (!searchVideo[message.guild.id]) {
            searchVideo[message.guild.id] = []
        }
        if (!searchPlaylist[message.guild.id]) {
            searchPlaylist[message.guild.id] = []
        }
        if (searchVideo[message.guild.id]['array']) {
            searchVideo[message.guild.id]['old'] = searchVideo[message.guild.id]['array']
        }
        if (searchPlaylist[message.guild.id]['array']) {
            searchPlaylist[message.guild.id]['old'] = searchPlaylist[message.guild.id]['array']
        }
        const options = this.setArrayWithChoice(message, title, type, nextPage, byReaction)
        this.clearSearchArrays(message, type, byReaction)
        const oldArrayResult = this.verifyOldResearch(message, type, byReaction)
        if (!oldArrayResult) {
            this.getYoutubeResearch(message, title, type, options, byReaction)
        }
    }

    static cancel(message) {
        cancelArray[message.guild.id] = true
    }

    sendCurrentResultAndRecall(message, title, type, buildedArray, searchresults, byReaction) {
        message.channel.send('> ' + buildedArray.length + '/5 trouvé')
        setTimeout(() => {
            if (!cancelArray[message.guild.id]) {
                this.youtubeResearch(message, title, type, searchresults.nextpageRef, byReaction)
            }
            else {
                delete cancelArray[message.guild.id]
                message.channel.send('> Recherche arrêtée !')
            }
        }, 1500)
    }

    getYoutubeResearch(message, title, type, options, byReaction) {
        ytsr(title, options, (err, searchresults) => {
            if (searchresults) {
                const buildedArray = this.makeSearchArray(message, searchresults.items, type)
                if (buildedArray.length < 5 && searchresults.nextpageRef) {
                    this.sendCurrentResultAndRecall(message, title, type, buildedArray, searchresults, byReaction)
                }
                else if (buildedArray.length === 5 || !searchresults.nextpageRef) {
                    if (type === 'video') {
                        delete searchVideo[message.guild.id]['old']
                    }
                    else if (type === 'playlist') {
                        delete searchPlaylist[message.guild.id]['old']
                    }
                    this.setArrayInfos(message, type, title, searchresults)
                    this.sendSearchResultsAsString(message, type)
                }
            }
            else {
                if (type === 'video') {
                    searchVideo[message.guild.id]['array'] = searchVideo[message.guild.id]['old']
                }
                else if (type === 'playlist') {
                    searchPlaylist[message.guild.id]['array'] = searchPlaylist[message.guild.id]['old']
                }
                message.channel.send('> Aucun résultat obtenu')
                this.sendSearchResultsAsString(message, type)
            }
        })
    }

    verifyOldResearch(message, type, byReaction) {
        if (byReaction[0]) {
            if (type === 'video' && searchVideo[message.guild.id]['last'].length) {
                delete searchVideo[message.guild.id]['array']
                searchVideo[message.guild.id]['array'] = []
                const lastArray = this.makeSearchArray(message, searchVideo[message.guild.id]['last'], 'video', true)
                if (lastArray && lastArray.length === 5) {
                    this.setArrayInfos(message, type, false, { nextPageRef: false })
                    this.sendSearchResultsAsString(message, type)
                    return true
                }
                return false
            }
            else if (type === 'playlist' && searchPlaylist[message.guild.id]['last'].length) {
                delete searchPlaylist[message.guild.id]['array']
                searchPlaylist[message.guild.id]['array'] = []
                const lastPlaylistArray = this.makeSearchArray(message, searchPlaylist[message.guild.id]['last'], 'playlist', true)
                if (lastPlaylistArray && lastPlaylistArray.length === 5) {
                    this.setArrayInfos(message, type, false, { nextPageRef: false })
                    this.sendSearchResultsAsString(message, type)
                    return true
                }
                return false
            }
        }
        return false
    }

    setArrayInfos(message, type, title, searchresults) {
        if (type === 'video') {
            if (searchresults.nextpageRef) {
                searchVideo[message.guild.id]['array']['nextpage'] = searchresults.nextpageRef
            }
            if (title) {
                searchVideo[message.guild.id]['infos']['title'] = title
                searchVideo[message.guild.id]['infos']['count'] = 2
            }
            else {
                searchVideo[message.guild.id]['infos']['count']++
            }
        }
        else {
            if (searchresults.nextpageRef) {
                searchPlaylist[message.guild.id]['array']['nextpage'] = searchresults.nextpageRef
            }
            if (title) {
                searchPlaylist[message.guild.id]['infos']['title'] = title
                searchPlaylist[message.guild.id]['infos']['count'] = 2
            }
            else {
                searchPlaylist[message.guild.id]['infos']['count']++
            }
        }
    }

    clearSearchArrays(message, type, byReaction) {
        if (!byReaction[0]) {
            if (type === 'video') {
                delete searchVideo[message.guild.id]['infos']
                delete searchVideo[message.guild.id]['last']
                searchVideo[message.guild.id]['infos'] = []
                searchVideo[message.guild.id]['last'] = []
            }
            else {
                delete searchPlaylist[message.guild.id]['infos']
                delete searchPlaylist[message.guild.id]['last']
                searchPlaylist[message.guild.id]['infos'] = []
                searchPlaylist[message.guild.id]['last'] = []
            }
        }
    }

    setArrayWithChoice(message, title, type, nextPage, byReaction) {
        let nextPageVar = nextPage
        const options = {
            limit: 20
        }
        if (type === 'video' && !nextPage) {
            if (searchVideo[message.guild.id]['array']) {
                if (byReaction[0]) {
                    nextPageVar = searchVideo[message.guild.id]['array']['nextpage']
                    message.channel.send('> Recherche de ' + type + ' : ' + '`' + searchVideo[message.guild.id]['infos']['title'].trim() + '` #' + searchVideo[message.guild.id]['infos']['count'])
                }
                delete searchVideo[message.guild.id]['array']
            }
            searchVideo[message.guild.id]['array'] = []
        }
        else if (type === 'playlist' && !nextPage) {
            if (searchPlaylist[message.guild.id]['array']) {
                if (byReaction[0]) {
                    nextPageVar = searchPlaylist[message.guild.id]['array']['nextpage']
                    message.channel.send('> Recherche de ' + type + ' : ' + '`' + searchPlaylist[message.guild.id]['infos']['title'].trim() + '` #' + searchPlaylist[message.guild.id]['infos']['count'])
                }
                delete searchPlaylist[message.guild.id]['array']
            }
            searchPlaylist[message.guild.id]['array'] = []
        }
        if (!byReaction[0] && !nextPage) {
            const goodTitle = title ? title : type === 'video' ? searchVideo[message.guild.id]['infos']['title'] : searchPlaylist[message.guild.id]['infos']['title']
            message.channel.send('> Recherche de ' + type + ' : ' + '`' + goodTitle.trim() + '`')
        }
        if (nextPageVar) {
            options.nextpageRef = nextPageVar
        }
        return options
    }

    makeSearchArray(message, searchresults, type, verify = false) {
        const filteredResult = searchresults.filter(i => i.type === type && i.title !== '[Deleted video]' && i.title !== '[Private video]')
        if (verify) {
            if (type === 'video') {
                delete searchVideo[message.guild.id]['last']
                searchVideo[message.guild.id]['last'] = []
            }
            else {
                delete searchPlaylist[message.guild.id]['last']
                searchPlaylist[message.guild.id]['last'] = []
            }
        }
        filteredResult.map(result => {
            const resultObj = {
                url: result.link,
                title: result.title
            }
            if (type === 'video' && searchVideo[message.guild.id]['array'].length < 5) {
                searchVideo[message.guild.id]['array'].push(resultObj)
            }
            else if (type === 'playlist' && searchPlaylist[message.guild.id]['array'].length < 5) {
                resultObj.plLength = result.length
                searchPlaylist[message.guild.id]['array'].push(resultObj)
            }
            else if (type === 'playlist') {
                searchPlaylist[message.guild.id]['last'].push(result)
            }
            else if (type === 'video') {
                searchVideo[message.guild.id]['last'].push(result)
            }
        })
        const array = type == 'video' ? searchVideo[message.guild.id]['array'] : searchPlaylist[message.guild.id]['array']
        return array
    }

    static toggleLoop(message) {
        const userChannel = Helper.take_user_voiceChannel(message)
        if (Helper.verifyBotLocation(message, connectedGuild[message.guild.id], userChannel)) {
            if (playlistArray[message.guild.id] && playlistArray[message.guild.id].length) {
                if (!loopArray[message.guild.id]) {
                    loopArray[message.guild.id] = true
                    message.channel.send('> Mode répétition activé !')
                }
                else {
                    delete loopArray[message.guild.id]
                    message.channel.send('> Mode répétition désactivée !')
                }
            }
            else {
                message.channel.send('> Vous n\'écoutez pas de musique !')
            }
        }
    }

    sendSearchResultsAsString(message, type) {
        const selectedArray = type === 'video' ? searchVideo[message.guild.id]['array'] : searchPlaylist[message.guild.id]['array']
        if (selectedArray && selectedArray.length) {
            let finalString = ''
            let resultChoices = ''
            selectedArray.map((item, index) => {
                if (item.plLength) {
                    resultChoices += '> **' + (index + 1) + '**. ' + item.title + ' (' + item.plLength + ')\n'
                }
                else {
                    resultChoices += '> **' + (index + 1) + '**. ' + item.title + '\n'
                }

            })
            if (type === 'video') {
                finalString = `> **Écrivez ou sélectionnez une musique parmi les ${selectedArray.length} ci-dessous.** \n > **Ex: ${config.prefix}search p 2** \n > \n ${resultChoices}`
            }
            else {
                finalString = `> **Écrivez ou sélectionnez une playlist parmi les ${selectedArray.length} ci-dessous.** \n > **Ex: ${config.prefix}search pl 1** \n > \n ${resultChoices}`
            }
            message.channel.send(finalString)
                .then(newMessage => this.addSearchReactions(newMessage))
        }
        else {
            message.channel.send('> Aucune ' + type + ' dans la liste des recherches')
        }

    }

    addSearchReactions(message) {
        message.react('1️⃣')
            .then(() => message.react('2️⃣'))
            .then(() => message.react('3️⃣'))
            .then(() => message.react('4️⃣'))
            .then(() => message.react('5️⃣'))
            .then(() => message.react('⏩'))
    }

    selectSongOrPlaylistInSearchList(message, words) {
        if (words[1] === 'p' || words[1] === 'play') {
            // If there is something after p|play search for the music
            if (words[2]) {
                Player.selectSongInSearchList(message, parseInt(words[2]))
            }
            // If nothing after p|play send the list
            else {
                this.sendSearchResultsAsString(message, 'video')
            }
        }
        else if (words[1] === 'pl' || words[1] === 'playlist') {
            // If there is something after pl|playlist search for the playlist
            if (words[2]) {
                Player.selectSongInSearchList(message, parseInt(words[2]), 'playlist')
            }
            else {
                this.sendSearchResultsAsString(message, 'playlist')
            }
        }
        else {
            message.channel.send('> Vous devez écrire le type de sélection.```Ex: ' + config.prefix + 'search p```')
        }
    }

    selectSongInSearchList(message, number, type = 'musique', byReaction = [false, false]) {
        let userChannel = Helper.take_user_voiceChannel(message)
        if (byReaction[0]) {
            userChannel = Helper.take_user_voiceChannel_by_reaction(message, byReaction[1])
        }
        if (userChannel) {
            if (Number.isFinite(parseInt(number))) {
                const choiceArray = type === 'musique' ? searchVideo[message.guild.id]['array'] : searchPlaylist[message.guild.id]['array']
                if (choiceArray && choiceArray.length) {
                    if (number >= 1 && number <= choiceArray.length) {
                        const command = type === 'musique' ? 'play' : 'playlist'
                        if (byReaction[0]) {
                            this.playSongs(message, command, ['useless', choiceArray[number - 1].url], byReaction)
                        }
                        else {
                            this.playSongs(message, command, ['useless', choiceArray[number - 1].url])
                        }
                    }
                    else {
                        message.channel.send(`> Choisissez un chiffre compris entre 1 et ${choiceArray.length}`)
                    }
                }
                else {
                    message.channel.send(`> Aucune ${type} enregistrée dans la recherche`)
                }
            }
            else {
                message.channel.send('> Vous devez écrire un chiffre après le mot search !')
            }
        }
        else {
            message.channel.send('> Vous devez être connecté dans un salon !')
        }
    }

    getSongInSearchList(message) {
        const userChannel = Helper.take_user_voiceChannel(message)
        if (userChannel) {
            const musicExist = searchVideo[message.guild.id]['array'] && searchVideo[message.guild.id]['array'].length
            const playlistExist = searchPlaylist[message.guild.id]['array'] && searchPlaylist[message.guild.id]['array'].length
            if (musicExist || playlistExist) {
                this.makeAndSendSearchListArray(message, musicExist, playlistExist)
            }
            else {
                message.channel.send('> Aucune musique enregistrée dans la recherche')
            }
        }
        else {
            message.channel.send('> Vous devez être connecté dans un salon !')
        }
    }

    makeAndSendSearchListArray(message, musicExist, playlistExist) {
        let resultChoices = ''
        if (musicExist && playlistExist) {
            resultChoices += '> **Musiques** \n'
            searchVideo[message.guild.id]['array'].map((song, index) => {
                resultChoices += '> **' + (index + 1) + '**. ' + song.title + '\n'
            })
            resultChoices += '> \n'
            resultChoices += '> **Playlists** \n'
            searchPlaylist[message.guild.id]['array'].map((song, index) => {
                resultChoices += '> **' + (index + 1) + '**. ' + song.title + '(' + song.plLength + ')\n'
            })
            const countChoices = searchPlaylist[message.guild.id]['array'].length + searchVideo[message.guild.id]['array'].length
            message.channel.send(`> **Faites un choix parmi les ${countChoices} ci-dessous.** \n > **Ex: ${config.prefix}search p 2** \n > **Ex: ${config.prefix}search pl 1** \n > \n ${resultChoices}`)
        }
        else if (musicExist && !playlistExist) {
            resultChoices += '> **Musiques** \n'
            searchVideo[message.guild.id]['array'].map((song, index) => {
                resultChoices += '> **' + (index + 1) + '**. ' + song.title + '\n'
            })
            message.channel.send(`> **Écrivez ou sélectionnez une musique parmi les ${searchVideo[message.guild.id]['array'].length} ci-dessous.** \n > **Ex: ${config.prefix}search p 2** \n > \n ${resultChoices}`)
                .then(newMessage => this.addSearchReactions(newMessage))
        }
        else {
            resultChoices += '> **Playlists** \n'
            searchPlaylist[message.guild.id]['array'].map((song, index) => {
                if (song.plLength) {
                    resultChoices += '> **' + (index + 1) + '**. ' + song.title + ' (' + song.plLength + ')\n'
                }
                else {
                    resultChoices += '> **' + (index + 1) + '**. ' + song.title + '\n'
                }
            })
            message.channel.send(`> **Écrivez ou sélectionnez une playlist parmi les ${searchPlaylist[message.guild.id]['array'].length} ci-dessous.** \n > **Ex: ${config.prefix}search pl 1** \n > \n ${resultChoices}`)
                .then(newMessage => this.addSearchReactions(newMessage))
        }
    }

    playSong(message, beginAt = false) {
        if (!beginAt) {
            const embedObj = this.setEmbedObj(playlistInfos[message.guild.id][0].title, playlistInfos[message.guild.id][0].id, playlistInfos[message.guild.id][0].thumbnail, playlistInfos[message.guild.id][0].duration)
            this.sendMusicEmbed(message, embedObj, [false, 1])
        }
        playlistInfos[message.guild.id]['error'] = false
        delete tryToNext[message.guild.id]
        let stream = null
        if (!beginAt) {
            stream = ytdl(playlistArray[message.guild.id][0], { filter: 'audio', liveBuffer: 10000, highWaterMark: 512 })
        }
        else {
            stream = ytdl(playlistArray[message.guild.id][0], { filter: 'audio', liveBuffer: 10000, highWaterMark: 512, beginAt: beginAt })
        }
        streamsArray[message.guild.id] = connectionsArray[message.guild.id].play(stream, { highWaterMark: 512 })
        // CHECK IF SPEAKING --> !streamsArray[message.guild.id].player.voiceConnection.speaking.bitfield
        streamsArray[message.guild.id].setVolume(0.4)
        musicTimes[message.guild.id] = Date.now()
        streamsArray[message.guild.id].on('error', (e) => {
            this.handleError(e)
        })
        streamsArray[message.guild.id].on('finish', () => {
            this.handleFinish(message)
        })
    }

    handleFinish(message) {
        let diffSec = Math.floor((Date.now() - musicTimes[message.guild.id]) / 1000)
        if (diffSec < this.getSeconds(playlistInfos[message.guild.id][0].duration)) {
            console.log('Try to resume song')
            let missingTime = this.getSeconds(playlistInfos[message.guild.id][0].duration) - diffSec
            const beginAt = this.convertSecondsToFormattedDuration(this.getSeconds(playlistInfos[message.guild.id][0].duration) - missingTime)
            this.playSong(message, beginAt)
        }
        else {
            setTimeout(() => {
                this.setArrays(message)
            }, 1000)
        }
    }

    handleError(e) {
        console.log('--------------------------------------')
        console.log('Titre : ', playlistInfos[message.guild.id][0].title)
        playlistInfos[message.guild.id]['error'] = true
        console.log('e message : ', e.message)
        if (e.message.indexOf('This video contains content') !== -1) {
            message.channel.send('> Vidéo bloquée par droit d\'auteur : `' + playlistInfos[message.guild.id][0].title + '`')
            this.next(message)
        }
        else {
            console.log('Pas les droit d\'auteur')
            this.next(message)
        }
        // e.message = 'Cannot call write after a stream was destroyed'
        console.log('--------------------------------------')
    }

    setArrays(message) {
        // If still connected but the end callback is call to early (after few seconds of playing)
        if (playlistArray[message.guild.id]) {
            // If loop is desactivate
            if (!loopArray[message.guild.id]) {
                delete playlistArray[message.guild.id][0]
                delete playlistInfos[message.guild.id][0]
                playlistArray[message.guild.id] = _.compact(playlistArray[message.guild.id])
                playlistInfos[message.guild.id] = _.compact(playlistInfos[message.guild.id])
            }
            // If playlist is empty
            if (!playlistArray[message.guild.id][0]) {
                waitArray[message.guild.id] = true
                if (loopArray[message.guild.id]) {
                    delete loopArray[message.guild.id]
                    message.channel.send('> Mode répétition désactivé')
                }
                message.channel.send('> Plus de musique en file d\'attente')
            }
            else {
                // If loop is activate and command 'next' is called
                if (nextSetLoop[message.guild.id]) {
                    loopArray[message.guild.id] = true
                    delete nextSetLoop[message.guild.id]
                }
                // streamsArray[message.guild.id].destroy()
                this.playSong(message)
            }
        }
    }

    sendMusicEmbed(message, embedObj, added = [false, 1], type = 'video') {
        const queuedLength = playlistArray[message.guild.id].length - 1
        let formattedDuration = 0
        const musicLink = type === 'video' ? `[${embedObj.title}](https://www.youtube.com/watch?v=${embedObj.id})` : `[${embedObj.title}](https://www.youtube.com/playlist?list=${embedObj.id})`
        const color = added[0] ? 3768896 : 5520025
        const title = added[0] && added[1] > 1 ? 'Playlist ajoutée' : added[0] ? 'Musique ajoutée' : 'Musique'
        if (playlistArray[message.guild.id].length >= 2) {
            playlistInfos[message.guild.id].map((video, index) => {
                if (index >= 1) {
                    this.addDuration(message, index, video.duration, 'current')
                }
            })
            formattedDuration = this.convertSecondsToFormattedDuration(playlistArray[message.guild.id]['currentDuration'])
        }
        const embed = new Discord.MessageEmbed()
            .setAuthor(title, 'https://syxbot.com/img/embed_music.png')
            .setColor(color)
            .setFooter('"' + config.prefix + 'p list" pour afficher la file d\'attente')
            .setThumbnail(embedObj.thumbnail)
            .addField('Titre', musicLink, true)
            .addBlankField(true)
            .addField('File d\'attente', queuedLength, true)
            .addField('Durée', embedObj.duration, true)
            .addBlankField(true)
            .addField('Durée en attente', formattedDuration, true)
        message.channel.send({ embed });
    }

    getPlaylist(message, words, playSongParams, byReaction) {
        message.channel.send('> Ajout de la playlist en cours ...')
        ytpl(words[1], { limit: 0 }, (err, playlist) => {
            if (playlist) {
                this.addPlaylistItems(message, playlist, playSongParams, byReaction)
            }
            else {
                message.channel.send('> Une erreur s\'est produite #2')
            }
        })
    }

    addPlaylistItems(message, playlist, play, byReaction) {
        let voiceChannel = Helper.take_user_voiceChannel(message)
        if (byReaction[0]) {
            voiceChannel = Helper.take_user_voiceChannel_by_reaction(message, byReaction[1])
        }
        if (radioPlayed[message.guild.id] || play) {
            playlistArray[message.guild.id] = []
            playlistInfos[message.guild.id] = []
            delete radioPlayed[message.guild.id]
        }
        this.pushPlaylistItems(message, playlist)
        const formattedDuration = this.convertSecondsToFormattedDuration(playlistArray[message.guild.id]['newPlaylistDuration'])
        const embedObj = this.setEmbedObj(playlist.title, playlist.id, playlist.items[0].thumbnail, formattedDuration)
        if (play) {
            voiceChannel.join()
                .then(conection => {
                    connectedGuild[message.guild.id] = voiceChannel.id
                    connectionsArray[message.guild.id] = conection
                    this.sendMusicEmbed(message, embedObj, [true, playlist.items.length], 'playlist')
                    this.playSong(message)
                })
        }
        else {
            this.sendMusicEmbed(message, embedObj, [true, playlist.items.length], 'playlist')
            if (radioPlayed[message.guild.id]) {
                streamsArray[message.guild.id].destroy()
                delete radioPlayed[message.guild.id]
                this.playSong(message)
            }
            else if (waitArray[message.guild.id]) {
                delete waitArray[message.guild.id]
                this.playSong(message)
            }
        }
    }

    pushPlaylistItems(message, playlist) {
        const videoURL = 'https://www.youtube.com/watch?v='
        let pushCount = 0;
        playlist.items.map(video => {
            if (video.title !== '[Deleted video]' && video.title !== '[Private video]') {
                pushCount++
                this.addDuration(message, pushCount, video.duration, 'new')
                playlistArray[message.guild.id].push(videoURL + video.id)
                let thumbnailURL = ''
                if (video.thumbnail) {
                    thumbnailURL = video.thumbnail
                }
                playlistInfos[message.guild.id].push({
                    title: video.title,
                    id: video.id,
                    thumbnail: thumbnailURL,
                    duration: video.duration
                })
            }
        })
        const deletedVideo = playlist.total_items - pushCount
        if (deletedVideo >= 1) {
            if (deletedVideo === 1) {
                message.channel.send('> ' + deletedVideo + ' vidéo supprimée')
            }
            else {
                message.channel.send('> ' + deletedVideo + ' vidéos supprimées')
            }
        }
    }

    convertSecondsToFormattedDuration(duration) {
        const videoDate = new Date(duration * 1000)
        const hours = videoDate.getUTCHours()
        const minutes = videoDate.getUTCMinutes()
        const seconds = videoDate.getUTCSeconds()
        let formatedDuration = ''
        formatedDuration += hours > 0 ? hours.toString() + ':' : ''
        formatedDuration += minutes > 9 ? minutes.toString() + ':' : hours > 0 ? '0' + minutes.toString() + ':' : minutes.toString() + ':'
        formatedDuration += seconds > 9 ? seconds.toString() : '0' + seconds.toString()
        return formatedDuration
    }

    addDuration(message, count, duration, type = 'new') {
        if (count === 1) {
            if (type === 'new') {
                playlistArray[message.guild.id]['newPlaylistDuration'] = this.getSeconds(duration)
            }
            else {
                playlistArray[message.guild.id]['currentDuration'] = this.getSeconds(duration)
            }
        }
        else if (type === 'new') {
            playlistArray[message.guild.id]['newPlaylistDuration'] += this.getSeconds(duration)
        }
        else {
            playlistArray[message.guild.id]['currentDuration'] += this.getSeconds(duration)
        }
    }

    getSeconds(duration) {
        const splittedDuration = duration.split(':')
        let resultSeconds = 0
        if (splittedDuration.length === 3) {
            resultSeconds += Number(splittedDuration[0]) * 3600
            resultSeconds += Number(splittedDuration[1]) * 60
            resultSeconds += Number(splittedDuration[2])
        }
        else {
            resultSeconds += Number(splittedDuration[0]) * 60
            resultSeconds += Number(splittedDuration[1])
        }
        return resultSeconds
    }

    getVideo(message, words, playSongParams = true, byReaction) {
        ytdl.getBasicInfo(words[1], (err, infos) => {
            if (infos) {
                if (infos.title !== '[Deleted video]' && infos.title !== '[Private video]') {
                    this.setMusicArrayAndPlayMusic(infos, message, playSongParams, byReaction)
                }
                else {
                    message.channel.send('> Cette vidéo n\'est pas disponible !')
                }
            }
            else {
                message.channel.send('> Une erreur s\'est produite')
            }
        })
    }

    setMusicArrayAndPlayMusic(infos, message, playSongParams, byReaction) {
        if (playSongParams || waitArray[message.guild.id]) {
            delete waitArray[message.guild.id]
            let voiceChannel = Helper.take_user_voiceChannel(message)
            if (byReaction[0]) {
                voiceChannel = Helper.take_user_voiceChannel_by_reaction(message, byReaction[1])
            }
            voiceChannel.join()
                .then(connection => {
                    this.clearAndAddArrayInfos(message, infos)
                    connectedGuild[message.guild.id] = voiceChannel.id
                    connectionsArray[message.guild.id] = connection
                    this.playSong(message)
                })
        }
        else if (radioPlayed[message.guild.id]) {
            delete radioPlayed[message.guild.id]
            this.clearAndAddArrayInfos(message, infos)
            this.playSong(message)
        }
        else {
            const formattedDuration = this.clearAndAddArrayInfos(message, infos)
            const embedObj = this.setEmbedObj(infos.title, infos.video_id, infos.player_response.videoDetails.thumbnail.thumbnails[0].url, formattedDuration)
            this.sendMusicEmbed(message, embedObj, [true, 1])
        }
    }

    setEmbedObj(title, id, thumbnail, duration) {
        return {
            title: title,
            id: id,
            thumbnail: thumbnail,
            duration: duration
        }
    }

    clearAndAddArrayInfos(message, infos) {
        if (!playlistArray[message.guild.id]) {
            playlistArray[message.guild.id] = []
            playlistInfos[message.guild.id] = []
        }
        playlistArray[message.guild.id].push(infos.video_url)
        const formattedDuration = this.convertSecondsToFormattedDuration(infos.player_response.videoDetails.lengthSeconds)
        playlistInfos[message.guild.id].push({
            title: infos.title,
            id: infos.video_id,
            thumbnail: infos.player_response.videoDetails.thumbnail.thumbnails[0].url,
            duration: formattedDuration
        })
        return formattedDuration
    }

    getSongInPlaylist(message, number) {
        const userChannel = Helper.take_user_voiceChannel(message)
        if (Helper.verifyBotLocation(message, connectedGuild[message.guild.id], userChannel)) {
            if (playlistInfos[message.guild.id].length) {
                if (number > 0 && number <= playlistInfos[message.guild.id].length) {
                    // Add selected music at the top of the list
                    playlistInfos[message.guild.id].splice(1, 0, playlistInfos[message.guild.id][number])
                    playlistArray[message.guild.id].splice(1, 0, playlistArray[message.guild.id][number])
                    // Remove selected music from where we copy it (+1 because we add an item before)
                    delete playlistInfos[message.guild.id][number + 1]
                    delete playlistArray[message.guild.id][number + 1]
                    // Add the current music after the selected one
                    playlistInfos[message.guild.id].splice(2, 0, playlistInfos[message.guild.id][0])
                    playlistArray[message.guild.id].splice(2, 0, playlistArray[message.guild.id][0])
                    // Destroy stream that call end callback (next song)
                    streamsArray[message.guild.id].destroy()
                }
                else {
                    let howToSay = 'chiffre'
                    if (playlistInfos[message.guild.id].length >= 10) {
                        howToSay = 'nombre'
                    }
                    message.channel.send(`> Choisissez un ${howToSay} compris entre 1 et ${playlistInfos[message.guild.id].length - 1}`)
                }
            }
            else {
                message.channel.send('> Aucune musique dans la file d\'attente')
            }
        }
    }

    showQueuedSongs(message) {
        const userChannel = Helper.take_user_voiceChannel(message)
        if (Helper.verifyBotLocation(message, connectedGuild[message.guild.id], userChannel)) {
            if (playlistInfos[message.guild.id] && playlistInfos[message.guild.id].length >= 2) {
                // Create songs array and send multiple message if needed (max message length to 2000)
                this.createSongsString(message).map((list, index) => {
                    if (index === 0) {
                        if (playlistInfos[message.guild.id].length >= 3) {
                            message.channel.send(`> **Musiques en file d'attente** \n > \n${list}`)
                        }
                        else {
                            message.channel.send(`> **La musique en file d'attente** \n > \n${list}`)
                        }
                    }
                    else {
                        message.channel.send(`${list}`)
                    }
                })
            }
            else {
                message.channel.send('> Aucune musique dans la file d\'attente')
            }
        }
    }

    createSongsString(message) {
        const songsArray = []
        let songs = ''
        playlistInfos[message.guild.id].map((music, index) => {
            if (index !== 0) {
                const newSong = '> **' + index + '**. ' + music.title + '\n'
                if (songs.length + newSong.length >= 1950) {
                    songsArray.push(songs)
                    songs = newSong
                }
                else {
                    songs += newSong
                }
            }
        })
        if (songs.length) {
            songsArray.push(songs)
        }
        return songsArray
    }

    removeSelectedSongsMaster(message, words) {
        const userChannel = Helper.take_user_voiceChannel(message)
        if (userChannel) {
            if (Helper.verifyBotLocation(message, connectedGuild[message.guild.id], userChannel)) {
                if (playlistArray[message.guild.id] && playlistArray[message.guild.id].length) {
                    if (words[2]) {
                        const selection = words[2].split('-')
                        if (selection.length <= 2) {
                            this.removeSelectedSongs(message, selection)
                        }
                        else {
                            message.channel.send('> Veuillez n\'écrire que 2 index maximum.```Ex: ' + config.prefix + 'p remove 15-20```')
                        }
                    }
                    else {
                        message.channel.send('> Vous devez sélectionner la/les musique(s) à supprimé')
                    }
                }
                else {
                    message.channel.send('> Aucune musique dans la file d\'attente')
                }
            }
        }
        else {
            message.channel.send('> Vous devez être connecté dans un salon !')
        }

    }

    removeSelectedSongs(message, selection) {
        const selectZero = Number(selection[0])
        if (selection[1]) {
            const selectOne = Number(selection[1])
            if (selectOne && selectZero && selectZero < selectOne) {
                if (selectZero > 0 && selectOne < playlistArray[message.guild.id].length) {
                    for (let i = selectZero; i <= selectOne; i++) {
                        delete playlistInfos[message.guild.id][i]
                        delete playlistArray[message.guild.id][i]
                    }
                    playlistArray[message.guild.id] = _.compact(playlistArray[message.guild.id])
                    playlistInfos[message.guild.id] = _.compact(playlistInfos[message.guild.id])
                    this.sendRemoveEmbed(message, (selectOne - selectZero) + 1)
                }
                else {
                    message.channel.send('> Sélectionnez des musiques compris entre 1 et ' + playlistArray[message.guild.id].length - 1)
                }
            }
            else {
                message.channel.send('> Le 2ème index doit être plus grand que le premier !')
            }
        }
        else if (selectZero && selectZero > 0) {
            delete playlistInfos[message.guild.id][selectZero]
            delete playlistArray[message.guild.id][selectZero]
            playlistArray[message.guild.id] = _.compact(playlistArray[message.guild.id])
            playlistInfos[message.guild.id] = _.compact(playlistInfos[message.guild.id])
            this.sendRemoveEmbed(message, 1)
        }
        else {
            message.channel.send('> Sélectionnez une musique compris entre 1 et ' + playlistArray[message.guild.id].length - 1)
        }
    }

    go(message, words) {
        const userChannel = Helper.take_user_voiceChannel(message)
        if (userChannel) {
            if (Helper.verifyBotLocation(message, connectedGuild[message.guild.id], userChannel)) {
                if (words[1] && Number(words[1])) {
                    const number = Number(words[1])
                    if (playlistArray[message.guild.id] && playlistArray[message.guild.id].length > 1) {
                        if (number > 0 && number < playlistArray[message.guild.id].length) {
                            streamsArray[message.guild.id].destroy()
                            for (let i = 0; i < number; i++) {
                                delete playlistInfos[message.guild.id][i]
                                delete playlistArray[message.guild.id][i]
                            }
                            playlistArray[message.guild.id] = _.compact(playlistArray[message.guild.id])
                            playlistInfos[message.guild.id] = _.compact(playlistInfos[message.guild.id])
                            this.sendRemoveEmbed(message, number)
                            this.playSong(message)
                        }
                        else {
                            message.channel.send('> Sélectionnez une musique compris entre 1 et ' + (playlistArray[message.guild.id].length - 1))
                        }
                    }
                    else {
                        message.channel.send('> Aucune musique dans la file d\'attente')
                    }
                }
                else {
                    message.channel.send('> Sélectionnez l\'index d\'une musique.```Ex: ' + config.prefix + 'go 12```')
                }
            }
        }
        else {
            message.channel.send('> Vous devez être connecté dans un salon !')
        }
    }

    sendRemoveEmbed(message, number) {
        const title = number > 1 ? 'Musiques supprimées' : 'Musique supprimée'
        const queuedLength = playlistArray[message.guild.id].length - 1
        // #952716 | Rouge | Decimal value
        const color = 9774870
        message.channel.send({
            'embed': {
                'color': color,
                'author': {
                    'name': title,
                    'icon_url': 'https://syxbot.com/img/removed_music.png'
                },
                'fields': [
                    {
                        'name': 'Nombre',
                        'value': number,
                        'inline': true
                    },
                    {
                        'name': 'File d\'attente',
                        'value': queuedLength,
                        'inline': true
                    }
                ]
            }
        })
    }

    static stop(message, leave = true) {
        const userChannel = Helper.take_user_voiceChannel(message)
        if (Helper.verifyBotLocation(message, connectedGuild[message.guild.id], userChannel)) {
            streamsArray[message.guild.id].destroy()
            if (leave) {
                connectionsArray[message.guild.id].channel.leave()
            }
            delete connectedGuild[message.guild.id]
            delete streamsArray[message.guild.id]
            delete connectionsArray[message.guild.id]
            delete playlistArray[message.guild.id]
            delete playlistInfos[message.guild.id]
            delete radioPlayed[message.guild.id]
            delete loopArray[message.guild.id]
            delete waitArray[message.guild.id]
            delete tryToNext[message.guild.id]
        }
    }

    static pause(message) {
        const userChannel = Helper.take_user_voiceChannel(message)
        if (Helper.verifyBotLocation(message, connectedGuild[message.guild.id], userChannel)) {
            if (streamsArray[message.guild.id]) {
                streamsArray[message.guild.id].pause(true)
            }
            else {
                message.channel.send('> Aucune musique en cours d\'écoute')
            }
        }
    }

    static resume(message) {
        const userChannel = Helper.take_user_voiceChannel(message)
        if (Helper.verifyBotLocation(message, connectedGuild[message.guild.id], userChannel)) {
            streamsArray[message.guild.id].resume()
        }
    }

    next(message) {
        const userChannel = Helper.take_user_voiceChannel(message)
        if (Helper.verifyBotLocation(message, connectedGuild[message.guild.id], userChannel)) {
            if (playlistArray[message.guild.id]) {
                tryToNext[message.guild.id] = true
                if (loopArray[message.guild.id]) {
                    delete loopArray[message.guild.id]
                    nextSetLoop[message.guild.id] = true
                }
                streamsArray[message.guild.id].destroy()
                this.setArrays(message, connectionsArray[message.guild.id])
            }
        }
    }
}

module.exports = Player