// From https://pypi.org/project/tuyapy/

const baseurl = "https://px1.tuyaeu.com/homeassistant/";
var proxyurl = "https://cors.smartathome.co.uk/";
var autoRefreshTimer;
var user_info = {};

$( document ).ready(function() {
	testFirstCookie();
	document.getElementById("password").onkeydown = function (e) {
		if (e.keyCode === 13) {
			do_login();
		}
	};
	user_info = {
		"access_token": getCookie("access_token"),
		"sl_refresh_token": getCookie("sl_refresh_token"),
		"sl_expires_in": getCookie("sl_expires_in")
	};
	console.log(user_info);
	logged_in = check_login();
	if (logged_in["success"] === true) {
		user_info["devices"] = logged_in["devices"];
		on_login();
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
			store_tokens(json, storecreds);
		}
	});
}

function store_tokens(json, storecreds) {
	if ("access_token" in json) {
		user_info["access_token"] = json["access_token"];
		user_info["sl_refresh_token"] = json["refresh_token"];
		user_info["sl_expires_in"] = Date.now() + json["expires_in"]*1000;
		user_info["logged_in"] = true;
		if (storecreds === true) {
			setCookie("access_token", json["access_token"], json["expires_in"]/3600);
			setCookie("sl_refresh_token", json["refresh_token"], json["expires_in"]/3600);
			setCookie("sl_expires_in", Date.now() + json["expires_in"]*1000, json["expires_in"]/3600);
		}
	}
}

function get_device_list(refresh_access_token) {
	if (refresh_access_token === true) {
		refresh_token();
	}
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
				to_return["devices"] = merge_devices(json["payload"]["devices"], user_info["devices"]);
				to_return["success"] = true;
				localStorage.devices = JSON.stringify(to_return["devices"]);
			}
		}
	});
	return to_return
}

function merge_devices(a, b){
	if (b == null) { return a };
	if (a.length != b.length) { return a };
	for (device_no in b) {
		if (!("data" in b[device_no])) { continue; };
		if (!("data" in a[device_no])) { continue; };
		for (prop in b[device_no]["data"]) {
			if (!(prop in a[device_no]["data"])) {
				a[device_no]["data"][prop] = b[device_no]["data"][prop];
			}
		}
	}
	return a;
}

function adjust_device(device, action, value_name, new_state) {
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
			"name": action,
			"namespace": "control",
			"payloadVersion": 1
		},
		"payload": {
			"accessToken": user_info["access_token"],
			"devId": device["id"]
		}
	}
	// object must be created before you can use a variable as a key
	data["payload"][value_name] = new_state;
	$.ajax({
		url: proxyurl+url,
		type: "POST",
		headers: headers,
		data: JSON.stringify(data),
		dataType: "json",
		async: false,
		success: function (json) {
			console.log(json);
			to_return = json;
		}
	});
	return to_return
}

function refresh_token() {
	url = baseurl + "access.do";
	params = { "grant_type": "refresh_token", "refresh_token": user_info["sl_refresh_token"], "rand": Math.random() }
	$.ajax({
		url: proxyurl+url,
		type: "GET",
		data: params,
		dataType: "json",
		async: false,
		success: function (json) {
			console.log(json);
			new_info = store_tokens(json, true);
		}
	});
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
		login(username, password, region, storecreds);
		if (user_info["logged_in"] === true) {
			device_list = get_device_list(false);
			user_info["devices"] = device_list["devices"]
			on_login();
		} else {
			on_logout();
			document.getElementById("loginfailed").innerHTML = "Login failed";
		}
	}, 100);
}

function check_login() {
	if (user_info["access_token"] !== "") {
		console.log("Getting devices");
		device_list = get_device_list(false);
		return device_list;
	} else {
		console.log("No access_token");
		return {"success": false};
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
		autoRefreshTimer = setInterval(update_devices, 31_000, true);
	}
}

function on_login() {
	var login_div = document.getElementById("login");
	login_div.classList.add("hidden");
	var switches = document.getElementById("switches");
	switches.classList.remove("hidden");
	var buttons = document.getElementById("buttons");
	buttons.classList.remove("hidden");
	var loader_div = document.getElementById("loader");
	loader_div.classList.add("hidden");
	update_devices(false);
	checkAutorefresh();
}

