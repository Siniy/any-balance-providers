﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://stat.tverline.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl+'cgi-bin/stat.pl', g_headers);
	var ses = getParam(html, null, null, /type=hidden name=ses value=([\s\S]*?)>/i, null, null);
	var pp = prefs.password;
	
	var pass = hex_md5(ses+' '+pp);
	html = AnyBalance.requestGet(baseurl + '/cgi-bin/stat.pl?ses='+ses+'&uu='+prefs.login+'&pp='+pass, addHeaders({Referer: baseurl})); 
	
    if(!/Личные данные/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /ФИО[\s\S]*?right>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /На вашем счете[\s\S]*?right>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'traf_total', /Интернет трафик[\s\S]*?right>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}