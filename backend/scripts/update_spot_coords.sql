-- Updated GCJ-02 coordinates for all 16 Lingshan scenic spots
-- 6 spots verified via Amap Geocoder API; 10 estimated from spatial layout
-- Run: mysql -u root -p scenic_guide < backend/scripts/update_spot_coords.sql

UPDATE scenic_spots SET latitude = 31.421388, longitude = 120.102499 WHERE spot_name = '灵山大照壁';
UPDATE scenic_spots SET latitude = 31.422206, longitude = 120.101356 WHERE spot_name = '五明桥';
UPDATE scenic_spots SET latitude = 31.422844, longitude = 120.101010 WHERE spot_name = '佛足坛';
UPDATE scenic_spots SET latitude = 31.423482, longitude = 120.100507 WHERE spot_name = '五智门';
UPDATE scenic_spots SET latitude = 31.423982, longitude = 120.100256 WHERE spot_name = '菩提大道';
UPDATE scenic_spots SET latitude = 31.424601, longitude = 120.099984 WHERE spot_name = '九龙灌浴';
UPDATE scenic_spots SET latitude = 31.425381, longitude = 120.099598 WHERE spot_name = '降魔浮雕';
UPDATE scenic_spots SET latitude = 31.426081, longitude = 120.099199 WHERE spot_name = '阿育王柱';
UPDATE scenic_spots SET latitude = 31.426781, longitude = 120.098799 WHERE spot_name = '百子戏弥勒';
UPDATE scenic_spots SET latitude = 31.427471, longitude = 120.098334 WHERE spot_name = '祥符禅寺';
UPDATE scenic_spots SET latitude = 31.428259, longitude = 120.098120 WHERE spot_name = '灵山大佛';
UPDATE scenic_spots SET latitude = 31.428259, longitude = 120.097820 WHERE spot_name = '佛教文化博览馆';
UPDATE scenic_spots SET latitude = 31.427548, longitude = 120.102825 WHERE spot_name = '灵山梵宫';
UPDATE scenic_spots SET latitude = 31.424676, longitude = 120.103054 WHERE spot_name = '五印坛城';
UPDATE scenic_spots SET latitude = 31.426070, longitude = 120.104609 WHERE spot_name = '曼飞龙塔';
UPDATE scenic_spots SET latitude = 31.428637, longitude = 120.096889 WHERE spot_name = '无尽意斋';