function update_devices(force_update) {
	if (force_update === true) {
		device_list = get_device_list(true);
		user_info["devices"] = device_list["devices"];
		//$('#switches').html('');
	}
	var devices = user_info["devices"];
	for (device_no in devices) {
		add_or_update_switch(devices[device_no], device_no);
	}
}

function toggle(device_no) {
	var device = user_info["devices"][device_no];
	var state = device["data"]["state"];
	var dev_type = device["dev_type"];
	if (state === false || dev_type === "scene") {
		new_state = 1;
	} else {
		new_state = 0;
	}
	success = adjust_device(device, "turnOnOff", "value", new_state);
	if ("header" in success && "code" in success["header"] && success["header"]["code"] === "SUCCESS" && dev_type !== "scene"){
		device["data"]["state"] = ! state;
		add_or_update_switch(device, device_no);
	}
}

function change_brightness(device_no, new_brightness) {
	var device = user_info["devices"][device_no];
	success = adjust_device(device, "brightnessSet", "value", new_brightness);
	if ("header" in success && "code" in success["header"] && success["header"]["code"] === "SUCCESS"){
		device["data"]["brightness"] = new_brightness * 10;
	}
}

function change_color_temperature(device_no, new_temperature) {
	var device = user_info["devices"][device_no];
	success = adjust_device(device, "colorTemperatureSet", "value", new_temperature);
	if ("header" in success && "code" in success["header"] && success["header"]["code"] === "SUCCESS"){
		// min temp = 1000, reports as 1000
		// max temp = 10000, reports as 36294
		new_color_temp = ((new_temperature - 1000) * 4.033) + 1000;
		device["data"]["color_temp"] = new_color_temp;
		device["data"]["color_mode"] = "white";
	}
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
	if (online === false) { state = false };
	var icon = device["icon"];
	var device_id = device["id"];
	var type = device["dev_type"];

	var currentActionDiv = $('#action_'+ device_id);
	if(currentActionDiv.length === 0) {
		var deviceDiv = createElement("div", "gridElem singleSwitch borderShadow ui-btn ui-btn-up-b ui-btn-hover-b " + getSwitchClass(type, state));
		var nameDiv = createElement("div", "switchName");
		nameDiv.innerHTML = name;
		var imgTable = createElement("table", "switchImg");
		var imgTd = createElement("td");
		imgTd.innerHTML = createImg(icon, name, type);
		imgTable.appendChild(imgTd);
		if ("color_mode" in device["data"] && online === true) {
			var cTd = createColorSelector(device, device_no);
			imgTable.appendChild(cTd);
		}
		var actionDiv = createElement("div", "switchAction");
		actionDiv.id = "action_" + device_id;
		actionDiv.innerHTML = createActionLink(device_no, online, state, type);
		deviceDiv.appendChild(imgTable);
		deviceDiv.appendChild(nameDiv);
		deviceDiv.appendChild(actionDiv);
		if ("brightness" in device["data"] && online === true) {
			var bTable = createBrightnessSlider(device, device_no);
			deviceDiv.appendChild(bTable);
		}
		if ("color_temp" in device["data"] && online === true) {
			var ctTable = createColorTempSlider(device, device_no);
			deviceDiv.appendChild(ctTable);
		}
		$('#switches')[0].appendChild(deviceDiv);
		setUpColors(device_no);
	} else {
		var parentDiv = currentActionDiv.parent()[0];
		parentDiv.classList.remove("switch_true");
		parentDiv.classList.remove("switch_false");
		parentDiv.classList.add(getSwitchClass(type, state));
		currentActionDiv.remove();
		var newActionDiv = createElement("div", "switchAction");
		newActionDiv.setAttribute("id", "action_" + device_id);
		newActionDiv.innerHTML = createActionLink(device_no, online, state, type);
		parentDiv.appendChild(newActionDiv);
		if ("brightness" in device["data"] && online === true) {
			document.getElementById("brightness_" + device_id).value = device["data"]["brightness"] / 10;
		}
		if ("color_temp" in device["data"] && online === true) {
			document.getElementById("colortemp_" + device_id).value = ((device["data"]["color_temp"] - 1000) / 4.033) + 1000;
		}
	}
}

function getSwitchClass(type, state){
	return "switch_" + (type === "scene" ? "scene" : state);
}

