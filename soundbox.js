//'use strict';

var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var fs = require('fs');
var path = require('path');
var express = require('express');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

var actualVoiceChannelId = null;
var actualStream = null;

// Initialize Discord Bot
var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userId, channelId, message, evt) {
    switch (message) {
        case 'soundbox join':
            actualVoiceChannelId = getUserVoiceChannelId(userId);
            joinVoiceChannel(actualVoiceChannelId);
            break;
        case 'soundbox play':
            playMp3File('philippe.mp3');
            break;
        case 'soundbox quit':
            bot.leaveVoiceChannel(actualVoiceChannelId);
            actualVoiceChannelId = null;
            break;
        default: break;
    }
});

function botSendMessages(messages, channelId) {
    bot.sendMessage({
        to: channelId,
        message: messages.join("\n")
    });
}

function getUserVoiceChannelId(userId) {
    for (var channelId in bot.channels) {
        if (bot.channels.hasOwnProperty(channelId)) {
            var channel = bot.channels[channelId];
            if (channel.members[userId]) {
                return channel.id;
            }
        }
    }
    return null;
}

function playMp3File(localFileName) {
    //Create a stream to your file and pipe it to the stream
    //Without {end: false}, it would close up the stream, so make sure to include that.
    actualStream.cork();
    var filePath = path.join(__dirname, 'assets', localFileName);
    fs.createReadStream(filePath).pipe(actualStream, { end: false });
    actualStream.uncork();
}

function joinVoiceChannel(voiceChannelId) {
    bot.joinVoiceChannel(voiceChannelId, function (error, events) {
        //Check to see if any errors happen while joining.
        if (error) return logger.error(error);
        //Then get the audio context
        bot.getAudioContext(voiceChannelId, function (error, stream) {
            if (error) return logger.error(error);
            //Once again, check to see if any errors exist

            //The stream fires `done` when it's got nothing else to send to Discord.
            stream.on('done', function () {
                logger.debug('read file done')
            });
            actualStream = stream;
        });
    });
}



////////////////////////////////
////////// REST API ////////////
////////////////////////////////

var restServer = express();
restServer.get('/soundbox/play/:sample', function (req, res) {
    logger.debug('play request: ' + req.params.sample);
    if (actualVoiceChannelId != null && actualStream != null) {
        logger.debug('playing: ' + req.params.sample);
        playMp3File(req.params.sample + '.mp3');
    } else {
        logger.debug("soundbox not in channel");
    }
    res.send();
});

restServer.listen(3000, function () {
    logger.info('Soundbox REST API listening on port 3000');
});