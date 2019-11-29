const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    userId: String,
    serverId: String,
    grade: Number,
    xp: Number
}, {
    versionKey: false
});

module.exports = userSchema;