"""vo-capture.py の純粋関数（URL の許可リストと伏せ字）を確かめる。

実行: python3 scripts/test_vo_capture.py
VoiceOver も Safari も使わない。
"""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "vo_capture", Path(__file__).with_name("vo-capture.py")
)
vo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vo)

for url in [
    "http://localhost:4173/",
    "http://localhost:4174/ssr.html",
    "http://localhost:4173",
]:
    assert vo.is_allowed_url(url), url

for url in [
    "https://localhost:4173/",                    # スキーム違い
    "http://127.0.0.1:4173/",                     # ホスト違い
    "http://localhost:5173/",                     # ポート違い
    "http://localhost/",                          # ポート無し
    "http://localhost:4173.evil.example/",        # ポートが数値でない
    "http://user@localhost:4173/",                # 認証情報付き
    "http://localhost:4173/?q=1",                 # クエリ付き
    'http://localhost:4173/a"&(do shell script "x")',  # AppleScript への埋め込み
    "http://localhost:4173/a\nb",                # urlsplit が改行を捨てる
    " http://localhost:4173/",                    # 前後の空白
    "http://[::1",                                # 解析できない
    "https://mail.google.com/",
]:
    assert not vo.is_allowed_url(url), url

for phrase in [
    "メールアドレス, 編集テキスト, 必須",
    "送信, ボタン",
    "(タイムアウト: 発話が変わらなかった)",
]:
    assert vo.redact(phrase) == phrase, phrase

for phrase in [
    "taro.yamada+shop@example.co.jp",
    "4111 1111 1111 1111",
    "4111-1111-1111-1111",
    "4111111111111",                              # 13 桁
    "連絡先の自動入力, ボタン",
    "候補が 3 件あります",
]:
    assert vo.redact(phrase) == vo.REDACTED, phrase

print("ok")
