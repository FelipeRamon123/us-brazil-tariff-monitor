from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
DIST.mkdir(exist_ok=True)

for name in ["index.html", ".nojekyll"]:
    shutil.copy2(ROOT / name, DIST / name)

for folder in ["assets", "data"]:
    target = DIST / folder
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(ROOT / folder, target, ignore=shutil.ignore_patterns("raw", "source", "work"))

(DIST / ".openai").mkdir(exist_ok=True)
shutil.copy2(ROOT / ".openai" / "hosting.json", DIST / ".openai" / "hosting.json")
print(f"Static site prepared at {DIST}")
