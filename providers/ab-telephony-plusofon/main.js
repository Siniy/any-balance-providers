﻿
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://portal.plusofon.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'signin', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var CSRF = getParam(html, null, null, /<input[^>]+name="_csrf"[^>]+value="([^"]*)/i);
	if(!CSRF) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удалось найти параметр запроса. Сайт изменён?");
	}
	html = AnyBalance.requestPost(baseurl + 'signin', {
		'LoginForm[username]': 	 prefs.login,
		'LoginForm[rememberMe]': 0,
		'LoginForm[password]':   prefs.password,
		'_csrf':				 CSRF
	}, AB.addHeaders({
		Referer: baseurl + 'signin'
	}));

	if (!/signout/i.test(html)) {
		var error = AB.getParam(html, null, null, /Пароль[\s\S]*?<p[^>]+error[^>]*>([\s\S]*?)<\/p>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	AB.getParam(html, result, 'balance', /<p[^>]*>Баланс:([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'limit', /<p[^>]*>Кредитный лимт:([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, ['currency', 'balance', 'limit'], /<p[^>]*>Баланс:([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseCurrency);

	html = AnyBalance.requestGet(baseurl + 'site/get-tariff', addHeaders({
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var json = getJson(html);
	AB.getParam(json.name, result, '__tariff');

	if(isAvailable(['available_nums', 'on_nums'])) {
		html = AnyBalance.requestGet(baseurl + 'site/get-numbers', addHeaders({
			'X-Requested-With': 'XMLHttpRequest'
		}));

		json = getJson(html);
		AB.getParam(json.avaliable + '', result,  'available_nums', null, null, parseBalance);
		AB.getParam(json.on + '', 		 result,  'on_nums', 		null, null, parseBalance);
	}

	if(isAvailable('agreement')) {
		html = AnyBalance.requestGet(baseurl + 'agreement', g_headers);
		AB.getParam(html, result, 'agreement', /Информация по договору:([\s\S]*?)<\//i, replaceTagsAndSpaces);
	}

	if(isAvailable(['fio', 'phone', 'email'])) {
		html = AnyBalance.requestGet(baseurl + 'site/get-assigned', addHeaders({
			'X-Requested-With': 'XMLHttpRequest'
		}));
		json = getJson(html);

		AB.getParam(json.fio, 	result, 'fio');
		AB.getParam(json.phone, result, 'phone');
		AB.getParam(json.email, result, 'email');
	}
	AnyBalance.setResult(result);
}
