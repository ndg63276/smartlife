// From https://pypi.org/project/tuyapy/

const baseurl = "https://px1.tuyaeu.com/homeassistant/";
var proxyurl = "https://cors-anywhere.herokuapp.com/";

function login(username, password, region, storecreds) {
	var to_return = {};
	var url = baseurl + "auth.do";
	var headers = {
		"Content-Type": "application/x-www-form-urlencoded"
	}
	var data = {
		"userName": username,
		"password": password,
		"countryCode": region,
		"bizType": "smart_life",
		"from": "tuya",
	}
	$.ajax({
		url: proxyurl+url,
		type: "POST",
		headers: headers,
		data: data,
		dataType: "json",
		async: false,
		success: function (json) {
			console.log(json);
			if ("access_token" in json) {
				to_return["access_token"] = json["access_token"];
				to_return["logged_in"] = true;
				if (storecreds == true) {
					setCookie("access_token", json["access_token"], json["expires_in"]/3600);
				}
			}
		}
	});
	return to_return;
}

function get_device_list(user_info) {
	to_return = {};
	if (user_info["access_token"].substring(0,2) === "EU") {
		var url = baseurl + "skill";
	} else if (user_info["access_token"].substring(0,2) === "AY") {
		var url = baseurl.replace("eu", "cn") + "skill";
	} else {
		var url = baseurl.replace("eu", "us") + "skill";
	}
	var headers = {
		"Content-Type": "application/json"
	}
	data = {
		"header": {
			"name": "Discovery",
			"namespace": "discovery",
			"payloadVersion": 1,
		},
		"payload": {
			"accessToken": user_info["access_token"],
		},
	}
	$.ajax({
		url: proxyurl+url,
		type: "POST",
		headers: headers,
		data: JSON.stringify(data),
		dataType: "json",
		async: false,
		success: function (json) {
			console.log(json);
			if ("header" in json && "code" in json["header"] && json["header"]["code"] === "FrequentlyInvoke") {
				to_return["devices"] = user_info["devices"];
				to_return["success"] = true;
			} else if ("payload" in json && "devices" in json["payload"]) {
				to_return["devices"] = json["payload"]["devices"];
				to_return["success"] = true;
			}
		}
	});
	return to_return
}

function switch_device(device, user_info, new_state) {
	to_return = {};
	if (user_info["access_token"].substring(0,2) === "EU") {
		var url = baseurl + "skill";
	} else if (user_info["access_token"].substring(0,2) === "AY") {
		var url = baseurl.replace("eu", "cn") + "skill";
	} else {
		var url = baseurl.replace("eu", "us") + "skill";
	}
	var headers = {
		"Content-Type": "application/json"
	}
	var data = {
		"header": {
			"name": "turnOnOff",
			"namespace": "control",
			"payloadVersion": 1
		},
		"payload": {
			"accessToken": user_info["access_token"],
			"devId": device["id"],
			"value": new_state
		}
	}
	$.ajax({
		url: proxyurl+url,
		type: "POST",
		headers: headers,
		data: JSON.stringify(data),
		dataType: "json",
		async: false,
		success: function (json) {
			console.log(json);
		}
	});
	return to_return
}

function do_login() {
	var login_div = document.getElementById("login");
	login_div.classList.add("hidden");
	var loader_div = document.getElementById("loader");
	loader_div.classList.remove("hidden");
	var username = document.getElementById("username").value;
	var password = document.getElementById("password").value;
	var region = document.getElementById("region").value;
	var storecreds = document.getElementById("storecreds").checked;
	setTimeout(function(){
		user_info = login(username, password, region, storecreds);
		if (user_info["logged_in"] === true) {
			device_list = get_device_list(user_info);
			user_info["devices"] = device_list["devices"]
			on_login(user_info);
		} else {
			on_logout();
			document.getElementById("loginfailed").innerHTML = "Login failed";
		}
	}, 100);
}

