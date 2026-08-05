// scripts/secret-scanner.cjs
// Shared secret detection patterns used by hooks + lint agents.

const SECRET_PATTERNS = [
  { type: 'openai_api_key',   re: /sk-[A-Za-z0-9]{20,}/ },
  { type: 'anthropic_key',    re: /sk-ant-[A-Za-z0-9_-]{32,}/ },
  { type: 'github_pat',       re: /ghp_[A-Za-z0-9]{36,}/ },
  { type: 'github_fg_pat',    re: /github_pat_[A-Za-z0-9_]{82,}/ },
  { type: 'aws_access_key',   re: /AKIA[0-9A-Z]{16}/ },
  { type: 'gcp_api_key',      re: /AIza[0-9A-Za-z_-]{35}/ },
  { type: 'slack_token',      re: /xox[bpars]-[0-9A-Za-z-]{10,}/ },
  { type: 'jwt_bearer',       re: /Bearer\s+eyJ[A-Za-z0-9._-]+/ },
  { type: 'private_key',      re: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { type: 'env_secret',       re: /[_A-Z][_A-Z0-9]*_(?:SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY)\s*[:=]\s*\S{8,}/ },
  { type: 'password_literal', re: /(?:password|passwd|pwd)\s*[:=]\s*["']?\S{6,}["']?/i }
];

function scanForSecrets(content) {
  const findings = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { type, re } of SECRET_PATTERNS) {
      const m = line.match(re);
      if (m) {
        findings.push({
          type,
          line: i + 1,
          match: m[0].slice(0, 40) + (m[0].length > 40 ? '...' : '')
        });
      }
    }
  }
  return findings;
}

module.exports = { scanForSecrets, SECRET_PATTERNS };
