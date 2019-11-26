function take_user_voiceChannel(message) {
    let voiceChannel = false
    message.guild.channels.map(channel => {
        if (channel.type === "voice") {
            if (channel.members) {
                channel.members.map(member => {
                    if (member.user.id === message.author.id) {
                        voiceChannel = channel
                    }
                })
            }
        }
    })
    return voiceChannel
}

function getFirstAuthorizedChannel(guild) {
    if (guild.channels.has(guild.id)) return guild.channels.get(guild.id)

    // Check for a "general" channel
    let generalChannel = guild.channels.find(channel => channel.name === "general");
    if (generalChannel) return generalChannel;

    // If there is no "general" channel, get the first authorized text channel
    // "guild.client.user" is the bot object
    return guild.channels
        .filter(c => c.type === "text" &&
            c.permissionsFor(guild.client.user).has("SEND_MESSAGES"))
        .first();
}

exports.take_user_voiceChannel = take_user_voiceChannel
exports.getFirstAuthorizedChannel = getFirstAuthorizedChannel