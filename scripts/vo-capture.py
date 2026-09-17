#!/usr/bin/env python3
"""VoiceOver が実際に発話した文字列を採取する。

Issue #21 の記入シートは「アクセシビリティツリーは一致しているが、支援技術が
実際に読み上げるか」を埋めるためのもので、本来は人が `⌃⌥⇧C`（直前の発話を
コピー）を押して貼り付ける。B11 は 23 停止 × 2 lane あり、手作業では
コピーの取りこぼしが混じるため、同じ文字列を AppleScript から読んでいる。

読んでいる `content of last phrase` は `⌃⌥⇧C` が取るのと同じ文字列で、
キーも System Events で送っているので操作の経路も人と同じ。妥当性は、
手測の記録が残っている B5 を再現して 8 停止すべて一致することで確認した
（scenario="b5"）。ここが割れたらこのスクリプトは使わない。

必要な事前設定（どちらも検証する人の環境を変えるため、記入シート側の手順は
人がキーを押す形のまま残してある）:

  1. VoiceOver ユーティリティ →「一般」→「AppleScript で VoiceOver を
     制御することを許可」を ON
  2. 実行するターミナルにアクセシビリティ権限（システム設定 → プライバシーと
     セキュリティ → アクセシビリティ）

使い方（VoiceOver を ⌘F5 で起動し、Safari をウインドウ 1 枚だけ開いた状態で）:

  python3 scripts/vo-capture.py b5  http://localhost:4173/
  python3 scripts/vo-capture.py b11 http://localhost:4173/ssr.html
  python3 scripts/vo-capture.py b11 http://localhost:4174/ssr.html

実行中はキーボードとマウスに触らない。Safari が前面から外れるとキーが
別のアプリへ飛び、記録が壊れる。

**検証用の localhost 以外では実行しない。** `content of last phrase` は
VoiceOver が直前に読み上げた内容を無条件に返すため、メール・パスワード
マネージャ・社内ツールが前面にあると、その画面の内容が標準出力に出る。
出力は会話ログや Issue のコメントへ貼られる前提なので、取り消しが利かない。
"""
import subprocess
import sys
import time

POLL_INTERVAL = 0.12
POLL_TIMEOUT = 6.0
SETTLE_AFTER_RELOAD = 3.0
PAUSE_AFTER_SETUP_KEY = 0.8

KEY_TAB, KEY_SPACE, KEY_RIGHT = 48, 49, 124
KEY_L, KEY_RETURN = 37, 36
VO_MODS = "{control down, option down}"

# 起点。Tab ×1 がこれを読まなければ、フォーカスがページ内にない
ORIGIN_PHRASE = "通知を表示"


def osa(script: str) -> str:
    result = subprocess.run(
        ["osascript", "-e", script], capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip())
    return result.stdout.strip()


def last_phrase() -> str:
    return osa('tell application "VoiceOver" to return content of last phrase')


def press(code: int, mods: str = "") -> None:
    using = f" using {mods}" if mods else ""
    osa(f'tell application "System Events" to key code {code}{using}')


def wait_for_new_phrase(previous: str) -> str:
    """発話が変わるまで待ち、変わった瞬間に返す。

    項目のアナウンスの後には間を置いてヒント（操作方法の案内）が続く。
    記入シートはヒントを記録しないので、変化を検出したら即座に確定する。
    """
    deadline = time.time() + POLL_TIMEOUT
    while time.time() < deadline:
        current = last_phrase()
        if current and current != previous:
            return current
        time.sleep(POLL_INTERVAL)
    return "(タイムアウト: 発話が変わらなかった)"


def require_voiceover() -> None:
    if osa('application "VoiceOver" is running') != "true":
        sys.exit("VoiceOver が起動していない。⌘F5 で起動してから実行する")


