DO $$
DECLARE
    org_id UUID;
    cat_laptop UUID;
    cat_phone UUID;
    cat_monitor UUID;
    loc_hq UUID;
    loc_remote UUID;
    liliana_om_id UUID;
    admin_om_id UUID;
    asset_1 UUID;
    asset_2 UUID;
    asset_3 UUID;
    asset_4 UUID;
BEGIN
    SELECT id INTO org_id FROM organizations WHERE code = 'TECH';
    
    SELECT om.id INTO liliana_om_id FROM organization_memberships om 
    JOIN users u ON u.id = om.user_id WHERE u.email = 'liliana.sawayn@acmetech.com';

    SELECT om.id INTO admin_om_id FROM organization_memberships om 
    JOIN users u ON u.id = om.user_id WHERE u.email = 'admin@acmetech.com';

    SELECT id INTO cat_laptop FROM asset_categories WHERE organization_id = org_id AND name ILIKE '%Laptop%' LIMIT 1;
    SELECT id INTO cat_phone FROM asset_categories WHERE organization_id = org_id AND name ILIKE '%Phone%' LIMIT 1;
    SELECT id INTO cat_monitor FROM asset_categories WHERE organization_id = org_id AND name ILIKE '%Monitor%' LIMIT 1;

    SELECT id INTO loc_hq FROM locations WHERE organization_id = org_id AND name ILIKE '%HQ%' LIMIT 1;
    SELECT id INTO loc_remote FROM locations WHERE organization_id = org_id AND name ILIKE '%Remote%' LIMIT 1;

    -- Insert 4 new assets
    INSERT INTO assets (organization_id, name, asset_tag, category_id, location_id, status, condition)
    VALUES (org_id, 'MacBook Pro 16 M3 Max', 'TECH-AST-1001', cat_laptop, loc_hq, 'ALLOCATED', 'NEW') RETURNING id INTO asset_1;
    
    INSERT INTO assets (organization_id, name, asset_tag, category_id, location_id, status, condition)
    VALUES (org_id, 'iPhone 15 Pro', 'TECH-AST-1002', cat_laptop, loc_remote, 'ALLOCATED', 'NEW') RETURNING id INTO asset_2;

    INSERT INTO assets (organization_id, name, asset_tag, category_id, location_id, status, condition)
    VALUES (org_id, 'Dell UltraSharp 32 4K', 'TECH-AST-1003', cat_laptop, loc_hq, 'AVAILABLE', 'FAIR') RETURNING id INTO asset_3;

    INSERT INTO assets (organization_id, name, asset_tag, category_id, location_id, status, condition)
    VALUES (org_id, 'Logitech MX Master 3S', 'TECH-AST-1004', cat_laptop, loc_remote, 'AVAILABLE', 'NEW') RETURNING id INTO asset_4;

    -- Allocate the first two to Liliana
    INSERT INTO asset_allocations (organization_id, asset_id, employee_id, allocated_by, status)
    VALUES (org_id, asset_1, liliana_om_id, admin_om_id, 'ACTIVE');

    INSERT INTO asset_allocations (organization_id, asset_id, employee_id, allocated_by, status)
    VALUES (org_id, asset_2, liliana_om_id, admin_om_id, 'ACTIVE');
END $$;
