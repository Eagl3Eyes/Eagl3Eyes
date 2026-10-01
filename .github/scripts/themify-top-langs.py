import re
import sys

PALETTE = ["#58a6ff", "#bf91f3", "#ff7eb6", "#2dd4bf"]


def main(path: str) -> int:
    with open(path, encoding="utf-8") as f:
        svg = f.read()

    ordered = []
    seen = set()
    for tag in re.findall(r"<rect\b[^>]*>", svg):
        if "lang-progress" not in tag:
            continue
        fill = re.search(r'fill="(#[0-9a-fA-F]{6})"', tag)
        if fill and fill.group(1).lower() not in seen:
            seen.add(fill.group(1).lower())
            ordered.append(fill.group(1))

    if not ordered:
        print(f"::error::no lang-progress fills found in {path}")
        return 1

    mapping = {src.lower(): PALETTE[i % len(PALETTE)] for i, src in enumerate(ordered)}
    pattern = re.compile("|".join(re.escape(src) for src in mapping), re.IGNORECASE)
    svg = pattern.sub(lambda m: mapping[m.group(0).lower()], svg)

    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)

    for src, dst in mapping.items():
        print(f"{src} -> {dst}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
