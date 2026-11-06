/** 삼성네컷 무료 이메일 첨부 서버 (Google Apps Script)
 * 웹 앱 배포: 실행 사용자=나, 액세스=모든 사용자
 * 공개 웹 앱은 남용 위험이 있습니다. 아래 발송 제한을 유지하세요.
 */
const ALLOWED_ORIGIN = 'https://minyeong72.github.io';
const MAX_BYTES = 4 * 1024 * 1024;
const DAILY_MAX = 30; // 앱 자체 발송 제한, Google 계정 한도와 별개

function doPost(e) {
  let result;
  try {
    const p = (e && e.parameter) || {};
    const email = String(p.to_email || '').trim();
    const data = String(p.image || '');
    if (!/^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[A-Za-z]{2,}$/.test(email)) throw Error('이메일 주소가 올바르지 않습니다.');
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data)) throw Error('PNG 이미지 형식이 올바르지 않습니다.');
    if (data.length > Math.ceil(MAX_BYTES * 4 / 3) + 100) throw Error('첨부파일이 너무 큽니다 (최대 4MB).');
    const bytes = Utilities.base64Decode(data.split(',')[1]);
    if (bytes.length > MAX_BYTES || bytes.length < 100) throw Error('이미지 크기가 올바르지 않습니다.');
    if (!(bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71)) throw Error('PNG 파일이 아닙니다.');

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw Error('요청이 많습니다. 잠시 후 다시 시도해 주세요.');
    try {
      const cache = CacheService.getScriptCache();
      const recipientKey = 'recipient_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email.toLowerCase())).slice(0,32);
      if (cache.get(recipientKey)) throw Error('같은 이메일로 연속 전송할 수 없습니다. 10분 뒤 시도해 주세요.');
      const props = PropertiesService.getScriptProperties();
      const day = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
      const countKey = 'sent_' + day;
      const count = Number(props.getProperty(countKey) || '0');
      if (count >= DAILY_MAX || MailApp.getRemainingDailyQuota() < 1) throw Error('오늘의 무료 전송 한도에 도달했습니다.');
      const blob = Utilities.newBlob(bytes, 'image/png', '삼성네컷.png');
      MailApp.sendEmail({to: email, subject:'삼성네컷 사진이 도착했어요! 📸', body:'삼성네컷에서 촬영한 사진을 첨부했어요. 즐거운 추억으로 간직해 주세요!', name:'삼성네컷', attachments:[blob]});
      props.setProperty(countKey, String(count+1));
      cache.put(recipientKey, '1', 600);
    } finally { lock.releaseLock(); }
    result = {ok:true, message:'전송 요청이 완료됐어요. 메일함과 스팸함을 확인해 주세요.'};
  } catch (err) {
    result = {ok:false, message:String(err.message || err)};
  }
  // HTMLService iframe 응답에서 GitHub Pages 부모창에 결과 전달
  const payload = JSON.stringify({type:'samsung-fourcut-email', ...result}).replace(/</g,'\\u003c');
  const html = '<!doctype html><html><body><script>window.parent.postMessage(' + payload + ',' + JSON.stringify(ALLOWED_ORIGIN) + ');<\\/script></body></html>'.replace('<\\/script>','</script>');
  return HtmlService.createHtmlOutput(html).setTitle('삼성네컷 이메일 결과');
}
