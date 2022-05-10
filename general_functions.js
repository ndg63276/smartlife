function testFirstCookie(){
	var visit = getCookie("cookieCompliancyAccepted");
	if (visit == ""){
		$("#myCookieConsent").fadeIn(400);	// Show warning
	}
}

function acceptCookies(){
	setCookie("cookieCompliancyAccepted", "true", 365*24)
	$("#myCookieConsent").hide(400);
}

function last_element(arr) {
	return arr[arr.length-1]
}

function sortByKey(array, key) {
	return array.sort(function(a, b) {
		var x = a[key]; var y = b[key];
		return ((x < y) ? -1 : ((x > y) ? 1 : 0));
	});
}

function getCookie(cname) {
	var name = cname + "=";
	var ca = document.cookie.split(";");
	for(var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == " ") {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

function setCookie(cname, cvalue, exhours) {
	var d = new Date();
	d.setTime(d.getTime() + (exhours * 60 * 60 * 1000));
	var expires = "expires="+d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function parseDateParam(param) {
	var to_return = new Date();
	if (param == 'now') {
		// do nothing
	} else if (param == 'future_prices') {
		if (to_return.getHours() >= 16) {
			to_return.setDate(to_return.getDate()+1);
			to_return.setHours(23, 0, 0, 0);
		} else {
			to_return.setHours(23, 0, 0, 0);
		}
	} else if (param.startsWith("20")) {
		var pattern = /([0-9]{4})-?([0-9]{2})-?([0-9]{2})T?([0-9]{2})?:?([0-9]{2})?:?([0-9]{2})?.*/;
		var match = param.match(pattern);
		year = match[1];
		month = match[2];
		day = match[3];
		if (match[4] == null) { hour = 0; } else { hour = match[4]; }
		if (match[5] == null) { min = 0; } else { min = match[5]; }
		if (match[6] == null) { sec = 0; } else { sec = match[6]; }
		to_return = new Date(year, month-1, day, hour, min, sec);
	} else {
		var pattern = /([+ -])([0-9]+)(year|month|week|day|hour|min|sec).*/i;
		var match = param.match(pattern);
		if (match != null) {
			if (match[1] == "-") {
				plusminus = -1
			} else {
				plusminus = 1
			}
			if (match[3].includes("year")) {
				to_return.setFullYear(to_return.getFullYear() + plusminus * match[2]);
			}
			if (match[3].includes("month")) {
				to_return.setMonth(to_return.getMonth() + plusminus * match[2]);
			}
			if (match[3].includes("week")) {
				to_return.setDate(to_return.getDate() + plusminus * match[2] * 7);
			}
			if (match[3].includes("day")) {
				to_return.setDate(to_return.getDate() + plusminus * match[2]);
			}
			if (match[3].includes("hour")) {
				to_return.setHours(to_return.getHours() + plusminus * match[2]);
			}
			if (match[3].includes("min")) {
				to_return.setMinutes(to_return.getMinutes() + plusminus * match[2]);
			}
			if (match[3].includes("sec")) {
				to_return.setSeconds(to_return.getSeconds() + plusminus * match[2]);
			}
		}
	}
	return to_return;
}

function capitalise(str) {
	if (typeof str !== 'undefined' && str !== null) {
		return str.charAt(0).toUpperCase() + str.slice(1)
	} else {
		return str
	}
}

function hardCapitalise(str) {
	if (typeof str !== 'undefined' && str !== null) {
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
	} else {
		return str
	}
}

function get_json(jsonfile) {
	var to_return = {};
	$.ajax({
		url: jsonfile,
		async: false,
		dataType: "json",
		success: function (json) {
			to_return = json;
		}
	});
	return to_return;
}

function get_text(file) {
	var to_return = {};
	$.ajax({
		url: file,
		async: false,
		success: function (text) {
			to_return = text.trim();
		}
	});
	return to_return;
}

String.prototype.obfuscate = function () {
	var bytes = [];
	for (var i = 0; i < this.length; i++) {
		bytes.push(this.charCodeAt(i).toString(16));
	}
	return bytes.join('$');
}

String.prototype.deobfuscate = function () {
	var arr = this.split('$');
	return arr.map(function(c) {
		return String.fromCharCode(parseInt(c, 16))
	}).reduce(function(a, b) {return a  + b})
}

$.mobile.changeGlobalTheme = function(theme) {
	// These themes will be cleared, add more
	// swatch letters as needed.
	var themes = " a b c d e";

	// Updates the theme for all elements that match the
	// CSS selector with the specified theme class.
	function setTheme(cssSelector, themeClass, theme) {
		$(cssSelector)
			.removeClass(themes.split(" ").join(" " + themeClass + "-"))
			.addClass(themeClass + "-" + theme)
			.attr("data-theme", theme);
	}

	// Add more selectors/theme classes as needed.
	setTheme(".ui-mobile-viewport", "ui-overlay", theme);
	setTheme("[data-role='page']", "ui-body", theme);
	setTheme("[data-role='header']", "ui-bar", theme);
	setTheme("[data-role='listview'] > li", "ui-bar", theme);
	setTheme(".ui-btn", "ui-btn-up", theme);
	setTheme(".ui-btn", "ui-btn-hover", theme);
};

function switchTheme() {
	if (document.getElementById("page").classList.contains('ui-body-b')) {
		$.mobile.changeGlobalTheme("a");
		document.getElementById("logo").classList.remove("hidden")
		document.getElementById("logo_dark").classList.add("hidden")
	} else {
		$.mobile.changeGlobalTheme("b");
		document.getElementById("logo").classList.add("hidden")
		document.getElementById("logo_dark").classList.remove("hidden")
	}
}
