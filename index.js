const Eris = require('eris')
const fs = require('fs')
const os = require('os')
const moment = require('moment')
const mkdirp = require('mkdirp')
const google = require('google')
const request = require('request')
const express = require('express')
const app = express()
// const Discogs = require('discogs-client')
const packageJSON = require('./package.json')

// Load Config
var config = require('./semi-public/config.json')

var bot = new Eris(config.token)
var ownerID = config.ownerID
var prefix = config.prefix
var location = config.snipLocation

function checkForUpdate () {
  var options = {
    url: 'https://raw.githubusercontent.com/Noculi/selfbutt/master/package.json',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Accept-Charset': 'utf-8',
      'User-Agent': 'selfbutt-noculi/' + packageJSON.version
    }
  }
  request(options, function (err, res, body) {
    if (err) throw err
    let json = JSON.parse(body)
    if (packageJSON.version === json.version) {
      webLogger('SelfButt is up to date!')
      webLogger('Ready!')
    } else {
      webLogger('There is a new update for SelfButt!')
      webLogger('Ready! (But you should update)')
    }
  })
}

bot.on('messageCreate', (msg) => {
  if (msg.author.id === ownerID) {
    if (msg.content === prefix + 'ping') {
      bot.createMessage(msg.channel.id, {
        embed: {
          title: 'Hey!',
          description: "I'm alive, don't worry!",
          author: {
            name: msg.author.username,
            icon_url: msg.author.avatarURL
          },
          color: 0x008000,
          footer: {
            text: 'SelfButt 0.1 by Noculi'
          }
        }
      })
    } else if (msg.content === prefix + 'loadSong') {
      fs.readFile(location, 'utf8', function (err, data) {
        if (err) throw err
        webLogger(data)
        writeSongTxt(data)
        bot.editStatus({name: '🎶 ' + data, type: 0})
        logItPls('Song updated to ' + data)
        bot.createMessage(msg.channel.id, {
          embed: {
            title: 'Hey!',
            description: "I'll go ahead and do that really quickly! (Song name is '" + data + "')",
            author: {
              name: msg.author.username,
              icon_url: msg.author.avatarURL
            },
            color: 0x008000,
            footer: {
              text: 'SelfButt 0.1 by Noculi'
            }
          }
        })
      })
    } else if (msg.content.startsWith(prefix + 'google')) {
      var searchCommand = prefix + 'google'
      if (msg.content.length <= searchCommand.length + 1) {
        bot.createMessage(msg.channel.id, 'Please specify a search term.')
        return
      }
      var filename = msg.content.substring(searchCommand.length + 1)
      google.resultsPerPage = 25
      var nextCounter = 0
      google(filename, function (err, res) {
        if (err) throw err
        bot.createMessage(msg.channel.id, 'Here are the top 4 results!')
        for (var i = 0; i < res.links.length; ++i) {
          var link = res.links[i]
          bot.createMessage(msg.channel.id, {
            embed: {
              title: link.title + ' - ' + link.href,
              description: link.description + '\n',
              author: {
                name: 'Google Search',
                icon_url: 'https://s-media-cache-ak0.pinimg.com/736x/66/00/18/6600188f65aa2e4cc2cd29017cb27662.jpg'
              },
              color: 0x008000,
              footer: {
                text: 'SelfButt 0.1 by Noculi'
              }
            }
          })
          if (i === 3) {
            return
          }
        }
        if (nextCounter < 4) {
          nextCounter += 1
          if (res.next) res.next()
        }
      })
    } else if (msg.content === prefix + 'searchSong') {
      fs.readFile(location, 'utf8', function (err, data) {
        if (err) throw err
      })
    }
  }
})

bot.on('messageCreate', (msg) => {
  if (config.chatLogging === 'Y') {
    var time = '[' + moment().format('MMMM Do YYYY, h:mm:ss a')
    var finalMessage = time + ']' + ' [' + msg.author.username + '#' + msg.author.discriminator + '] ' + msg.content + os.EOL
    var finalPath = './logs/groups/' + msg.channel.id + '.txt'
    if (!msg.channel.guild) {
      mkdirp('./logs/groups/', function (err) {
        if (err) throw err
        fs.appendFile(finalPath, finalMessage, function (err) {
          if (err) throw err
        })
      })
    } else {
      mkdirp('./logs/' + '/' + msg.channel.guild.name + '/', function (err) {
        if (err) throw err
        fs.appendFile(finalPath, finalMessage, function (err) {
          if (err) throw err
        })
      })
    }
  }
})

