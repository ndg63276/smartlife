const appid = 'oeVkj2lYFGnJu5XUtWisfW4utiN4u9Mq';
const version = 6;
var proxyurl = "https://cors-anywhere.herokuapp.com/";

function get_time() {
	var now = new Date();
	return Math.floor(now.getTime()/1000);
}

function login(username, password, region) {
	var to_return = {'region': region};
	var app_details = {
		'password': password,
		'ts': get_time(),
		'appid': appid,
	}
	if (username.indexOf("@") > -1) {
		app_details["email"] = username;
	} else {
		app_details["phoneNumber"] = username;
	}
	var secret="6Nz4n0xA8s8qdxQf2GqurZj2Fs55FUvM";
	var nonce = JSON.stringify(app_details);
	var hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256,secret);
	hmac.update(nonce);
	var hash = hmac.finalize();
	var sign = hash.toString(CryptoJS.enc.Base64);
	var headers = {
		'Authorization' : 'Sign ' + sign,
		'Content-Type'  : 'application/json;charset=UTF-8'
	}
	var url = 'https://'+region+'-api.coolkit.cc:8080/api/user/login'
	$.ajax({
		url: proxyurl+url,
		type: 'POST',
		headers: headers,
		data: JSON.stringify(app_details),
		dataType: 'json',
		async: false,
		success: function (json) {
			console.log(json);
			if ('at' in json) {
				to_return['bearer_token'] = json['at'];
				setCookie('bearer_token', json['at'], 24*365);
				to_return['user_apikey'] = json['user']['apikey'];
				setCookie('user_apikey', json['user']['apikey'], 24*365)
				setCookie('region', region, 24*365)
				to_return['logged_in'] = true;
			} else {
				to_return['logged_in'] = false;
			}
		}
	});
	return to_return;
}

function get_device_list(user_info) {
	to_return = {};
	query_params = {
		'lang': 'en',
		'version': version,
		'appid': appid,
	}
	var url = 'https://'+user_info['region']+'-api.coolkit.cc:8080/api/user/device';
	var headers = {
		'Authorization' : 'Bearer ' + user_info['bearer_token'],
		'Content-Type'  : 'application/json;charset=UTF-8'
	}
	$.ajax({
		url: proxyurl+url,
		type: 'GET',
		headers: headers,
		data: query_params,
		dataType: 'json',
		async: false,
		success: function (json) {
			console.log(json);
			if (json['error'] == 0) {
				to_return['devices'] = json['devicelist'];
				to_return['success'] = true;
			} else {
				to_return['success'] = false;
			}
		}
	});
	return to_return
}

function get_ws_address(user_info, lookup) {
	if (lookup == true) {
		var to_return = '';
		var url = 'https://'+user_info['region']+'-disp.coolkit.cc:8080/dispatch/app';
		$.ajax({
			url: proxyurl+url,
			type: 'GET',
			dataType: 'json',
			async: false,
			success: function (json) {
				console.log(json);
				to_return = 'wss://'+json['domain']+':'+json['port']+'/api/ws';
			}
		});
		return to_return;
	} else {
		var domain = user_info['region']+'-pconnect'+Math.ceil(Math.random()*3)+'.coolkit.cc';
		return 'wss://'+domain+':8080/api/ws';
	}
}

function get_ws(user_info, lookup) {
	if (lookup == true) {
		user_info['ws_address'] = get_ws_address(user_info, lookup)
	}
	ws = new WebSocket(user_info['ws_address'])
	payload = {
		'action'    : 'userOnline',
		'userAgent' : 'app',
		'at'        : user_info['bearer_token'],
		'apikey'    : user_info['user_apikey'],
	}
	ws.onmessage = function (event) {
		console.log(event.data);
	}
	ws.onopen = function (event) {
		console.log('ws open');
		ws.send(JSON.stringify(payload));
	}
	ws.onclose = function (event) {
		console.log('ws closed. Reconnect will be attempted in 1 second.', event.reason);
		setTimeout(function() {
			user_info['ws'] = get_ws(user_info, true);
		}, 1000);
	};
	return ws;
}

function switch_device(device, user_info, new_state) {
	var ws = user_info['ws'];
	payload = {
		'action'        : 'update',
		'userAgent'     : 'app',
		'params'        : { 'switch' : new_state },
		'apikey'        : device['apikey'],
		'deviceid'      : device['deviceid'],
		'sequence'      : get_time(),
        }
        if ('controlType' in device['params']) {
        	payload['controlType'] = device['params']['controlType'];
        } else {
        	payload['controlType'] = 4;
        }
        ws.send(JSON.stringify(payload));
}

function do_login() {
	var login_div = document.getElementById("login");
	login_div.classList.add('hidden');
	var loader_div = document.getElementById("loader");
	loader_div.classList.remove('hidden');
	var username = document.getElementById("username").value;
	var password = document.getElementById("password").value;
	var region = document.getElementById("region").value;
	setTimeout(function(){
		user_info = login(username, password, region);
		if (user_info['logged_in'] == true) {
			device_list = get_device_list(user_info);
			user_info['devices'] = device_list['devices']
			on_login(user_info);
		} else {
			on_logout();
			document.getElementById('loginfailed').innerHTML = 'Login failed';
		}
	}, 100);
}

function check_login(user_info) {
	if (! user_info['bearer_token'] == '') {
		console.log('Getting devices');
		device_list = get_device_list(user_info);
		return device_list;
	} else {
		console.log('No bearer_token');
		return false;
	}
}

function on_login(user_info) {
	var login_div = document.getElementById('login');
	login_div.classList.add('hidden');
	var switches = document.getElementById('switches');
	switches.classList.remove('hidden');
	var loader_div = document.getElementById('loader');
	loader_div.classList.add('hidden');
	update_devices(user_info);
	user_info['ws_address'] = get_ws_address(user_info);
	user_info['ws'] = get_ws(user_info);
}

function update_devices(user_info, force_update) {
	if (force_update == true) {
		device_list = get_device_list(user_info);
		user_info['devices'] = device_list['devices']
	}
	var devices = user_info['devices']
	var switches = document.getElementById('switches');
	switches.innerHTML = '';
	for (device in devices) {
		console.log(devices[device]);
		var brand = devices[device]['brandName'];
		var model = devices[device]['productModel'];
		var name = devices[device]['name'];
		var state = devices[device]['params']['switch'];
		switches.innerHTML += '<br />'+brand+' '+model+' '+name+': ';
		if (state == 'off') {
			switches.innerHTML += '<a href="#" class="ui-btn ui-btn-b ui-btn-inline ui-icon-power ui-btn-icon-left" onclick="toggle('+device+');">Off</a>';
		} else {
			switches.innerHTML += '<a href="#" class="ui-btn ui-btn-inline ui-icon-power ui-btn-icon-left" onclick="toggle('+device+');">On</a>';
		}
	}
	setTimeout(update_devices, 10000, user_info, true);
}

function toggle(device_no) {
	var device = user_info['devices'][device_no];
	var state = device['params']['switch'];
	if (state == 'off') {
		new_state = 'on';
	} else {
		new_state = 'off';
	}
	switch_device(device, user_info, new_state);
	update_devices(user_info, true);
}

function on_logout() {
	var switches = document.getElementById('switches');
	switches.classList.add('hidden');
	var login_div = document.getElementById('login');
	login_div.classList.remove('hidden');
	var loader_div = document.getElementById('loader');
	loader_div.classList.add('hidden');
}

