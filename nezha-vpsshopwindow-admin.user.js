// ==UserScript==
// @name         哪吒VPS橱窗后台脚本
// @namespace    http://bmqy.net/
// @version      1.0.0
// @description  配合哪吒面板自定义代码VPS橱窗打造的后台油猴脚本
// @author       bmqy
// @match        http://*/*
// @match        https://*/*
// @icon        https://avatars.githubusercontent.com/u/105093572?s=48&v=4
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
    const storageKey = 'nzVpsChuChuangData';
    const extraDataKeyName = {
        shop:"商家名称",
        pid: '产品ID',
        price:"购买价格",
        cycle: "付款周期",
        start: "购买日期",
        expire: "过期时间",
    }
    let timmer = null;
    let changer = false;
    const pathname = location.pathname;
    const $footer = document.querySelector('.footer');
    if(!$footer || $footer.innerText.indexOf('Powered by 哪吒监控')==-1) return false;
    let raw = GM_getValue(storageKey +'.raw', '');
    let extra = GM_getValue(storageKey +'.extra', null);
    if(pathname === '/setting'){
        const $settingForm = document.forms.settingForm;
        let settingData = new FormData($settingForm);
        settingData = new URLSearchParams(settingData).toString();
        GM_setValue(storageKey +'.raw', settingData);
        const CustomCode = document.querySelector('textarea[name=CustomCode]').value;
        let CustomCodeValue =CustomCode.match(/(?<=extraData = )[\s\S]+(?=\nconst cycleNames)/g);
        CustomCodeValue = CustomCodeValue ? CustomCodeValue[0] : '{}';
        CustomCodeValue = CustomCodeValue.replace(/([0-9a-zA-Z]+):/g, '"$1":').replace(/},\n}/g, '}\n}').replace(/'/g, '"');
        extra = JSON.parse(CustomCodeValue);
        GM_setValue(storageKey +'.extra', extra);
        if(extra == null){
            alert('数据获取成功，脚本可以正常使用了。')
        } else {
            console.log('已重新获取数据。');
        }
    } else {
        if(pathname !='/' && pathname !='/login' && extra == null){
            alert('请先进入【设置】页面获取脚本所需数据！！！');
            return false;
        }
        if(pathname === '/server'){
            const $table = document.querySelector('table.table');
            const $tableTr = $table.querySelectorAll('tbody tr');
            $tableTr.forEach(e=>{
                let $tds = e.querySelectorAll('td');
                let id = $tds[1].innerText;
                id = id.replace(/\(\d+\)/g, '');
                let $nameTd = $tds[2];
                let $extraDataBox = document.createElement('div');
                $extraDataBox.id = id;
                $extraDataBox.setAttribute('class', 'extra-box');
                $extraDataBox.setAttribute('style', 'margin-top:10px;');
                for(let key in extraDataKeyName){
                    let extraData = extra[id];
                    let $inputLabel = document.createElement('div');
                    $inputLabel.setAttribute('style', 'white-space: nowrap;padding-bottom:3px;');
                    $inputLabel.innerHTML = '<span style="display:inline-block;width:70px;">'+ extraDataKeyName[key] +'：</span>';
                    let $input = document.createElement('input');
                    $input.name = key;
                    if(extraData){
                        $input.value = extraData[key];
                    }
                    $input.addEventListener('change', ()=>{
                        changer = true;
                        if(timmer) return false;
                        console.log('1s 后提交');
                        timmer = setTimeout(function(){
                            updateExtraData();
                        }, 1500);
                    });
                    $input.addEventListener('focus', ()=>{
                        if(timmer){
                            console.log('终断提交');
                            clearTimeout(timmer);
                            timmer = null;
                        }
                    });
                    $input.addEventListener('blur', ()=>{
                        if(timmer) return false;
                        if(changer){
                            console.log('1s 后提交');
                            timmer = setTimeout(function(){
                                updateExtraData();
                            }, 1500);
                        }
                    });
                    $inputLabel.append($input);
                    $extraDataBox.append($inputLabel);
                }
                $nameTd.append($extraDataBox);
            })
        }
    }
    const updateExtraData = function(){
        let paramsRaw = new URLSearchParams(raw);
        let customCodeOld = paramsRaw.get('CustomCode');
        let $extraBox = document.querySelectorAll('table.table .extra-box');
        let extraNew = {};
        $extraBox.forEach(e=>{
            let shop = e.querySelector('input[name=shop]').value,
                pid = e.querySelector('input[name=pid]').value,
                price =e.querySelector('input[name=price]').value,
                cycle = e.querySelector('input[name=cycle]').value,
                start = e.querySelector('input[name=start]').value,
                expire = e.querySelector('input[name=expire]').value;
            if(shop || pid || price || cycle || start || expire){
                extraNew[e.id] = {
                    shop:shop,
                    pid: pid,
                    price:price,
                    cycle: cycle,
                    start: start,
                    expire: expire,
                }
            }
        });
        let customCodeNew = customCodeOld.replace(/(?<=extraData = )[\s\S]+(?=\nconst cycleNames)/g, JSON.stringify(extraNew));
        paramsRaw.set('CustomCode', customCodeNew)
        GM_xmlhttpRequest({
            method: 'POST',
            url: '/api/setting',
            headers: {
                "Content-Type":"application/x-www-form-urlencoded; charset=UTF-8"
            },
            responseType : 'json',
            data: paramsRaw.toString(),
            onload: function(responses){
                let res = responses.response;
                if(res.code == 200){
                    alert('更新成功');
                } else {
                    alert(responses.responseText);
                }
                clearTimeout(timmer);
                timmer = null;
                changer = false;
            }
        })
    }
})();