function check_login(user_info) {
	if (! user_info["access_token"] === "") {
		console.log("Getting devices");
		device_list = get_device_list(user_info);
		return device_list;
	} else {
		console.log("No access_token");
		return false;
	}
}

function on_login(user_info) {
	var login_div = document.getElementById("login");
	login_div.classList.add("hidden");
	var switches = document.getElementById("switches");
	switches.classList.remove("hidden");
	var loader_div = document.getElementById("loader");
	loader_div.classList.add("hidden");
	update_devices(user_info, false);
}

function update_devices(user_info, force_update) {
	if (force_update == true) {
		device_list = get_device_list(user_info);
		user_info["devices"] = device_list["devices"];
		$('#switches').html('');
	}
	var devices = user_info["devices"];
	for (device in devices) {
		var name = devices[device]["name"];
		var state = devices[device]["data"]["state"];
		var online = devices[device]["data"]["online"];
		var icon = devices[device]["icon"];
		var device_id = devices[device]["id"];

		add_or_update_switch(name, state, online, icon, device_id, device);
	}
	//setTimeout(update_devices, 30000, user_info, true, true);
}

function toggle(device_no) {
	var device = user_info["devices"][device_no];
	var state = device["data"]["state"];
	if (state == false) {
		new_state = 1;
	} else {
		new_state = 0;
	}
	switch_device(device, user_info, new_state);
	device["data"]["state"] = ! state;
	add_or_update_switch(device.name, device.data.state, device.data.online, device.icon, device.id, device_no);
}

function on_logout() {
	var switches = document.getElementById("switches");
	switches.classList.add("hidden");
	var login_div = document.getElementById("login");
	login_div.classList.remove("hidden");
	var loader_div = document.getElementById("loader");
	loader_div.classList.add("hidden");
}

function add_or_update_switch(name, state, online, icon, device_id, device_no){
	var currentActionDiv = $('#action_'+ device_id);
	if(currentActionDiv.length === 0){
		var deviceDiv = createElement("div", "gridElem singleSwitch borderShadow ui-btn ui-shadow ui-corner-all ui-btn-up-b ui-btn-hover-b");

		var nameDiv = createElement("div", "switchName");
		nameDiv.innerHTML = name;
		var imgDiv = createElement("div", null);
		imgDiv.innerHTML = createImg(icon, name);
		var actionDiv = createElement("div", null);
		actionDiv.setAttribute("id", "action_" + device_id);
		actionDiv.innerHTML = createActionLink(device_no, online, state);

		deviceDiv.appendChild(imgDiv);
		deviceDiv.appendChild(nameDiv);
		deviceDiv.appendChild(actionDiv);

		$('#switches')[0].appendChild(deviceDiv);
	}
	else{
		var parentDiv = currentActionDiv.parent()[0];
		currentActionDiv.remove();
		var newActionDiv = createElement("div", null);
		newActionDiv.setAttribute("id", "action_" + device_id);
		newActionDiv.innerHTML = createActionLink(device_no, online, state);

		parentDiv.appendChild(newActionDiv);
	}
}

function createActionLink(device, online, state){
	if (online === false) {
		return '<a href="#" class="borderShadow ui-btn ui-disabled ui-btn-inline ui-icon-power ui-btn-icon-left">Offline</a>';
	} else if (state === false) {
		return '<a href="#" class="borderShadow ui-btn ui-btn-b ui-btn-inline ui-icon-power ui-btn-icon-left" onclick="toggle('+device+');">Off</a>';
	} else {
		return '&nbsp;<a href="#" class="borderShadow ui-btn ui-btn-inline ui-icon-power ui-btn-icon-left" onclick="toggle('+device+');">On</a>';
	}
}

function createImg(icon, name){
	return "<img width=50 src='" + icon + "' alt='" + name + "'>";
}

function createElement(typeName, className){
	var elem = document.createElement(typeName);
	if(!isNullOrEmpty(className))
		elem.className = className;

	return elem;
}

function isNullOrEmpty(entry){
	return entry == null || entry === '';
}

