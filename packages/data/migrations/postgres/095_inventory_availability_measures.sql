-- Add canonical operands only. Existing facts, mappings, publication and readers
-- remain unchanged until a separately reconciled recipe observation is prepared.
INSERT INTO mart.measure_definitions VALUES
 ('reserved_stock_quantity','snapshot',false),
 ('free_stock_quantity','snapshot',false),
 ('free_stock_value','snapshot',true);
