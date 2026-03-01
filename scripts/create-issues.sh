#!/bin/bash
#
# ReflectHub - Phase 2 & Phase 3 Issue 一括登録スクリプト
#
# 使い方:
#   1. GitHub CLI (gh) をインストール: https://cli.github.com/
#   2. gh auth login で認証
#   3. このスクリプトを実行:
#      ./scripts/create-issues.sh [options]
#
# オプション:
#   --phase2     Phase 2 の Issue のみ作成
#   --phase3     Phase 3 の Issue のみ作成
#   --dry-run    実際には作成せず、内容を確認のみ
#   --help       ヘルプを表示
#
# 必要なツール: gh (GitHub CLI), jq

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="hiiragi17/ReflectHub"
CREATE_PHASE2=false
CREATE_PHASE3=false
DRY_RUN=false

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

print_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
  echo "ReflectHub - Phase 2 & Phase 3 Issue 一括登録スクリプト"
  echo ""
  echo "使い方: ./scripts/create-issues.sh [options]"
  echo ""
  echo "オプション:"
  echo "  --phase2     Phase 2 の Issue のみ作成"
  echo "  --phase3     Phase 3 の Issue のみ作成"
  echo "  --dry-run    実際には作成せず、内容を確認のみ"
  echo "  --help       このヘルプを表示"
  echo ""
  echo "例:"
  echo "  ./scripts/create-issues.sh              # 全 Issue を作成"
  echo "  ./scripts/create-issues.sh --phase2     # Phase 2 のみ作成"
  echo "  ./scripts/create-issues.sh --dry-run    # 確認のみ（作成しない）"
}

# 引数パース
while [[ $# -gt 0 ]]; do
  case $1 in
    --phase2)
      CREATE_PHASE2=true
      shift
      ;;
    --phase3)
      CREATE_PHASE3=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    *)
      print_error "不明なオプション: $1"
      show_help
      exit 1
      ;;
  esac
done

# オプションが指定されなければ両方作成
if ! $CREATE_PHASE2 && ! $CREATE_PHASE3; then
  CREATE_PHASE2=true
  CREATE_PHASE3=true
fi

# 前提条件チェック
check_prerequisites() {
  print_info "前提条件を確認中..."

  if ! command -v gh &> /dev/null; then
    print_error "gh (GitHub CLI) がインストールされていません"
    echo "  インストール: https://cli.github.com/"
    exit 1
  fi

  if ! gh auth status &> /dev/null; then
    print_error "GitHub CLI にログインしていません"
    echo "  実行してください: gh auth login"
    exit 1
  fi

  if ! command -v jq &> /dev/null; then
    print_error "jq がインストールされていません"
    echo "  インストール: sudo apt install jq (Ubuntu) / brew install jq (Mac)"
    exit 1
  fi

  print_success "前提条件OK"
}

# 既存 Issue の重複チェック
check_duplicate() {
  local title="$1"
  local existing
  existing=$(gh issue list --repo "$REPO" --state all --limit 200 --json title --jq '.[].title' 2>/dev/null)

  if echo "$existing" | grep -qF "$title"; then
    return 0 # 重複あり
  fi
  return 1 # 重複なし
}

# ラベルを作成（存在しない場合）
ensure_labels() {
  local labels_to_create=("Phase 2" "Phase 3" "enhancement")

  for label in "${labels_to_create[@]}"; do
    if ! gh label list --repo "$REPO" --json name --jq '.[].name' 2>/dev/null | grep -qF "$label"; then
      if $DRY_RUN; then
        print_info "[DRY-RUN] ラベル作成: $label"
      else
        case "$label" in
          "Phase 2")
            gh label create "$label" --repo "$REPO" --color "0075ca" --description "Phase 2 実装タスク" 2>/dev/null || true
            ;;
          "Phase 3")
            gh label create "$label" --repo "$REPO" --color "e4e669" --description "Phase 3 実装タスク" 2>/dev/null || true
            ;;
          *)
            # enhancement ラベルはデフォルトで存在する場合が多い
            true
            ;;
        esac
        print_success "ラベル作成: $label"
      fi
    fi
  done
}

# JSON ファイルから Issue を作成
create_issues_from_json() {
  local json_file="$1"
  local phase_name="$2"

  if [[ ! -f "$json_file" ]]; then
    print_error "ファイルが見つかりません: $json_file"
    return 1
  fi

  local count
  count=$(jq 'length' "$json_file")
  print_info "$phase_name: $count 件の Issue を処理します"

  local created=0
  local skipped=0

  for i in $(seq 0 $((count - 1))); do
    local title
    title=$(jq -r ".[$i].title" "$json_file")
    local body
    body=$(jq -r ".[$i].body" "$json_file")
    local labels
    labels=$(jq -r ".[$i].labels | join(\",\")" "$json_file")

    echo ""
    print_info "[$((i + 1))/$count] $title"

    # 重複チェック
    if check_duplicate "$title"; then
      print_warn "スキップ（既に存在）: $title"
      skipped=$((skipped + 1))
      continue
    fi

    if $DRY_RUN; then
      print_info "[DRY-RUN] 作成予定:"
      echo "  タイトル: $title"
      echo "  ラベル: $labels"
      echo "  本文: $(echo "$body" | head -3)..."
      created=$((created + 1))
    else
      local result
      result=$(gh issue create \
        --repo "$REPO" \
        --title "$title" \
        --body "$body" \
        --label "$labels" 2>&1)

      if [[ $? -eq 0 ]]; then
        print_success "作成完了: $result"
        created=$((created + 1))
      else
        print_error "作成失敗: $result"
      fi

      # API レート制限対策: 少し待機
      sleep 1
    fi
  done

  echo ""
  print_info "$phase_name 結果: 作成 $created 件, スキップ $skipped 件"
}

# メイン処理
main() {
  echo "========================================"
  echo " ReflectHub Issue 一括登録ツール"
  echo "========================================"
  echo ""

  if $DRY_RUN; then
    print_warn "DRY-RUN モード: Issue は実際には作成されません"
    echo ""
  fi

  check_prerequisites
  ensure_labels

  local total_created=0

  if $CREATE_PHASE2; then
    echo ""
    echo "----------------------------------------"
    echo " Phase 2 Issue 登録"
    echo "----------------------------------------"
    create_issues_from_json "$SCRIPT_DIR/issues/phase2-issues.json" "Phase 2"
  fi

  if $CREATE_PHASE3; then
    echo ""
    echo "----------------------------------------"
    echo " Phase 3 Issue 登録"
    echo "----------------------------------------"
    create_issues_from_json "$SCRIPT_DIR/issues/phase3-issues.json" "Phase 3"
  fi

  echo ""
  echo "========================================"
  echo " 完了"
  echo "========================================"

  if ! $DRY_RUN; then
    echo ""
    print_info "作成された Issue 一覧:"
    echo "  https://github.com/$REPO/issues"
  fi
}

main
