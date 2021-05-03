const Discord = require('discord.js');
const {
	prefix,
	token,
} = require('./config.json');
const ytdl = require('ytdl-core');
const client = new Discord.Client();

// Server ID -> BotState
/*
  BotState {
    Player -> BlackJackInfo
    {
 
    },
    MusicInfo 
    {
      textChannel: ...,
      voiceChannel: ...,
      connection: null,
      songs: [{title: "...", url:"..."},...],
    }
  }
*/
const botState = new Map();

client.once("ready", () => {
  console.log("Ready!");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

const musicCommandMap = new Map([
  ["play", execute],
  ["skip", skip],
  ["stop", stop],
  ["pause", pause],
  ["resume", resume],
  ["queue", displayQueue]
]);

client.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  var serverState = botState.get(message.guild.id);

  if (!serverState) {
    const playerInfo = new Map()
    serverState = {
      musicInfo: {
        textChannel: null,
        voiceChannel: null,
        connection: null,
        songs: []
      },
      blackJackInfo: playerInfo
    }
    botState.set(message.guild.id, serverState);
  }

  const args = message.content.split(" ");
  
  const command = args[0].substring(prefix.length)

  if (musicCommandMap.has(command)) {
    musicCommandMap.get(command)(message, serverState.musicInfo)
  } else {
    message.channel.send("You need to enter a valid command!");
  }
});

// Black Jack Commands

// Music Commands

async function execute(message, musicInfo) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
  }

  const songInfo = await ytdl.getInfo(args[1]);

  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url
  };

  if (!musicInfo.connection) {

    musicInfo.textChannel = message.channel
    musicInfo.voiceChannel = voiceChannel

    musicInfo.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      musicInfo.connection = connection;
      play(message.guild, musicInfo);
    } catch (err) {
      console.log(err);
      if (musicInfo.connection) {
        musicInfo.voiceChannel.leave();
        musicInfo.connection = null;
      }
      return message.channel.send(err);
    }
  } else {
    musicInfo.songs.push(song);
    return message.channel.send(`${song.title} has been added`);
  }
}

function skip(message, musicInfo) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You need to join the channel first."
    );
  if (musicInfo.songs.length == 0)
    return message.channel.send("There's nothing to skip.");
  musicInfo.connection.dispatcher.end();
  message.channel.send("Lol Oops?");
}

function stop(message, musicInfo) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You need to join the channel first."
    );
    musicInfo.songs = [];
    musicInfo.connection.dispatcher.end();
}

function pause(message, musicInfo) {
	if (!message.member.voice.channel)
	  return message.channel.send(
		  "You need to join the channel first."
	  );
    musicInfo.connection.dispatcher.pause();
}

function resume(message, musicInfo) {
  if(!message.member.voice.channel)
    return message.channel.send(
      "You need to join the channel first."
    );
    musicInfo.connection.dispatcher.resume();
}

function displayQueue(message, musicInfo) {
  if(!message.member.voice.channel)
    return message.channel.send(
      "You need to join the channel first."
    );

  if (musicInfo.songs.length == 0) {
    return message.channel.send(
      "Lol there is nothing here!"
    )
  }

  var queueMessage = ""
  for(var i = 0; i < musicInfo.songs.length; i++) {
    queueMessage += `${i}) ${musicInfo.songs[i].title}`
    if (i != musicInfo.songs.length - 1) {
      queueMessage += "\n"
    }
  }

  message.channel.send(queueMessage)
}

function play(guild, musicInfo) {
  if (musicInfo.songs.length == 0) {
    musicInfo.voiceChannel.leave();
    musicInfo.connection = null;
    return;
  }

  const song = musicInfo.songs[0];

  const dispatcher = musicInfo.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      musicInfo.songs.shift();
      play(guild, musicInfo);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(1);
  musicInfo.textChannel.send(`Start playing: **${song.title}**`);
}

client.login(token);