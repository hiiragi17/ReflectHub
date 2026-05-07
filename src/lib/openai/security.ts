/**
 * OpenAI プロンプトインジェクション対策ユーティリティ。
 *
 * - ユーザー入力に紛れ込む jailbreak フレーズや区切りトークンを検出・無害化する
 * - 出力に system プロンプトの内部設定や機密パターン (API key 等) が含まれていないか検証する
 *
 * Issue #93 の脅威モデル: docs/security/prompt-injection.md を参照。
 */

// 区切り（ユーザー入力ブロックの開始終了を示す）
export const USER_INPUT_BEGIN = '<<<USER_INPUT_BEGIN>>>';
export const USER_INPUT_END = '<<<USER_INPUT_END>>>';

// よく知られた jailbreak / インジェクションの目印となるパターン。
// 完全一致ではなく語句単位で検出する。日本語と英語の両方をカバー。
const INJECTION_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'ignore_previous', pattern: /ignore\s+(?:all\s+|the\s+)?(?:previous|prior|above)\s+(?:instructions?|prompts?|rules?)/i },
  { name: 'disregard_above', pattern: /disregard\s+(?:all\s+|the\s+)?(?:previous|prior|above)\s+(?:instructions?|prompts?|rules?)/i },
  { name: 'forget_everything', pattern: /forget\s+(?:everything|all|previous)/i },
  { name: 'you_are_now', pattern: /you\s+are\s+now\s+/i },
  { name: 'act_as', pattern: /\bact\s+as\s+(?:a\s+|an\s+)?(?:dan|developer|admin|root|system)/i },
  { name: 'role_override', pattern: /^\s*(?:system|assistant|developer)\s*[:：]/im },
  { name: 'instruction_marker', pattern: /^\s*(?:###\s*)?(?:instruction|system|prompt|directive)\s*[:：]/im },
  { name: 'reveal_prompt', pattern: /(?:reveal|show|print|dump|leak)\s+(?:the\s+|your\s+)?(?:system\s+)?(?:prompt|instructions?)/i },
  { name: 'reveal_prompt_jp', pattern: /(?:システム)?プロンプト(?:を|の内容を)?(?:表示|教えて|出力|公開)/ },
  { name: 'ignore_jp', pattern: /(?:これまでの|以前の|上記の)?(?:指示|命令|ルール|プロンプト)(?:を)?(?:無視|忘れて)/ },
  { name: 'jailbreak_keyword', pattern: /\b(?:jailbreak|prompt\s*injection|dan\s+mode)\b/i },
  { name: 'override_role_jp', pattern: /(?:あなたは|今から).{0,20}(?:管理者|admin|開発者|developer|システム)である/ },
];

// 出力の漏洩検査用パターン
const SECRET_PATTERNS: { name: string; pattern: RegExp }[] = [
  // OpenAI / Anthropic 形式の API キー
  { name: 'openai_api_key', pattern: /\bsk-[A-Za-z0-9_-]{20,}/ },
  { name: 'anthropic_api_key', pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  // JWT (3 セグメントの base64url)
  { name: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  // Bearer トークン
  { name: 'bearer_token', pattern: /\b(?:Bearer|Authorization)\s+[A-Za-z0-9._-]{20,}/i },
  // private key の PEM ヘッダ
  { name: 'private_key_pem', pattern: /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) (?:PRIVATE )?KEY-----/ },
];

// 制御文字（LF/CR 以外）
const CONTROL_CHARS = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g;

// ユーザー入力ブロック区切りトークンが入力に混入した場合は無害化する
const USER_BLOCK_DELIMITERS = /<{3,}\s*USER_INPUT_(?:BEGIN|END)\s*>{3,}/gi;

export interface SanitizeResult {
  /** 無害化済みのテキスト */
  sanitized: string;
  /** 検出された injection パターン名（重複除去） */
  detected: string[];
  /** 何らかの変更を行ったか */
  modified: boolean;
}

/**
 * ユーザー入力に対するサニタイズ。
 * - 制御文字除去
 * - 区切りトークンの破壊
 * - jailbreak パターンを `[REDACTED]` 置換 (= モデルに対する命令性を奪う)
 *
 * 完全ブロックは行わない（誤検知時のユーザー体験を損なうため）。
 * 検出ログは `detected` 配列で呼び出し側に返却する。
 */
export function sanitizeUserInput(value: string): SanitizeResult {
  if (typeof value !== 'string') {
    return { sanitized: '', detected: [], modified: false };
  }

  const detectedSet = new Set<string>();
  let working = value;

  if (CONTROL_CHARS.test(working)) {
    working = working.replace(CONTROL_CHARS, '');
    detectedSet.add('control_chars');
  }

  if (USER_BLOCK_DELIMITERS.test(working)) {
    working = working.replace(USER_BLOCK_DELIMITERS, '[REDACTED_DELIMITER]');
    detectedSet.add('user_block_delimiter');
  }

  for (const { name, pattern } of INJECTION_PATTERNS) {
    if (pattern.test(working)) {
      working = working.replace(pattern, '[REDACTED_INSTRUCTION]');
      detectedSet.add(name);
    }
  }

  const sanitized = working;
  return {
    sanitized,
    detected: Array.from(detectedSet),
    modified: sanitized !== value,
  };
}

/**
 * 出力に機密パターンが含まれていないか確認する。
 * 含まれていればパターン名を返す（複数）。
 */
export function findLeakedSecrets(output: string): string[] {
  const found: string[] = [];
  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(output)) found.push(name);
  }
  return found;
}

/**
 * 出力に system プロンプトの一部が長文コピーされて漏洩していないか検査する。
 * 連続する 50 文字以上の system プロンプトの一致を検出した場合は漏洩とみなす。
 *
 * 短い単語の偶然一致を避けるため、空白除去後の長さで判定する。
 */
export function containsSystemPromptLeak(
  output: string,
  systemPrompt: string,
  minMatchLength = 50,
): boolean {
  if (!output || !systemPrompt) return false;
  const normalizedOutput = output.replace(/\s+/g, '');
  const normalizedSystem = systemPrompt.replace(/\s+/g, '');
  if (normalizedSystem.length < minMatchLength) return false;
  for (let i = 0; i + minMatchLength <= normalizedSystem.length; i++) {
    const slice = normalizedSystem.slice(i, i + minMatchLength);
    if (normalizedOutput.includes(slice)) return true;
  }
  return false;
}

export interface OutputValidationResult {
  ok: boolean;
  /** 検出されたリスク種別 */
  risks: string[];
}

/**
 * 出力 (parsed payload を JSON.stringify したもの想定) を検査する。
 */
export function validateOutputForLeaks(
  output: string,
  systemPrompt: string,
): OutputValidationResult {
  const risks: string[] = [];
  const secrets = findLeakedSecrets(output);
  if (secrets.length > 0) risks.push(...secrets.map((s) => `secret:${s}`));
  if (containsSystemPromptLeak(output, systemPrompt)) {
    risks.push('system_prompt_leak');
  }
  return { ok: risks.length === 0, risks };
}
