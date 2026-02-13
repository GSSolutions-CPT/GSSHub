INSERT INTO products (code, name, category, retail_price, cost_price, description)
VALUES
('HW51', 'Cutting Disk - 230mm Masonry', 'ADHESIVES & HARDWARE', 66.5, 46.5, NULL),
('HW52', 'Cutting Disk - 115mm Steel', 'ADHESIVES & HARDWARE', 22, 15.4, NULL),
('HW52-2', 'Cutting Disk - 115mm x 1.0mm Metal', 'ADHESIVES & HARDWARE', 18.5, 12.9, NULL),
('HW52-3', 'Flap Sanding Disc 115mm 80 Grit', 'ADHESIVES & HARDWARE', 35.8, 25, NULL),
('HW53', 'Cutting Disk - 115mm Masonary', 'ADHESIVES & HARDWARE', 34, 23.8, NULL),
('HW70', 'Hacksaw Blade Shatterproof 24T', 'ADHESIVES & HARDWARE', 14.2, 9.9, NULL),
('HW73', 'Pop Rivets 4015 Large / 100', 'ADHESIVES & HARDWARE', 74.9, 52.4, NULL),
('HW80', 'Welding Rods MS - 2.5mm VITAMAX / 500g', 'ADHESIVES & HARDWARE', 280.3, 196.2, NULL),
('HW79-5', 'Screw 12 x 40 Hex Tex / 100', 'ADHESIVES & HARDWARE', 82, 57, NULL),
('HW79-6', 'Screw 12 x 70 Hex Tex / 100', 'ADHESIVES & HARDWARE', 123.2, 86.2, NULL),
('HW79-8-1', 'Screw 12 x 25 Hex Tex / 100', 'ADHESIVES & HARDWARE', 71, 49.3, NULL),
('HW89', 'Screw - Dry Wall 6 x 25mm / 200', 'ADHESIVES & HARDWARE', 61.6, 43.1, NULL),
('HW92', 'Spray - Q20 Lubricant 150ml', 'ADHESIVES & HARDWARE', 121, 84.7, NULL),
('HW96', 'Masking Tape - 18mm x 40m', 'ADHESIVES & HARDWARE', 20, 14, NULL),
('HW05', 'Venus Alarm Adaptor RJ11 Socket plus Con', 'ADHESIVES & HARDWARE', 35.31, 23.61, NULL),
('CN18', 'Connector - UY2 Scotch Lock / 100', 'ADHESIVES & HARDWARE', 162, 113, NULL)
ON CONFLICT (code) DO UPDATE SET
name = EXCLUDED.name,
category = EXCLUDED.category,
retail_price = EXCLUDED.retail_price,
cost_price = EXCLUDED.cost_price,
description = EXCLUDED.description;