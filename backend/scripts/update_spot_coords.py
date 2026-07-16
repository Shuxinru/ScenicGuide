"""Update scenic_spots coordinates to corrected GCJ-02 values.

Run: python -m scripts.update_spot_coords  (from backend directory)
"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text as sa_text
from app.core.database import async_session

CORRECTED_COORDS = {
    "灵山大照壁":     (31.422026, 120.100378),
    "五明桥":         (31.422925, 120.100273),
    "佛足坛":         (31.423464, 120.100346),
    "五智门":         (31.424003, 120.100136),
    "菩提大道":       (31.424452, 120.100220),
    "九龙灌浴":       (31.425351, 120.100431),
    "降魔浮雕":       (31.425980, 120.100273),
    "阿育王柱":       (31.426519, 120.100115),
    "百子戏弥勒":     (31.427058, 120.100304),
    "祥符禅寺":       (31.427552, 120.100252),
    "灵山大佛":       (31.428136, 120.100220),
    "佛教文化博览馆": (31.428136, 120.100010),
    "灵山梵宫":       (31.428517, 120.100540),
    "五印坛城":       (31.424816, 120.102138),
    "曼飞龙塔":       (31.424916, 120.101639),
    "无尽意斋":       (31.427816, 120.098941),
}


async def main():
    async with async_session() as db:
        updated = 0
        for spot_name, (lat, lng) in CORRECTED_COORDS.items():
            result = await db.execute(
                sa_text(
                    "UPDATE scenic_spots SET latitude = :lat, longitude = :lng "
                    "WHERE spot_name = :name"
                ),
                {"lat": lat, "lng": lng, "name": spot_name},
            )
            await db.commit()
            if result.rowcount and result.rowcount > 0:
                print(f"  [OK] {spot_name}: {lat}, {lng}")
                updated += result.rowcount
            else:
                print(f"  [SKIP] {spot_name}: not found in scenic_spots")
        print(f"\nTotal updated: {updated} rows")


if __name__ == "__main__":
    asyncio.run(main())