def open_and_reload(url: str) -> str:
    """指定 URL を読み直し、フォーカスをページ内へ戻す。

    ⌘R を使わないのは、フォーカスが Safari の UI 側に出たままだと戻して
    くれず、以降の Tab がツールバーを辿ってしまうため。⌘L → Return なら
    読み直しと同時にフォーカスがコンテンツへ入る。
    """
    osa(f'tell application "Safari" to set URL of front document to "{url}"')
    osa('tell application "Safari" to activate')
    time.sleep(SETTLE_AFTER_RELOAD)
    press(KEY_L, "command down")
    time.sleep(0.5)
    press(KEY_RETURN)
    time.sleep(SETTLE_AFTER_RELOAD)
    return last_phrase()


# (ラベル, 操作) のうちラベルが None のものは記録しない準備操作。
# "reload" と "origin" は run() が解釈する特別な操作。
def steps_b11():
    """B11 SSR / hydration。Tab ×16 → ヒントの表示 → 非表示。"""
    return [(f"S{i}", (KEY_TAB, "")) for i in range(1, 17)] + [
        (None, "reload"),  # Tab ×16 でページ外へ出るので起点を取り直す
        (None, "origin"),
        *[(None, (KEY_TAB, "")) for _ in range(5)],
        (None, (KEY_SPACE, VO_MODS)),      # チェック ON
        ("S17", (KEY_RIGHT, VO_MODS)),
        ("S18", (KEY_RIGHT, VO_MODS)),
        ("S19", (KEY_RIGHT, VO_MODS)),
        (None, (KEY_TAB, "")),
        (None, (KEY_TAB, "shift down")),   # チェックボックスへ戻す
        (None, (KEY_SPACE, VO_MODS)),      # チェック OFF
        ("S20", (KEY_RIGHT, VO_MODS)),
        ("S21", (KEY_RIGHT, VO_MODS)),
        ("S22", (KEY_RIGHT, VO_MODS)),
        ("S23", (KEY_RIGHT, VO_MODS)),
    ]


def steps_b5():
    """B5 条件付き描画。手測の記録があるので、自動採取の妥当性判定に使う。"""
    return [
        (None, "origin"),                  # Tab ×1
        *[(None, (KEY_TAB, "")) for _ in range(4)],
        ("T1", (KEY_TAB, "")),             # Tab ×6。チェックボックス
        (None, (KEY_SPACE, VO_MODS)),      # チェック ON
        ("T2", (KEY_RIGHT, VO_MODS)),
        ("T3", (KEY_RIGHT, VO_MODS)),
        ("T4", (KEY_RIGHT, VO_MODS)),
        (None, (KEY_TAB, "")),
        (None, (KEY_TAB, "shift down")),
        (None, (KEY_SPACE, VO_MODS)),      # チェック OFF
        ("T5", (KEY_RIGHT, VO_MODS)),
        ("T6", (KEY_RIGHT, VO_MODS)),
        ("T7", (KEY_RIGHT, VO_MODS)),
        ("T8", (KEY_RIGHT, VO_MODS)),
    ]


SCENARIOS = {"b5": steps_b5, "b11": steps_b11}


def run(tag: str, url: str, steps) -> None:
    require_voiceover()
    previous = open_and_reload(url)
    print(f"[{tag}]", flush=True)
    for label, action in steps:
        if action == "reload":
            previous = open_and_reload(url)
            continue
        if action == "origin":
            press(KEY_TAB)
            previous = wait_for_new_phrase(previous)
            if ORIGIN_PHRASE not in previous:
                sys.exit(f"起点がずれている（Tab ×1 の発話: {previous}）。記録せず中断")
            continue
        code, mods = action
        press(code, mods)
        if label is None:
            time.sleep(PAUSE_AFTER_SETUP_KEY)
            previous = last_phrase()
            continue
        previous = wait_for_new_phrase(previous)
        print(f"{label}: {previous}", flush=True)


def main() -> None:
    if len(sys.argv) != 3 or sys.argv[1] not in SCENARIOS:
        sys.exit(f"使い方: {sys.argv[0]} {{{'|'.join(SCENARIOS)}}} <URL>")
    scenario, url = sys.argv[1], sys.argv[2]
    lane = "vapor" if ":4174" in url else "classic"
    run(f"{scenario.upper()} {lane}", url, SCENARIOS[scenario]())


if __name__ == "__main__":
    main()
