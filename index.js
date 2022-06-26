const fs = require('fs');
const path = require('path');
const util = require('util');

const package_json = require('./package.json');
const StartupMessage = `\n\nBulk Steam Key activaator v_${package_json.version}\n\n`;
console.log(StartupMessage);

const { log } = require('./lib/logger');
const { askQuestion } = require('./lib/utils');

const Path_Config = path.join(__dirname, 'config.json');

const SteamUser = require('steam-user');
const client = new SteamUser();

let global_config;

// Ask user for input on first startup or if config file is missing
const first_startup = async () => {
	const Steam_Username = await askQuestion('Please enter your Steam Username: ');
	const Steam_Password = await askQuestion('Please enter your Steam Password: ');
	const Store_Password_Plain = await askQuestion('Do you want to store your password in plain text while processing your keys? (y/n) ');
	const Store_Password_Value = Store_Password_Plain.toLowerCase() === 'y' ? true : false;
	const AutoLogin = await askQuestion('Do you want to automatically login? (y/n) ');
	const AutoLogin_Value = AutoLogin.toLowerCase() === 'y' ? true : false;

	if (Store_Password_Value) {
		fs.writeFileSync(Path_Config, JSON.stringify({ Steam_Username, Steam_Password, AutoLogin_Value }));
		global_config = { Steam_Username, Steam_Password, AutoLogin_Value }
	} else {
		fs.writeFileSync(Path_Config, JSON.stringify({ Steam_Username, Steam_Password: "", AutoLogin_Value }));
		global_config = { Steam_Username, Steam_Password: "", AutoLogin_Value }
	}

	Steam_login({ Steam_Username, Steam_Password, AutoLogin_Value });
}

/**
 * Login into steam as normal steam client
 * @param {Json} [config]
 */
const Steam_login = (config = global_config) => {
	if (fs.existsSync('./loginkey')) {
		log.info("Login with loginkey")
		client.logOn({
			accountName: config.Steam_Username,
			loginKey: fs.readFileSync('loginkey', 'utf8'),
		})
	} else {
		if (config.Steam_Password !== "") {
			log.info("Login with username & password")
			client.logOn({
				"accountName": config.Steam_Username,
				"password": config.Steam_Password,
				rememberPassword: false
			});
		} else {
			log.error("Login with loginKey failed and no password was found. EXIT")
			process.exit(1)
		}
	}
}

//Check if there is a config file and if not create one
if (!fs.existsSync(Path_Config)) {
	first_startup();
} else {
	const config = fs.readFileSync(Path_Config, 'utf8')
	global_config = config;
	Steam_login();
}


client.on('loggedOn', function (details) {
	//console.log(details)
	log.system("Logged into Steam as " + client.steamID.getSteam3RenderedID())
	/*
	client.getUserOwnedApps(client.steamID).then(function (apps) {
		console.log(apps);
	});
	*/
});

client.on('webSession', function (sessionID, cookies) {
	log.system("Got web session", sessionID, cookies)
	// Do something with these cookies if you wish
});

client.on('loginKey', function (key) {
	log.system("Got login key: " + key)
	fs.writeFileSync('loginkey', key);
});

client.on('error', function (e) {
	log.error("Ran into some error: " + e)
	// Steam Login Failed
	if (e.eresult === 5) {
		if (global_config.Steam_Password !== "") {
			log.info("Login with username & password")
			client.logOn({
				"accountName": config.Steam_Username,
				"password": config.Steam_Password,
				rememberPassword: false
			});
		} else {
			log.error("Login with loginKey failed and no password was found. EXIT")
			process.exit(1)
		}
		return;
	}

	// Steam Login API Rate Limit Reached
	if (e.eresult === 84) {
		return console.log("Ratelimit: Pleas try again in a hour.");
	}

	console.log(e);

});