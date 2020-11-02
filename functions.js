// From https://pypi.org/project/tuyapy/

const baseurl = "https://px1.tuyaeu.com/homeassistant/";
var proxyurl = "https://cors-anywhere.herokuapp.com/";
var autoRefreshTimer;
var user_info = {};

$( document ).ready(function() {
	testFirstCookie();
	document.getElementById("password").onkeydown = function (e) {
		if (e.keyCode === 13) {
			do_login();
		}
	};
	user_info = {"access_token": getCookie("access_token")};
	console.log(user_info);
	logged_in = check_login(user_info);
	if (logged_in["success"] === true) {
		user_info["devices"] = logged_in["devices"];
		on_login(user_info);
		user_info["logged_in"] = true;
	} else {
		on_logout();
		user_info["logged_in"] = false;
	}

	readLocalStorage();
	$('#autorefresh').on("change", function () {
		localStorage.autoRefresh = $(this).prop("checked");
		checkAutorefresh();
	});
	checkAutorefresh();
});

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
				if (storecreds === true) {
					setCookie("access_token", json["access_token"], json["expires_in"]/3600);
				}
			}
		}
	});
	return to_return;
}

function get_device_list(user_info) {
	to_return = {};
	var url;
	if (user_info["access_token"].substring(0,2) === "EU") {
		url = baseurl + "skill";
	} else if (user_info["access_token"].substring(0,2) === "AY") {
		url = baseurl.replace("eu", "cn") + "skill";
	} else {
		url = baseurl.replace("eu", "us") + "skill";
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
				to_return["devices"] = (user_info["devices"] !== undefined ? user_info["devices"] : JSON.parse(localStorage.devices));
				to_return["success"] = true;
			} else if ("payload" in json && "devices" in json["payload"]) {
				to_return["devices"] = json["payload"]["devices"];
				to_return["success"] = true;
				localStorage.devices = JSON.stringify(to_return["devices"]);
			}
		}
	});
	return to_return
}

function switch_device(device, user_info, new_state) {
	to_return = {};
	var url;
	if (user_info["access_token"].substring(0,2) === "EU") {
		url = baseurl + "skill";
	} else if (user_info["access_token"].substring(0,2) === "AY") {
		url = baseurl.replace("eu", "cn") + "skill";
	} else {
		url = baseurl.replace("eu", "us") + "skill";
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
	if (user_info["access_token"] !== "") {
		console.log("Getting devices");
		device_list = get_device_list(user_info);
		return device_list;
	} else {
		console.log("No access_token");
		return false;
	}
}

function readLocalStorage(){
	// Not initialized
	if (localStorage.autoRefresh == null) {
		localStorage.autoRefresh = "true";
		localStorage.theme = "a";
	}
	$('#autorefresh').prop( "checked", localStorage.autoRefresh === "true").checkboxradio( "refresh" );
	if (localStorage.theme !== "a") {
		checkTheme();
	}
}

function checkTheme(){
	switchTheme();
	localStorage.theme = $("#page").attr("data-theme");
}

function checkAutorefresh(){
	clearInterval(autoRefreshTimer);
	if (localStorage.autoRefresh === "true" && user_info["logged_in"] === true) {
		autoRefreshTimer = setInterval(update_devices, 30_000, user_info, true);
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
	checkAutorefresh();
}

function update_devices(user_info, force_update) {
	if (force_update === true) {
		device_list = get_device_list(user_info);
		user_info["devices"] = device_list["devices"];
		$('#switches').html('');
	}
	var devices = user_info["devices"];
	for (device_no in devices) {
		add_or_update_switch(devices[device_no], device_no);
	}
}

function toggle(device_no) {
	var device = user_info["devices"][device_no];
	var state = device["data"]["state"];
	if (state === false) {
		new_state = 1;
	} else {
		new_state = 0;
	}
	switch_device(device, user_info, new_state);
	device["data"]["state"] = ! state;
	add_or_update_switch(device, device_no);
}

function on_logout() {
	var switches = document.getElementById("switches");
	switches.classList.add("hidden");
	var login_div = document.getElementById("login");
	login_div.classList.remove("hidden");
	var loader_div = document.getElementById("loader");
	loader_div.classList.add("hidden");
}

function add_or_update_switch(device, device_no){
	var name = device["name"];
	var state = device["data"]["state"];
	var online = device["data"]["online"];
	var icon = device["icon"];
	var device_id = device["id"];
	var type = device["dev_type"];

	var currentActionDiv = $('#action_'+ device_id);
	if (currentActionDiv.length === 0) {
		var deviceDiv = createElement("div", "gridElem singleSwitch borderShadow ui-btn ui-btn-up-b ui-btn-hover-b");
		var nameDiv = createElement("div", "switchName");
		nameDiv.innerHTML = name;
		var imgDiv = createElement("div", "switchImg");
		imgDiv.innerHTML = createImg(icon, name, type);
		var actionDiv = createElement("div", null);
		actionDiv.setAttribute("id", "action_" + device_id);
		actionDiv.innerHTML = createActionLink(device_no, online, state, type);
		deviceDiv.appendChild(imgDiv);
		deviceDiv.appendChild(nameDiv);
		deviceDiv.appendChild(actionDiv);
		$('#switches')[0].appendChild(deviceDiv);
	} else {
		var parentDiv = currentActionDiv.parent()[0];
		currentActionDiv.remove();
		var newActionDiv = createElement("div", null);
		newActionDiv.setAttribute("id", "action_" + device_id);
		newActionDiv.innerHTML = createActionLink(device_no, online, state, type);
		parentDiv.appendChild(newActionDiv);
	}
}

function createActionLink(device, online, state, type){
	var onString = type === "scene" ? "Start" : "On";
	if (online === false) {
		return '<a href="#" class="borderShadow ui-btn ui-disabled ui-btn-inline ui-icon-power ui-btn-icon-left">Offline</a>';
	} else if (state === false) {
		return '<a href="#" class="borderShadow ui-btn ui-btn-b ui-btn-inline ui-icon-power ui-btn-icon-left" onclick="toggle('+device+');">Off</a>';
	} else {
		return '<a href="#" class="borderShadow ui-btn ui-btn-inline ui-icon-power ui-btn-icon-left" onclick="toggle('+device+');">' + onString + '</a>';
	}
}

function createImg(icon, name, type){
	if (isNullOrEmpty(icon)) {
		return "<p>" + type + "</p>";
	}
	return "<img width=50 src='" + icon + "' alt='" + name + "'>";
}

function createElement(typeName, className){
	var elem = document.createElement(typeName);
	if (!isNullOrEmpty(className)) {
		elem.className = className;
	}
	return elem;
}

function isNullOrEmpty(entry){
	return entry == null || entry === '';
}

