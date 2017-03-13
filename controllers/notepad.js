var redis = require('../src/redis')
, async = require('async')
, dbox  = require("dbox")
, crypto = require("crypto")
, fs = require('fs');
/*--dbox config---*/
var appx   = dbox.app({ 
	"app_key": "dbox_app_key",
	"app_secret": "dbox_app_secret",
	"scope":"/your-domain.com",
	"root":"dropbox" });
var AESALT = 'AES_SALT';
var WEBMASTER = 'webmaster@example.com';
exports.index = function(req, res) {
	var randId = generateRandomAlphaNum(8);
	redis.exists('notepad:' + randId, function(err, bol){
		if(bol)
			exports.index(req, res);
		res.redirect('/' + randId);
	});
}

exports.write = function(req, res) {
	var id = req.params.id;
	redis.getObject('notepad:'+id, function(err, data){
		if(data == null)
			data = {id : id, needpsw : 0};
		else{
			if(data.encrypt == 1){
				data.content = '请在上面输入密码，然后点击 解锁 !';
				data.needpsw = 1;
			}else{
				var oid = data.oid == null ? data.id : data.oid;
				data.content = aesDe(data.content, oid + AESALT);
				data.needpsw = 0;
			}
		}
		res.render('notepad/write',data);
	});
}
exports.decrypt = function(req, res) {
	var id = req.params.id;
	var psw = req.body.psw;
	redis.getObject('notepad:'+id, function(err, data){
		if(data == null)
			data = {id : id};
		else{
			try{
				var oid = data.oid == null ? data.id : data.oid;
				data.content = aesDe(data.content, oid + AESALT + psw);
				data.msg = 'ok';
			}catch(err){
				console.log(err);
				data.msg = 'err';
			}
			
		}
		data = {msg : data.msg, content : data.content};
		res.json(data);
	});
}
exports.raw = function(req, res) {
	var id = req.params.id;
	redis.getObject('notepad:'+id, function(err, data){
		if(data == null)
			data = {id : id, needpsw : 0,content:''};
		else{
			if(data.encrypt == 1){
				data.content = '抱歉，加密内容暂时无法以纯文本形式查看！';
				data.needpsw = 1;
			}else{
				var oid = data.oid == null ? data.id : data.oid;
				data.content = aesDe(data.content, oid + AESALT);
				data.needpsw = 0;
				if(data.content==null) data.content='';
				data.content = data.content.replace(/<[^>]*>/g,'\n');
				data.content = data.content.replace(/&nbsp;/g,' ');
			}
		}
		res.writeHeader(200, {"Content-Type": "text/plain; charset=utf-8"});
		res.write(data.content);
		res.end();
	});
}
exports.save = function(req, res) {
	var content = req.body.content;
	var id = req.params.id;
	var psw = req.body.psw;
	var encrypted = 0;
	var readonly = 0;
	var ip = req.get('X-Real-IP');
	redis.getObject('notepad:'+id,function(err, data){
		if(data && data.readonly && data.readonly.length > 0)
			readonly = 1;
		if(readonly == 1){
			if(data.readonly == md5(psw)){
				var oid = data.oid == null ? id : data.oid;
				content = aesEn(content, oid + AESALT);
				redis.setObject('notepad:'+id, {id : id, content : content, encrypt : 0, date : new Date(), ip : ip }, function(){
					res.json({ msg: 'ok' });
				});
			}else{
				res.json({ msg: 'readonly' });
			}
		}else{
			var oid = data && data.oid ? data.oid : id;
			if(psw && psw.length > 0){
				content = aesEn(content, oid + AESALT + psw);
				encrypted = 1;
			}else{
				content = aesEn(content, oid + AESALT);
			}
			redis.setObject('notepad:'+id, {id : id, content : content, encrypt : encrypted, date : new Date(), ip : ip }, function(){
				res.json({ msg: 'ok' });
			});
		}
	});
	
}
exports.readonly = function(req, res) {
	var id = req.params.id;
	var psw = req.body.psw;
	if(psw && psw.length > 0)
		psw = md5(psw);
	redis.getObjectField('notepad:'+id, 'readonly', function(err, val){
		if(val){
			if(val == psw){
				redis.setObjectField('notepad:'+id, 'readonly', psw, function(){
					res.json({ msg: 'ok' });
				});
			}else{
				res.json({ msg: 'psw existed' });
			}
		}else{
			redis.setObjectField('notepad:'+id, 'readonly', psw, function(){
				res.json({ msg: 'ok' });
			});
		}
	});
	
}
exports.qrcode = function(req, res) {
	var id = req.params.id;
	res.render('notepad/qrcode',{id : id});
}
exports.aes = function(req, res){
	//res.send(aesDe(aesEn('xxxx','12313'),'12312'));
}
exports.download = function(req, res){
	var id = req.params.id;
	redis.getObject('notepad:'+id, function(err, data){
		if(data != null){
			var sd = {};
			sd.content = data.content;
			sd.id = data.id;
			sd.encrypted = data.encrypt;
			sd.webmaster = WEBMASTER;
			var dd = JSON.stringify(sd);
			res.status(200).set({
				'Content-Length': dd.length,
				'Content-Type': 'application/text' }).send(dd);
		}else{
			res.render('rs',{msg:'内容是空的不需要保存'});
		}
	});
}