setInterval(function () {
  fs.readFile('./semi-public/lastsong.txt', 'utf8', function (err, lastSong) {
    if (err) throw err
    fs.readFile(location, 'utf8', function (err, data) {
      if (err) throw err
      if (lastSong === data) {
        webLogger('Song was already ' + data + '. Skipping change.')
      } else {
        writeSongTxt(data)
        webLogger('Song updated to "' + data + '"')
        bot.editStatus({name: '🎶 ' + data, type: 0})
        logItPls('Song updated to ' + data)
      }
    })
  })
}, 15000)

setInterval(function () {
  statSaving()
}, 5000)

function writeSongTxt (song) {
  mkdirp('./semi-public/', function (err) {
    if (err) throw err
    fs.writeFile('./semi-public/lastsong.txt', song, function (err) {
      if (err) {
        return webLogger(err)
      }
    })
  })
}

function writeLogsTxt (data) {
  mkdirp('./semi-public/', function (err) {
    if (err) throw err
    fs.writeFile('./semi-public/logs.txt', data, function (err) {
      if (err) {
        return webLogger(err)
      }
    })
  })
}

function logItPls (whathappened) {
  bot.createMessage(config.logChannel, {
    embed: {
      title: 'Hey! Look a log!',
      description: whathappened,
      color: 0x008000,
      footer: {
        text: 'SelfButt 0.1 by Noculi'
      }
    }
  })
}
function startNet () {
  var spawn = require('child_process').spawn
  var child = spawn('node', ['index.js'], {
    detached: true,
    stdio: [ 'ignore', 'ignore', 'ignore' ]
  })
  child.unref()
}

function statSaving () {
  mkdirp('./semi-public/stats/', function (err) {
    if (err) throw err
    var numberOfGuilds = bot.guilds.size
    var numberOfUsers = bot.users.size
    var numberOfChannels = Object.keys(bot.channelGuildMap).length
    fs.writeFile('./semi-public/stats/numberOfGuilds.txt', numberOfGuilds, function (err) {
      if (err) {
        return webLogger(err)
      }
    })
    fs.writeFile('./semi-public/stats/numberOfUsers.txt', numberOfUsers, function (err) {
      if (err) {
        return webLogger(err)
      }
    })
    fs.writeFile('./semi-public/stats/numberOfChannels.txt', numberOfChannels, function (err) {
      if (err) {
        return webLogger(err)
      }
    })
  })
}

bot.connect()
console.log('You can manage your bot over at "http://localhost:3000"')
process.title = 'SelfButt'
if (fs.existsSync('./semi-public/lastsong.txt')) {
  checkForUpdate()
  writeLogsTxt('')
} else {
  logItPls("Looks like you're new to SelfButt! You can take a look on the wiki for commands!")
  writeSongTxt('SelfButt First Boot')
  writeLogsTxt('')
  checkForUpdate()
}

app.use(express.static('public'))
app.use(express.static('semi-public'))

app.get('/apiV1/shutdown', function (req, res) {
  webLogger('Shutting down SelfButt.')
  res.send('<h1>Server has caught fire</h1><br /><i>Same thing as shutting down right?</i><br /><img src="https://i.imgur.com/daF13vl.gif" />')
  process.exit(0)
})

app.get('/apiV1/reboot', function (req, res) {
  webLogger('Rebooting SelfButt. NOTE: DUE TO A BUG, YOU WILL NOT BE ABLE TO SEE ANY OF THE NEW LOGS HERE OR BE ABLE TO END IT HERE! USE "http://localhost:3000/apiV1/shutdown" TO SHUT IT DOWN!')
  res.send('Rebooting. <a href="http://localhost:3000/">Click here to go back to the dashboard</a>')
  startNet()
  process.exit(0)
})

app.get('/apiV1/configChange', function (req, res) {
  webLogger('Changing SelfButt config.')
})

app.listen(3000, function () {
  webLogger('SelfButt WebUI listening on port 3000!')
})

function webLogger (data) {
  var time = '[' + moment().format('MMMM Do YYYY, h:mm:ss a')
  var finalMessage = time + '] ' + data + os.EOL
  fs.appendFile('./semi-public/logs.txt', finalMessage, function (err) {
    if (err) throw err
  })
}
