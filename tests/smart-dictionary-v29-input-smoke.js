(function(){
  const S=window.MG_SMART_DICT;
  function assert(name,ok){if(!ok)throw new Error('FAIL '+name);console.log('OK '+name)}
  if(!S)throw new Error('MG_SMART_DICT missing');
  assert('corpus=500000',S.count()===500000);
  assert('single letter v',S.suggest('в',15).length>0);
  assert('single letter p',S.suggest('п',15).some(x=>/покраска/i.test(x)));
  assert('infinitive восстановить',S.suggest('восстановить',15).includes('восстановление'));
  assert('context покраска п',S.suggest('покраска п',15).some(x=>/пластик/i.test(x)));
  assert('typo металоконструкция',S.suggest('металоконструкция',15).some(x=>/металлоконструкция/i.test(x)));
  assert('context задний м',S.suggest('задний м',15).some(x=>/маятник/i.test(x)));
  assert('context задний ба',S.suggest('задний ба',15).some(x=>/багажник/i.test(x)));
  console.log('smart dictionary v32 OK');
})();