var request_tokenx;
exports.dbox = function(req, res) {
	var id = req.params.id;
	appx.requesttoken(function(status, request_token) {
		request_tokenx = request_token;
		res.redirect(request_token.authorize_url + "&oauth_callback=https://i.athere.me/"+id+"/dbsave");
	});
}
exports.dboxsave = function(req, res) {
	var id = req.params.id;
	redis.getObject('notepad:'+id, function(err, data){
		if(data != null){
			var sd = {};
			sd.content = data.content;
			sd.id = data.id;
			sd.encrypted = data.encrypt;
			sd.webmaster = WEBMASTER;
			appx.accesstoken(request_tokenx, function(status, access_token) {
				var cc = appx.client(access_token);
				cc.put(sd.id + ".txt", JSON.stringify(sd), function(status, reply) {
					if(status == 200)
						res.render('rs',{msg:'成功'});
					else
						res.render('rs',{msg:'出错了 :('});
				});
			});
		}else{
			res.render('rs',{msg:'内容是空的不需要保存'});
		}
	});
	
}
exports.upload = function(req, res){
	res.render('notepad/upload',{});
}

exports.up = function(req, res){
	if(req.files && req.files.txt){
		fs.readFile(req.files.txt.path, function (err, data) {
			if (err) throw err;
			var json = data.toString();
			try{
				json = JSON.parse(json);
				if (json.id && json.encrypted && json.content){
					genID(8, function(id){
						var ip = req.get('X-Real-IP');
						var data = {id : id, oid : json.id, content : json.content, encrypt : parseInt(json.encrypted), date : new Date(), ip : ip };
						redis.setObject('notepad:'+id, data, function(){
							fs.unlink(req.files.txt.path);
							res.redirect('/' + id);
						});
					});
				}else{
					throw 'fields err'; 
				}
			}catch(err){
				fs.unlink(req.files.txt.path);
				res.render('rs',{msg:'文件没法识别'});
			}
		});
	}else{
		res.send('nothing');
	}
}
function genID(len, cb){
	async.waterfall([ function(next) {
		var randId = generateRandomAlphaNum(len);
		next(null, randId);
	}, function(randId, next) {
		redis.exists('notepad:' + randId, function(err, bol){
			if(bol)
				randId = genID(len);
			next(null, randId);
		});
	}], function(err, randId) {
		cb(randId);
	});
}
function generateRandomAlphaNum(len) {
	var rdmString = "";
	for (; rdmString.length < len; rdmString += Math.random().toString(33).substr(2));
	return rdmString.substr(0, len);
}
function md5(s){
	var hash = crypto.createHash('md5');
	hash.update(s, 'utf-8');
	return hash.digest('hex');
}
function aesEn(s, k){
	k = md5(k);
	var cipher = crypto.createCipher('aes-128-ecb', k);
	return cipher.update(s, 'utf-8', 'hex') + cipher.final('hex');
}
function aesDe(s, k){
	k = md5(k);
	var cipher = crypto.createDecipher('aes-128-ecb', k);
	return cipher.update(s, 'hex', 'utf-8') + cipher.final('utf-8');
}
