/**
 * 自检接口：验证 CLOUDCONVERT_API_KEY 是否有效并返回当前剩余额度
 * 浏览器访问 /api/cloudconvert-check 即可（无需 POST  body）
 * 注意：Key 需包含 user.read 权限才能看到 credits；仅 task.read/task.write 会返回 403
 */
export default async function handler(req, res) {
  const key = process.env.CLOUDCONVERT_API_KEY;
  if (!key) {
    return res.status(503).json({
      ok: false,
      error: 'CLOUDCONVERT_API_KEY not configured',
      hint: '请在 Vercel 环境变量中配置 CLOUDCONVERT_API_KEY',
    });
  }

  try {
    const r = await fetch('https://api.cloudconvert.com/v2/users/me', {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      const msg = data.message || data.error || r.statusText;
      const isForbidden = r.status === 403;
      return res.status(r.status).json({
        ok: false,
        error: msg,
        hint: isForbidden
          ? '当前 Key 可能未勾选 user.read 权限，或 Key 无效。仅 task.read/task.write 无法查询额度，但不影响转换。'
          : '请检查 Key 是否有效、是否已过期。',
      });
    }

    const user = data.data || {};
    return res.status(200).json({
      ok: true,
      email: user.email,
      credits: user.credits,
      message: user.credits != null ? `当前剩余额度: ${user.credits}` : 'Key 有效（无法读取额度，请确认 Key 包含 user.read）',
    });
  } catch (e) {
    console.error('CloudConvert check error:', e);
    return res.status(500).json({
      ok: false,
      error: e.message || 'Network or server error',
    });
  }
}