function setUpColors(device_no) {
	$("#color_"+device_no).spectrum({
		type: "color",
		hideAfterPaletteSelect: true,
		showInitial: true,
		showAlpha: false,
		change: function() {
			changeColor(this)
		}
	});
}

function createColorSelector(device, device_no){
	var cTd = createElement("td", "colorSelectorTd");
	var inp = document.createElement("input", "colorSelector");
	h = device["data"]["hue"];
	s = device["data"]["saturation"];
	v = device["data"]["brightness"];
	inp.value = "hsv("+h+", "+s+", "+v+")";
	inp.id = "color_"+device_no;
	cTd.appendChild(inp);
	return cTd;
}

function createBrightnessSlider(device, device_no){
	var device_id = device["id"];
	var bTable = createElement("table", "switchBrightness");
	var bTd = createElement("td");
	var brightnessDiv = createElement("input", "slider100");
	brightnessDiv.id = "brightness_" + device_id;
	brightnessDiv.type = "range";
	brightnessDiv.min = 11;
	brightnessDiv.max = 100;
	brightnessDiv.value = device["data"]["brightness"] / 10;
	brightnessDiv.onchange = function () { change_brightness(device_no, this.value) };
	bTd.appendChild(brightnessDiv);
	bTable.appendChild(bTd);
	var bTd2 = createElement("td");
	bTd2.innerHTML = "&#128262;";
	bTable.appendChild(bTd2);
	return bTable;
}

function createColorTempSlider(device, device_no){
	var device_id = device["id"];
	var ctTable = createElement("table", "switchColorTemp");
	var ctTd1 = createElement("td");
	ctTd1.innerHTML = "<small>2700K</small>";
	ctTable.appendChild(ctTd1);
	var ctTd = createElement("td");
	var colorTempDiv = createElement("input", "colorTempSlider");
	colorTempDiv.id = "colortemp_" + device_id;
	colorTempDiv.type = "range";
	colorTempDiv.min = 1000;
	colorTempDiv.max = 10000;
	colorTempDiv.value = ((device["data"]["color_temp"] - 1000) / 4.033) + 1000;
	colorTempDiv.onchange = function () { change_color_temperature(device_no, this.value) };
	ctTd.appendChild(colorTempDiv);
	ctTable.appendChild(ctTd);
	var ctTd2 = createElement("td");
	ctTd2.innerHTML = "<small>6500K</small>";
	ctTable.appendChild(ctTd2);
	return ctTable;
}

function createActionLink(device_no, online, state, type){
	var onString = type === "scene" ? "Start" : "On";
	if (online === false) {
		return '<a href="#" class="borderShadow ui-btn ui-disabled ui-btn-inline ui-icon-power ui-btn-icon-left">Offline</a>';
	} else if (state === false) {
		return '<a href="#" class="borderShadow ui-btn ui-btn-b ui-btn-inline ui-icon-power ui-btn-icon-left" onclick="toggle('+device_no+');">Off</a>';
	} else {
		return '<a href="#" class="borderShadow ui-btn ui-btn-inline ui-icon-power ui-btn-icon-left" onclick="toggle('+device_no+');">' + onString + '</a>';
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

function logout() {
	setCookie("access_token", "", -1);
	setCookie("sl_refresh_token", "", -1);
	setCookie("sl_expires_in", "", -1);
	location.reload();
}

function changeColor(element) {
	device_no = element.id.replace("color_", "");
	var device = user_info["devices"][device_no];
	var t = $("#"+element.id).spectrum("get");
	var new_color = {};
	if (t === null || t.toName() == "white"){
		h = 0;
		s = 0;
		t = "white";
	} else {
		hsv = t.toHsv();
		h = hsv["h"];
		s = hsv["s"];
		v = hsv["v"];
	}
	new_color = {"hue": h, "saturation": s, "brightness": device["data"]["brightness"] / 10};
	success = adjust_device(device, "colorSet", "color", new_color);
	if ("header" in success && "code" in success["header"] && success["header"]["code"] === "SUCCESS"){
		device["data"]["hue"] = h;
		device["data"]["saturation"] = s;
		localStorage.devices = JSON.stringify(user_info["devices"]);
		$("#color_"+device_no).spectrum("set", t);
	}
}
