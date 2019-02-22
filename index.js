
process.on('unhandledRejection', (reason) => {
	console.error(reason);
	process.exit(1);
});
try {
	var Discord = require("discord.js");
	var fs = require('fs');
	var youtubedl = require('youtube-dl');
}
catch (e) {
	console.log(e.stack);
	console.log(process.version);
	console.log("Please run npm install and ensure it passes with no errors!");
	process.exit();
}
var bot = new Discord.Client({
	disableEveryone: true
});
try {
	var AuthDetails = require("./auth.json");
}
catch (e) {
	console.log("Please create an auth.json with a bot token" + e.stack);
	process.exit();
}
//LOGIN
if (AuthDetails.bot_token) {
	console.log("logging in with token");
	bot.login(AuthDetails.bot_token);
}
else {
	console.log("There is no token present, please update auth.json");
}
bot.on("ready", function () {
	console.log("logged in")
});
const createWTClient = require('@wetransfer/js-sdk');
const prefix = "yt!"
bot.on("message", async message => {
	if (message.author.bot) return;
	if (message.channel.type !== "text") return;
	if (!message.content.startsWith(prefix)) return;
	var command = message.content.substring(prefix.length)
	console.log(command)
	command = command.split(" ")
	if (command[0] == "download") {
		console.log(command)
		console.log("starting download")
		download(command[1], message)
		writeTextFile("./log.txt", `${message.author.username}\t ${command[1]}\n`)	
	}
});
bot.on("disconnected", function () {
	console.log("Disconnected!");
	process.exit(1); //exit node.js with an error
});

function formatBytes(bytes) {
	if (bytes < 1024) return bytes + " Bytes";
	else if (bytes < 1048576) return (bytes / 1024).toFixed(3) + " KB";
	else if (bytes < 1073741824) return (bytes / 1048576).toFixed(3) + " MB";
	else return (bytes / 1073741824).toFixed(3) + " GB";
};

function getVideoInfo(video) {
	return new Promise(function (resolve, reject) {
		video.on('info', function (info) {
			resolve(info)
		})

	})
}


var filePaths = [];


function deleteFile(path) {
	try{

	
	fs.stat(`${path}`, function (err, stats) {
		if (err) {
			return console.error(err);
		}
		fs.unlink(`${path}`, function (err) {
			if (err) return console.log(err);
			console.log('file deleted successfully');
		});
	});
}catch(err){
	console.log(err)
}

}

function writeTextFile(filepath, output) {
	fs.appendFile(filepath, output, (err) => {
		if (err) return console.log("Could not write to file")
	});
}


const regex = /(?:http(?:s)?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:(?:watch)?\?(?:.*&)?v(?:i)?=|(?:embed|v|vi|user)\/))([^\?&\"'<> #]+)/gmi;
//DOWNLOAD FUNCTION
async function download(url, message) {
	try {
		var found = url.match(regex);
		if (found == undefined) return message.channel.send("not a youtube url");
		var video = youtubedl(url, // Optional arguments passed to youtube-dl.
			['--format=18'], {
				cwd: __dirname
			})

		//options ,'-f bestaudio[ext=m4a]'
		// Will be called when the download starts.
		getVideoInfo(video).then(info => {
			if(info.size > 2147483647) return message.channel.send(`**${info._filename}** is too big, it is **${formatBytes(info.size)}**, please only upload files less than 2GB`)
			message.channel.send(`Downloading **${info._filename}**, size of this file is : **${formatBytes(info.size)}**.`)
			var r = video.pipe(fs.createWriteStream(`./output/${info._filename}.mp4`));
			r.on('close', async function () {
				console.log('request finished downloading file');
				
				const wtClient = await createWTClient('goGFlQ7F8b91ZQilJayTh1EQRvfz8hPn5xpM9IcE');
				function readFile(path) {
					return new Promise((resolve, reject) => {
						fs.readFile(path, (error, data) => {
							if (error) {
								return reject(error);
							}
							resolve(data);
						});
					});
				}
				
				if(filePaths.length >= 1){message.channel.send(`Upload of **${info._filename}** is queued! There are ${filePaths.length} more videos in queue`)}else{
					message.channel.send(`Uploading **${info._filename}**, please wait...`)
				}
				filePaths.push(`./output/${info._filename}.mp4`);
				// Read the content of the files, in parallel
				const fileContents = await Promise.all(filePaths.map(readFile));
				const files = filePaths.map((file, index) => {
					const content = fileContents[index];
					return {
						name: file.split('/').pop()
						, size: content.length
						, content: content
					};
				});
				const transfer = await wtClient.transfer.create({
					message: 'Thank you for using this bot made by Eagler1997 :)'
					, files: files
				});
				console.log(transfer.files)
				console.log(transfer.success)
				if (transfer.success) {
					message.channel.send(`Finished uploading **${info._filename}**, you can find it on : <${transfer.url}>`)
					deleteFile(`./output/${info._filename}.mp4`)
				} else {
					message.channel.send("Something went wrong with the upload! Retrying...")
				}
			});
		});
	} catch (err) {
		console.log(err)
		message.channel.send("An error occured, couldn't download the provided file!")

	}
}
//ERRORAFHANDELING
bot.on("error", (e) => console.error(e));
bot.on("warn", (e) => console.warn(e));
process.on('unhandledRejection', function (reason, p) {
	console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
	process.exit();
});
process.on('uncaughtException', function (err) {
	console.log('Caught exception: ', err);
	//process.exit();
});
bot.on("disconnect", (error) => {
	console.log("Disconnected!");
	process.exit();
});