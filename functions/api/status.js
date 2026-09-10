/**
 * functions/api/status.js - Cloudflare Pages Function
 * 서버 상태 및 환경변수 설정 여부 확인
 */

export async function onRequestGet(context) {
  const { env } = context;
  const hasKey = !!(env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY.trim() !== '');

  return new Response(JSON.stringify({
    status: 'ok',
    hasKey: hasKey,
    defaultModel: env.DEFAULT_MODEL || 'google/gemini-2.5-flash'
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
