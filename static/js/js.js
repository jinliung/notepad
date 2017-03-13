$(function(){
	$('#editor').focus();
	var msgs = function(t){
		var st = $('.settings');
		st.addClass('hidden');
		st.hide();
		$('.msg').html(t).fadeIn().fadeOut();
	}
	var post = function(data){
		if(needpsw){
			msgs('无效操作！');
			return;
		}
		
		if(readonly){
			if(data.psw.length == 0){
				msgs('请输入只读密码');
				$('#psw').focus();
				return false;
			}
		}else{
			if(data.psw.length > 0){
				if(!pswconfirm && !confirm('请牢记设置的密码，忘记了没法找回的')){
					return;
				}else{
					pswconfirm = true;
				}
			}
		}
		$.ajax({
			url : '/'+pageid+'/save',
			data : data,
			type : "POST",
			dataType : 'json'
		}).done(function(msg){
			if(msg.msg == 'ok')
				msgs('已保存！');
			else if(msg.msg == 'readonly')
				msgs('只读密码有误，不能保存！');
		});
	}
	var data = function(){
		return {id:pageid, content:$('#editor').html(), psw:$('#psw').val()};
	}
	var save = function(){
		$("#psw").blur();
		post(data());
	};
	$("#psw").change(function(){
		pswconfirm = false;
	});
	$(".save").click(function(){
		save();
	})
	$(".decrypt").click(function(){
		var d = $(this);
		var data = {
			psw : $('#psw').val()
		}
		$.ajax({
			url : '/'+pageid+'/decrypt',
			data : data,
			type : "POST",
			dataType : 'json'
		}).done(function(msg){
			if(msg.msg == 'ok'){
				d.hide();
				$('#psw').hide();
				$('#editor').html(msg.content);
				pswconfirm = true;
				needpsw = false;
				$(".write").click();
			}else{
				msgs('抱歉，无法解锁！');
			}
		});
	});
	$(".read").click(function(){
		var d = $(this);
		var dt = {psw:$('#psw').val()};
		if(dt.psw.length == 0){
			msgs('请输入只读密码');
			$('#psw').focus();
			return false;
		}
		$.ajax({
			url : '/'+pageid+'/readonly',
			data : dt,
			type : "POST",
			dataType : 'json'
		}).done(function(msg){
			if(msg.msg == 'psw existed'){
				msgs('已设密码设置不成功！');
			}else{
				msgs('设置成功！');
				$('#psw').hide();
				d.hide();
				readonly = true;
			}
			
		});
	});
	$(".write").click(function(){
		$("#editor").attr('contentEditable','');
		$(this).remove();
	});
	$(".setting").click(function(){
		var st = $(".settings");
		if(st.is(".hidden")){
			st.removeClass('hidden');
			st.show();
		}else{
			st.addClass('hidden');
			st.hide();
		}
	});
	
	$(document).keydown( function(e) {
		if (e.which == 83 && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
			e.preventDefault();
			save();
		}
	});
	
});
